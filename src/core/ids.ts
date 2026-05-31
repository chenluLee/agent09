import { createHash } from "node:crypto";
import path from "node:path";
import { kaError } from "./errors";

export function normalizeVaultPath(input: string): string {
  const withForwardSlashes = input.replace(/\\/g, "/").replace(/^\.\//, "");
  if (path.posix.isAbsolute(withForwardSlashes) || path.win32.isAbsolute(input)) {
    throw kaError("KA_ABSOLUTE_PATH", "Vault-relative path must not be absolute");
  }
  const normalized = path.posix.normalize(withForwardSlashes);
  if (normalized === ".." || normalized.startsWith("../")) {
    throw kaError("KA_PATH_TRAVERSAL", "Vault-relative path must not traverse outside the vault");
  }
  return normalized;
}

export function contentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function documentIdForPath(sourceType: string, sourceId: string, relativePath: string): string {
  const normalized = normalizeVaultPath(relativePath).toLowerCase();
  return `doc_${createHash("sha256").update(`${sourceType}:${sourceId}:${normalized}`).digest("hex").slice(0, 32)}`;
}

export function stableChunkId(documentId: string, ordinal: number): string {
  const digest = createHash("sha256").update(`${documentId}:${ordinal}`).digest("hex").slice(0, 32);
  return `chk_${digest}_${String(ordinal).padStart(4, "0")}`;
}
