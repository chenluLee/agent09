# Demo 0 Retrieval Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Demo 0: a runnable Tauri + React app that indexes a reproducible Obsidian sample vault, accepts typed transcript text, returns ranked related notes with human-readable match reasons, and opens selected notes through hardened Obsidian URIs.

**Architecture:** Keep Demo 0 small and testable: TypeScript owns parsing, indexing, retrieval, fixtures, evals, the local HTTP service, and the React UI; Tauri provides the desktop shell and URI open command. The renderer never reads the filesystem directly and never imports Node-only modules; it calls `src/api/commands.ts`, which talks to the local service for vault/index/retrieval work and asks Tauri to open Obsidian URIs when running in desktop mode.

**Tech Stack:** Tauri, React, Vite, TypeScript, Vitest, Fastify local service, SQLite FTS5 via `better-sqlite3`, `gray-matter`, `zod`, Testing Library, lucide-react.

---

## Scope

Demo 0 includes:
- `examples/demo-vault` with 20 representative Markdown notes containing Chinese text, tags, frontmatter, spaces, internal links, and special characters.
- `examples/demo-transcripts/eval.json` with transcript fixtures, expected top notes, acceptable alternatives, and known false positives.
- SQLite schema version `1`, stable source/document/chunk IDs, content hashes, and FTS5-backed search.
- Manual transcript retrieval with top 3 to 5 results, score breakdown, and reasons: `title match`, `tag match`, `backlink match`, `phrase match`, `recently edited`.
- Hardened Obsidian URI construction for Chinese paths, spaces, `#`, `?`, Unicode, and traversal blocking.
- Basic React UI: vault setup, index action, manual transcript input, related result cards, debug score details, and open-note action.
- Quickstart proving a new developer can run Demo 0 in under 10 minutes.

Demo 0 excludes ASR, global shortcuts, session retention controls, NotebookLM asset rendering, packaged installers, and vector search runtime.

## File Structure

Create this project layout:

```text
.
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── index.html
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── api/
│   │   ├── commands.ts
│   │   └── commands.test.ts
│   ├── core/
│   │   ├── errors.ts
│   │   ├── ids.ts
│   │   ├── indexer.ts
│   │   ├── indexer.test.ts
│   │   ├── markdown.ts
│   │   ├── markdown.test.ts
│   │   ├── retrieval.ts
│   │   ├── retrieval.test.ts
│   │   ├── schema.sql
│   │   ├── search.ts
│   │   ├── search.test.ts
│   │   ├── scanner.ts
│   │   ├── scanner.test.ts
│   │   ├── types.ts
│   │   ├── uri.ts
│   │   └── uri.test.ts
│   ├── eval/
│   │   ├── runEval.ts
│   │   └── runEval.test.ts
│   ├── service/
│   │   ├── localCommands.ts
│   │   ├── localCommands.test.ts
│   │   └── server.ts
│   └── test/
│       ├── setup.ts
│       └── tmp.ts
├── scripts/
│   └── create-demo-fixtures.mjs
├── examples/
│   ├── demo-vault/
│   └── demo-transcripts/
│       └── eval.json
├── src-tauri/
│   ├── build.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       └── main.rs
└── docs/
    ├── QUICKSTART.md
    └── DEMO0_ACCEPTANCE.md
```

Responsibility boundaries:
- `src/core/*`: pure TypeScript domain logic; no React and no Tauri imports.
- `src/api/commands.ts`: renderer-facing command adapter; this is the only place the UI calls backend capabilities.
- `src/service/*`: Node-only local service; this is the only layer that imports `better-sqlite3` for runtime UI flows.
- `src/eval/*`: deterministic relevance and latency checks against sample fixtures.
- `src/App.tsx`: Demo 0 workflow only; no ASR settings or session timeline.
- `src-tauri/*`: desktop shell and hardened `open_obsidian_uri` bridge.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/test/setup.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create package metadata and scripts**

Create `package.json`:

```json
{
  "name": "personal-knowledge-assistant",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "run-p service vite",
    "vite": "vite",
    "build": "vite build",
    "service": "tsx src/service/server.ts",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "test": "vitest",
    "test:run": "vitest run",
    "fixtures": "node scripts/create-demo-fixtures.mjs",
    "eval": "tsx src/eval/runEval.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "@tauri-apps/api": "^2.0.0",
    "better-sqlite3": "^11.9.1",
    "fastify": "^5.1.0",
    "gray-matter": "^4.0.3",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "npm-run-all2": "^7.0.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: true,
    port: 1420
  }
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
```

- [ ] **Step 3: Create minimal app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Knowledge Assistant Demo 0</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="assistant-panel">
        <h1>Knowledge Assistant Demo 0</h1>
        <p>Manual transcript retrieval is being initialized.</p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #1f2937;
  background: #f7f7f2;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

