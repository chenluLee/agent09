import type { SearchResult } from "../core/types";

export type PopupState = "IDLE" | "RECORDING" | "TRANSCRIBING" | "RESULTS" | "ERROR";

export type PopupEvent =
  | "RECORD_START"
  | "RECORD_STOP"
  | "RECORD_ERROR"
  | "TRANSCRIBE_SUCCESS"
  | "TRANSCRIBE_ERROR"
  | "DISMISS";

export interface PopupContext {
  transcript: string;
  error: string | null;
  notes: SearchResult[];
  autoCloseTimerMs: number;
}

export interface TransitionResult {
  state: PopupState;
  context: PopupContext;
}

type TransitionMap = Record<PopupState, Partial<Record<PopupEvent, PopupState>>>;

const transitions: TransitionMap = {
  IDLE: {
    RECORD_START: "RECORDING"
  },
  RECORDING: {
    RECORD_STOP: "TRANSCRIBING",
    RECORD_ERROR: "ERROR"
  },
  TRANSCRIBING: {
    TRANSCRIBE_SUCCESS: "RESULTS",
    TRANSCRIBE_ERROR: "ERROR"
  },
  RESULTS: {
    DISMISS: "IDLE"
  },
  ERROR: {
    DISMISS: "IDLE"
  }
};

export function popupTransition(
  currentState: PopupState,
  event: PopupEvent,
  context: PopupContext
): TransitionResult {
  const nextState = transitions[currentState]?.[event];
  if (!nextState) {
    return { state: currentState, context };
  }
  return { state: nextState, context };
}
