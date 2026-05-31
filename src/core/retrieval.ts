import { performance } from "node:perf_hooks";
import { searchIndex } from "./search";
import type { RetrievalRequest, RetrievalResult } from "./types";

interface RetrievalInput {
  indexPath: string;
  request: RetrievalRequest;
}

export function retrieveRelatedNotes(input: RetrievalInput): RetrievalResult {
  const start = performance.now();
  const query = buildRetrievalQuery(input.request.transcript);
  const notes = searchIndex({
    indexPath: input.indexPath,
    query,
    limit: input.request.limit ?? 5
  });

  return {
    windowId: input.request.windowId,
    version: input.request.version,
    elapsedMs: Math.round((performance.now() - start) * 100) / 100,
    notes
  };
}

export function buildRetrievalQuery(transcript: string): string {
  const terms = transcript
    .replace(/[^\p{L}\p{N}_\s-]/gu, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 1);
  return [...new Set(terms)].slice(-40).join(" ");
}
