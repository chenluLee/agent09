import { describe, expect, it } from "vitest";
import {
  type PopupEvent,
  type PopupState,
  type PopupContext,
  popupTransition
} from "./popup-state";

function createEmptyContext(): PopupContext {
  return {
    transcript: "",
    error: null,
    notes: [],
    autoCloseTimerMs: 3000
  };
}

describe("popupTransition", () => {
  it("transitions IDLE → RECORDING on RECORD_START", () => {
    const result = popupTransition("IDLE", "RECORD_START", createEmptyContext());
    expect(result.state).toBe("RECORDING");
  });

  it("transitions RECORDING → TRANSCRIBING on RECORD_STOP", () => {
    const result = popupTransition("RECORDING", "RECORD_STOP", createEmptyContext());
    expect(result.state).toBe("TRANSCRIBING");
  });

  it("transitions TRANSCRIBING → RESULTS on TRANSCRIBE_SUCCESS with notes", () => {
    const ctx = createEmptyContext();
    ctx.transcript = "你好世界";
    const result = popupTransition("TRANSCRIBING", "TRANSCRIBE_SUCCESS", {
      ...ctx,
      notes: [
        { documentId: "1", path: "test.md", title: "Test", tags: [], snippet: "test", modifiedTimeMs: 0, score: 1, reasons: ["content match"], scoreBreakdown: {} }
      ]
    });
    expect(result.state).toBe("RESULTS");
  });

  it("transcribes and sets transcript in context", () => {
    const result = popupTransition("TRANSCRIBING", "TRANSCRIBE_SUCCESS", {
      ...createEmptyContext(),
      transcript: "语音识别结果",
      notes: []
    });
    expect(result.state).toBe("RESULTS");
    expect(result.context.transcript).toBe("语音识别结果");
  });

  it("transitions TRANSCRIBING → ERROR on TRANSCRIBE_ERROR", () => {
    const result = popupTransition("TRANSCRIBING", "TRANSCRIBE_ERROR", {
      ...createEmptyContext(),
      error: "ASR 连接失败"
    });
    expect(result.state).toBe("ERROR");
    expect(result.context.error).toBe("ASR 连接失败");
  });

  it("transitions RECORDING → ERROR on RECORD_ERROR", () => {
    const result = popupTransition("RECORDING", "RECORD_ERROR", {
      ...createEmptyContext(),
      error: "麦克风权限被拒绝"
    });
    expect(result.state).toBe("ERROR");
    expect(result.context.error).toBe("麦克风权限被拒绝");
  });

  it("transitions RESULTS → IDLE on DISMISS", () => {
    const result = popupTransition("RESULTS", "DISMISS", createEmptyContext());
    expect(result.state).toBe("IDLE");
  });

  it("transitions ERROR → IDLE on DISMISS", () => {
    const result = popupTransition("ERROR", "DISMISS", createEmptyContext());
    expect(result.state).toBe("IDLE");
  });

  it("returns same state for invalid transitions", () => {
    const result = popupTransition("IDLE", "RECORD_STOP", createEmptyContext());
    expect(result.state).toBe("IDLE");
  });
});
