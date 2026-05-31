# TODOs

Derived from the design doc review at `docs/superpowers/specs/2026-05-31-personal-knowledge-assistant-design.md`.

## P1

- [ ] Build sample vault (`examples/demo-vault`) with 20-50 notes
  - Why: Demo 0 needs reproducible data; private vaults make results hard to interpret.
  - Context: Include typical vault structure with tags, links, frontmatter, and Chinese content.

- [ ] Add relevance eval fixtures
  - Why: ranking quality cannot be improved by feel.
  - Context: Store demo transcripts, expected top notes, acceptable alternatives, and false-positive examples in `examples/demo-transcripts`.

- [ ] Define ASR trust boundary and secret storage
  - Why: cloud ASR receives voice/transcript/hotword data; API secrets must not land in plaintext config or logs.
  - Context: Use OS keychain for secrets, explicit cloud-ASR consent, local-only mode, and transcript/log retention controls.

- [ ] Specify UI information architecture and interaction states
  - Why: the current plan names screens but not what the user sees during setup, indexing, listening, errors, empty states, or fallback.
  - Context: Define Assistant, Search, Session Timeline, and Settings with state tables.

## P2

- [ ] Add stable source/document/chunk IDs to index schema
  - Why: keeps the architecture open for future vector search and cross-source memory without implementing them in MVP.
  - Context: Include source type, content hash, path normalization, chunk IDs, and schema versioning.

- [ ] Harden Obsidian URI setup and tests
  - Why: vault names, Chinese paths, spaces, and special characters will fail without deterministic encoding and troubleshooting.
  - Context: Add setup verifier and tests for path normalization/traversal blocking.

- [ ] Add error catalog and debug panel
  - Why: implementers and users need to diagnose ASR, indexing, URI, permission, and retrieval failures.
  - Context: Each error needs code, message, cause, primary action, secondary action, and log reference.

- [ ] Add quickstart guide
  - Why: new developer must run Demo 0 in under 10 minutes.
  - Context: Document install commands, sample vault usage, and expected output.

## P3

- [ ] Revisit Obsidian plugin prototype after Demo 0
  - Why: plugin/sidebar may fit the workflow better than external desktop UI.
  - Context: Compare plugin vs external app after core retrieval value is measured.

- [ ] Explore cross-source memory ingestion
  - Why: long-term competitors are moving beyond single-vault search.
  - Context: Do not implement before Demo 0; keep schema ready.

- [ ] Plan vector search implementation
  - Why: Chinese speech recall may outgrow FTS5-only retrieval.
  - Context: Add only after eval fixtures show FTS failure modes.

- [ ] Define packaged installer strategy
  - Why: Tauri + Node sidecar + Whisper + permissions create packaging complexity.
  - Context: Defer until local dev demo is stable.
