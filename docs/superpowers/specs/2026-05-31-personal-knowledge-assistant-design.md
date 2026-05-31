# Personal Knowledge Assistant Design

Date: 2026-05-31

## Summary

Build a cross-platform live knowledge copilot around an Obsidian vault. The first version is an external desktop application focused on assistant mode: it listens while the user speaks, transcribes the speech, retrieves related notes in real time, and opens selected notes in Obsidian. It does not require an Obsidian plugin.

The system scans Markdown notes, indexes them for low-latency retrieval, shows related notes in a compact live overlay, explains why each note matched the current transcript, and opens notes in Obsidian through Obsidian URI links. NotebookLM infographic generation remains part of the broader product vision, but it is not on the critical path for the first demo. It can be implemented as a separate coding-agent skill that produces assets the desktop app consumes later.

## Decisions

- Use Obsidian as the Markdown vault and primary writing environment.
- Do not build an Obsidian plugin for MVP.
- Use a local desktop app for assistant mode, live note retrieval, search, preview, and settings.
- Make assistant mode the primary MVP experience and the coding-ability showcase.
- Defer NotebookLM infographic generation to a separate skill or agent workflow.
- Prioritize iFlytek real-time transcription for Chinese ASR.
- Keep local Whisper medium as optional provider (not required fallback after Demo 1).
- Avoid modifying original Markdown notes in MVP.
- Use keyboard shortcuts to turn assistant mode on and off to control cloud ASR cost.
- Optimize around staged demo milestones: Demo 0 (typed transcript retrieval) before Demo 1 (iFlytek ASR).
- Add Demo 0 as a typed-transcript retrieval validation gate before full live-ASR integration.
- Keep Obsidian as the only MVP knowledge source, but add `source_id`, `source_type`, and stable document IDs to schemas for future extensibility.
- Keep FTS5-only retrieval for MVP, but add chunk/stable-ID schema and relevance eval set; defer embeddings implementation.
- Store API secrets in OS keychain, not in config files or logs.
- Make manual text input a first-class mode for Demo 0, not a hidden fallback.
- Define overlay as in-app assistant panel for MVP, not a system-wide floating window.

## Architecture

The MVP uses these components:

```text
Renderer UI (React)
  ├── Assistant Panel
  ├── Search Panel
  ├── Timeline Panel
  └── Settings Panel
        |
        v
Tauri Command Boundary
  ├── validateVault()
  ├── openObsidianUri()
  ├── getProviderStatus()
  └── manageSecrets()
        |
        v
Local Service / Sidecar
  ├── Indexer
  │   ├── Markdown parser
  │   ├── link/tag/frontmatter extractor
  │   └── staged SQLite writer
  ├── Retrieval Engine
  │   ├── transcript window
  │   ├── query builder
  │   ├── FTS/title/tag/link recall
  │   └── ranking + explanation
  ├── ASR Providers
  │   ├── manual text
  │   ├── iFlytek
  │   └── Whisper (optional)
  └── Session Store
        |
        v
Local Storage
  ├── index.sqlite
  ├── sessions.sqlite
  ├── config.json (non-secret)
  ├── OS keychain (secrets)
  └── logs/ (redacted)
```

### Data Flow

```text
Transcript input
  -> normalize segment
  -> RetrievalRequest(session_id, window_id, version)
  -> query builder
  -> candidate recall: title/tag/link/body
  -> rank + dedupe + suppress
  -> RetrievalResult(version, notes, reasons)
  -> UI accepts only latest version
  -> optional session event write
```

Recommended asset layout inside the vault:

```text
Assets/knowledge-assistant/
├── infographics/
├── metadata/
└── sessions/
```

Recommended application data layout:

```text
knowledge-assistant/
├── index.sqlite
├── config.json
├── sessions.sqlite
└── logs/
```

## Milestones

The plan is staged into demo milestones with success metrics:

### Demo 0: Retrieval Validation

Proves the core retrieval value before audio, packaging, and shortcut complexity.

Scope:
- Sample vault with 20-50 notes
- SQLite FTS index
- Manual transcript text input (typed)
- Ranked note retrieval with match reasons
- Obsidian note opening via URI
- Basic result cards

Success metrics:
- Given a demo transcript, the expected top note appears in results
- Match reason is human-readable and accurate
- Obsidian opens the correct note
- New developer can run Demo 0 in under 10 minutes
- Retrieval result latency P95 < 200 ms

