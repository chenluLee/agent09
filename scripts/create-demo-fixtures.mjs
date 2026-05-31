import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const vaultRoot = path.join("examples", "demo-vault");
const transcriptRoot = path.join("examples", "demo-transcripts");

const notes = [
  {
    path: "projects/knowledge-assistant.md",
    title: "Knowledge Assistant Demo 0",
    tags: ["project", "assistant", "demo0"],
    links: ["areas/retrieval-evaluation", "references/obsidian-uri"],
    body: "Demo 0 validates typed transcript retrieval before ASR. It indexes a sample Obsidian vault, ranks related notes, explains match reasons, and opens notes through Obsidian URI links. The target latency is under 200 ms P95 for local retrieval."
  },
  {
    path: "areas/retrieval-evaluation.md",
    title: "Retrieval Evaluation",
    tags: ["search", "quality", "eval"],
    links: ["projects/knowledge-assistant"],
    body: "Evaluation fixtures map demo transcripts to expected top notes, acceptable alternatives, and known false positives. Ranking should boost title matches, tag matches, backlinks, and repeated phrases."
  },
  {
    path: "references/obsidian-uri.md",
    title: "Obsidian URI Encoding",
    tags: ["obsidian", "uri", "desktop"],
    links: ["projects/knowledge-assistant"],
    body: "Obsidian links use obsidian://open with encoded vault and file parameters. Chinese characters, spaces, hash symbols, question marks, and Unicode must be encoded with encodeURIComponent."
  },
  {
    path: "people/lin-chen.md",
    title: "Lin Chen",
    tags: ["person", "design"],
    links: ["projects/knowledge-assistant"],
    body: "Lin Chen reviews assistant panel information architecture, empty states, result card hierarchy, and compact debugging views for retrieval demos."
  },
  {
    path: "meetings/2026-05-31-demo-review.md",
    title: "Demo Review 2026-05-31",
    tags: ["meeting", "demo0"],
    links: ["projects/knowledge-assistant", "areas/retrieval-evaluation"],
    body: "The review confirmed that typed transcript input should be first class. The sample vault must make retrieval quality reproducible without private notes."
  },
  {
    path: "areas/chinese-asr.md",
    title: "Chinese ASR Providers",
    tags: ["asr", "iflytek", "speech"],
    links: ["projects/knowledge-assistant"],
    body: "iFlytek realtime transcription is planned after retrieval validation. Cloud ASR requires explicit consent, keychain secret storage, and immediate disconnect on stop."
  },
  {
    path: "areas/privacy-retention.md",
    title: "Privacy And Retention",
    tags: ["privacy", "storage"],
    links: ["areas/chinese-asr"],
    body: "Transcripts and debug traces are sensitive local data. Secrets must never be written to config files, logs, or session databases."
  },
  {
    path: "areas/coffee-roasting.md",
    title: "Coffee Roasting Curve",
    tags: ["coffee", "roasting", "hobby"],
    links: ["references/sensor-calibration"],
    body: "A light roast profile tracks turning point, rate of rise, first crack, development time, and cooling speed. It is unrelated to assistant retrieval except as a realistic personal note."
  },
  {
    path: "references/sensor-calibration.md",
    title: "Sensor Calibration",
    tags: ["hardware", "calibration"],
    links: ["areas/coffee-roasting"],
    body: "Calibrate temperature sensors by comparing readings against a known reference. Record offset, drift, and sampling interval."
  },
  {
    path: "projects/side-panel-prototype.md",
    title: "Obsidian Side Panel Prototype",
    tags: ["obsidian", "plugin", "prototype"],
    links: ["projects/knowledge-assistant"],
    body: "A future Obsidian side panel may be revisited after Demo 0 proves retrieval value in the external app."
  },
  {
    path: "references/sqlite-fts5.md",
    title: "SQLite FTS5 Notes",
    tags: ["sqlite", "fts5", "search"],
    links: ["areas/retrieval-evaluation"],
    body: "FTS5 supports local keyword search over title, tags, path, and body text. The MVP keeps vector search out of scope while preserving stable chunk IDs."
  },
  {
    path: "areas/hotword-management.md",
    title: "Hotword Management",
    tags: ["hotwords", "asr"],
    links: ["areas/chinese-asr"],
    body: "Hotwords come from note titles, tags, links, and repeated proper nouns. Demo 0 can extract candidates but does not sync them to any provider."
  },
  {
    path: "references/tauri-command-boundary.md",
    title: "Tauri Command Boundary",
    tags: ["tauri", "security"],
    links: ["projects/knowledge-assistant"],
    body: "The renderer should call validated commands instead of reading files or secrets directly. Commands include validateVault, startIndexing, retrieve, search, and openObsidianUri."
  },
  {
    path: "中文/会议纪要 空格.md",
    title: "中文路径与空格测试",
    tags: ["unicode", "obsidian"],
    links: ["references/obsidian-uri"],
    body: "这个笔记用于验证中文路径、空格、井号和问号在 Obsidian URI 中被稳定编码。"
  },
  {
    path: "中文/特殊字符 #问号?.md",
    title: "特殊字符 URI 测试",
    tags: ["unicode", "uri"],
    links: ["references/obsidian-uri"],
    body: "文件名包含特殊字符。打开路径时必须编码井号、问号和中文字符。"
  },
  {
    path: "people/maya-rivera.md",
    title: "Maya Rivera",
    tags: ["person", "research"],
    links: ["areas/retrieval-evaluation"],
    body: "Maya studies how people trust search results when the interface explains why each note matched the current context."
  },
  {
    path: "projects/notebooklm-assets.md",
    title: "NotebookLM Asset Boundary",
    tags: ["notebooklm", "assets"],
    links: ["projects/knowledge-assistant"],
    body: "NotebookLM infographic generation is outside Demo 0. The desktop app may consume generated assets when metadata exists."
  },
  {
    path: "areas/error-catalog.md",
    title: "Error Catalog",
    tags: ["errors", "debug"],
    links: ["references/tauri-command-boundary"],
    body: "Errors include vault missing, markdown parse failure, index rebuild failure, stale retrieval result, URI open failure, and locked database."
  },
  {
    path: "references/content-hash.md",
    title: "Content Hashing",
    tags: ["indexing", "hash"],
    links: ["references/sqlite-fts5"],
    body: "SHA-256 content hashes detect changed Markdown files and support staged index validation before swapping the active SQLite index."
  },
  {
    path: "meetings/product-positioning.md",
    title: "Product Positioning Notes",
    tags: ["strategy", "assistant"],
    links: ["projects/knowledge-assistant"],
    body: "The assistant is a live knowledge copilot for an Obsidian vault. The first demo should prove note recall, not audio magic."
  }
];

