import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./api/commands", () => ({
  demoCommands: {
    validateVault: vi.fn(async () => ({ valid: true, path: "examples/demo-vault", markdownCount: 20, skipped: [] })),
    startIndexing: vi.fn(async () => ({ documentCount: 20, chunkCount: 84, indexPath: "demo.sqlite" })),
    retrieve: vi.fn(async () => ({
      windowId: "manual",
      version: 1,
      elapsedMs: 14,
      notes: [
        {
          documentId: "doc_demo",
          path: "projects/knowledge-assistant.md",
          title: "Knowledge Assistant Demo 0",
          tags: ["project", "assistant", "demo0"],
          snippet: "Demo 0 validates typed transcript retrieval.",
          modifiedTimeMs: 1717146000000,
          score: 19,
          reasons: ["title match", "phrase match"],
          scoreBreakdown: { title: 8, phrase: 10, recency: 1 }
        }
      ]
    })),
    search: vi.fn(async () => []),
    openObsidianUri: vi.fn(async () => "obsidian://open?vault=Demo&file=projects%2Fknowledge-assistant.md")
  }
}));

describe("App", () => {
  it("auto-indexes vault on mount", async () => {
    render(<App />);
    await screen.findByText(/已索引 20 篇笔记/);
  });

  it("runs the manual transcript retrieval flow", async () => {
    render(<App />);

    // Wait for auto-index to complete
    await screen.findByText(/已索引 20 篇笔记/);

    fireEvent.change(screen.getByLabelText("输入文本"), {
      target: { value: "演示文本检索，匹配原因和 Obsidian URI 打开" }
    });
    fireEvent.click(screen.getByRole("button", { name: "检索笔记" }));

    await waitFor(() => {
      expect(screen.getByText("Knowledge Assistant Demo 0")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/title match|phrase match/).length).toBeGreaterThan(0);
  });

  it("shows prompt to index first when not indexed", async () => {
    render(<App />);
    // Before auto-index completes, the "index first" message is shown
    expect(screen.getByText("请先索引知识库后再检索。")).toBeInTheDocument();
    // After auto-index completes, the message changes
    await screen.findByText(/已索引 20 篇笔记/);
  });
});