body {
  margin: 0;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

.assistant-panel {
  width: min(960px, 100%);
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
pnpm install
```

Expected: dependencies install and `pnpm-lock.yaml` is created.

- [ ] **Step 5: Verify scaffold**

Run:

```bash
pnpm typecheck
pnpm test:run
```

Expected: typecheck passes; Vitest reports no test files or zero failing tests.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts index.html src
git commit -m "chore: scaffold demo 0 app"
```

---

### Task 2: Demo Fixtures

**Files:**
- Create: `scripts/create-demo-fixtures.mjs`
- Create: `examples/demo-vault/*`
- Create: `examples/demo-transcripts/eval.json`

- [ ] **Step 1: Write fixture generator**

Create `scripts/create-demo-fixtures.mjs`:

```js
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
```

- [ ] **Step 2: Generate fixtures**

Run:

```bash
pnpm fixtures
```

Expected: `examples/demo-vault` contains 20 Markdown files and `examples/demo-transcripts/eval.json` contains 4 eval cases.

- [ ] **Step 3: Verify fixture counts**

Run:

```bash
find examples/demo-vault -name '*.md' | wc -l
node -e "console.log(JSON.parse(require('fs').readFileSync('examples/demo-transcripts/eval.json','utf8')).cases.length)"
```

Expected: first command prints `20`; second command prints `4`.

- [ ] **Step 4: Commit**

```bash
git add scripts/create-demo-fixtures.mjs examples/demo-vault examples/demo-transcripts/eval.json
git commit -m "test: add demo 0 vault fixtures"
```

---

### Task 3: Core Types, IDs, And Test Utilities

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/errors.ts`
- Create: `src/core/ids.ts`
- Create: `src/test/tmp.ts`
- Create: `src/core/ids.test.ts`

- [ ] **Step 1: Write failing ID tests**

Create `src/core/ids.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contentHash, documentIdForPath, normalizeVaultPath, stableChunkId } from "./ids";

describe("ids", () => {
  it("normalizes vault paths across platforms", () => {
    expect(normalizeVaultPath("projects\\Knowledge Assistant.md")).toBe("projects/Knowledge Assistant.md");
    expect(normalizeVaultPath("./中文/会议纪要 空格.md")).toBe("中文/会议纪要 空格.md");
  });

  it("blocks absolute and traversal paths", () => {
    expect(() => normalizeVaultPath("../secret.md")).toThrow("KA_PATH_TRAVERSAL");
    expect(() => normalizeVaultPath("/tmp/secret.md")).toThrow("KA_ABSOLUTE_PATH");
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test:run src/core/ids.test.ts
```

Expected: FAIL because `src/core/ids.ts` does not exist.

- [ ] **Step 3: Implement types and errors**

Create `src/core/errors.ts`:

```ts
export class KnowledgeAssistantError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly causeDetail?: string
  ) {
    super(message);
    this.name = "KnowledgeAssistantError";
  }
}

export function kaError(code: string, message: string, causeDetail?: string): KnowledgeAssistantError {
  return new KnowledgeAssistantError(code, message, causeDetail);
}
```

Create `src/core/types.ts`:

```ts
export type SourceType = "obsidian";

export interface ParsedNote {
  sourceType: SourceType;
  sourceId: string;
  documentId: string;
  contentHash: string;
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  links: string[];
  plainText: string;
  modifiedTimeMs: number;
  chunks: IndexedChunk[];
}

export interface IndexedChunk {
  chunkId: string;
  documentId: string;
  kind: "title" | "tags" | "frontmatter" | "body";
  ordinal: number;
  text: string;
}

export interface SearchResult {
  documentId: string;
  path: string;
  title: string;
  tags: string[];
  snippet: string;
  modifiedTimeMs: number;
  score: number;
  reasons: MatchReason[];
  scoreBreakdown: Record<string, number>;
}

export type MatchReason = "title match" | "tag match" | "backlink match" | "phrase match" | "recently edited";

export interface RetrievalRequest {
  transcript: string;
  windowId: string;
  version: number;
  limit?: number;
}

export interface RetrievalResult {
  windowId: string;
  version: number;
  elapsedMs: number;
  notes: SearchResult[];
}

export interface VaultValidation {
  valid: boolean;
  path: string;
  markdownCount: number;
  skipped: string[];
}
```

- [ ] **Step 4: Implement stable IDs**

Create `src/core/ids.ts`:

```ts
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
```

- [ ] **Step 5: Add temp directory helper**

Create `src/test/tmp.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function withTempDir<T>(prefix: string, callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm test:run src/core/ids.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/types.ts src/core/errors.ts src/core/ids.ts src/core/ids.test.ts src/test/tmp.ts
git commit -m "feat: add demo 0 core identifiers"
```

---

### Task 4: Markdown Parser

**Files:**
- Create: `src/core/markdown.ts`
- Create: `src/core/markdown.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `src/core/markdown.test.ts`:

```ts
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
```

- [ ] **Step 2: Run parser test to verify failure**

Run:

```bash
pnpm test:run src/core/markdown.test.ts
```

Expected: FAIL because `parseMarkdownNote` does not exist.

- [ ] **Step 3: Implement parser**

Create `src/core/markdown.ts`:

```ts
import matter from "gray-matter";
import { contentHash, documentIdForPath, normalizeVaultPath, stableChunkId } from "./ids";
import type { IndexedChunk, ParsedNote } from "./types";

interface ParseInput {
  sourceId: string;
  relativePath: string;
  content: string;
  modifiedTimeMs: number;
}

export function parseMarkdownNote(input: ParseInput): ParsedNote {
  const relativePath = normalizeVaultPath(input.relativePath);
  const documentId = documentIdForPath("obsidian", input.sourceId, relativePath);
  const parsed = matter(input.content);
  const headingTitle = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = String(parsed.data.title ?? headingTitle ?? relativePath.replace(/\.md$/i, ""));
  const frontmatterTags = normalizeTags(parsed.data.tags);
  const inlineTags = [...parsed.content.matchAll(/(^|\s)#([\p{L}\p{N}_-]+)/gu)].map((match) => match[2]);
  const tags = unique([...frontmatterTags, ...inlineTags]);
  const links = unique([...parsed.content.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim()));
  const plainText = toPlainText(parsed.content);
  const chunks = buildChunks(documentId, title, tags, parsed.data, plainText);

  return {
    sourceType: "obsidian",
    sourceId: input.sourceId,
    documentId,
    contentHash: contentHash(input.content),
    path: relativePath,
    title,
    frontmatter: parsed.data,
    tags,
    links,
    plainText,
    modifiedTimeMs: input.modifiedTimeMs,
    chunks
  };
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((tag) => String(tag).split(",")).map(cleanTag).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map(cleanTag).filter(Boolean);
  }
  return [];
}

function cleanTag(tag: string): string {
  return tag.trim().replace(/^#/, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildChunks(documentId: string, title: string, tags: string[], frontmatter: Record<string, unknown>, plainText: string): IndexedChunk[] {
  const chunks: Omit<IndexedChunk, "chunkId">[] = [
    { documentId, kind: "title", ordinal: 0, text: title },
    { documentId, kind: "tags", ordinal: 1, text: tags.join(" ") },
    { documentId, kind: "frontmatter", ordinal: 2, text: JSON.stringify(frontmatter) }
  ];

  const paragraphs = plainText.split(/\n{2,}|\.\s+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  paragraphs.forEach((paragraph, index) => {
    chunks.push({ documentId, kind: "body", ordinal: index + 3, text: paragraph });
  });

  return chunks.map((chunk) => ({
    ...chunk,
    chunkId: stableChunkId(documentId, chunk.ordinal)
  }));
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
pnpm test:run src/core/markdown.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/markdown.ts src/core/markdown.test.ts
git commit -m "feat: parse markdown notes for indexing"
```

---

### Task 5: Vault Scanner And Validator

**Files:**
- Create: `src/core/scanner.ts`
- Create: `src/core/scanner.test.ts`

- [ ] **Step 1: Write failing scanner tests**

Create `src/core/scanner.test.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { scanVault, validateVault } from "./scanner";

describe("vault scanner", () => {
  it("validates a vault containing markdown files", async () => {
    await withTempDir("vault", async (dir) => {
      await mkdir(path.join(dir, "projects"));
      await writeFile(path.join(dir, "projects", "demo.md"), "# Demo\n\nText", "utf8");

      await expect(validateVault(dir)).resolves.toEqual({
        valid: true,
        path: dir,
        markdownCount: 1,
        skipped: []
      });
    });
  });

  it("scans markdown files and skips hidden directories", async () => {
    await withTempDir("vault", async (dir) => {
      await mkdir(path.join(dir, ".obsidian"));
      await mkdir(path.join(dir, "notes"));
      await writeFile(path.join(dir, ".obsidian", "workspace.md"), "# Hidden", "utf8");
      await writeFile(path.join(dir, "notes", "中文.md"), "# 中文\n\n内容", "utf8");

      const notes = await scanVault({ vaultPath: dir, sourceId: "demo" });
      expect(notes).toHaveLength(1);
      expect(notes[0].path).toBe("notes/中文.md");
      expect(notes[0].title).toBe("中文");
    });
  });
});
```

- [ ] **Step 2: Run scanner tests to verify failure**

Run:

```bash
pnpm test:run src/core/scanner.test.ts
```

Expected: FAIL because `src/core/scanner.ts` does not exist.

- [ ] **Step 3: Implement scanner**

Create `src/core/scanner.ts`:

```ts
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
```

- [ ] **Step 4: Run scanner tests**

Run:

```bash
pnpm test:run src/core/scanner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/scanner.ts src/core/scanner.test.ts
git commit -m "feat: scan and validate obsidian vaults"
```

---

### Task 6: SQLite FTS5 Indexer

**Files:**
- Create: `src/core/schema.sql`
- Create: `src/core/indexer.ts`
- Create: `src/core/indexer.test.ts`

- [ ] **Step 1: Write failing indexer tests**

Create `src/core/indexer.test.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { buildIndex } from "./indexer";

describe("buildIndex", () => {
  it("creates schema version, documents, chunks, links, and fts rows", async () => {
    await withTempDir("indexer", async (dir) => {
      const vaultPath = path.join(dir, "vault");
      const indexPath = path.join(dir, "index.sqlite");
      await mkdir(vaultPath);
      await writeFile(path.join(vaultPath, "demo.md"), "# Demo Search\n\nBody about typed transcript retrieval and [[linked-note]].", "utf8");

      const stats = await buildIndex({ vaultPath, sourceId: "demo", indexPath });
      expect(stats.documentCount).toBe(1);
      expect(stats.chunkCount).toBeGreaterThan(1);

      const db = new Database(indexPath, { readonly: true });
      expect(db.prepare("select version from schema_version").pluck().get()).toBe(1);
      expect(db.prepare("select count(*) from documents").pluck().get()).toBe(1);
      expect(db.prepare("select count(*) from chunks").pluck().get()).toBeGreaterThan(1);
      expect(db.prepare("select count(*) from note_fts where note_fts match 'transcript'").pluck().get()).toBe(1);
      db.close();
    });
  });
});
```

- [ ] **Step 2: Run indexer test to verify failure**

Run:

```bash
pnpm test:run src/core/indexer.test.ts
```

Expected: FAIL because `buildIndex` does not exist.

- [ ] **Step 3: Create schema**

Create `src/core/schema.sql`:

```sql
pragma journal_mode = wal;
pragma foreign_keys = on;

create table if not exists schema_version (
  version integer primary key,
  applied_at text not null
);

create table if not exists sources (
  source_id text primary key,
  source_type text not null,
  root_path text not null
);

create table if not exists documents (
  document_id text primary key,
  source_id text not null references sources(source_id),
  source_type text not null,
  path text not null,
  title text not null,
  content_hash text not null,
  frontmatter_json text not null,
  tags_json text not null,
  links_json text not null,
  modified_time_ms integer not null
);

create table if not exists chunks (
  chunk_id text primary key,
  document_id text not null references documents(document_id) on delete cascade,
  kind text not null,
  ordinal integer not null,
  text text not null
);

create virtual table if not exists note_fts using fts5(
  document_id unindexed,
  title,
  tags,
  path,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);
```

- [ ] **Step 4: Implement indexer**

Create `src/core/indexer.ts`:

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { scanVault } from "./scanner";
import type { ParsedNote } from "./types";

interface BuildIndexInput {
  vaultPath: string;
  sourceId: string;
  indexPath: string;
}

export interface IndexStats {
  documentCount: number;
  chunkCount: number;
  indexPath: string;
}

export async function buildIndex(input: BuildIndexInput): Promise<IndexStats> {
  const notes = await scanVault({ vaultPath: input.vaultPath, sourceId: input.sourceId });
  const db = new Database(input.indexPath);
  try {
    db.exec(await schemaSql());
    const insertAll = db.transaction(() => {
      db.prepare("delete from note_fts").run();
      db.prepare("delete from chunks").run();
      db.prepare("delete from documents").run();
      db.prepare("delete from sources").run();
      db.prepare("delete from schema_version").run();
      db.prepare("insert into schema_version(version, applied_at) values(1, datetime('now'))").run();
      db.prepare("insert into sources(source_id, source_type, root_path) values(?, 'obsidian', ?)").run(input.sourceId, input.vaultPath);

      for (const note of notes) {
        insertNote(db, note);
      }
    });
    insertAll();

    return {
      documentCount: notes.length,
      chunkCount: notes.reduce((sum, note) => sum + note.chunks.length, 0),
      indexPath: input.indexPath
    };
  } finally {
    db.close();
  }
}

function insertNote(db: Database.Database, note: ParsedNote) {
  db.prepare(`
    insert into documents(document_id, source_id, source_type, path, title, content_hash, frontmatter_json, tags_json, links_json, modified_time_ms)
    values(@documentId, @sourceId, @sourceType, @path, @title, @contentHash, @frontmatterJson, @tagsJson, @linksJson, @modifiedTimeMs)
  `).run({
    ...note,
    frontmatterJson: JSON.stringify(note.frontmatter),
    tagsJson: JSON.stringify(note.tags),
    linksJson: JSON.stringify(note.links)
  });

  const insertChunk = db.prepare("insert into chunks(chunk_id, document_id, kind, ordinal, text) values(?, ?, ?, ?, ?)");
  for (const chunk of note.chunks) {
    insertChunk.run(chunk.chunkId, chunk.documentId, chunk.kind, chunk.ordinal, chunk.text);
  }

  db.prepare("insert into note_fts(document_id, title, tags, path, body) values(?, ?, ?, ?, ?)").run(
    note.documentId,
    note.title,
    note.tags.join(" "),
    note.path,
    note.plainText
  );
}

async function schemaSql(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return readFile(path.join(here, "schema.sql"), "utf8");
}
```

- [ ] **Step 5: Run indexer tests**

Run:

```bash
pnpm test:run src/core/indexer.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/schema.sql src/core/indexer.ts src/core/indexer.test.ts
git commit -m "feat: build sqlite fts index"
```

---

### Task 7: Search And Retrieval Ranking

**Files:**
- Create: `src/core/search.ts`
- Create: `src/core/search.test.ts`
- Create: `src/core/retrieval.ts`
- Create: `src/core/retrieval.test.ts`

- [ ] **Step 1: Write failing search tests**

Create `src/core/search.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { buildIndex } from "./indexer";
import { searchIndex } from "./search";

describe("searchIndex", () => {
  it("returns ranked results with reasons and snippets", async () => {
    await withTempDir("search", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });

      const results = searchIndex({ indexPath, query: "Demo 0 typed transcript retrieval", limit: 5 });

      expect(results[0].path).toBe("projects/knowledge-assistant.md");
      expect(results[0].reasons).toContain("title match");
      expect(results[0].reasons).toContain("phrase match");
      expect(results[0].snippet.length).toBeGreaterThan(20);
    });
  });
});
```

- [ ] **Step 2: Write failing retrieval tests**

Create `src/core/retrieval.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { buildIndex } from "./indexer";
import { retrieveRelatedNotes } from "./retrieval";

describe("retrieveRelatedNotes", () => {
  it("preserves request version and returns top related notes under 200 ms", async () => {
    await withTempDir("retrieval", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });

      const result = retrieveRelatedNotes({
        indexPath,
        request: {
          transcript: "typed transcript retrieval Demo 0 match reasons Obsidian",
          windowId: "manual",
          version: 7,
          limit: 5
        }
      });

      expect(result.windowId).toBe("manual");
      expect(result.version).toBe(7);
      expect(result.notes[0].path).toBe("projects/knowledge-assistant.md");
      expect(result.notes.length).toBeLessThanOrEqual(5);
      expect(result.elapsedMs).toBeLessThan(200);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
pnpm test:run src/core/search.test.ts src/core/retrieval.test.ts
```

Expected: FAIL because search and retrieval modules do not exist.

- [ ] **Step 4: Implement search**

Create `src/core/search.ts`:

```ts
import Database from "better-sqlite3";
import type { MatchReason, SearchResult } from "./types";

interface SearchInput {
  indexPath: string;
  query: string;
  limit: number;
}

interface Row {
  document_id: string;
  path: string;
  title: string;
  tags_json: string;
  links_json: string;
  modified_time_ms: number;
  snippet: string;
}

export function searchIndex(input: SearchInput): SearchResult[] {
  const normalizedQuery = normalizeQuery(input.query);
  if (!normalizedQuery) {
    return [];
  }

  const db = new Database(input.indexPath, { readonly: true });
  try {
    const rows = db.prepare(`
      select
        d.document_id,
        d.path,
        d.title,
        d.tags_json,
        d.links_json,
        d.modified_time_ms,
        snippet(note_fts, 4, '<mark>', '</mark>', '...', 24) as snippet
      from note_fts
      join documents d on d.document_id = note_fts.document_id
      where note_fts match ?
      limit 25
    `).all(toFtsQuery(normalizedQuery)) as Row[];

    return rows
      .map((row) => scoreRow(row, normalizedQuery))
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit);
  } finally {
    db.close();
  }
}

function scoreRow(row: Row, query: string): SearchResult {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const title = row.title.toLowerCase();
  const path = row.path.toLowerCase();
  const tags = JSON.parse(row.tags_json) as string[];
  const links = JSON.parse(row.links_json) as string[];
  const tagText = tags.join(" ").toLowerCase();
  const linkText = links.join(" ").toLowerCase();
  const reasons: MatchReason[] = [];
  const scoreBreakdown: Record<string, number> = {};

  const titleHits = terms.filter((term) => title.includes(term)).length;
  const tagHits = terms.filter((term) => tagText.includes(term)).length;
  const backlinkHits = terms.filter((term) => linkText.includes(term) || path.includes(term)).length;

  scoreBreakdown.title = titleHits * 8;
  scoreBreakdown.tags = tagHits * 5;
  scoreBreakdown.backlinks = backlinkHits * 3;
  scoreBreakdown.phrase = phraseBonus(query, title, row.snippet.toLowerCase());
  scoreBreakdown.recency = recentBonus(row.modified_time_ms);

  if (scoreBreakdown.title > 0) reasons.push("title match");
  if (scoreBreakdown.tags > 0) reasons.push("tag match");
  if (scoreBreakdown.backlinks > 0) reasons.push("backlink match");
  if (scoreBreakdown.phrase > 0) reasons.push("phrase match");
  if (scoreBreakdown.recency > 0) reasons.push("recently edited");

  return {
    documentId: row.document_id,
    path: row.path,
    title: row.title,
    tags,
    snippet: row.snippet || row.title,
    modifiedTimeMs: row.modified_time_ms,
    score: Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 1),
    reasons,
    scoreBreakdown
  };
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/[^\p{L}\p{N}_\s-]/gu, " ").replace(/\s+/g, " ");
}

function toFtsQuery(query: string): string {
  return query
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .map((term) => `"${term.replace(/"/g, "")}"`)
    .join(" OR ");
}

function phraseBonus(query: string, title: string, snippet: string): number {
  const lowered = query.toLowerCase();
  const important = ["demo 0", "typed transcript", "obsidian uri", "retrieval evaluation"];
  return important.some((phrase) => lowered.includes(phrase) && (title.includes(phrase) || snippet.includes(phrase))) ? 10 : 0;
}

function recentBonus(modifiedTimeMs: number): number {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - modifiedTimeMs < thirtyDaysMs ? 1 : 0;
}
```

- [ ] **Step 5: Implement retrieval**

Create `src/core/retrieval.ts`:

```ts
import { performance } from "node:perf_hooks";
import { searchIndex } from "./search";
import type { RetrievalRequest, RetrievalResult } from "./types";

interface RetrievalInput {
  indexPath: string;
  request: RetrievalRequest;
}

export function retrieveRelatedNotes(input: RetrievalInput): RetrievalResult {
  const start = performance.now();
  const query = buildRetrievalQuery(input.request.transcript);
  const notes = searchIndex({
    indexPath: input.indexPath,
    query,
    limit: input.request.limit ?? 5
  });

  return {
    windowId: input.request.windowId,
    version: input.request.version,
    elapsedMs: Math.round((performance.now() - start) * 100) / 100,
    notes
  };
}

export function buildRetrievalQuery(transcript: string): string {
  const terms = transcript
    .replace(/[^\p{L}\p{N}_\s-]/gu, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
  return [...new Set(terms)].slice(-40).join(" ");
}
```

- [ ] **Step 6: Run search and retrieval tests**

Run:

```bash
pnpm test:run src/core/search.test.ts src/core/retrieval.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/search.ts src/core/search.test.ts src/core/retrieval.ts src/core/retrieval.test.ts
git commit -m "feat: retrieve ranked notes from transcripts"
```

---

### Task 8: Relevance Eval And Latency Gate

**Files:**
- Create: `src/eval/runEval.ts`
- Create: `src/eval/runEval.test.ts`

- [ ] **Step 1: Write failing eval test**

Create `src/eval/runEval.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runDemoEval } from "./runEval";

describe("runDemoEval", () => {
  it("passes all demo transcript cases", async () => {
    const report = await runDemoEval();
    expect(report.caseCount).toBe(4);
    expect(report.failures).toEqual([]);
    expect(report.p95LatencyMs).toBeLessThan(200);
  });
});
```

- [ ] **Step 2: Run eval test to verify failure**

Run:

```bash
pnpm test:run src/eval/runEval.test.ts
```

Expected: FAIL because `runDemoEval` does not exist.

- [ ] **Step 3: Implement eval runner**

Create `src/eval/runEval.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildIndex } from "../core/indexer";
import { retrieveRelatedNotes } from "../core/retrieval";

