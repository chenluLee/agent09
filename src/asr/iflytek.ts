import type { AsrMessage, AsrResultData } from "./types";

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
        const endMarker = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        this.ws.send(endMarker.buffer);
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

  private handleResult(dataStr: string): void {
    try {
      const data: AsrResultData = JSON.parse(dataStr);
      if (data.type === 0) {
        const words = data.w ?? [];
        const text = words
          .filter((w) => w.wp === "n")
          .map((w) => w.w)
          .join("");
        this.collectedText += text;

        if (words.length === 0) {
          this.finalResultReceived = true;
          if (this.resolveFinish) {
            this.resolveFinish(this.collectedText);
          }
        }
      }
    } catch {
      // Ignore malformed result data
    }
  }
}
