import { describe, expect, it } from "vitest";
import { contentHash, documentIdForPath, normalizeVaultPath, stableChunkId } from "./ids";

describe("ids", () => {
  it("normalizes vault paths across platforms", () => {
    expect(normalizeVaultPath("projects\\Knowledge Assistant.md")).toBe("projects/Knowledge Assistant.md");
    expect(normalizeVaultPath("./中文/会议纪要 空格.md")).toBe("中文/会议纪要 空格.md");
  });

  it("blocks absolute and traversal paths", () => {
    expect(() => normalizeVaultPath("../secret.md")).toThrow();
    try {
      normalizeVaultPath("../secret.md");
    } catch (e) {
      expect((e as { code: string }).code).toBe("KA_PATH_TRAVERSAL");
    }
    expect(() => normalizeVaultPath("/tmp/secret.md")).toThrow();
    try {
      normalizeVaultPath("/tmp/secret.md");
    } catch (e) {
      expect((e as { code: string }).code).toBe("KA_ABSOLUTE_PATH");
    }
  });

  it("derives stable document and chunk ids", () => {
    const docId = documentIdForPath("obsidian", "demo", "projects/knowledge-assistant.md");
    expect(docId).toMatch(/^doc_[a-f0-9]{32}$/);
    expect(stableChunkId(docId, 3)).toMatch(/^chk_[a-f0-9]{32}_0003$/);
  });

  it("hashes content with sha256", () => {
    expect(contentHash("hello")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });
});