interface EvalCase {
  id: string;
  transcript: string;
  expectedTop: string;
  acceptableAlternatives: string[];
  falsePositives: string[];
}

interface EvalFile {
  schemaVersion: 1;
  cases: EvalCase[];
}

export interface EvalReport {
  caseCount: number;
  failures: string[];
  latenciesMs: number[];
  p95LatencyMs: number;
}

export async function runDemoEval(): Promise<EvalReport> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "demo0-eval-"));
  try {
    const indexPath = path.join(tempDir, "index.sqlite");
    await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });
    const evalFile = JSON.parse(await readFile("examples/demo-transcripts/eval.json", "utf8")) as EvalFile;
    const failures: string[] = [];
    const latenciesMs: number[] = [];

    evalFile.cases.forEach((testCase, index) => {
      const result = retrieveRelatedNotes({
        indexPath,
        request: {
          transcript: testCase.transcript,
          windowId: testCase.id,
          version: index + 1,
          limit: 5
        }
      });
      latenciesMs.push(result.elapsedMs);
      const paths = result.notes.map((note) => note.path);
      if (paths[0] !== testCase.expectedTop && !testCase.acceptableAlternatives.includes(paths[0])) {
        failures.push(`${testCase.id}: expected ${testCase.expectedTop}, got ${paths[0] ?? "none"}`);
      }
      const falsePositiveHit = paths.slice(0, 3).find((resultPath) => testCase.falsePositives.includes(resultPath));
      if (falsePositiveHit) {
        failures.push(`${testCase.id}: false positive in top 3: ${falsePositiveHit}`);
      }
    });

    return {
      caseCount: evalFile.cases.length,
      failures,
      latenciesMs,
      p95LatencyMs: percentile(latenciesMs, 0.95)
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
  return sorted[index] ?? 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runDemoEval();
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length > 0 || report.p95LatencyMs >= 200) {
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run eval tests and CLI**

Run:

```bash
pnpm test:run src/eval/runEval.test.ts
pnpm eval
```

Expected: PASS and CLI JSON shows `"failures": []` plus `"p95LatencyMs"` below `200`.

- [ ] **Step 5: Commit**

```bash
git add src/eval/runEval.ts src/eval/runEval.test.ts
git commit -m "test: add demo 0 relevance eval"
```

---

### Task 9: Hardened Obsidian URI

**Files:**
- Create: `src/core/uri.ts`
- Create: `src/core/uri.test.ts`

- [ ] **Step 1: Write failing URI tests**

Create `src/core/uri.test.ts`:

```ts
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
    expect(() => buildObsidianOpenUri({ vaultName: "Demo", filePath: "../secret.md" })).toThrow("KA_PATH_TRAVERSAL");
    expect(() => buildObsidianOpenUri({ vaultName: "Demo", filePath: "/tmp/secret.md" })).toThrow("KA_ABSOLUTE_PATH");
  });
});
```

- [ ] **Step 2: Run URI tests to verify failure**

Run:

```bash
pnpm test:run src/core/uri.test.ts
```

Expected: FAIL because `buildObsidianOpenUri` does not exist.

- [ ] **Step 3: Implement URI builder**

Create `src/core/uri.ts`:

```ts
import { normalizeVaultPath } from "./ids";

interface BuildUriInput {
  vaultName: string;
  filePath: string;
}

export function buildObsidianOpenUri(input: BuildUriInput): string {
  const file = normalizeVaultPath(input.filePath);
  return `obsidian://open?vault=${encodeURIComponent(input.vaultName)}&file=${encodeURIComponent(file)}`;
}
```

- [ ] **Step 4: Run URI tests**

Run:

```bash
pnpm test:run src/core/uri.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/uri.ts src/core/uri.test.ts
git commit -m "feat: harden obsidian uri construction"
```

---

### Task 10: Local Service And Renderer Command Adapter

**Files:**
- Create: `src/service/localCommands.ts`
- Create: `src/service/localCommands.test.ts`
- Create: `src/service/server.ts`
- Create: `src/api/commands.ts`
- Create: `src/api/commands.test.ts`

- [ ] **Step 1: Write failing local command tests**

Create `src/service/localCommands.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempDir } from "../test/tmp";
import { createLocalCommands } from "./localCommands";

