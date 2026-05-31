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
  it("runs the manual transcript retrieval flow", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Vault path"), { target: { value: "examples/demo-vault" } });
    fireEvent.click(screen.getByRole("button", { name: "Index vault" }));
    await screen.findByText(/Indexed 20 notes/);

    fireEvent.change(screen.getByLabelText("Manual transcript"), {
      target: { value: "Demo 0 typed transcript retrieval with match reasons" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Retrieve notes" }));

    await waitFor(() => {
      expect(screen.getByText("Knowledge Assistant Demo 0")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/title match|phrase match/).length).toBeGreaterThan(0);
  });
});
