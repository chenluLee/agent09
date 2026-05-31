import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { buildIndex } from "./indexer";

describe("buildIndex", () => {
  it("creates schema version, documents, chunks, links, and fts rows", async () => {
    await withTempDir("indexer", async (dir) => {
      const vaultPath = path.join(dir, "vault");
      const indexPath = path.join(dir, "index.sqlite");
      await mkdir(vaultPath);
      await writeFile(path.join(vaultPath, "demo.md"), "# Demo Search\n\nBody about typed transcript retrieval and [[linked-note]].", "utf8");

      const stats = await buildIndex({ vaultPath, sourceId: "demo", indexPath });
      expect(stats.documentCount).toBe(1);
      expect(stats.chunkCount).toBeGreaterThan(1);

      const db = new Database(indexPath, { readonly: true });
      expect(db.prepare("select version from schema_version").pluck().get()).toBe(1);
      expect(db.prepare("select count(*) from documents").pluck().get()).toBe(1);
      expect(db.prepare("select count(*) from chunks").pluck().get()).toBeGreaterThan(1);
      expect(db.prepare("select count(*) from note_fts where note_fts match 'transcript'").pluck().get()).toBe(1);
      db.close();
    });
  });
});
