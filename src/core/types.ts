export type SourceType = "obsidian";

export interface ParsedNote {
  sourceType: SourceType;
  sourceId: string;
  documentId: string;
  contentHash: string;
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  links: string[];
  plainText: string;
  modifiedTimeMs: number;
  chunks: IndexedChunk[];
}

export interface IndexedChunk {
  chunkId: string;
  documentId: string;
  kind: "title" | "tags" | "frontmatter" | "body";
  ordinal: number;
  text: string;
}

export interface SearchResult {
  documentId: string;
  path: string;
  title: string;
  tags: string[];
  snippet: string;
  modifiedTimeMs: number;
  score: number;
  reasons: MatchReason[];
  scoreBreakdown: Record<string, number>;
}

export type MatchReason = "title match" | "tag match" | "backlink match" | "phrase match" | "recently edited";

export interface RetrievalRequest {
  transcript: string;
  windowId: string;
  version: number;
  limit?: number;
}

export interface RetrievalResult {
  windowId: string;
  version: number;
  elapsedMs: number;
  notes: SearchResult[];
}

export interface VaultValidation {
  valid: boolean;
  path: string;
  markdownCount: number;
  skipped: string[];
}