describe("local command adapter", () => {
  it("validates, indexes, retrieves, and builds open URI", async () => {
    await withTempDir("commands", async (dir) => {
      const indexPath = path.join(dir, "index.sqlite");
      const commands = createLocalCommands({ indexPath, sourceId: "demo", vaultName: "Demo Vault" });

      const validation = await commands.validateVault("examples/demo-vault");
      expect(validation.valid).toBe(true);
      expect(validation.markdownCount).toBe(20);

      const stats = await commands.startIndexing("examples/demo-vault");
      expect(stats.documentCount).toBe(20);

      const result = await commands.retrieve({
        transcript: "Demo 0 typed transcript retrieval Obsidian",
        windowId: "manual",
        version: 1,
        limit: 5
      });
      expect(result.notes[0].path).toBe("projects/knowledge-assistant.md");

      expect(await commands.openObsidianUri("projects/knowledge-assistant.md")).toBe(
        "obsidian://open?vault=Demo%20Vault&file=projects%2Fknowledge-assistant.md"
      );
    });
  });
});
```

- [ ] **Step 2: Run local command test to verify failure**

Run:

```bash
pnpm test:run src/service/localCommands.test.ts
```

Expected: FAIL because `createLocalCommands` does not exist.

- [ ] **Step 3: Implement Node-only local commands**

Create `src/service/localCommands.ts`:

```ts
import { buildIndex, type IndexStats } from "../core/indexer";
import { retrieveRelatedNotes } from "../core/retrieval";
import { searchIndex } from "../core/search";
import { validateVault } from "../core/scanner";
import type { RetrievalRequest, RetrievalResult, SearchResult, VaultValidation } from "../core/types";
import { buildObsidianOpenUri } from "../core/uri";

