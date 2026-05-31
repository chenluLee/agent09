import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { scanVault } from "./scanner";
import type { ParsedNote } from "./types";

interface BuildIndexInput {
  vaultPath: string;
  sourceId: string;
  indexPath: string;
}

export interface IndexStats {
  documentCount: number;
  chunkCount: number;
  indexPath: string;
}

export async function buildIndex(input: BuildIndexInput): Promise<IndexStats> {
  const notes = await scanVault({ vaultPath: input.vaultPath, sourceId: input.sourceId });
  const db = new Database(input.indexPath);
  try {
    db.exec(await schemaSql());
    const insertAll = db.transaction(() => {
      db.prepare("delete from note_fts").run();
      db.prepare("delete from chunks").run();
      db.prepare("delete from documents").run();
      db.prepare("delete from sources").run();
      db.prepare("delete from schema_version").run();
      db.prepare("insert into schema_version(version, applied_at) values(1, datetime('now'))").run();
      db.prepare("insert into sources(source_id, source_type, root_path) values(?, 'obsidian', ?)").run(input.sourceId, input.vaultPath);

      for (const note of notes) {
        insertNote(db, note);
      }
    });
    insertAll();

    return {
      documentCount: notes.length,
      chunkCount: notes.reduce((sum, note) => sum + note.chunks.length, 0),
      indexPath: input.indexPath
    };
  } finally {
    db.close();
  }
}

function insertNote(db: Database.Database, note: ParsedNote) {
  db.prepare(`
    insert into documents(document_id, source_id, source_type, path, title, content_hash, frontmatter_json, tags_json, links_json, modified_time_ms)
    values(@documentId, @sourceId, @sourceType, @path, @title, @contentHash, @frontmatterJson, @tagsJson, @linksJson, @modifiedTimeMs)
  `).run({
    ...note,
    frontmatterJson: JSON.stringify(note.frontmatter),
    tagsJson: JSON.stringify(note.tags),
    linksJson: JSON.stringify(note.links)
  });

  const insertChunk = db.prepare("insert into chunks(chunk_id, document_id, kind, ordinal, text) values(?, ?, ?, ?, ?)");
  for (const chunk of note.chunks) {
    insertChunk.run(chunk.chunkId, chunk.documentId, chunk.kind, chunk.ordinal, chunk.text);
  }

  db.prepare("insert into note_fts(document_id, title, tags, path, body) values(?, ?, ?, ?, ?)").run(
    note.documentId,
    note.title,
    note.tags.join(" "),
    note.path,
    note.plainText
  );
}

async function schemaSql(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return readFile(path.join(here, "schema.sql"), "utf8");
}
