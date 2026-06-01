// src/core/hotwords.test.ts
import Database from "better-sqlite3";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { extractHotwords } from "./hotwords";

function seedDb(indexPath: string, tagSets: string[][]) {
  const db = new Database(indexPath);
  try {
    db.exec(`
      create table if not exists sources (
        source_id text primary key,
        source_type text not null,
        root_path text not null
      );
      create table if not exists documents (
        document_id text primary key,
        source_id text not null references sources(source_id),
        source_type text not null,
        path text not null,
        title text not null,
        content_hash text not null,
        frontmatter_json text not null,
        tags_json text not null,
        links_json text not null,
        modified_time_ms integer not null
      );
      insert into sources values('test', 'obsidian', '/test');
    `);
    const insert = db.prepare(
      `insert into documents(document_id, source_id, source_type, path, title,
         content_hash, frontmatter_json, tags_json, links_json, modified_time_ms)
       values(?, 'test', 'obsidian', ?, ?, '', '{}', ?, '[]', 0)`
    );
    tagSets.forEach((tags, i) => {
      insert.run(`doc-${i}`, `note-${i}.md`, `Note ${i}`, JSON.stringify(tags));
    });
  } finally {
    db.close();
  }
}

describe("extractHotwords", () => {
  it("returns empty array when index does not exist", async () => {
    await withTempDir("hotwords", async (dir) => {
      const result = extractHotwords({ indexPath: path.join(dir, "nonexistent.sqlite") });
      expect(result).toEqual([]);
    });
  });

  it("extracts tags from documents in the index", async () => {
    await withTempDir("hotwords", async (dir) => {
      const indexPath = path.join(dir, "test.sqlite");
      seedDb(indexPath, [["人工智能", "机器学习"]]);
      const result = extractHotwords({ indexPath });
      expect(result).toContain("人工智能");
      expect(result).toContain("机器学习");
    });
  });

  it("deduplicates tags across documents", async () => {
    await withTempDir("hotwords", async (dir) => {
      const indexPath = path.join(dir, "test.sqlite");
      seedDb(indexPath, [["人工智能"], ["人工智能", "深度学习"]]);
      const result = extractHotwords({ indexPath });
      const aiCount = result.filter((t) => t === "人工智能").length;
      expect(aiCount).toBe(1);
    });
  });

  it("filters to pure CJK characters only", async () => {
    await withTempDir("hotwords", async (dir) => {
      const indexPath = path.join(dir, "test.sqlite");
      seedDb(indexPath, [["人工智能", "AI", "机器学习123", "深度学习/神经网络"]]);
      const result = extractHotwords({ indexPath });
      expect(result).toContain("人工智能");
      expect(result).not.toContain("AI");
      expect(result).not.toContain("机器学习123");
      expect(result).not.toContain("深度学习/神经网络");
    });
  });

  it("filters to tags with 7 or fewer characters", async () => {
    await withTempDir("hotwords", async (dir) => {
      const indexPath = path.join(dir, "test.sqlite");
      seedDb(indexPath, [["短词", "刚好七个字没问题", "这是超过七个字的标签应该被过滤"]]);
      const result = extractHotwords({ indexPath });
      expect(result).toContain("短词");
      expect(result).toContain("刚好七个字没问题");
      expect(result).not.toContain("这是超过七个字的标签应该被过滤");
    });
  });

  it("sorts by frequency descending then alphabetically", async () => {
    await withTempDir("hotwords", async (dir) => {
      const indexPath = path.join(dir, "test.sqlite");
      seedDb(indexPath, [
        ["算法", "数据结构", "编程"],
        ["算法", "数据结构"],
        ["算法"]
      ]);
      const result = extractHotwords({ indexPath });
      expect(result[0]).toBe("算法");      // 3 docs
      expect(result[1]).toBe("数据结构");   // 2 docs
      expect(result[2]).toBe("编程");       // 1 doc
    });
  });

  it("sorts alphabetically on frequency ties", async () => {
    await withTempDir("hotwords", async (dir) => {
      const indexPath = path.join(dir, "test.sqlite");
      // Both tags appear once, "编程" should sort before "算法"
      seedDb(indexPath, [
        ["算法"],
        ["编程"]
      ]);
      const result = extractHotwords({ indexPath });
      expect(result).toEqual(["编程", "算法"]);
    });
  });
});
