---
title: "Tauri Command Boundary"
tags: ["tauri", "security"]
updated: "2026-05-31T09:00:00.000Z"
---
# Tauri Command Boundary

The renderer should call validated commands instead of reading files or secrets directly. Commands include validateVault, startIndexing, retrieve, search, and openObsidianUri.

## Links

- [[projects/knowledge-assistant]]