### Demo 1: Live ASR Integration

Adds real-time speech transcription on top of proven retrieval.

Scope:
- iFlytek real-time transcription
- ASR provider abstraction
- Assistant state machine
- Provider connection management and billing safety
- Global shortcut toggle
- Manual text input remains available as first-class mode

Success metrics:
- Spoken phrase about a known topic returns expected top note
- ASR disconnect is immediate and idempotent on shortcut toggle
- Fallback from failed ASR to manual input is automatic
- Idle timeout stops billing after 3-5 minutes of silence

### Demo 2: Session and Hotword Support

Adds session history, hotword management, and optional Whisper.

Scope:
- Session timeline persistence
- Hotword extraction and sync
- Whisper as optional provider
- Privacy and retention controls

Success metrics:
- Session timeline shows transcript segments, retrieval events, and opened notes
- Hotwords from vault titles/tags improve retrieval accuracy
- Session data can be cleared by user

### Demo 3: External Asset Consumption

Adds NotebookLM asset display when present.

Scope:
- Display NotebookLM infographics when assets exist in vault
- Metadata contract for external skill outputs
- Asset status on result cards

Success metrics:
- Card shows infographic thumbnail when PNG exists
- Missing or malformed assets do not break the card
- External skill writes deterministic, schema-versioned outputs

## Obsidian Integration

MVP integration is intentionally light:

- The app reads Markdown files directly from the vault path.
- Search results open notes using Obsidian URI links.
- The app does not install or require a community plugin.
- The app does not write to original notes by default.
- Later versions can add an Obsidian plugin for sidebars, command palette commands, or in-Obsidian result panels.

This keeps the first version independent from Obsidian plugin compatibility and review constraints while preserving a clear upgrade path.

### URI Hardening

Obsidian URI construction must handle edge cases deterministically:

- Encode vault name and file path with `encodeURIComponent`.
- Normalize path separators (Windows backslash to forward slash).
- Block path traversal (`..`, absolute paths).
- Test with: Chinese characters, spaces, `#`, `?`, Unicode, long paths.
- Add a setup verifier that checks Obsidian URI registration and vault accessibility.

## Indexing

The indexer scans `.md` files in the selected vault and stores:

- `source_type`: always `obsidian` in MVP, extensible for future sources
- `source_id`: unique identifier for the knowledge source
- `document_id`: stable ID derived from vault-relative path
- `content_hash`: SHA-256 hash of file content for change detection
- Vault-relative path (normalized)
- Title
- Frontmatter
- Tags
- Plain text content
- Internal links and backlinks where practical
- Modified time
- Optional infographic asset path
- Searchable snippets
- Schema version for safe migration

### Chunk IDs

Each document is stored as one or more chunks with stable chunk IDs:

- `chunk_id`: derived from `document_id` + chunk index
- Chunk boundaries: paragraph-level for body text, separate entries for title/tags/frontmatter
- Chunk IDs enable future vector search without re-indexing

### Staged Rebuild

Index rebuilds use a staging table and transactional swap:

1. Build new index into `index_staging.sqlite`.
2. Validate row count and content hashes.
3. Swap atomically: rename staging to `index.sqlite`.
4. Failed rebuilds keep the previous index usable.

The first version uses SQLite FTS5 for keyword search and transcript-driven retrieval. Vector search is out of scope for MVP but the schema supports future addition.

The app supports manual reindexing in MVP. File watching can be added after the core scan/search path is stable.

## Live Retrieval

The retrieval engine is the core MVP behavior. It receives normalized transcript events and turns recent speech into a small set of candidate note queries.

### Retrieval Behavior

- Maintain a rolling transcript window, such as the last 20 to 60 seconds.
- Extract candidate terms from note titles, tags, backlinks, and repeated transcript phrases.
- Run FTS5 searches against titles, tags, and note body text.
- Boost exact title, tag, and backlink matches above body-only matches.
- Suppress notes that were already shown recently unless the match score rises.
- Emit the top 3 to 5 notes with match reasons.
- Keep retrieval fast enough that results feel live, with a target under 500 ms after each stable transcript segment.

### Retrieval Event Versioning

Each retrieval request includes a version number. The UI accepts only the latest version result and discards stale results to prevent flicker and race conditions:

```text
RetrievalRequest(session_id, window_id, version)
  -> query builder
  -> ranking + deduplication + suppression
  -> RetrievalResult(version, notes, reasons)
  -> UI discards results with version < current
```

Rapid transcript updates create backpressure: debounce queries within 200 ms windows, cancel pending queries when a newer window arrives.

### Match Reasons

Match reasons should be human-readable:

- `title match`
- `tag match`
- `backlink match`
- `phrase match`
- `recently edited`

### Relevance Evaluation Set

Ranking quality is measured, not guessed. The project includes evaluation fixtures:

- `examples/demo-vault`: 20-50 sample notes covering typical vault structure.
- `examples/demo-transcripts`: demo transcript inputs with expected results.
- Each fixture maps a transcript to expected top notes, acceptable alternatives, and known false-positive examples.
- Retrieval improvements are validated against this set before shipping.

## UI Information Architecture

```text
App Shell
├── Assistant
│   ├── Status/control strip
│   ├── Manual transcript input (Demo 0 first-class mode)
│   ├── Live transcript panel
│   └── Related notes panel (top 3-5)
├── Search
│   ├── Query input
│   ├── Filters/tags
│   └── Result list / preview
├── Session Timeline
│   ├── Transcript segments
│   ├── Retrieval events
│   └── Opened notes
└── Settings
    ├── Vault
    ├── ASR providers
    ├── Shortcuts
    ├── Hotwords
    ├── Privacy/storage
    └── Advanced/debug
```

The overlay is defined as an in-app assistant panel, not a system-wide floating window. This avoids OS-level window complexity while keeping the assistant experience focused.

## Interaction States

Every feature has defined states for loading, empty, error, success, and partial conditions:

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Vault setup | scanning path | no vault selected | path invalid | vault verified | vault valid, Obsidian URI unverified |
| Indexing | file count/progress | no Markdown files | parser/index failure | indexed with stats | skipped files listed |
| Assistant | connecting/provider start | no transcript yet | provider/permission failure | transcript and results updating | partial transcript, no final segment |
| Retrieval | ranking current segment | no related notes | query/index unavailable | top 3-5 notes | stale result suppressed |
| Obsidian open | opening URI | no note selected | URI failed | note opened | fallback available |
| Session timeline | loading session | no history | DB read failure | events shown | debug traces hidden |

### First-Run Onboarding

New users see a guided setup flow:

1. Choose vault folder.
2. Verify Obsidian is installed and URI handler works.
3. Grant microphone permission (if using ASR).
4. Run initial index scan.
5. Show Demo 0 input to prove retrieval works.

## Assistant Mode

Assistant mode listens to speech, transcribes it, searches the vault, and shows related notes in a small result overlay. It is the first version's primary experience.

Default provider order:

1. iFlytek real-time transcription
2. Local Whisper medium (optional after Demo 1)
3. Manual text input fallback (first-class mode for Demo 0)

The transcript pipeline emits normalized transcript events. Search logic is provider-independent.

### Assistant State Machine

```text
OFF
  -> REQUESTING_PERMISSION
  -> CONNECTING_PROVIDER
  -> LISTENING
  -> TRANSCRIBING
  -> DEGRADED_MANUAL_INPUT
  -> STOPPING
  -> OFF

Any active state
  -> CONNECTION_FAILED
  -> CLEANUP_PROVIDER
  -> FALLBACK_AVAILABLE or OFF

Rules:
- stop/dispose is idempotent.
- provider billing must stop before UI leaves STOPPING.
- rapid toggle queues at most one transition.
```

### Assistant Mode Behavior

- A global shortcut toggles assistant mode.
- Recommended macOS shortcut: `Cmd+Shift+Space`.
- Recommended Windows shortcut: `Ctrl+Shift+Space`.
- Optional push-to-talk mode listens only while the shortcut is held.
- The app connects to iFlytek only while assistant mode is active.
- The app disconnects immediately when assistant mode is turned off.
- Idle timeout stops ASR after 3 to 5 minutes without useful speech.
- The overlay shows only the top 3 to 5 results.
- Each result shows a short match reason so the user trusts why it appeared.
- The live transcript view can be shown for debugging and demo clarity.
- A session timeline records transcript segments, retrieval events, and clicked notes.
- Clicking a result opens the note in Obsidian.

