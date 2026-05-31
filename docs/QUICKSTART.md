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
