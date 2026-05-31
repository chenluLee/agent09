import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultCards } from "./ResultCards";
import type { SearchResult } from "../core/types";

const sampleNotes: SearchResult[] = [
  {
    documentId: "1",
    path: "projects/test.md",
    title: "测试笔记",
    tags: ["test"],
    snippet: "这是一段<mark>匹配</mark>的文本",
    modifiedTimeMs: Date.now(),
    score: 10,
    reasons: ["title match", "content match"],
    scoreBreakdown: { title: 8, content: 2 }
  }
];

describe("ResultCards", () => {
  it("renders note titles", () => {
    render(<ResultCards notes={sampleNotes} onOpenNote={() => {}} />);
    expect(screen.getByText("测试笔记")).toBeInTheDocument();
  });

  it("renders match reason chips", () => {
    render(<ResultCards notes={sampleNotes} onOpenNote={() => {}} />);
    expect(screen.getByText("title match")).toBeInTheDocument();
    expect(screen.getByText("content match")).toBeInTheDocument();
  });

  it("renders snippet with highlighting", () => {
    render(<ResultCards notes={sampleNotes} onOpenNote={() => {}} />);
    const snippet = screen.getByText(/匹配/);
    expect(snippet).toBeInTheDocument();
  });

  it("renders empty state when no notes", () => {
    render(<ResultCards notes={[]} onOpenNote={() => {}} />);
    expect(screen.getByText("暂无相关笔记。")).toBeInTheDocument();
  });
});