State indicators:

- Off
- Listening
- Transcribing
- Paused
- Connection failed
- Fallback mode

Demo path:

1. Start assistant mode with the global shortcut.
2. Speak naturally about a project, person, or concept already present in the vault.
3. See the transcript stabilize.
4. See 3 to 5 related notes appear with match reasons.
5. Click a result and open the original Markdown note in Obsidian.
6. Stop assistant mode and confirm ASR disconnects.

## ASR Providers

### ASR Trust Boundary

Cloud ASR providers receive voice data, transcripts, and hotwords. The app must be explicit about this boundary:

- User consent is required before first cloud ASR connection.
- Hotword data sent to cloud ASR is shown to the user before sync.
- Local-only mode disables all cloud ASR; only manual text and local Whisper are available.
- Transcript and audio data retention is controlled by user settings.

### Secret Storage

API secrets (iFlytek App ID, API key, API secret) must be stored in the OS keychain:

- macOS: Keychain Services
- Windows: Credential Manager
- Never write secrets to `config.json`, log files, or session databases.
- `config.json` stores non-secret configuration only.

### iFlytek Realtime

iFlytek is the preferred Chinese ASR provider for MVP because it supports low-latency streaming and cloud-side hotword optimization.

Configuration:

- App ID (stored in OS keychain)
- API key (stored in OS keychain)
- API secret (stored in OS keychain)
- Service URL
- Language and domain settings where applicable
- Hotword sync status

Cost controls:

- Do not keep the connection open by default.
- Start only through shortcut or explicit UI action.
- Stop on shortcut, idle timeout, or application sleep.
- Track session duration.
- Store daily usage totals locally.
- Add budget warning hooks for a later version.

### Whisper Local

Whisper medium is an optional offline provider after Demo 1. It is suitable when privacy or offline availability matters more than real-time latency.

Expected behavior:

- Process audio in 3 to 8 second chunks.
- Use the shared hotword list as prompt context where supported by the runtime.
- Run post-processing corrections for known terms.
- Degrade to smaller models on low-resource machines if configured.

Whisper hotwords are a bias, not a guarantee. For domain-specific Chinese terms, post-processing remains necessary.

### Windows Native ASR

Windows native ASR is not a primary MVP provider. It may be explored later as an experimental provider or manual dictation fallback, but the MVP should not depend on it for continuous Chinese assistant mode.

## Privacy and Data Retention

Transcripts, session logs, and debug traces are sensitive local data.

Retention controls:

- Default session retention: 30 days.
- User-configurable retention period.
- One-click clear all session history.
- Debug traces are off by default; enabled explicitly in Settings > Advanced.
- Logs redact API keys and secrets.

Session store writes are async and must not block retrieval result rendering. If session write fails (DB locked, full disk), the app retries async and drops debug events if needed, showing a warning with storage action.

## Search Experience

Search results are presented as cards:

- Infographic thumbnail when available
- Title
- Matched snippet
- Tags
- Modified time
- Optional asset status if an external infographic skill has generated or failed to generate an asset

Clicking a card opens the corresponding note in Obsidian. If Obsidian URI opening fails, the fallback is opening the file location in the operating system file manager.

## Hotword Management

The app maintains a local hotword database shared by ASR providers.

Sources:

- Note titles
- Tags
- Internal links
- Frequently repeated proper nouns
- Manually added people, projects, companies, and terminology

Fields:

- Text
- Category
- Source
- Priority
- Enabled flag
- Last used time
- Provider sync state

iFlytek uses the hotword list through its cloud-side hotword mechanism. Whisper uses it as prompt context and post-processing correction data.

## File Write And Sync Safety

The app should not rewrite original Markdown files in MVP.

Allowed writes:

- SQLite index in the application data directory
- Session history in the application data directory or `Assets/knowledge-assistant/sessions/`
- Optional generated PNG files under `Assets/knowledge-assistant/infographics/`
- Optional metadata mapping under `Assets/knowledge-assistant/metadata/`
- Application logs and config

Write strategy:

- Write generated assets and session exports to a temporary file first.
- Atomically rename the temporary file to the final path.
- Prefer deterministic asset names based on note path hash plus version.
- Keep transcript/session logs local and user-controlled.
- Do not write back transcript summaries to original notes in MVP.

## Error Handling

Every major error has a structured catalog with:

