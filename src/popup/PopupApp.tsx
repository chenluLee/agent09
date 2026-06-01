import { useCallback, useEffect, useRef, useState } from "react";
import { IflytekAsrProvider } from "../asr/iflytek";
import { createFetchCommands } from "../api/commands";
import type { AppConfig } from "../core/config";
import { type PopupContext, type PopupState } from "./popup-state";
import { RecordingIndicator } from "./RecordingIndicator";
import { ResultCards } from "./ResultCards";

const commands = createFetchCommands();

export function PopupApp() {
  const [state, setState] = useState<PopupState>("IDLE");
  const [context, setContext] = useState<PopupContext>({
    transcript: "",
    error: null,
    notes: [],
    autoCloseTimerMs: 3000
  });

  const asrProviderRef = useRef<IflytekAsrProvider>(new IflytekAsrProvider());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const transition = useCallback(
    (nextState: PopupState, newContext?: Partial<PopupContext>) => {
      setState(nextState);
      if (newContext) {
        setContext((prev) => ({ ...prev, ...newContext }));
      }
    },
    []
  );

  useEffect(() => {
    async function setupListeners() {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        await listen("shortcut-pressed", () => {
          transition("RECORDING");
          startRecording();
        });
        await listen("shortcut-released", () => {
          stopAndTranscribe();
        });
      } catch {
        // Not in Tauri environment (dev mode) — ignore
      }
    }
    setupListeners();
  }, []);

  async function startRecording() {
    try {
      const config = (await commands.getConfig()) as unknown as AppConfig;
      const appId = config.iflytek?.appId;
      const apiKey = config.iflytek?.apiKey;
      const apiSecret = config.iflytek?.apiSecret;

      if (!appId || !apiKey || !apiSecret) {
        transition("ERROR", { error: "请先在设置中配置 iFlytek 凭证。" });
        return;
      }

      const url = await commands.getAsrConnectUrl(appId, apiKey, apiSecret);
      await asrProviderRef.current.connect(url);

      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }
      });
      const recorder = new MediaRecorder(audioStreamRef.current);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          event.data.arrayBuffer().then((buffer) => asrProviderRef.current.sendAudio(buffer));
        }
      };

      recorder.start(40);
    } catch (err) {
      transition("ERROR", { error: `录音启动失败：${err instanceof Error ? err.message : String(err)}` });
    }
  }

  async function stopAndTranscribe() {
    try {
      mediaRecorderRef.current?.stop();
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());

      transition("TRANSCRIBING");
      const transcript = await asrProviderRef.current.finish();
      await asrProviderRef.current.disconnect();

      if (!transcript.trim()) {
        transition("ERROR", { error: "未检测到语音内容，请重试。" });
        return;
      }

      const result = await commands.retrieve({
        transcript,
        windowId: "push-to-talk",
        version: Date.now(),
        limit: 5
      });

      transition("RESULTS", { transcript, notes: result.notes });
    } catch (err) {
      transition("ERROR", { error: `处理失败：${err instanceof Error ? err.message : String(err)}` });
    }
  }

  async function openNote(path: string) {
    await commands.openObsidianUri(path);
  }

  useEffect(() => {
    if (state === "RESULTS" || state === "ERROR") {
      const timer = setTimeout(() => {
        transition("IDLE");
        tryHideWindow();
      }, context.autoCloseTimerMs);
      return () => clearTimeout(timer);
    }
  }, [state]);

  async function tryHideWindow() {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().hide();
    } catch {
      // Not in Tauri environment
    }
  }

  function handleDismiss() {
    transition("IDLE");
    tryHideWindow();
  }

  if (state === "IDLE") {
    return <div className="popup-idle">按住 Ctrl+Shift+Space 开始语音检索</div>;
  }

  if (state === "RECORDING") {
    return <RecordingIndicator />;
  }

  if (state === "TRANSCRIBING") {
    return <div className="popup-transcribing">正在识别...</div>;
  }

  if (state === "ERROR") {
    return (
      <div className="popup-error">
        <p>{context.error}</p>
        <button type="button" onClick={handleDismiss}>关闭</button>
      </div>
    );
  }

  return (
    <div className="popup-results">
      <div className="popup-transcript">「{context.transcript}」</div>
      <ResultCards notes={context.notes} onOpenNote={openNote} />
      <button className="popup-dismiss-btn" type="button" onClick={handleDismiss}>关闭</button>
    </div>
  );
}
