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
