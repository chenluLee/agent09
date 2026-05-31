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
});