- Error code
- User-facing message
- Root cause
- Primary recovery action
- Secondary recovery action
- Log reference

### Error Catalog

| Codepath | What can go wrong | Rescue action | User sees |
|---|---|---|---|
| Vault validation | Missing/renamed path | prompt reselect; preserve old index until confirmed | "Vault not found. Choose folder again." |
| Markdown parse | Broken frontmatter/large file | skip file, record error, continue index | skipped-file count and details |
| Index rebuild | crash/corruption midway | staging DB transaction; keep old index | "Rebuild failed. Previous index kept." |
| Retrieval query | stale query result | version discard | no flicker; debug notes stale discard |
| iFlytek auth | invalid key/secret | stop provider, show setup action, manual fallback | actionable ASR auth error |
| iFlytek network | disconnect/timeout | cleanup billing, retry policy, fallback | provider degraded, switch option |
| Microphone permission | denied/revoked | open OS settings, manual fallback | permission instructions |
| Whisper startup | model missing/too slow | optional provider disabled | model setup prompt |
| Obsidian URI open | app missing/path encoded wrong | file-manager fallback; copy URI/path | troubleshoot panel |
| Session write | DB locked/full disk | retry async, drop debug event if needed | warning with storage action |
| NotebookLM metadata | malformed/stale schema | ignore asset, keep card usable | card without asset |

### Debug Panel

Settings > Advanced > Debug provides:

- Score breakdown for each retrieval result
- Stale retrieval event log
- Provider connection state history
- Index statistics and skipped file details

## Testing Strategy

Unit tests:

- Markdown title extraction
- Frontmatter parsing
- Tag extraction
- Obsidian URI encoding (Chinese, spaces, `#`, `?`, Unicode, traversal blocking)
- Search ranking
- Transcript windowing
- Retrieval ranking and deduplication
- Retrieval event versioning and stale discard
- Match reason generation
- Hotword extraction and deduplication
- Content hash computation
- Chunk ID generation
- Assistant state machine transitions

Integration tests:

- Temporary vault scan
- Multiple Markdown file indexing
- Staged index rebuild (failed rebuild preserves previous index)
- Search result snippets
- Transcript segment to related-note retrieval
- Infographic metadata binding when optional assets exist
- Obsidian URI construction with spaces and Chinese paths
- Session timeline persistence
- Keychain secret save/load
- SQLite schema migration

Relevance evaluation:

- Demo transcript fixtures map to expected top notes
- Acceptable alternative results defined
- Known false-positive examples documented
- Score breakdown logged for each eval run

Failure injection tests:

- Provider mock disconnect, auth failure, rapid stop
- SQLite corruption and locked DB
- Missing/malformed config
- Vault path changes during indexing

Manual end-to-end tests:

- macOS vault scan and search
- Windows 11 vault scan and search
- Obsidian note opening
- iFlytek real-time assistant mode
- Whisper fallback
- Shortcut toggle and push-to-talk
- Idle disconnect
- Live overlay result relevance during a real spoken demo
- Optional NotebookLM infographic asset display after an external skill writes outputs

## Performance Budget

Performance targets are split by layer:

- Stable transcript segment to retrieval result: P95 < 200 ms for indexed local search.
- UI result render after retrieval: P95 < 50 ms.
- Session event write: async, must not block result rendering.
- Initial indexing baselines: 100, 1k, 10k, 50k notes.
- Reindex must not block read-only search against last good index.

## DX Quickstart

Target: new developer runs Demo 0 in under 10 minutes.

Prerequisites:

```text
Demo 0: Node.js, pnpm, Tauri prerequisites, sample vault
Demo 1: + iFlytek credentials
Demo 2: + Whisper model download (optional)
```

Quickstart steps:

1. Clone and install: `pnpm install && pnpm tauri dev`
2. App launches, shows first-run onboarding.
3. Select `examples/demo-vault` as vault.
4. App verifies Obsidian and indexes the sample vault.
5. Type a demo transcript in Assistant panel.
6. See ranked results with match reasons.
7. Click a result to open the note in Obsidian.

Sample assets:

- `examples/demo-vault`: 20-50 notes covering typical vault structure, tags, links, and frontmatter.
- `examples/demo-transcripts`: typed transcripts with expected top results documented.

## Technology Stack

Recommended stack:

- Tauri for the desktop shell
- React + Vite for the UI
- TypeScript for UI and local service logic
- SQLite with FTS5 for indexing
- Node sidecar or TypeScript service for fast iteration
- Later Rust migration only where it simplifies packaging or performance

Alternatives:

- Electron + Node: faster development, larger app size.
- Local web app + Node service: fastest prototype, weaker desktop integration.
- Tauri + Node sidecar: recommended MVP balance.

### Tauri/Sidecar Command Boundary

The Tauri command boundary explicitly defines what the renderer can call:

- `validateVault(path)` - check vault path exists and contains Markdown files
- `startIndexing(vaultPath)` - trigger index scan
- `search(query, options)` - run FTS search
- `retrieve(transcript, windowId, version)` - run retrieval pipeline
- `openObsidianUri(vaultName, filePath)` - open note in Obsidian
- `manageSecrets(action, key, value?)` - get/set/delete secrets in OS keychain
- `getProviderStatus()` - check ASR provider availability
- `getSessionEvents(sessionId)` - load session timeline

The renderer must not have direct filesystem or credential access. All file and secret operations go through the Tauri command boundary.

## Runtime Requirements

The MVP does not require special workstation hardware.

Recommended environment:

- macOS 13+ or Windows 11
- 16 GB RAM recommended, 8 GB minimum
- 2 to 10 GB free disk depending on vault size, index size, session logs, and optional generated infographic count
- Network access for iFlytek
- Installed Obsidian desktop app
- Installed and authenticated `notebooklm` CLI only if running the optional infographic skill
- Microphone permission for assistant mode

GPU is not required for the primary demo. Local compute pressure mainly comes from Whisper fallback; smaller Whisper models can be selected on lower-resource machines.

## MVP Scope

Included:

- Configure vault path and vault name
- Scan Markdown notes
- Build SQLite FTS index with stable IDs and content hashes
- Transactional staged index rebuild
- Transcript-driven note retrieval with event versioning
- Live assistant overlay with 3 to 5 related notes
- Match reasons for related notes
- Live transcript/debug panel with score breakdown
- Session timeline for transcript and retrieval events
- Session retention controls and clear history
- Manual keyword search
- Manual text input as first-class mode (Demo 0)
- Card result UI with optional infographic thumbnail
- Open notes in Obsidian with hardened URI construction
- iFlytek-first assistant mode with trust boundary and consent
- Whisper as optional provider
- Global shortcut toggle
- Optional push-to-talk
- Idle disconnect for ASR cost control
- Basic hotword database
- OS keychain for API secret storage
- First-run onboarding flow
- Error catalog with codes, causes, and recovery actions
- Debug panel with score breakdown
- Sample vault and demo transcript fixtures
- Quickstart guide

Excluded:

- Built-in NotebookLM daemon
- Automatic NotebookLM infographic generation inside the desktop app
- Obsidian plugin
- Mobile support
- Multi-user collaboration
- Automatic edits to original Markdown notes
- Publishing packages for Douyin, Bilibili, or Xiaohongshu
- NotebookLM as the search engine
- Full system-wide floating window outside the app
- Vector search runtime (schema supports future addition)
- Cloud sync beyond the user's existing vault sync provider
- Packaged signed installer

Optional separate skill:

- Generate NotebookLM infographics for selected notes.
- Write PNGs to `Assets/knowledge-assistant/infographics/`.
- Write metadata under `Assets/knowledge-assistant/metadata/`.
- Let the desktop app display those assets when present.

## Implementation Preconditions

- Use Tauri + React/Vite + TypeScript for the first implementation plan.
- Store optional generated knowledge assets inside the vault under `Assets/knowledge-assistant/`.
- Store application index and config in the application data directory.
- Store API secrets in OS keychain, never in config files.
- Obtain iFlytek credentials before enabling the realtime provider.
- Treat global shortcut conflicts as user-configurable settings.
- Treat NotebookLM generation as an external skill boundary, not a desktop-app blocker.
- SQLite and config schemas must be versioned from day one.

## Next Steps

