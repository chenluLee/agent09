import type { AsrMessage, AsrLlmResultData } from "./types";

export class IflytekAsrProvider {
  private ws: WebSocket | null = null;
  private resolveFinish: ((text: string) => void) | null = null;
  private rejectFinish: ((error: Error) => void) | null = null;
  private collectedText = "";
  private finalResultReceived = false;

  constructor(
    private createWebSocket: (url: string) => WebSocket = (url) => new WebSocket(url)
  ) {}

  async connect(authUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = this.createWebSocket(authUrl);

      this.ws.onopen = () => {};

      this.ws.onmessage = (event: MessageEvent) => {
        const msg: AsrMessage = JSON.parse(event.data as string);

        if (msg.action === "started") {
          resolve();
          return;
        }

        if (msg.action === "error") {
          const err = new Error(`iFlytek ASR error ${msg.code}: ${msg.desc ?? "unknown"}`);
          reject(err);
          this.rejectFinish?.(err);
          return;
        }

        if (msg.action === "result" && msg.data) {
          this.handleResult(msg.data);
        }
      };

      this.ws.onerror = (event: Event) => {
        const message =
          (event as unknown as { error?: Error }).error?.message ??
          "WebSocket connection error";
        const err = new Error(message);
        reject(err);
        this.rejectFinish?.(err);
      };

      this.ws.onclose = () => {
        if (this.resolveFinish && this.finalResultReceived) {
          this.resolveFinish(this.collectedText);
        } else if (this.rejectFinish) {
          this.rejectFinish(new Error("WebSocket closed before final result"));
        }
      };
    });
  }

  sendAudio(chunk: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  finish(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolveFinish = resolve;
      this.rejectFinish = reject;

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // rtasr-llm: send JSON text message as end marker
        this.ws.send(JSON.stringify({ end: true }));
      }

      if (this.finalResultReceived) {
        resolve(this.collectedText);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.collectedText = "";
    this.finalResultReceived = false;
    this.resolveFinish = null;
    this.rejectFinish = null;
  }

  /**
   * Parse rtasr-llm result data.
   * Structure: data.cn.st.rt.ws[].cw[].{w, wp}
   * - type=0: confirmed result (accumulate)
   * - type=1: intermediate result (ignore)
   * - ls=true: last segment
   */
  private handleResult(dataStr: string): void {
    try {
      const data: AsrLlmResultData = JSON.parse(dataStr);
      const st = data.cn?.st;
      if (!st || st.type !== 0) {
        // Skip intermediate results (type=1)
        return;
      }

      // Collect all words from ws[].cw[]
      const words = st.rt?.ws?.flatMap((ws) => ws?.cw ?? []) ?? [];
      const text = words
        .filter((cw) => cw.wp === "n" || cw.wp === "p")
        .map((cw) => cw.w)
        .join("");
      this.collectedText += text;

      // ls=true signals the last segment
      if (data.ls) {
        this.finalResultReceived = true;
        if (this.resolveFinish) {
          this.resolveFinish(this.collectedText);
        }
      }
    } catch {
      // Ignore malformed result data
    }
  }
}
