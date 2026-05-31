import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { IflytekAsrProvider } from "./iflytek";
import type { AsrMessage } from "./types";

function createMockWebSocket() {
  let onopen: (() => void) | null = null;
  let onmessage: ((event: { data: string }) => void) | null = null;
  let onerror: ((event: { error: Error }) => void) | null = null;
  let onclose: (() => void) | null = null;
  const sentData: ArrayBuffer[] = [];

  const ws = {
    readyState: 0,
    set onopen(cb: () => void) { onopen = cb; },
    set onmessage(cb: (event: { data: string }) => void) { onmessage = cb; },
    set onerror(cb: (event: { error: Error }) => void) { onerror = cb; },
    set onclose(cb: () => void) { onclose = cb; },
    send(data: ArrayBuffer | string) {
      if (data instanceof ArrayBuffer) {
        sentData.push(data);
      }
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

describe("IflytekAsrProvider", () => {
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

  it("sends audio chunks via WebSocket", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    mockWs.simulateMessage(JSON.stringify({ action: "started", code: "0" }));
    await connectPromise;

    const chunk = new ArrayBuffer(1280);
    provider.sendAudio(chunk);

    expect(mockWs.getSentData()).toHaveLength(1);
    expect(mockWs.getSentData()[0].byteLength).toBe(1280);
  });

  it("collects transcription results and returns final text", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    mockWs.simulateMessage(JSON.stringify({ action: "started", code: "0" }));
    await connectPromise;

    const finishPromise = provider.finish();

    mockWs.simulateMessage(JSON.stringify({
      action: "result",
      code: "0",
      data: JSON.stringify({ type: 1, w: [{ w: "你", wp: "n" }, { w: "好", wp: "n" }] })
    }));

    mockWs.simulateMessage(JSON.stringify({
      action: "result",
      code: "0",
      data: JSON.stringify({ type: 0, w: [{ w: "你好", wp: "n" }, { w: "世界", wp: "n" }] })
    }));

    mockWs.simulateMessage(JSON.stringify({
      action: "result",
      code: "0",
      data: JSON.stringify({ type: 0, w: [] })
    }));

    const text = await finishPromise;
    expect(text).toContain("你好");
    expect(text).toContain("世界");
  });

  it("rejects on connection error", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateError(new Error("connection failed"));

    await expect(connectPromise).rejects.toThrow("connection failed");
  });

  it("rejects on server error message", async () => {
    const connectPromise = provider.connect("wss://example.com");
    mockWs.simulateOpen();
    mockWs.simulateMessage(JSON.stringify({ action: "error", code: "10105", desc: "illegal access" }));

    await expect(connectPromise).rejects.toThrow("10105");
  });
});
