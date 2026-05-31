# Personal Knowledge Assistant — Demo 0

## 项目概述

个人知识助手，实时检索 Obsidian 知识库并在转录中推送相关笔记。当前为 Demo 0 阶段（手动输入转录 → 检索 → 展示）。

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **桌面壳**: Tauri 2
- **后端**: Fastify 5 + better-sqlite3
- **测试**: Vitest + Testing Library + jsdom
- **搜索**: SQLite FTS5 全文检索

## 常用命令

```bash
npm test          # 运行测试（watch 模式）
npm run test:run  # 运行测试（单次）
npm run typecheck # 类型检查
npm run dev       # 启动开发服务器
npm run eval      # 运行检索质量评估
```

## 开发规范

### 测试驱动开发（TDD）

本项目严格遵循 **Red-Green-Refactor** 循环：

#### 1. RED — 先写失败测试

- 每个新功能、Bug 修复、行为变更都必须**先写测试**
- 测试应描述期望行为，而非实现细节
- 运行测试，确认它**因功能缺失而失败**（不是拼写错误）

```bash
npm run test:run src/core/<module>.test.ts
```

#### 2. GREEN — 写最小实现

- 只写刚好让测试通过的代码，不多不少
- 不添加未测试的功能，不"顺手"重构

#### 3. REFACTOR — 重构

- 测试全绿后才能重构
- 重构期间测试必须保持通过
- 不在重构中添加新行为

#### Commit 规范

为保留 TDD 证据，推荐以下 commit 粒度：

```
test: add failing test for <feature>    ← RED 阶段，仅含测试文件
feat: implement <feature>               ← GREEN 阶段，仅含实现文件
refactor: clean up <feature>            ← REFACTOR 阶段（可选）
```

**禁止**在一个 commit 中同时提交测试和实现代码——这会丢失"看过测试失败"的证据。

#### 测试要求

- 每个核心模块（`src/core/*`）必须有对应的 `.test.ts` 文件
- 测试应覆盖：正常路径、边界条件、错误处理
- 优先使用真实代码，避免不必要的 mock
- 安全相关功能（路径校验、URI 构造等）必须有针对性测试

#### 当前测试结构

```
src/core/ids.test.ts        # ID 生成与路径规范化
src/core/scanner.test.ts    # 知识库扫描与校验
src/core/markdown.test.ts   # Markdown 解析
src/core/indexer.test.ts    # SQLite FTS 索引
src/core/search.test.ts     # 全文检索
src/core/retrieval.test.ts  # 笔记检索
src/core/uri.test.ts        # Obsidian URI 构造
src/api/commands.test.ts    # API 命令适配
src/service/localCommands.test.ts  # 本地命令实现
src/eval/runEval.test.ts    # 检索质量评估
src/App.test.tsx            # React UI 组件测试
```

## 项目结构

```
src/
├── core/          # 纯业务逻辑（ids, scanner, markdown, indexer, search, retrieval, uri）
├── api/           # HTTP 命令适配层
├── service/       # 本地服务实现
├── eval/          # 检索质量评估
├── App.tsx        # React 演示界面
└── test/          # 测试工具与 setup
src-tauri/         # Tauri 桌面壳（Rust）
examples/          # 演示用知识库与转录数据
docs/              # 设计文档
```
