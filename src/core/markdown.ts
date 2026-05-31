import matter from "gray-matter";
import { contentHash, documentIdForPath, normalizeVaultPath, stableChunkId } from "./ids";
import type { IndexedChunk, ParsedNote } from "./types";

interface ParseInput {
  sourceId: string;
  relativePath: string;
  content: string;
  modifiedTimeMs: number;
}

export function parseMarkdownNote(input: ParseInput): ParsedNote {
  const relativePath = normalizeVaultPath(input.relativePath);
  const documentId = documentIdForPath("obsidian", input.sourceId, relativePath);
  const parsed = matter(input.content);
  const headingTitle = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = String(parsed.data.title ?? headingTitle ?? relativePath.replace(/\.md$/i, ""));
  const frontmatterTags = normalizeTags(parsed.data.tags);
  const inlineTags = [...parsed.content.matchAll(/(^|\s)#([\p{L}\p{N}_-]+)/gu)].map((match) => match[2]);
  const tags = unique([...frontmatterTags, ...inlineTags]);
  const links = unique([...parsed.content.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim()));
  const plainText = toPlainText(parsed.content);
  const chunks = buildChunks(documentId, title, tags, parsed.data, plainText);

  return {
    sourceType: "obsidian",
    sourceId: input.sourceId,
    documentId,
    contentHash: contentHash(input.content),
    path: relativePath,
    title,
    frontmatter: parsed.data,
    tags,
    links,
    plainText,
    modifiedTimeMs: input.modifiedTimeMs,
    chunks
  };
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((tag) => String(tag).split(",")).map(cleanTag).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map(cleanTag).filter(Boolean);
  }
  return [];
}

function cleanTag(tag: string): string {
  return tag.trim().replace(/^#/, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildChunks(documentId: string, title: string, tags: string[], frontmatter: Record<string, unknown>, plainText: string): IndexedChunk[] {
  const chunks: Omit<IndexedChunk, "chunkId">[] = [
    { documentId, kind: "title", ordinal: 0, text: title },
    { documentId, kind: "tags", ordinal: 1, text: tags.join(" ") },
    { documentId, kind: "frontmatter", ordinal: 2, text: JSON.stringify(frontmatter) }
  ];

  const paragraphs = plainText.split(/\n{2,}|\.\s+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  paragraphs.forEach((paragraph, index) => {
    chunks.push({ documentId, kind: "body", ordinal: index + 3, text: paragraph });
  });

  return chunks.map((chunk) => ({
    ...chunk,
    chunkId: stableChunkId(documentId, chunk.ordinal)
  }));
}
