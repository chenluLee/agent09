import { describe, expect, it } from "vitest";
import { parseMarkdownNote } from "./markdown";

describe("parseMarkdownNote", () => {
  it("extracts frontmatter title, tags, links, plain text, and chunks", () => {
    const parsed = parseMarkdownNote({
      sourceId: "demo",
      relativePath: "projects/demo.md",
      content: [
        "---",
        'title: "Demo Note"',
        'tags: ["demo", "search"]',
        "---",
        "# Ignored Heading",
        "",
        "Body with [[references/sqlite-fts5]] and inline #transcript tag.",
        "",
        "Second paragraph."
      ].join("\n"),
      modifiedTimeMs: 1717146000000
    });

    expect(parsed.title).toBe("Demo Note");
    expect(parsed.tags).toEqual(["demo", "search", "transcript"]);
    expect(parsed.links).toEqual(["references/sqlite-fts5"]);
    expect(parsed.plainText).toContain("Body with references/sqlite-fts5 and inline transcript tag.");
    expect(parsed.chunks.map((chunk) => chunk.kind)).toEqual(["title", "tags", "frontmatter", "body", "body"]);
  });

  it("falls back to first heading when frontmatter title is absent", () => {
    const parsed = parseMarkdownNote({
      sourceId: "demo",
      relativePath: "notes/no-title.md",
      content: "# Heading Title\n\nText",
      modifiedTimeMs: 1717146000000
    });

    expect(parsed.title).toBe("Heading Title");
  });
});
