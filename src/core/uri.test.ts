import { describe, expect, it } from "vitest";
import { buildObsidianOpenUri } from "./uri";

describe("buildObsidianOpenUri", () => {
  it("encodes vault and file path", () => {
    expect(buildObsidianOpenUri({
      vaultName: "我的 Vault",
      filePath: "中文/特殊字符 #问号?.md"
    })).toBe("obsidian://open?vault=%E6%88%91%E7%9A%84%20Vault&file=%E4%B8%AD%E6%96%87%2F%E7%89%B9%E6%AE%8A%E5%AD%97%E7%AC%A6%20%23%E9%97%AE%E5%8F%B7%3F.md");
  });

  it("normalizes backslashes", () => {
    expect(buildObsidianOpenUri({
      vaultName: "Demo",
      filePath: "projects\\knowledge assistant.md"
    })).toBe("obsidian://open?vault=Demo&file=projects%2Fknowledge%20assistant.md");
  });

  it("blocks traversal and absolute paths", () => {
    expect(() => buildObsidianOpenUri({ vaultName: "Demo", filePath: "../secret.md" })).toThrow();
    try { buildObsidianOpenUri({ vaultName: "Demo", filePath: "../secret.md" }); } catch (e) {
      expect((e as { code: string }).code).toBe("KA_PATH_TRAVERSAL");
    }
    expect(() => buildObsidianOpenUri({ vaultName: "Demo", filePath: "/tmp/secret.md" })).toThrow();
    try { buildObsidianOpenUri({ vaultName: "Demo", filePath: "/tmp/secret.md" }); } catch (e) {
      expect((e as { code: string }).code).toBe("KA_ABSOLUTE_PATH");
    }
  });
});
