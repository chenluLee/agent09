import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { scanVault, validateVault } from "./scanner";

describe("vault scanner", () => {
  it("validates a vault containing markdown files", async () => {
    await withTempDir("vault", async (dir) => {
      await mkdir(path.join(dir, "projects"));
      await writeFile(path.join(dir, "projects", "demo.md"), "# Demo\n\nText", "utf8");

      await expect(validateVault(dir)).resolves.toEqual({
        valid: true,
        path: dir,
        markdownCount: 1,
        skipped: []
      });
    });
  });

  it("scans markdown files and skips hidden directories", async () => {
    await withTempDir("vault", async (dir) => {
      await mkdir(path.join(dir, ".obsidian"));
      await mkdir(path.join(dir, "notes"));
      await writeFile(path.join(dir, ".obsidian", "workspace.md"), "# Hidden", "utf8");
      await writeFile(path.join(dir, "notes", "中文.md"), "# 中文\n\n内容", "utf8");

      const notes = await scanVault({ vaultPath: dir, sourceId: "demo" });
      expect(notes).toHaveLength(1);
      expect(notes[0].path).toBe("notes/中文.md");
      expect(notes[0].title).toBe("中文");
    });
  });
});