const evals = [
  {
    id: "demo0-core-retrieval",
    transcript: "下周我要演示 typed transcript retrieval，先不用语音，重点是 Demo 0 的样例库、FTS 索引、match reasons 和 Obsidian 打开。",
    expectedTop: "projects/knowledge-assistant.md",
    acceptableAlternatives: ["areas/retrieval-evaluation.md", "references/sqlite-fts5.md"],
    falsePositives: ["areas/coffee-roasting.md"]
  },
  {
    id: "uri-hardening",
    transcript: "我们要测试 Obsidian URI，中文路径、空格、井号和问号都要稳定编码。",
    expectedTop: "references/obsidian-uri.md",
    acceptableAlternatives: ["中文/会议纪要 空格.md", "中文/特殊字符 #问号?.md"],
    falsePositives: ["areas/chinese-asr.md"]
  },
  {
    id: "ranking-quality",
    transcript: "eval fixtures 应该记录 expected top notes、acceptable alternatives 和 false positives，用来衡量 ranking quality。",
    expectedTop: "areas/retrieval-evaluation.md",
    acceptableAlternatives: ["references/sqlite-fts5.md"],
    falsePositives: ["areas/privacy-retention.md"]
  },
  {
    id: "coffee-negative-control",
    transcript: "我在调整咖啡豆烘焙曲线，关注 turning point、first crack 和 development time。",
    expectedTop: "areas/coffee-roasting.md",
    acceptableAlternatives: ["references/sensor-calibration.md"],
    falsePositives: ["projects/knowledge-assistant.md"]
  }
];

function frontmatter(note) {
  return [
    "---",
    `title: "${note.title}"`,
    `tags: [${note.tags.map((tag) => `"${tag}"`).join(", ")}]`,
    `updated: "2026-05-31T09:00:00.000Z"`,
    "---",
    ""
  ].join("\n");
}

async function main() {
  await rm(vaultRoot, { recursive: true, force: true });
  await rm(transcriptRoot, { recursive: true, force: true });
  await mkdir(vaultRoot, { recursive: true });
  await mkdir(transcriptRoot, { recursive: true });

  for (const note of notes) {
    const target = path.join(vaultRoot, note.path);
    await mkdir(path.dirname(target), { recursive: true });
    const links = note.links.map((link) => `- [[${link}]]`).join("\n");
    const content = `${frontmatter(note)}# ${note.title}\n\n${note.body}\n\n## Links\n\n${links}\n`;
    await writeFile(target, content, "utf8");
  }

  await writeFile(
    path.join(transcriptRoot, "eval.json"),
    `${JSON.stringify({ schemaVersion: 1, cases: evals }, null, 2)}\n`,
    "utf8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
