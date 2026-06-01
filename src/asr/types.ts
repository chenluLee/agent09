/** ASR provider interface — implemented by iFlytek and future providers. */
export interface AsrProvider {
  /** Open WebSocket connection to ASR service. */
  connect(authUrl: string): Promise<void>;

  /** Send a chunk of PCM audio data (16bit 16kHz mono). */
  sendAudio(chunk: ArrayBuffer): void;

  /** Signal end of audio, wait for final transcription result. */
  finish(): Promise<string>;

  /** Disconnect and clean up resources. */
  disconnect(): Promise<void>;
}

/** State of the ASR provider lifecycle. */
export type AsrState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "transcribing"
  | "finished"
  | "error";

/** A single ASR result from the WebSocket stream. */
export interface AsrMessage {
  action: "started" | "result" | "error";
  code: string;
  data?: string;
  desc?: string;
  sid?: string;
}

/** Parsed word from rtasr-llm result (cw level). */
export interface AsrLlmCw {
  w: string;
  wp: string;
  wb?: number;
  we?: number;
  rl?: number;
  lg?: string;
}

/** Parsed word group from rtasr-llm result (ws level). */
export interface AsrLlmWs {
  cw: AsrLlmCw[];
}

/** Parsed real-time result from rtasr-llm (rt level). */
export interface AsrLlmRt {
  ws: AsrLlmWs[];
}

/** Parsed sentence from rtasr-llm result (st level). */
export interface AsrLlmSt {
  rt: AsrLlmRt;
  type: number;
  bg?: number;
  ed?: number;
}

/** Parsed result data from rtasr-llm (top-level data field). */
export interface AsrLlmResultData {
  cn: {
    st: AsrLlmSt;
  };
  seg_id: number;
  ls: boolean;
}
