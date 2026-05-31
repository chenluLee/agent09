import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { buildIndex } from "./indexer";
import { searchIndex } from "./search";

describe("searchIndex", () => {
  it("returns ranked results with reasons and snippets", async () => {
    await withTempDir("search", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });

      const results = searchIndex({ indexPath, query: "Demo 0 typed transcript retrieval", limit: 5 });

      expect(results[0].path).toBe("projects/knowledge-assistant.md");
      expect(results[0].reasons).toContain("title match");
      expect(results[0].reasons).toContain("phrase match");
      expect(results[0].snippet.length).toBeGreaterThan(20);
    });
  });

  it("supports Chinese search with no spaces", async () => {
    await withTempDir("search", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });

      const results = searchIndex({ indexPath, query: "稳定编码", limit: 5 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe("中文/会议纪要 空格.md");
      expect(results[0].reasons).not.toEqual(["recently edited"]);
    });
  });

  it("returns consistent results for CJK with and without spaces", async () => {
    await withTempDir("search", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });

      const resultsNoSpace = searchIndex({ indexPath, query: "稳定编码", limit: 5 });
      const resultsSpaced = searchIndex({ indexPath, query: "稳定 编码", limit: 5 });

      expect(resultsNoSpace.length).toBeGreaterThan(0);
      expect(resultsSpaced.length).toBeGreaterThan(0);

      // Top result must be the same
      expect(resultsNoSpace[0].path).toBe(resultsSpaced[0].path);

      // No-space query must have real match reasons, not just recency
      expect(resultsNoSpace[0].reasons).not.toEqual(["recently edited"]);
      expect(resultsNoSpace[0].reasons.length).toBeGreaterThanOrEqual(resultsSpaced[0].reasons.length);
    });
  });
});