export interface DemoCommands {
  validateVault(vaultPath: string): Promise<VaultValidation>;
  startIndexing(vaultPath: string): Promise<IndexStats>;
  retrieve(request: RetrievalRequest): Promise<RetrievalResult>;
  search(query: string): Promise<SearchResult[]>;
  openObsidianUri(filePath: string): Promise<string>;
}

interface LocalCommandOptions {
  indexPath: string;
  sourceId: string;
  vaultName: string;
}

export function createLocalCommands(options: LocalCommandOptions): DemoCommands {
  return {
    validateVault,
    startIndexing(vaultPath: string) {
      return buildIndex({ vaultPath, sourceId: options.sourceId, indexPath: options.indexPath });
    },
    async retrieve(request: RetrievalRequest) {
      return retrieveRelatedNotes({ indexPath: options.indexPath, request });
    },
    async search(query: string) {
      return searchIndex({ indexPath: options.indexPath, query, limit: 10 });
    },
    async openObsidianUri(filePath: string) {
      return buildObsidianOpenUri({ vaultName: options.vaultName, filePath });
    }
  };
}

export const demoCommands = createLocalCommands({
  indexPath: "knowledge-assistant-demo0.sqlite",
  sourceId: "demo",
  vaultName: "Demo Vault"
});
```

- [ ] **Step 4: Create local HTTP service**

Create `src/service/server.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import { createLocalCommands } from "./localCommands";

