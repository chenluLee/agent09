import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { createLocalCommands } from "./localCommands";

describe("local command adapter", () => {
  it("validates, indexes, retrieves, and builds open URI", async () => {
    await withTempDir("commands", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      const commands = createLocalCommands({ indexPath, sourceId: "demo", vaultName: "Demo Vault" });

      const validation = await commands.validateVault("examples/demo-vault");
      expect(validation.valid).toBe(true);
      expect(validation.markdownCount).toBe(20);

      const stats = await commands.startIndexing("examples/demo-vault");
      expect(stats.documentCount).toBe(20);

      const result = await commands.retrieve({
        transcript: "Demo 0 typed transcript retrieval Obsidian",
        windowId: "manual",
        version: 1,
        limit: 5
      });
      expect(result.notes[0].path).toBe("projects/knowledge-assistant.md");

      expect(await commands.openObsidianUri("projects/knowledge-assistant.md")).toBe(
        "obsidian://open?vault=Demo%20Vault&file=projects%2Fknowledge-assistant.md"
      );
    });
  });

  it("getHotwords returns valid hotwords after indexing", async () => {
    await withTempDir("hotwords-int", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      const commands = createLocalCommands({ indexPath, sourceId: "demo", vaultName: "Demo Vault" });
      await commands.startIndexing("examples/demo-vault");
      const hotwords = await commands.getHotwords();
      expect(Array.isArray(hotwords)).toBe(true);
      for (const word of hotwords) {
        expect(word.length).toBeLessThanOrEqual(7);
        expect([...word].every((ch) => /\p{Unified_Ideograph}/u.test(ch))).toBe(true);
      }
      expect(new Set(hotwords).size).toBe(hotwords.length);
    });
  });

  it("getHotwords returns empty array when no index exists", async () => {
    await withTempDir("hotwords-empty", async (dir) => {
      const indexPath = path.join(dir, "nonexistent.sqlite");
      const commands = createLocalCommands({ indexPath, sourceId: "demo", vaultName: "Demo Vault" });
      const hotwords = await commands.getHotwords();
      expect(hotwords).toEqual([]);
    });
  });
});
