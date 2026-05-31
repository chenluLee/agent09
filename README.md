# Personal Knowledge Assistant

一个实时知识检索助手，在对话过程中从 Obsidian 笔记库中检索相关笔记并打开。

## Demo 0 — Retrieval Validation

Demo 0 验证核心检索流程：索引 Obsidian 笔记库 → 输入文本 → 返回排名结果 + 匹配原因 → 通过 Obsidian URI 打开笔记。

### 功能

- **Markdown 解析** — frontmatter（title、tags）、Obsidian `[[wiki-links]]`、行内 `#tag`
- **SQLite FTS5 全文索引** — unicode61 分词器，支持中英文混合搜索
- **排名评分** — title match、tag match、backlink match、phrase match、recently edited
- **Obsidian URI** — 安全编码中文路径、空格、`#`、`?` 等特殊字符，阻止路径遍历
- **React UI** — 手动输入 transcript，展示结果卡片、匹配原因、分数详情
- **Tauri 桌面端** — 通过原生命令打开 Obsidian URI

### 技术栈

React 18 · TypeScript · Vite · Tauri 2 · Fastify · SQLite (better-sqlite3) · Vitest

### 快速开始

前置条件：Node.js 22+、pnpm 9+、Rust 工具链（桌面端可选）

```bash
pnpm install
pnpm fixtures      # 生成 20 条示例笔记 + 4 个评估案例
pnpm test:run      # 运行测试（18 tests, 11 files）
pnpm eval          # 运行检索质量评估
pnpm dev           # 启动 Web 开发服务器 → http://localhost:1420
```

Web 模式使用步骤：

1. 保持 vault path 为 `examples/demo-vault`
2. 点击 **Index vault**
3. 保持默认 transcript 文本
4. 点击 **Retrieve notes**
5. 确认 `Knowledge Assistant Demo 0` 排在首位

桌面模式：

```bash
pnpm tauri:dev
```

### 项目结构

```
src/
  core/          # 纯 TypeScript 领域逻辑（解析、索引、搜索、排名、URI）
  api/           # 渲染进程命令适配器（fetch → 本地服务）
  service/       # Fastify 本地 HTTP 服务
  eval/          # 检索质量评估
  App.tsx        # Demo 0 UI
src-tauri/       # Tauri 桌面端（Rust）
examples/
  demo-vault/    # 20 条示例 Markdown 笔记
  demo-transcripts/eval.json  # 4 个评估案例
```

### 检索评估结果

| 指标 | 结果 |
|------|------|
| 评估案例 | 4/4 通过 |
| 失败数 | 0 |
| P95 延迟 | 1.71 ms（目标 < 200 ms） |

### 更多文档

- [Quickstart](docs/QUICKSTART.md)
- [Acceptance Criteria](docs/DEMO0_ACCEPTANCE.md)
- [Design Spec](docs/superpowers/specs/2026-05-31-personal-knowledge-assistant-design.md)

## 后续计划

Demo 0 范围外（未来迭代）：

- ASR 语音转写（iFlytek 实时中文转录）
- 全局快捷键
- 会话保留控制
- NotebookLM 资产渲染
- 向量搜索

## License

Private
