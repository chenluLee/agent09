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

/** Parsed word from iFlytek ASR result. */
export interface AsrWord {
  w: string;
  wp: string;
  wb: number;
  we: number;
}

/** Parsed data from iFlytek ASR result data field. */
export interface AsrResultData {
  bg: number;
  ed: number;
  type: number;
  seg_id: number;
  w?: AsrWord[];
  bg_str?: string;
  ed_str?: string;
}
