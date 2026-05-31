/**
 * Checks if a string contains any CJK Unified Ideographs.
 */
export function hasCJK(text: string): boolean {
  return /\p{Unified_Ideograph}/u.test(text);
}

/**
 * Splits CJK ideographs in the text by inserting spaces between them,
 * while leaving non-CJK (e.g. English words, numbers) intact.
 *
 * Example: "下周我要演示 typed transcript" -> "下 周 我 要 演 示 typed transcript"
 */
export function segmentCJK(text: string): string {
  const spaced = text.replace(/(\p{Unified_Ideograph})/gu, " $1 ");
  return spaced.replace(/\s+/g, " ").trim();
}

/**
 * Restores original spacing for CJK texts from FTS snippets (which will contain spaces
 * between characters due to our indexing preprocessing). It ensures spaces between CJK
 * characters and punctuation (including `<mark>` tags) are removed, while retaining
 * spaces between English words.
 */
export function restoreCJKSpaces(text: string): string {
  // Use private use area characters to temporarily replace markup tags so they don't break regex logic
  let restored = text
    .replace(/<mark>/g, "\uE000")
    .replace(/<\/mark>/g, "\uE001");

  // Define matcher for CJK characters and placeholders
  const cjkOrTag = "[\\p{Unified_Ideograph}\\uE000\\uE001]";
  const cjkOrTagRegex = new RegExp(`(${cjkOrTag})\\s+(?=${cjkOrTag})`, "gu");
  restored = restored.replace(cjkOrTagRegex, "$1");

  // Remove spaces between CJK/tags and punctuation
  const punct = "\\p{P}";
  const cjkToPunctRegex = new RegExp(`(${cjkOrTag})\\s+(?=${punct})`, "gu");
  const punctToCjkRegex = new RegExp(`(${punct})\\s+(?=${cjkOrTag})`, "gu");
  restored = restored.replace(cjkToPunctRegex, "$1");
  restored = restored.replace(punctToCjkRegex, "$1");

  // Restore the markup tags
  return restored
    .replace(/\uE000/g, "<mark>")
    .replace(/\uE001/g, "</mark>");
}

/**
 * Extracts scoring terms from a query string for consistent CJK-aware scoring.
 * CJK characters are returned individually; non-CJK text is split by whitespace.
 *
 * "\u4E2D\u6587\u5B57\u7B26"   \u2192 ["\u4E2D", "\u6587", "\u5B57", "\u7B26"]
 * "\u4E2D\u6587 hello" \u2192 ["\u4E2D", "\u6587", "hello"]
 */
export function cjkScoringTerms(query: string): string[] {
  const terms: string[] = [];
  const parts = query.split(/(\p{Unified_Ideograph}+)/gu);
  for (const part of parts) {
    if (!part) continue;
    if (/\p{Unified_Ideograph}/u.test(part)) {
      for (const ch of part) {
        if (/\p{Unified_Ideograph}/u.test(ch)) {
          terms.push(ch);
        }
      }
    } else {
      const words = part.trim().split(/\s+/).filter((w) => w.length > 0);
      terms.push(...words);
    }
  }
  return terms;
}

/**
 * Generates overlapping bigrams from a CJK character sequence.
 * Each bigram is two adjacent characters joined by a space (matching
 * the single-char tokenisation used during indexing).
 *
 * "\u4E2D\u6587\u5B57\u7B26" \u2192 ["\u4E2D \u6587", "\u6587 \u5B57", "\u5B57 \u7B26"]
 * "\u4E2D\u6587"     \u2192 ["\u4E2D \u6587"]
 */
export function cjkBigrams(cjkSegment: string): string[] {
  const chars = [...cjkSegment].filter((c) => /\p{Unified_Ideograph}/u.test(c));
  if (chars.length < 2) return chars.length === 1 ? [chars[0]] : [];
  const bigrams: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    bigrams.push(`${chars[i]} ${chars[i + 1]}`);
  }
  return bigrams;
}
