import Database from "better-sqlite3";
import { existsSync } from "node:fs";

export interface HotwordsInput {
  indexPath: string;
}

export function extractHotwords(input: HotwordsInput): string[] {
  if (!existsSync(input.indexPath)) {
    return [];
  }

  let db: Database.Database;
  try {
    db = new Database(input.indexPath, { readonly: true });
  } catch {
    return [];
  }

  try {
    const rows = db.prepare("select tags_json from documents").all() as { tags_json: string }[];
    const tagCounts = new Map<string, number>();

    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags_json);
        if (Array.isArray(tags)) {
          for (const tag of tags) {
            if (typeof tag === "string" && tag) {
              tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
          }
        }
      } catch {
        // skip malformed tags_json rows
      }
    }

    return [...tagCounts.entries()]
      .filter(([tag]) => isPureCJK(tag) && [...tag].length <= 7)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
      .map(([tag]) => tag);
  } catch {
    return [];
  } finally {
    db.close();
  }
}

function isPureCJK(text: string): boolean {
  return text.length > 0 && [...text].every((ch) => /\p{Unified_Ideograph}/u.test(ch));
}