1. Build the sample vault (`examples/demo-vault`) with 20-50 representative notes.
2. Build the vault scanner and SQLite FTS5 index with stable IDs and content hashes.
3. Build manual text input and retrieval against the sample vault (Demo 0).
4. Build manual search, result cards, and Obsidian URI open path with hardened encoding.
5. Build first-run onboarding flow.
6. Add relevance eval fixtures and validate retrieval quality.
7. Add iFlytek realtime ASR and assistant state machine (Demo 1).
8. Add Whisper as optional provider after provider abstraction is proven.
9. Add session timeline persistence and retention controls.
10. Add hotword management.
11. Create a separate NotebookLM infographic skill that writes PNGs and metadata into `Assets/knowledge-assistant/`.
12. Teach the desktop app to display NotebookLM assets when present (Demo 3).

## Office Hours Recommendation

The chosen direction is `Live Knowledge Copilot`: assistant mode first, NotebookLM asset generation second.

Premises:

1. This is primarily a self-use tool and coding-ability showcase, not a commercial validation project.
2. The first demo must prove retrieval value with typed transcript input before adding audio.
3. NotebookLM infographics are valuable as memory and presentation assets, but they are not required to prove the core assistant experience.
4. A separate NotebookLM skill is the right boundary because it lets a coding agent handle brittle browser or CLI automation without blocking the desktop app.
5. The app should treat generated infographics as optional assets, not as part of the core retrieval system.

Approaches considered:

### Approach A: Demo 0 Retrieval Validation

- Summary: Build sample vault, indexing, manual transcript input, ranked results, match explanations, and Obsidian open.
- Effort: M
- Risk: Low
- Pros: validates relevance before ASR; easiest to test; best first coding checkpoint.
- Cons: less magical; does not prove microphone/provider integration.
- Reuses: SQLite FTS5, Obsidian URI, manual text fallback.

### Approach B: Original Live Knowledge Copilot

- Summary: Build Tauri app, indexing, overlay, iFlytek ASR, Whisper fallback, hotwords, session timeline, search, settings.
- Effort: L/XL
- Risk: High
- Pros: memorable demo if it works; showcases streaming, ranking, desktop integration.
- Cons: many independent failure modes; ASR can hide retrieval defects.
- Reuses: all planned architecture.

### Approach C: Obsidian-First Side Panel Prototype

- Summary: Prototype within Obsidian/plugin-like sidebar or local web panel first, focus on note recall during writing/meeting review.
- Effort: M/L
- Risk: Medium
- Pros: closer to where notes are used; avoids desktop overlay ambiguity.
- Cons: less cross-app; plugin constraints and distribution questions return sooner.
- Reuses: Obsidian as UI/workflow surface.

Recommendation: Approach A first, then Approach B. It preserves the final vision but creates a measurable gate before ASR and packaging.

## NotebookLM Infographic Generation

NotebookLM infographic generation is deferred from the first MVP and should be implemented as a separate coding-agent skill or offline asset-generation workflow. The desktop app should not depend on NotebookLM auth, rate limits, or artifact generation to deliver assistant mode.

The NotebookLM workflow may use the local `notebooklm` CLI. It should not rely on global notebook context in automation. Commands should pass explicit notebook IDs wherever supported.

Generation flow:

1. Validate auth with `notebooklm auth check --test --json`.
2. Create a notebook with `notebooklm create "<title>" --json`.
3. Add selected Markdown files with `notebooklm source add ./file.md --json`.
4. Wait for source processing with `notebooklm source wait <source_id> -n <notebook_id>`.
5. Generate an infographic with options for orientation, detail, and style.
6. Wait for artifact completion.
7. Download the PNG.
8. Write it to `Assets/knowledge-assistant/infographics/`.
9. Write metadata that maps the generated asset to the vault-relative note path.
10. Let the desktop app pick up the asset on the next reindex or metadata refresh.

Default infographic options:

- Orientation: `portrait`
- Detail: `standard`
- Style: `professional`
- Language: Simplified Chinese where supported by account settings

If implemented as a long-running process later, it should process jobs serially to avoid duplicate writes and NotebookLM context races. If implemented as a skill, it should be explicitly invoked by the user or coding agent and should write deterministic outputs for the app to consume.

Job states:

- `queued`
- `auth_required`
- `adding_sources`
- `waiting_sources`
- `generating`
- `waiting_artifact`
- `downloading`
- `completed`
- `failed_retryable`
- `failed_final`

Expected retryable failures include rate limiting, transient NotebookLM generation failures, auth expiry, and incomplete artifacts. These failures must not break assistant mode.