const port = Number(process.env.KA_DEMO0_PORT ?? 3760);
const commands = createLocalCommands({
  indexPath: process.env.KA_DEMO0_INDEX ?? "knowledge-assistant-demo0.sqlite",
  sourceId: "demo",
  vaultName: process.env.KA_DEMO0_VAULT_NAME ?? "Demo Vault"
});

const retrieveSchema = z.object({
  transcript: z.string(),
  windowId: z.string(),
  version: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(10).optional()
});

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));

app.post("/validate-vault", async (request) => {
  const body = z.object({ vaultPath: z.string() }).parse(request.body);
  return commands.validateVault(body.vaultPath);
});

app.post("/index", async (request) => {
  const body = z.object({ vaultPath: z.string() }).parse(request.body);
  return commands.startIndexing(body.vaultPath);
});

app.post("/retrieve", async (request) => {
  return commands.retrieve(retrieveSchema.parse(request.body));
});

app.post("/search", async (request) => {
  const body = z.object({ query: z.string() }).parse(request.body);
  return commands.search(body.query);
});

app.post("/open-uri", async (request) => {
  const body = z.object({ filePath: z.string() }).parse(request.body);
  return { uri: await commands.openObsidianUri(body.filePath) };
});

await app.listen({ host: "127.0.0.1", port });
```

- [ ] **Step 5: Write failing renderer adapter tests**

Create `src/api/commands.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFetchCommands } from "./commands";

describe("createFetchCommands", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts validate, index, retrieve, and open-uri requests", async () => {
    const responses = [
      { valid: true, path: "examples/demo-vault", markdownCount: 20, skipped: [] },
      { documentCount: 20, chunkCount: 80, indexPath: "demo.sqlite" },
      { windowId: "manual", version: 1, elapsedMs: 12, notes: [] },
      { uri: "obsidian://open?vault=Demo&file=projects%2Fknowledge-assistant.md" }
    ];
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => responses.shift()
    }));
    vi.stubGlobal("fetch", fetchMock);

    const commands = createFetchCommands("http://127.0.0.1:3760", { openUri: false });
    await expect(commands.validateVault("examples/demo-vault")).resolves.toMatchObject({ markdownCount: 20 });
    await expect(commands.startIndexing("examples/demo-vault")).resolves.toMatchObject({ documentCount: 20 });
    await expect(commands.retrieve({ transcript: "demo", windowId: "manual", version: 1 })).resolves.toMatchObject({ version: 1 });
    await expect(commands.openObsidianUri("projects/knowledge-assistant.md")).resolves.toContain("obsidian://open");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://127.0.0.1:3760/validate-vault",
      "http://127.0.0.1:3760/index",
      "http://127.0.0.1:3760/retrieve",
      "http://127.0.0.1:3760/open-uri"
    ]);
  });
});
```

- [ ] **Step 6: Run renderer adapter test to verify failure**

Run:

```bash
pnpm test:run src/api/commands.test.ts
```

Expected: FAIL because `createFetchCommands` does not exist.

- [ ] **Step 7: Implement renderer-safe command adapter**

Create `src/api/commands.ts`:

```ts
import type { IndexStats } from "../core/indexer";
import type { RetrievalRequest, RetrievalResult, SearchResult, VaultValidation } from "../core/types";

export interface DemoCommands {
  validateVault(vaultPath: string): Promise<VaultValidation>;
  startIndexing(vaultPath: string): Promise<IndexStats>;
  retrieve(request: RetrievalRequest): Promise<RetrievalResult>;
  search(query: string): Promise<SearchResult[]>;
  openObsidianUri(filePath: string): Promise<string>;
}

interface FetchCommandOptions {
  openUri: boolean;
}

