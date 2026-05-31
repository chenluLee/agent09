import { describe, expect, it } from "vitest";
import { cjkBigrams, cjkScoringTerms, hasCJK, restoreCJKSpaces, segmentCJK } from "./cjk";

describe("CJK Utilities", () => {
  describe("hasCJK", () => {
    it("detects Chinese characters", () => {
      expect(hasCJK("hello")).toBe(false);
      expect(hasCJK("测试")).toBe(true);
      expect(hasCJK("hello 测试")).toBe(true);
    });
  });

  describe("segmentCJK", () => {
    it("inserts spaces between Chinese characters but keeps English intact", () => {
      expect(segmentCJK("中文")).toBe("中 文");
      expect(segmentCJK("中文 hello 字符")).toBe("中 文 hello 字 符");
      expect(segmentCJK("下周我要演示 typed transcript retrieval，先不用语音。")).toBe(
        "下 周 我 要 演 示 typed transcript retrieval， 先 不 用 语 音 。"
      );
    });
  });

  describe("restoreCJKSpaces", () => {
    it("removes spaces between Chinese characters", () => {
      expect(restoreCJKSpaces("中 文")).toBe("中文");
      expect(restoreCJKSpaces("中 文 hello 字 符")).toBe("中文 hello 字符");
    });

    it("retains space between CJK and English words", () => {
      expect(restoreCJKSpaces("中 文 hello 字 符")).toBe("中文 hello 字符");
      expect(restoreCJKSpaces("这是 Obsidian 的 检索")).toBe("这是 Obsidian 的检索");
    });

    it("handles mark tags correctly", () => {
      expect(restoreCJKSpaces("这 是 <mark>中</mark> <mark>文</mark> 测 试")).toBe("这是<mark>中</mark><mark>文</mark>测试");
      expect(restoreCJKSpaces("用 于 验 证 <mark>中</mark> <mark>文</mark> <mark>路</mark> <mark>径</mark> 、")).toBe(
        "用于验证<mark>中</mark><mark>文</mark><mark>路</mark><mark>径</mark>、"
      );
    });
  });

  describe("cjkScoringTerms", () => {
    it("extracts individual CJK characters", () => {
      expect(cjkScoringTerms("中文字符")).toEqual(["中", "文", "字", "符"]);
    });

    it("extracts CJK chars alongside non-CJK words", () => {
      expect(cjkScoringTerms("中文 hello 字符")).toEqual(["中", "文", "hello", "字", "符"]);
    });

    it("produces identical terms regardless of CJK spacing", () => {
      expect(cjkScoringTerms("中文字符")).toEqual(cjkScoringTerms("中文 字符"));
    });
  });

  describe("cjkBigrams", () => {
    it("generates overlapping bigrams for CJK text", () => {
      expect(cjkBigrams("中文字符")).toEqual(["中 文", "文 字", "字 符"]);
    });

    it("returns single pair for 2-char CJK", () => {
      expect(cjkBigrams("中文")).toEqual(["中 文"]);
    });

    it("returns empty for empty input", () => {
      expect(cjkBigrams("")).toEqual([]);
    });
  });
});
