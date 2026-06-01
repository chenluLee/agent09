import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { IflytekAsrProvider } from "./iflytek";
import type { AsrMessage } from "./types";

function createMockWebSocket() {
  let onopen: (() => void) | null = null;
  let onmessage: ((event: { data: string }) => void) | null = null;
  let onerror: ((event: { error: Error }) => void) | null = null;
  let onclose: (() => void) | null = null;
  const sentData: (ArrayBuffer | string)[] = [];

  const ws = {
    readyState: 0,
    set onopen(cb: () => void) { onopen = cb; },
    set onmessage(cb: (event: { data: string }) => void) { onmessage = cb; },
    set onerror(cb: (event: { error: Error }) => void) { onerror = cb; },
    set onclose(cb: () => void) { onclose = cb; },
    send(data: ArrayBuffer | string) {
      sentData.push(data);
    },
    close() {
      this.readyState = 3;
      onclose?.();
    },
    simulateOpen() {
      this.readyState = 1;
      onopen?.();
    },
    simulateMessage(data: string) {
      onmessage?.({ data });
    },
    simulateError(error: Error) {
      onerror?.({ error });
    },
    getSentData() {
      return sentData;
    }
  };
  return ws;
}

/** Helper: build rtasr-llm result data JSON string */
function llmResultData(options: {
  words: Array<{ w: string; wp: string }>;
  type: number;
  ls: boolean;
  segId?: number;
}): string {
  const cw = options.words.map((w) => ({ w: w.w, wp: w.wp }));
  return JSON.stringify({
    cn: {
      st: {
        rt: { ws: cw.length > 0 ? [{ cw }] : [] },
        type: options.type,
      },
    },
    seg_id: options.segId ?? 0,
    ls: options.ls,
  });
}

describe("IflytekAsrProvider (rtasr-llm)", () => {
  let provider: IflytekAsrProvider;
  let mockWs: ReturnType<typeof createMockWebSocket>;

  beforeEach(() => {
    mockWs = createMockWebSocket();
    provider = new IflytekAsrProvider(() => mockWs as unknown as WebSocket);
  });

  afterEach(() => {
    provider.disconnect().catch(() => {});
  });

  it("connects and waits for 'started' action", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    const startedMsg: AsrMessage = { action: "started", code: "0", desc: "success", sid: "test-sid" };
    mockWs.simulateMessage(JSON.stringify(startedMsg));
    await connectPromise;
  });

  it("sends audio chunks via WebSocket as binary data", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    mockWs.simulateMessage(JSON.stringify({ action: "started", code: "0" }));
    await connectPromise;

    const chunk = new ArrayBuffer(1280);
    provider.sendAudio(chunk);

    const sent = mockWs.getSentData();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(ArrayBuffer);
    expect((sent[0] as ArrayBuffer).byteLength).toBe(1280);
  });

  it("collects confirmed results (type=0) and returns final text via ls=true", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    mockWs.simulateMessage(JSON.stringify({ action: "started", code: "0" }));
    await connectPromise;

    const finishPromise = provider.finish();

    // Intermediate result (type=1) — should be ignored
    mockWs.simulateMessage(JSON.stringify({
      action: "result",
      code: "0",
      data: llmResultData({
        words: [{ w: "你", wp: "n" }, { w: "好", wp: "n" }],
        type: 1,
        ls: false,
      }),
    }));

    // Confirmed result (type=0) — should be accumulated
    mockWs.simulateMessage(JSON.stringify({
      action: "result",
      code: "0",
      data: llmResultData({
        words: [{ w: "你好", wp: "n" }, { w: "世界", wp: "n" }],
        type: 0,
        ls: false,
      }),
    }));

    // Final result (type=0, ls=true)
    mockWs.simulateMessage(JSON.stringify({
      action: "result",
      code: "0",
      data: llmResultData({
        words: [{ w: "。", wp: "p" }],
        type: 0,
        ls: true,
      }),
    }));

    const text = await finishPromise;
    expect(text).toContain("你好");
    expect(text).toContain("世界");
    // Punctuation (wp="p") should be filtered out
    expect(text).toContain("。");
  });

  it("sends JSON end marker instead of binary zero bytes", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    mockWs.simulateMessage(JSON.stringify({ action: "started", code: "0" }));
    await connectPromise;

    const finishPromise = provider.finish();

    // Send final result so the promise resolves
    mockWs.simulateMessage(JSON.stringify({
      action: "result",
      code: "0",
      data: llmResultData({ words: [], type: 0, ls: true }),
    }));

    await finishPromise;

    // Check that a JSON text message was sent as end marker
    const textMessages = mockWs.getSentData().filter((d) => typeof d === "string");
    expect(textMessages.length).toBeGreaterThanOrEqual(1);
    const endMsg = JSON.parse(textMessages[textMessages.length - 1] as string);
    expect(endMsg.end).toBe(true);
  });

  it("rejects on connection error", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateError(new Error("connection failed"));

    await expect(connectPromise).rejects.toThrow("connection failed");
  });

  it("rejects on server error message", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    mockWs.simulateMessage(JSON.stringify({ action: "error", code: "35001", desc: "鉴权失败" }));

    await expect(connectPromise).rejects.toThrow("35001");
  });
});