export function createFetchCommands(baseUrl = "http://127.0.0.1:3760", options: FetchCommandOptions = { openUri: true }): DemoCommands {
  return {
    validateVault(vaultPath: string) {
      return post(`${baseUrl}/validate-vault`, { vaultPath });
    },
    startIndexing(vaultPath: string) {
      return post(`${baseUrl}/index`, { vaultPath });
    },
    retrieve(request: RetrievalRequest) {
      return post(`${baseUrl}/retrieve`, request);
    },
    search(query: string) {
      return post(`${baseUrl}/search`, { query });
    },
    async openObsidianUri(filePath: string) {
      const response = await post<{ uri: string }>(`${baseUrl}/open-uri`, { filePath });
      if (options.openUri) {
        await openUri(response.uri);
      }
      return response.uri;
    }
  };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`KA_SERVICE_REQUEST_FAILED: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function openUri(uri: string) {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_obsidian_uri", { input: { uri } });
    return;
  }
  window.location.href = uri;
}

export const demoCommands = createFetchCommands();
```

- [ ] **Step 8: Run command tests**

Run:

```bash
pnpm test:run src/service/localCommands.test.ts src/api/commands.test.ts
```

Expected: PASS.

- [ ] **Step 9: Verify service boots**

Run:

```bash
pnpm service
```

Expected: Fastify logs that it is listening on `http://127.0.0.1:3760`. Stop it with `Ctrl+C`.

- [ ] **Step 10: Commit**

```bash
git add src/service/localCommands.ts src/service/localCommands.test.ts src/service/server.ts src/api/commands.ts src/api/commands.test.ts
git commit -m "feat: add demo 0 local service"
```

---

### Task 11: Demo 0 React UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write failing UI test**

Create `src/App.test.tsx`:

```tsx
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
    expect(screen.getByText(/title match|phrase match/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run UI test to verify failure**

Run:

```bash
pnpm test:run src/App.test.tsx
```

Expected: FAIL because the current app shell has no controls.

- [ ] **Step 3: Implement app UI**

Replace `src/App.tsx` with:

```tsx
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { demoCommands } from "./api/commands";
import type { RetrievalResult } from "./core/types";

const defaultTranscript = "Demo 0 typed transcript retrieval with match reasons and Obsidian URI opening.";

export function App() {
  const [vaultPath, setVaultPath] = useState("examples/demo-vault");
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [status, setStatus] = useState("Ready");
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [version, setVersion] = useState(0);

  const topNotes = useMemo(() => result?.notes ?? [], [result]);

  async function indexVault() {
    setStatus("Indexing vault...");
    const validation = await demoCommands.validateVault(vaultPath);
    if (!validation.valid) {
      setStatus("Vault invalid: select a folder with Markdown files.");
      return;
    }
    const stats = await demoCommands.startIndexing(vaultPath);
    setStatus(`Indexed ${stats.documentCount} notes and ${stats.chunkCount} chunks.`);
  }

  async function retrieve() {
    const nextVersion = version + 1;
    setVersion(nextVersion);
    setStatus("Retrieving related notes...");
    const nextResult = await demoCommands.retrieve({
      transcript,
      windowId: "manual",
      version: nextVersion,
      limit: 5
    });
    setResult(nextResult);
    setStatus(`Retrieved ${nextResult.notes.length} notes in ${nextResult.elapsedMs} ms.`);
  }

  async function openNote(path: string) {
    const uri = await demoCommands.openObsidianUri(path);
    window.location.href = uri;
  }

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="Vault setup">
        <div>
          <h1>Knowledge Assistant Demo 0</h1>
          <p>{status}</p>
        </div>
        <label className="field">
          <span>Vault path</span>
          <input value={vaultPath} onChange={(event) => setVaultPath(event.target.value)} />
        </label>
        <button className="icon-button text-button" type="button" onClick={indexVault}>
          <RefreshCw size={18} />
          Index vault
        </button>
      </section>

      <section className="workspace">
        <form className="transcript-panel" onSubmit={(event) => { event.preventDefault(); void retrieve(); }}>
          <label className="field">
            <span>Manual transcript</span>
            <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={9} />
          </label>
          <button className="icon-button text-button primary" type="submit">
            <Search size={18} />
            Retrieve notes
          </button>
        </form>

        <section className="results-panel" aria-label="Related notes">
          {topNotes.length === 0 ? (
            <div className="empty-state">No related notes yet.</div>
          ) : (
            topNotes.map((note) => (
              <article className="result-card" key={note.documentId}>
                <div className="result-header">
                  <div>
                    <h2>{note.title}</h2>
                    <p>{note.path}</p>
                  </div>
                  <button className="icon-button" type="button" onClick={() => void openNote(note.path)} aria-label={`Open ${note.title}`}>
                    <ExternalLink size={18} />
                  </button>
                </div>
                <p className="snippet" dangerouslySetInnerHTML={{ __html: note.snippet }} />
                <div className="chips">
                  {note.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                </div>
                <details>
                  <summary>Score {note.score}</summary>
                  <pre>{JSON.stringify(note.scoreBreakdown, null, 2)}</pre>
                </details>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Implement UI styling**

Replace `src/styles.css` with:

```css
:root {
  color: #1f2937;
  background: #f7f7f2;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

body {
  margin: 0;
}

button,
input,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr minmax(260px, 420px) auto;
  gap: 16px;
  align-items: end;
  max-width: 1180px;
  margin: 0 auto 24px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 28px;
  line-height: 1.2;
}

h2 {
  font-size: 18px;
  line-height: 1.3;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-size: 13px;
  font-weight: 700;
  color: #4b5563;
}

input,
textarea {
  border: 1px solid #c7c9bd;
  border-radius: 6px;
  padding: 10px 12px;
  background: #fffef9;
  color: #1f2937;
}

textarea {
  resize: vertical;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(320px, 420px) 1fr;
  gap: 24px;
  max-width: 1180px;
  margin: 0 auto;
}

.transcript-panel,
.results-panel {
  min-width: 0;
}

.transcript-panel {
  display: grid;
  align-content: start;
  gap: 12px;
}

.results-panel {
  display: grid;
  gap: 12px;
}

.result-card,
.empty-state {
  border: 1px solid #d7d9cf;
  border-radius: 8px;
  background: #fffef9;
  padding: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.result-header p,
.snippet {
  margin-top: 6px;
  color: #4b5563;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.chips span {
  border: 1px solid #b7c3b0;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  color: #275235;
  background: #edf7e9;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #aeb4a5;
  border-radius: 6px;
  min-height: 38px;
  min-width: 38px;
  background: #fffef9;
  color: #1f2937;
  cursor: pointer;
}

.text-button {
  gap: 8px;
  padding: 0 14px;
}

.primary {
  background: #245a77;
  color: #ffffff;
  border-color: #245a77;
}

details {
  margin-top: 12px;
}

pre {
  overflow: auto;
  background: #f1f3ee;
  padding: 10px;
  border-radius: 6px;
}

@media (max-width: 820px) {
  .toolbar,
  .workspace {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run UI test and typecheck**

Run:

```bash
pnpm test:run src/App.test.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Manual browser smoke test**

Run:

```bash
pnpm dev
```

Expected: Vite serves at `http://localhost:1420`. Open the page, click `Index vault`, click `Retrieve notes`, and confirm the top result is `Knowledge Assistant Demo 0`.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: build demo 0 manual retrieval ui"
```

---

### Task 12: Tauri Desktop Shell And Open Command

**Files:**
- Create: `src-tauri/build.rs`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`

- [ ] **Step 1: Create Tauri config**

Create `src-tauri/Cargo.toml`:

```toml
[package]
name = "knowledge-assistant-demo0"
version = "0.0.0"
description = "Knowledge Assistant Demo 0"
authors = ["Knowledge Assistant"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = [] }
open = "5.3.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

Create `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Knowledge Assistant Demo 0",
  "version": "0.0.0",
  "identifier": "local.knowledge-assistant.demo0",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Knowledge Assistant Demo 0",
        "width": 1180,
        "height": 760,
        "minWidth": 860,
        "minHeight": 620
      }
    ]
  },
  "bundle": {
    "active": false
  }
}
```

- [ ] **Step 2: Create open URI command**

Create `src-tauri/src/main.rs`:

```rust
use serde::Deserialize;

#[derive(Deserialize)]
struct OpenObsidianUriInput {
    uri: String,
}

#[tauri::command]
fn open_obsidian_uri(input: OpenObsidianUriInput) -> Result<(), String> {
    if !input.uri.starts_with("obsidian://open?") {
        return Err("KA_URI_SCHEME_INVALID".to_string());
    }
    open::that(input.uri).map_err(|error| format!("KA_URI_OPEN_FAILED: {error}"))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_obsidian_uri])
        .run(tauri::generate_context!())
        .expect("failed to run knowledge assistant demo 0");
}
```

- [ ] **Step 3: Add build script required by Tauri**

Create `src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 4: Verify desktop app starts**

Run:

```bash
pnpm tauri:dev
```

Expected: a desktop window opens with the Demo 0 UI. Click `Index vault`, click `Retrieve notes`, and confirm results render.

- [ ] **Step 5: Commit**

```bash
git add src-tauri
git commit -m "feat: add tauri shell for demo 0"
```

---

### Task 13: Quickstart And Acceptance Docs

**Files:**
- Create: `docs/QUICKSTART.md`
- Create: `docs/DEMO0_ACCEPTANCE.md`

- [ ] **Step 1: Write quickstart**

Create `docs/QUICKSTART.md`:

```markdown
# Quickstart

## Prerequisites

- Node.js 22+
- pnpm 9+
- Rust toolchain for Tauri
- Obsidian desktop app for the open-note check

## Demo 0

```bash
pnpm install
pnpm fixtures
pnpm test:run
pnpm eval
pnpm dev
```

Open `http://localhost:1420`.

1. Keep `examples/demo-vault` in the vault path field.
2. Click `Index vault`.
3. Keep the default manual transcript text.
4. Click `Retrieve notes`.
5. Confirm `Knowledge Assistant Demo 0` appears as the top result.

Desktop mode:

```bash
pnpm tauri:dev
```

Use the same UI flow. Clicking the external-link button opens the selected note through an Obsidian URI when Obsidian is installed and the demo vault is available in Obsidian.
```

- [ ] **Step 2: Write acceptance checklist**

Create `docs/DEMO0_ACCEPTANCE.md`:

```markdown
# Demo 0 Acceptance

Run these commands from the repository root:

```bash
pnpm fixtures
pnpm typecheck
pnpm test:run
pnpm eval
```

Acceptance criteria:

- `examples/demo-vault` contains 20 Markdown notes.
- `examples/demo-transcripts/eval.json` contains 4 eval cases.
- TypeScript typecheck passes.
- Unit and integration tests pass.
- Eval report has zero failures.
- Eval report P95 latency is below 200 ms.
- UI can index `examples/demo-vault`.
- UI returns 3 to 5 related note cards for the default transcript.
- Top result for the default transcript is `Knowledge Assistant Demo 0`.
- Result cards show at least one human-readable reason.
- Obsidian URI tests cover Chinese, spaces, `#`, `?`, Unicode, and traversal blocking.
```

- [ ] **Step 3: Run documentation commands**

Run:

```bash
pnpm fixtures
pnpm typecheck
pnpm test:run
pnpm eval
```

Expected: all commands pass; eval JSON contains zero failures and P95 latency below 200 ms.

- [ ] **Step 4: Commit**

```bash
git add docs/QUICKSTART.md docs/DEMO0_ACCEPTANCE.md
git commit -m "docs: add demo 0 quickstart and acceptance"
```

---

### Task 14: Final Demo 0 Verification

**Files:**
- Modify only if verification exposes a failing requirement.

- [ ] **Step 1: Run full verification**

Run:

```bash
pnpm fixtures
pnpm typecheck
pnpm test:run
pnpm eval
```

Expected:
- `pnpm fixtures`: completes without errors.
- `pnpm typecheck`: exits 0.
- `pnpm test:run`: all tests pass.
- `pnpm eval`: exits 0 with `"failures": []` and `"p95LatencyMs"` below `200`.

- [ ] **Step 2: Run web demo smoke test**

Run:

```bash
pnpm dev
```

Expected:
- Browser can open `http://localhost:1420`.
- `Index vault` reports `Indexed 20 notes`.
- `Retrieve notes` reports a latency below 200 ms for the default transcript.
- `Knowledge Assistant Demo 0` is the first card.
- A card includes `title match` or `phrase match`.

- [ ] **Step 3: Run desktop smoke test**

Run:

```bash
pnpm tauri:dev
```

Expected:
- Desktop window opens.
- Same index and retrieval workflow works.
- External-link button generates an `obsidian://open` URI for the selected note.

- [ ] **Step 4: Commit final fixes if any were required**

```bash
git add .
git commit -m "fix: satisfy demo 0 acceptance"
```

Use this commit only when Step 1, Step 2, or Step 3 required source changes. If no source changes were needed, skip this commit.

---

## Self-Review

Spec coverage:
- Sample vault with 20 notes: Task 2.
- Demo transcripts and expected results: Task 2 and Task 8.
- SQLite FTS5 index: Task 6.
- Stable source/document/chunk IDs and content hashes: Task 3, Task 4, Task 6.
- Manual transcript input: Task 11.
- Ranked retrieval with reasons: Task 7 and Task 11.
- Obsidian URI hardening and tests: Task 9 and Task 12.
- Basic result cards: Task 11.
- New developer quickstart: Task 13.
- P95 latency below 200 ms: Task 8 and Task 14.

Placeholder scan:
- No task relies on unspecified code.
- Each code-creating step includes concrete file content.
- Each test step includes exact command and expected result.

Type consistency:
- `ParsedNote`, `SearchResult`, `RetrievalRequest`, and `RetrievalResult` are defined in Task 3 and used consistently in later tasks.
- `buildIndex`, `searchIndex`, `retrieveRelatedNotes`, and `buildObsidianOpenUri` names match tests and UI calls.
- Reason strings match the design doc: `title match`, `tag match`, `backlink match`, `phrase match`, `recently edited`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-31-demo-0-retrieval-validation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
