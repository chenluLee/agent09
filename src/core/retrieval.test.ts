import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { buildIndex } from "./indexer";
import { retrieveRelatedNotes } from "./retrieval";

describe("retrieveRelatedNotes", () => {
  it("preserves request version and returns top related notes under 200 ms", async () => {
    await withTempDir("retrieval", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });

      const result = retrieveRelatedNotes({
        indexPath,
        request: {
          transcript: "typed transcript retrieval Demo 0 match reasons Obsidian",
          windowId: "manual",
          version: 7,
          limit: 5
        }
      });

      expect(result.windowId).toBe("manual");
      expect(result.version).toBe(7);
      expect(result.notes[0].path).toBe("projects/knowledge-assistant.md");
      expect(result.notes.length).toBeLessThanOrEqual(5);
      expect(result.elapsedMs).toBeLessThan(200);
    });
  });
});
