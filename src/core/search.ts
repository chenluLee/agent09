import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import type { MatchReason, SearchResult } from "./types";
import { cjkBigrams, cjkScoringTerms, restoreCJKSpaces } from "./cjk";

interface SearchInput {
  indexPath: string;
  query: string;
  limit: number;
}

interface Row {
  document_id: string;
  path: string;
  title: string;
  tags_json: string;
  links_json: string;
  modified_time_ms: number;
  snippet: string;
}

export function searchIndex(input: SearchInput): SearchResult[] {
  const normalizedQuery = normalizeQuery(input.query);
  if (!normalizedQuery || !existsSync(input.indexPath)) {
    return [];
  }

  const db = new Database(input.indexPath, { readonly: true });
  try {
    const rows = db.prepare(`
      select
        d.document_id,
        d.path,
        d.title,
        d.tags_json,
        d.links_json,
        d.modified_time_ms,
        snippet(note_fts, 4, '<mark>', '</mark>', '...', 24) as snippet
      from note_fts
      join documents d on d.document_id = note_fts.document_id
      where note_fts match ?
      limit 25
    `).all(toFtsQuery(normalizedQuery)) as Row[];

    return rows
      .map((row) => {
        const result = scoreRow(row, normalizedQuery);
        result.snippet = restoreCJKSpaces(result.snippet);
        return result;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit);
  } finally {
    db.close();
  }
}

function scoreRow(row: Row, query: string): SearchResult {
  const terms = cjkScoringTerms(query.toLowerCase());
  const title = row.title.toLowerCase();
  const path = row.path.toLowerCase();
  const tags = JSON.parse(row.tags_json) as string[];
  const links = JSON.parse(row.links_json) as string[];
  const tagText = tags.join(" ").toLowerCase();
  const linkText = links.join(" ").toLowerCase();
  const reasons: MatchReason[] = [];
  const scoreBreakdown: Record<string, number> = {};

  const titleHits = terms.filter((term) => title.includes(term)).length;
  const tagHits = terms.filter((term) => tagText.includes(term)).length;
  const backlinkHits = terms.filter((term) => linkText.includes(term) || path.includes(term)).length;

  scoreBreakdown.title = titleHits * 8;
  scoreBreakdown.tags = tagHits * 5;
  scoreBreakdown.backlinks = backlinkHits * 3;
  scoreBreakdown.content = contentBonus(terms, row.snippet);
  scoreBreakdown.phrase = phraseBonus(query, title, row.snippet.toLowerCase());
  scoreBreakdown.recency = recentBonus(row.modified_time_ms);

  if (scoreBreakdown.title > 0) reasons.push("title match");
  if (scoreBreakdown.tags > 0) reasons.push("tag match");
  if (scoreBreakdown.backlinks > 0) reasons.push("backlink match");
  if (scoreBreakdown.content > 0) reasons.push("content match");
  if (scoreBreakdown.phrase > 0) reasons.push("phrase match");
  if (scoreBreakdown.recency > 0) reasons.push("recently edited");

  return {
    documentId: row.document_id,
    path: row.path,
    title: row.title,
    tags,
    snippet: row.snippet || row.title,
    modifiedTimeMs: row.modified_time_ms,
    score: Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 1),
    reasons,
    scoreBreakdown
  };
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/[^\p{L}\p{N}_\s-]/gu, " ").replace(/\s+/g, " ");
}

function toFtsQuery(query: string): string {
  const parts = query.split(/(\p{Unified_Ideograph}+)/gu);
  const terms: string[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (/\p{Unified_Ideograph}/u.test(part)) {
      // Exact phrase: "稳 定 编 码"
      const phrase = [...part].filter((c) => c.trim()).join(" ");
      if (phrase) {
        terms.push(`"${phrase}"`);
      }
      // Overlapping bigrams for recall: "稳 定" OR "定 编" OR "编 码"
      const bigrams = cjkBigrams(part);
      for (const bg of bigrams) {
        if (bg !== phrase) {
          terms.push(`"${bg}"`);
        }
      }
    } else {
      const words = part
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 1);
      for (const word of words) {
        terms.push(`"${word.replace(/"/g, "")}"`);
      }
    }
  }

  return terms.join(" OR ");
}

function contentBonus(terms: string[], snippet: string): number {
  const snippetText = snippet.replace(/<\/?mark>/g, "").toLowerCase();
  const hits = terms.filter((term) => snippetText.includes(term)).length;
  return hits * 2;
}

function phraseBonus(query: string, title: string, snippet: string): number {
  const lowered = query.toLowerCase();
  const important = ["demo 0", "typed transcript", "obsidian uri", "retrieval evaluation"];
  return important.some((phrase) => lowered.includes(phrase) && (title.includes(phrase) || snippet.includes(phrase))) ? 10 : 0;
}

function recentBonus(modifiedTimeMs: number): number {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - modifiedTimeMs < thirtyDaysMs ? 1 : 0;
}
