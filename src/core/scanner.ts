import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseMarkdownNote } from "./markdown";
import type { ParsedNote, VaultValidation } from "./types";

interface ScanInput {
  vaultPath: string;
  sourceId: string;
}

const ignoredDirectories = new Set([".git", ".obsidian", "node_modules", "Assets"]);

export async function validateVault(vaultPath: string): Promise<VaultValidation> {
  const stats = await stat(vaultPath).catch(() => undefined);
  if (!stats?.isDirectory()) {
    return { valid: false, path: vaultPath, markdownCount: 0, skipped: ["path is not a directory"] };
  }

  const files = await listMarkdownFiles(vaultPath);
  return { valid: files.length > 0, path: vaultPath, markdownCount: files.length, skipped: [] };
}

export async function scanVault(input: ScanInput): Promise<ParsedNote[]> {
  const files = await listMarkdownFiles(input.vaultPath);
  const notes: ParsedNote[] = [];

  for (const file of files) {
    const absolutePath = path.join(input.vaultPath, file);
    const [content, fileStats] = await Promise.all([readFile(absolutePath, "utf8"), stat(absolutePath)]);
    notes.push(parseMarkdownNote({
      sourceId: input.sourceId,
      relativePath: file,
      content,
      modifiedTimeMs: fileStats.mtimeMs
    }));
  }

  return notes.sort((a, b) => a.path.localeCompare(b.path));
}

async function listMarkdownFiles(root: string, current = ""): Promise<string[]> {
  const absolute = path.join(root, current);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await listMarkdownFiles(root, path.join(current, entry.name)));
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(path.join(current, entry.name).replace(/\\/g, "/"));
    }
  }

  return files;
}
