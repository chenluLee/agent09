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
});
