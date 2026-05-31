<!-- /autoplan restore point: /Users/lichenlu/.gstack/projects/agent09/no-git-autoplan-restore-20260531-123556.md -->

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
- Keep local Whisper medium as offline fallback.
- Avoid modifying original Markdown notes in MVP.
- Use keyboard shortcuts to turn assistant mode on and off to control cloud ASR cost.
- Optimize the first demo around the path: microphone -> ASR -> transcript normalization -> note retrieval -> overlay -> Obsidian open.

## Architecture

The MVP uses these components:

- `vault`: The user's Obsidian vault. Markdown files are the source of truth.
- `indexer`: Scans Markdown files and extracts title, content, tags, frontmatter, links, backlinks, modified time, and optional associated asset paths.
- `index store`: SQLite database with FTS5 for low-latency keyword retrieval and snippets.
- `retrieval engine`: Converts transcript windows into search queries, ranks candidate notes, deduplicates repeated matches, and emits top related notes.
- `session store`: Local session history for transcripts, retrieval events, selected notes, and debug traces.
- `asset store`: Optional vault-local directory for generated infographics, metadata, and external skill outputs.
- `desktop app`: Cross-platform UI for assistant mode, live transcript, related-note overlay, search, preview, and settings.
- `obsidian opener`: Builds `obsidian://open?vault=<vaultName>&file=<vaultRelativePath>` links.
- `asr providers`: Pluggable speech recognition providers for iFlytek, local Whisper, and future experimental native providers.
- `notebooklm skill output`: Optional later workflow that writes generated infographics and metadata for the app to display.

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

## Obsidian Integration

MVP integration is intentionally light:

- The app reads Markdown files directly from the vault path.
- Search results open notes using Obsidian URI links.
- The app does not install or require a community plugin.
- The app does not write to original notes by default.
- Later versions can add an Obsidian plugin for sidebars, command palette commands, or in-Obsidian result panels.

This keeps the first version independent from Obsidian plugin compatibility and review constraints while preserving a clear upgrade path.

## Indexing

The indexer scans `.md` files in the selected vault and stores:

- Vault-relative path
- Title
- Frontmatter
- Tags
- Plain text content
- Internal links and backlinks where practical
- Modified time
- Optional infographic asset path
- Searchable snippets

The first version uses SQLite FTS5 for keyword search and transcript-driven retrieval. Vector search is out of scope for MVP but can be added later as a second ranking signal once the realtime path is stable.

The app supports manual reindexing in MVP. File watching can be added after the core scan/search path is stable.

## Live Retrieval

The retrieval engine is the core MVP behavior. It receives normalized transcript events and turns recent speech into a small set of candidate note queries.

Retrieval behavior:

- Maintain a rolling transcript window, such as the last 20 to 60 seconds.
- Extract candidate terms from note titles, tags, backlinks, and repeated transcript phrases.
- Run FTS5 searches against titles, tags, and note body text.
- Boost exact title, tag, and backlink matches above body-only matches.
- Suppress notes that were already shown recently unless the match score rises.
- Emit the top 3 to 5 notes with match reasons.
- Keep retrieval fast enough that results feel live, with a target under 500 ms after each stable transcript segment.

Match reasons should be human-readable:

- `title match`
- `tag match`
- `backlink match`
- `phrase match`
- `recently edited`

This feature is the main coding showcase. It demonstrates streaming input handling, state management, ranking, UI responsiveness, and practical local data retrieval without depending on NotebookLM or a hosted LLM.

## Search Experience

Search results are presented as cards:

- Infographic thumbnail when available
- Title
- Matched snippet
- Tags
- Modified time
- Optional asset status if an external infographic skill has generated or failed to generate an asset

Clicking a card opens the corresponding note in Obsidian. If Obsidian URI opening fails, the fallback is opening the file location in the operating system file manager.

## Office Hours Recommendation

The chosen direction is `Live Knowledge Copilot`: assistant mode first, NotebookLM asset generation second.

Premises:

1. This is primarily a self-use tool and coding-ability showcase, not a commercial validation project.
2. The first demo must prove the realtime path: microphone -> ASR -> transcript normalization -> note retrieval -> overlay -> Obsidian open.
3. NotebookLM infographics are valuable as memory and presentation assets, but they are not required to prove the core assistant experience.
4. A separate NotebookLM skill is the right boundary because it lets a coding agent handle brittle browser or CLI automation without blocking the desktop app.
5. The app should treat generated infographics as optional assets, not as part of the core retrieval system.

Approaches considered:

### Approach A: Assistant-first MVP

Build Tauri, vault indexing, iFlytek realtime ASR, top related-note overlay, and Obsidian opening. Keep NotebookLM as a later integration.

- Effort: M
- Risk: Medium
- Best for: Fast proof that assistant mode works.
- Tradeoff: Less visually rich because infographic generation is not part of the first build.

### Approach B: Full Knowledge Assistant MVP

Build the original full plan: search UI, NotebookLM daemon, infographic queue, iFlytek, Whisper, hotwords, job recovery, settings, and desktop packaging.

- Effort: XL
- Risk: High
- Best for: A complete product architecture.
- Tradeoff: Too many external dependencies for the first demo.

### Approach C: Live Knowledge Copilot

Make assistant mode the centerpiece. Build live transcript, retrieval ranking, match reasons, session timeline, and note-opening flow. Move NotebookLM into a separate skill that writes optional assets.

- Effort: L
- Risk: Medium
- Best for: Self-use plus showing strong engineering taste.
- Tradeoff: Requires retrieval and UI state to be genuinely good, not just present.

Recommendation: choose Approach C. It creates the most memorable demo and keeps the hard engineering inside the main app: streaming input, retrieval, ranking, state management, desktop permissions, and Obsidian integration.

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

## Assistant Mode

Assistant mode listens to speech, transcribes it, searches the vault, and shows related notes in a small result overlay. It is the first version's primary experience.

Default provider order:

1. iFlytek real-time transcription
2. Local Whisper medium
3. Manual text input fallback

The transcript pipeline emits normalized transcript events. Search logic is provider-independent.

Assistant mode behavior:

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

### iFlytek Realtime

iFlytek is the preferred Chinese ASR provider for MVP because it supports low-latency streaming and cloud-side hotword optimization.

Configuration:

- App ID
- API key
- API secret
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

Whisper medium is the offline fallback. It is suitable when privacy or offline availability matters more than real-time latency.

Expected behavior:

- Process audio in 3 to 8 second chunks.
- Use the shared hotword list as prompt context where supported by the runtime.
- Run post-processing corrections for known terms.
- Degrade to smaller models on low-resource machines if configured.

Whisper hotwords are a bias, not a guarantee. For domain-specific Chinese terms, post-processing remains necessary.

### Windows Native ASR

Windows native ASR is not a primary MVP provider. It may be explored later as an experimental provider or manual dictation fallback, but the MVP should not depend on it for continuous Chinese assistant mode.

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
- Build SQLite FTS index
- Transcript-driven note retrieval
- Live assistant overlay with 3 to 5 related notes
- Match reasons for related notes
- Live transcript/debug panel
- Session timeline for transcript and retrieval events
- Manual keyword search
- Card result UI with optional infographic thumbnail
- Open notes in Obsidian
- iFlytek-first assistant mode
- Whisper fallback
- Global shortcut toggle
- Optional push-to-talk
- Idle disconnect for ASR cost control
- Basic hotword database

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
- Vector search
- Cloud sync beyond the user's existing vault sync provider

Optional separate skill:

- Generate NotebookLM infographics for selected notes.
- Write PNGs to `Assets/knowledge-assistant/infographics/`.
- Write metadata under `Assets/knowledge-assistant/metadata/`.
- Let the desktop app display those assets when present.

## Error Handling

- Missing vault: ask the user to choose the vault again.
- Vault renamed: keep existing index but require confirmation before reindexing.
- Obsidian URI fails: show vault name/path troubleshooting and file-manager fallback.
- NotebookLM asset metadata missing: show the card without an infographic.
- NotebookLM skill failure: keep the desktop app usable and surface the failure only in the optional asset-generation workflow.
- ASR provider unavailable: fall back to the next provider.
- iFlytek connection failure: stop billing-sensitive streaming immediately and show the error.
- Microphone permission missing: show permission setup steps and keep manual text input available.
- Transcript instability: wait for stable segments before re-ranking to avoid result flicker.
- Index corruption: allow index rebuild without touching vault files.

## Testing Strategy

Unit tests:

- Markdown title extraction
- Frontmatter parsing
- Tag extraction
- Obsidian URI encoding
- Search ranking
- Transcript windowing
- Retrieval ranking and deduplication
- Match reason generation
- Hotword extraction and deduplication

Integration tests:

- Temporary vault scan
- Multiple Markdown file indexing
- Search result snippets
- Transcript segment to related-note retrieval
- Infographic metadata binding when optional assets exist
- Obsidian URI construction with spaces and Chinese paths
- Session timeline persistence

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

## Implementation Preconditions

- Use Tauri + React/Vite + TypeScript for the first implementation plan.
- Store optional generated knowledge assets inside the vault under `Assets/knowledge-assistant/`.
- Store application index and config in the application data directory.
- Obtain iFlytek credentials before enabling the realtime provider.
- Treat global shortcut conflicts as user-configurable settings.
- Treat NotebookLM generation as an external skill boundary, not a desktop-app blocker.

## Next Steps

1. Build the vault scanner and SQLite FTS5 index against a small real Obsidian vault.
2. Build the manual search and Obsidian URI open path before adding audio.
3. Add assistant mode with manual text input first, using typed transcript text to exercise retrieval and overlay behavior.
4. Add iFlytek realtime ASR and map stable transcript segments into the same retrieval pipeline.
5. Add Whisper fallback after the provider abstraction is proven with iFlytek and manual input.
6. Add session timeline persistence for transcript segments, retrieval events, and clicked notes.
7. Create a separate NotebookLM infographic skill that writes PNGs and metadata into `Assets/knowledge-assistant/`.
8. Teach the desktop app to display NotebookLM assets when present, while keeping assistant mode fully functional without them.

---

## GSTACK REVIEW REPORT

Generated by `/autoplan` on 2026-05-31.

Execution notes:

- Restore point: `/Users/lichenlu/.gstack/projects/agent09/no-git-autoplan-restore-20260531-123556.md`
- Workspace is not a git repository. Base branch fell back to `main`; commit and diff analysis are unavailable.
- Premise gate was confirmed by user reply: `继续`.
- AskUserQuestion was unavailable in this runtime, so final approval decisions are listed here as gates for the user instead of interactive tool prompts.
- UI scope: yes. DX scope: yes.
- Outside voices: CEO ran Codex + subagent. Design, Eng, and DX ran independent subagents. Codex voices for Design/Eng/DX were not run after the CEO pass; this review is therefore `DONE_WITH_CONCERNS`, not a fully clean dual-model autoplan.

### Plan Summary

The plan builds a local desktop live knowledge copilot around an Obsidian vault. The MVP reads Markdown notes, builds a SQLite FTS index, accepts transcript input, retrieves 3 to 5 related notes with match reasons, and opens selected notes in Obsidian. NotebookLM infographic generation remains an external skill/workflow and is not on the MVP critical path.

### Decisions Made

Total decisions: 22.

- Auto-decided: 18
- Taste choices: 1
- User challenges: 3

### User Challenges

These are not auto-applied. The user's original direction stands unless explicitly changed.

**Challenge 1: Validate retrieval before full live-ASR desktop MVP** (CEO)

- You said: first demo must prove `microphone -> ASR -> transcript normalization -> note retrieval -> overlay -> Obsidian open`.
- Both CEO voices recommend: add a Demo 0 milestone before ASR: `typed transcript -> reliable retrieval -> ranked explainable results -> session feedback -> open/reference note`.
- Why: both voices found the same strategic risk: the plan has not proven that real-time speech-triggered note recall is a high-frequency, high-value behavior. If typed/manual transcript retrieval cannot change the user's next action, ASR, Tauri packaging, hotwords, and Whisper do not matter yet.
- What we might be missing: this may be primarily a coding-ability showcase where the audio path itself is the point.
- If we are wrong, the cost is: deferring ASR may make the first demo feel less magical.
- Recommendation: accept the challenge. Add Demo 0 as the first implementation gate, then Demo 1 for iFlytek.

**Challenge 2: Obsidian-only may be too narrow as the long-term memory source** (CEO)

- You said: use Obsidian as the Markdown vault and primary writing environment.
- Both CEO voices recommend: keep Obsidian as the MVP source, but add a future-source boundary now so the architecture does not assume Obsidian is the only knowledge source forever.
- Why: valuable context may live in meetings, browser history, code, email, chat, and calendars. Competitors are moving toward cross-source memory rather than single-vault search.
- What we might be missing: this is explicitly a self-use Obsidian workflow, not a broad product.
- If we are wrong, the cost is: designing source abstraction too early can slow MVP.
- Recommendation: keep MVP Obsidian-only, but add `source_id`, `source_type`, and stable document IDs to schemas now.

**Challenge 3: FTS5-only retrieval may not support Chinese speech recall quality** (CEO + Eng)

- You said: vector search is out of scope for MVP; first version uses SQLite FTS5.
- Both CEO and Eng voices recommend: keep vector search out of MVP execution, but design the retrieval schema and eval harness so semantic retrieval can be added without rewriting indexing.
- Why: Chinese ASR output, aliases, project names, no-space text, and paraphrases are weak matches for plain keyword FTS. A demo can be tuned by hand; daily use needs measurable relevance.
- What we might be missing: title/tag/backlink-heavy vaults may work well enough for first use.
- If we are wrong, the cost is: adding chunk IDs and eval data now adds some planning overhead.
- Recommendation: add chunk/stable ID schema and relevance eval set now; defer embeddings implementation.

### Taste Choice

**Choice 1: Desktop app vs Obsidian plugin** (CEO)

- Recommendation: keep the external desktop app for MVP because it avoids Obsidian plugin review/compatibility and allows richer ASR/system integration.
- Viable alternative: prototype an Obsidian sidebar plugin earlier. It may fit the user's workflow better and reduce window/overlay complexity.
- Downstream impact if alternative is chosen: less cross-app control, but better in-Obsidian distribution and lower context-switching.

### Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Add Demo 0 typed-transcript retrieval before full ASR | User Challenge | P1 completeness | Proves the core value before provider and packaging complexity | Start directly with microphone/iFlytek |
| 2 | CEO | Keep NotebookLM generation external | Mechanical | P3 pragmatic | Correct boundary; NotebookLM auth/rate-limit failures must not block assistant mode | Built-in NotebookLM daemon |
| 3 | CEO | Keep Obsidian-only MVP, add future source schema | User Challenge | P2 boil lake | Avoids overbuilding cross-source ingestion while preventing schema lock-in | Hard-code Obsidian-only forever |
| 4 | CEO | Add relevance evaluation dataset | Mechanical | P1 completeness | Ranking cannot be improved safely without expected-hit cases | Manual feel-based tuning |
| 5 | CEO | Keep vector search implementation deferred | Taste | P3 pragmatic | Schema can prepare for embeddings without adding MVP runtime cost | Implement vector search in MVP |
| 6 | Design | Define app information architecture | Mechanical | P5 explicit | Implementers need exact screens and navigation | Leave screen structure implicit |
| 7 | Design | Resolve overlay meaning as in-app panel/secondary window | Mechanical | P5 explicit | Current scope conflicts with "no system-wide floating window" | Ambiguous overlay |
| 8 | Design | Add first-run onboarding flow | Mechanical | P1 completeness | Vault, Obsidian, permissions, indexing, and provider setup need visible recovery states | Start at main app with hidden setup errors |
| 9 | Design | Add interaction-state table | Mechanical | P1 completeness | Empty/error/partial states are core UX for a live assistant | Happy-path UI only |
| 10 | Design | Make manual text input a first-class mode | Mechanical | P3 pragmatic | Supports Demo 0 and isolates retrieval quality from ASR quality | Treat manual input as hidden fallback |
| 11 | Eng | Add cloud ASR trust boundary | Mechanical | P1 completeness | Voice/transcript/hotwords cross a third-party boundary | Implicit cloud ASR consent |
| 12 | Eng | Store API secrets in OS keychain | Mechanical | P1 completeness | `config.json` must not hold API secret | Plaintext API secret |
| 13 | Eng | Define Tauri/sidecar command boundary | Mechanical | P5 explicit | Prevents renderer from gaining broad filesystem/credential power | Ad hoc sidecar calls |
| 14 | Eng | Add retrieval event versioning and cancellation | Mechanical | P1 completeness | Prevents stale results and race conditions | Fire all queries and render last returned |
| 15 | Eng | Use transactional/staged indexing | Mechanical | P1 completeness | Reindex failure must not corrupt current search | In-place destructive rebuild |
| 16 | Eng | Harden Obsidian URI encoding/path normalization | Mechanical | P1 completeness | Chinese paths, spaces, and traversal need deterministic handling | Concatenate URI strings directly |
| 17 | Eng | Define assistant session state machine | Mechanical | P5 explicit | Billing-sensitive connections need idempotent stop/cleanup | State list without transitions |
| 18 | Eng | Add privacy/session retention controls | Mechanical | P1 completeness | Transcripts and debug traces are sensitive local data | Infinite local session/log retention |
| 19 | DX | Add Quickstart and demo vault | Mechanical | P1 completeness | Showcase must be reproducible without private notes | Depend on user's private vault only |
| 20 | DX | Downgrade Whisper to optional provider after Demo 1 | Mechanical | P3 pragmatic | Whisper install/model friction can block first demo | Whisper medium as required MVP fallback |
| 21 | DX | Add error catalog | Mechanical | P5 explicit | Errors need code, cause, recovery action, and debug detail | Error category list only |
| 22 | DX | Add schema/config versioning | Mechanical | P1 completeness | SQLite/config changes need safe migration from day one | No migration path |

### CEO Review

#### 0A. Premise Challenge

The strongest premise is sound: assistant mode should be the center of the first meaningful demo. The weak premise is that real-time microphone input must be the first proof point. Both outside voices challenged that. The plan should prove retrieval value with manual/typed transcript input first, then add iFlytek once relevance and UI trust are measurable.

Specific premises:

- Self-use and coding showcase: reasonable, but success metrics are missing.
- Realtime path must be proven first: valid as a final demo path, risky as the first implementation path.
- NotebookLM can be external: valid boundary.
- Obsidian is primary source: valid for MVP, risky if schemas make future sources hard.
- Generated infographics are optional assets: valid.

#### 0B. Existing Code Leverage

No implementation code exists in this workspace. Existing leverage is conceptual:

| Sub-problem | Existing leverage | Reuse decision |
|---|---|---|
| Markdown source of truth | Obsidian vault files | Reuse directly; do not rewrite notes |
| Search | SQLite FTS5 | Use for Demo 0, but isolate behind retrieval interface |
| Note opening | Obsidian URI | Use, but normalize/encode paths and add verifier |
| ASR | iFlytek + Whisper | Provider abstraction; manual text first |
| Asset generation | NotebookLM external skill | Keep external; define metadata contract |

#### 0C. Dream State Mapping

```text
CURRENT STATE
  Obsidian vault holds notes, but recall depends on manual search and memory.
      |
      v
THIS PLAN
  Local desktop app indexes vault, accepts live/manual transcript, shows related notes,
  and opens notes in Obsidian with explainable match reasons.
      |
      v
12-MONTH IDEAL
  A low-interruption memory assistant that works across meetings, writing, and review:
  it recalls relevant context, explains source evidence, tracks session decisions,
  supports multiple knowledge sources, and keeps privacy controls explicit.
```

#### 0C-bis. Implementation Alternatives

**Approach A: Demo 0 Retrieval Validation**

- Summary: Build sample vault, indexing, manual transcript input, ranked results, match explanations, and Obsidian open.
- Effort: M
- Risk: Low
- Pros: validates relevance before ASR; easiest to test; best first coding checkpoint.
- Cons: less magical; does not prove microphone/provider integration.
- Reuses: SQLite FTS5, Obsidian URI, manual text fallback.

**Approach B: Original Live Knowledge Copilot**

- Summary: Build Tauri app, indexing, overlay, iFlytek ASR, Whisper fallback, hotwords, session timeline, search, settings.
- Effort: L/XL
- Risk: High
- Pros: memorable demo if it works; showcases streaming, ranking, desktop integration.
- Cons: many independent failure modes; ASR can hide retrieval defects.
- Reuses: all planned architecture.

**Approach C: Obsidian-First Side Panel Prototype**

- Summary: Prototype within Obsidian/plugin-like sidebar or local web panel first, focus on note recall during writing/meeting review.
- Effort: M/L
- Risk: Medium
- Pros: closer to where notes are used; avoids desktop overlay ambiguity.
- Cons: less cross-app; plugin constraints and distribution questions return sooner.
- Reuses: Obsidian as UI/workflow surface.

Recommendation: Approach A first, then Approach B. It preserves the final vision but creates a measurable gate before ASR and packaging.

#### 0D. Selective Expansion

Accepted into plan:

- Demo 0 typed transcript validation milestone.
- Relevance eval dataset with expected top notes and false-positive cases.
- Privacy/trust boundary for cloud ASR.
- Full first-run onboarding and error catalog.
- Stable document/chunk/source schema for future retrieval upgrades.

Deferred to TODO:

- Cross-source memory ingestion beyond Obsidian.
- Obsidian plugin prototype.
- Vector/embedding search implementation.
- Hosted/browser-extension memory layer.

Skipped for MVP:

- Built-in NotebookLM daemon.
- Publishing/distribution beyond local development demo.
- Mobile support.

#### 0E. Temporal Interrogation

| Time | Decision implementer will hit | Resolution now |
|---|---|---|
| Hour 1 | What is the first runnable demo path? | Demo 0: sample vault + manual transcript + retrieval + Obsidian open |
| Hour 2-3 | How are documents indexed and identified? | Add stable file/chunk/source IDs and content hash |
| Hour 4-5 | How does UI avoid stale retrieval results? | Version retrieval requests and discard stale results |
| Hour 6+ | How do we know ranking improved? | Add relevance eval set and score breakdown |

### CEO Dual Voices - Consensus Table

| Dimension | Claude Subagent | Codex | Consensus |
|---|---|---|---|
| Premises valid? | Partially | Partially | CONFIRMED concern |
| Right problem to solve? | Needs reframing | Needs validation | CONFIRMED concern |
| Scope calibration correct? | Over-scoped | Over-scoped | CONFIRMED concern |
| Alternatives sufficiently explored? | No | No | CONFIRMED concern |
| Competitive/market risks covered? | No | No | CONFIRMED concern |
| 6-month trajectory sound? | Risky | Risky | CONFIRMED concern |

### Design Review

Initial design completeness: 4/10.

A 10/10 plan would define the visible app model, first-run flow, assistant states, search/result card behavior, overlay semantics, settings pages, privacy controls, empty/error/partial states, and responsive/accessibility constraints.

#### Design Scope and Existing Leverage

- No `DESIGN.md` exists in this workspace.
- Existing UI patterns: none.
- The plan is app UI, not landing-page UI. It should be quiet, task-focused, and dense enough for repeated use.

#### Design Pass Scores

| Pass | Score | Findings |
|---|---:|---|
| Information Architecture | 4/10 | Main app structure undefined |
| Interaction State Coverage | 3/10 | Missing first-run, indexing, ASR, empty, partial, error states |
| User Journey | 4/10 | Demo path exists, onboarding path does not |
| AI Slop Risk | 7/10 | Plan is utility-focused, but "cards/overlay" remain generic |
| Design System Alignment | 2/10 | No design system or component vocabulary |
| Responsive & Accessibility | 3/10 | Keyboard, screen reader, touch, sizing not specified |
| Unresolved Decisions | 4/10 | Overlay, search vs assistant, manual input, settings IA unresolved |

#### Recommended UI Information Architecture

```text
App Shell
├── Assistant
│   ├── Status/control strip
│   ├── Manual transcript input (Demo 0)
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

#### Interaction State Table

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Vault setup | scanning path | no vault selected | path invalid | vault verified | vault valid, Obsidian URI unverified |
| Indexing | file count/progress | no Markdown files | parser/index failure | indexed with stats | skipped files listed |
| Assistant | connecting/provider start | no transcript yet | provider/permission failure | transcript and results updating | partial transcript, no final segment |
| Retrieval | ranking current segment | no related notes | query/index unavailable | top 3-5 notes | stale result suppressed |
| Obsidian open | opening URI | no note selected | URI failed | note opened | fallback available |
| Session timeline | loading session | no history | DB read failure | events shown | debug traces hidden |

#### Design Decisions Added

- Define overlay as in-app assistant panel for MVP, not system-wide floating window.
- Make manual text input visible in Assistant and use it for Demo 0.
- Show user-language match reasons, not raw engineering labels.
- Add privacy/storage settings for transcript retention and logs.
- Hide NotebookLM asset failure/queue states from normal result cards unless an asset management view exists.

### Design Voice Summary

Design subagent found 20 issues. Highest severity:

- Core interface structure undefined.
- `live overlay` conflicts with "no full system-wide floating window".
- First-use onboarding missing.
- Indexing and assistant states missing.
- Manual text fallback lacks a designed entry point.

Codex design voice was not run. Consensus count is therefore N/A.

### Eng Review

#### Scope Challenge

The plan is architecturally plausible, but it is too broad for the first runnable demo. The complete path should be staged:

1. Demo 0: sample vault + SQLite FTS + manual transcript + result cards + Obsidian open.
2. Demo 1: iFlytek ASR + provider abstraction + assistant state machine.
3. Demo 2: session timeline + hotwords + Whisper optional provider.
4. Demo 3: external NotebookLM asset consumption.

#### Architecture Diagram

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
  │   └── Whisper optional
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

#### Data Flow

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

#### Assistant State Machine

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

#### Eng Findings

| Severity | Finding | Required plan change |
|---|---|---|
| Critical | Cloud ASR privacy boundary unclear | Add explicit consent, provider trust boundary, per-vault cloud disable, local-only mode |
| Critical | API secret/session/log storage undefined | Use OS keychain for secrets; retention and redaction for transcripts/logs |
| High | Tauri + sidecar permission boundary vague | Define command API, schemas, and renderer restrictions |
| High | Retrieval concurrency missing | Add versioning, cancellation, debounce/backpressure |
| High | Index consistency under file changes/reindex missing | Use staging table/transactional swap and content hashes |
| High | Obsidian URI path normalization risky | Encode parameters and block traversal/absolute paths |
| High | Chinese FTS/tokenization risk | Pick tokenizer strategy and include Chinese ASR error cases |
| High | Assistant error state list lacks transitions | Add full state machine and provider contract |
| Medium | NotebookLM metadata contract soft | Add schema version and manifest rules |
| Medium | Session timeline retention undefined | Add retention, clear history, debug off by default |
| Medium | Performance budget not split | Add P50/P95 budgets and benchmark vault sizes |
| Medium | Tests miss failure injection | Add provider, sidecar, SQLite, URI, shortcut, and corruption tests |
| Medium | Packaging/distribution not closed | Define dev-demo vs packaged app boundary |

#### Error & Rescue Registry

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

#### Failure Modes Registry

| Codepath | Failure mode | Rescued? | Test? | User sees? | Logged? |
|---|---|---:|---:|---|---:|
| Cloud ASR | provider receives sensitive hotwords without consent | No | No | Silent | No |
| Secret storage | API secret written to config/log | No | No | Silent | No |
| Index rebuild | partial index replaces good index | Planned fix | No | stale/missing results | Yes |
| Retrieval | stale result overwrites latest result | Planned fix | No | flicker/wrong card | Debug |
| Obsidian open | malformed URI for Chinese path | Planned fix | Yes needed | open fails | Yes |
| FTS retrieval | Chinese ASR phrase not tokenized | Planned fix | Yes needed | no results | Debug |
| Provider toggle | rapid start/stop leaves ASR connected | Planned fix | Yes needed | billing risk | Yes |
| Session timeline | transcript retained forever | Planned fix | No | invisible privacy risk | No |

Critical gaps before implementation: cloud ASR consent, secret storage, session retention, provider stop idempotency.

### Test Diagram

```text
NEW UX FLOWS
  [+] First run: choose vault -> verify Obsidian -> index -> Demo 0 input
      [GAP] E2E: empty vault, invalid vault, success vault
  [+] Manual transcript -> related notes -> open Obsidian
      [GAP] E2E: sample transcript returns expected top note
  [+] iFlytek mode -> transcript -> retrieval -> stop billing
      [GAP] integration: provider mock disconnect, auth failure, rapid stop
  [+] Search -> result card -> preview/open
      [GAP] E2E: Chinese path and spaces
  [+] Settings -> credentials/shortcuts/privacy
      [GAP] E2E: validation and redaction

NEW DATA FLOWS
  vault file -> parser -> staged index -> FTS
      Unit/integration: frontmatter, tags, links, broken files, large files
  transcript segment -> query -> rank -> result
      Unit/integration: dedupe, suppression, stale version discard
  external asset metadata -> card thumbnail
      Integration: schema version, missing file, malformed metadata

NEW CODEPATHS
  provider start/stop/dispose
  Obsidian URI construction
  keychain secret save/load
  SQLite migration/rebuild
  session retention cleanup

NEW EXTERNAL CALLS
  iFlytek websocket/API
  OS keychain
  OS microphone/global shortcut permission
  Obsidian URI handler
  optional NotebookLM CLI workflow

COVERAGE TARGET
  Unit: parser, URI, ranking, tokenizer, state machine
  Integration: indexing, retrieval, provider contract, keychain, SQLite migration
  E2E: Demo 0, Obsidian open, first-run onboarding, provider failure fallback
  Manual: macOS/Windows shortcut, microphone permission, clean-machine run
```

### Performance Review

Performance target should be split:

- Stable segment to retrieval result: P95 < 200 ms for indexed local search.
- UI result render after retrieval: P95 < 50 ms.
- Session event write: async, must not block result rendering.
- Initial indexing baselines: 100, 1k, 10k, 50k notes.
- Reindex must not block read-only search against last good index.

### Eng Voice Summary

Eng subagent found 13 issues. Highest severity:

- Cloud ASR privacy boundary.
- Secret/session/log storage.
- Tauri/sidecar permission boundary.
- Retrieval concurrency.
- Index consistency.
- Obsidian URI normalization.

Codex eng voice was not run. Consensus count is N/A.

### DX Review

Product type: local desktop developer/self-use tool and coding showcase.

Primary developer persona:

```text
Who: Solo builder using an Obsidian vault and trying to produce a convincing local demo.
Context: Wants to run the app locally, point it at a vault, type/speak a transcript, and see useful note recall.
Tolerance: 5 to 10 minutes for a demo setup; much less if credentials or models fail silently.
Expects: clear quickstart, sample vault, reproducible demo transcript, precise error messages, and local privacy controls.
```

Developer empathy narrative:

> I clone the project and look for how to run it. The plan tells me the architecture, but not the command sequence. I do not know whether I need Rust, Node, pnpm, Tauri prerequisites, iFlytek credentials, Whisper models, or a prepared Obsidian vault. If I do not have a private vault suitable for demo, I cannot tell whether bad results are my notes or the app. If iFlytek fails, I need to know whether the issue is credentials, network, permission, or unsupported language settings. I need a sample vault and typed transcript path first so I can prove the core retrieval loop before touching audio.

Competitive/reference benchmark:

| Tool class | TTHW target | Relevant DX choice |
|---|---:|---|
| Local desktop dev demo | < 10 min | one command, sample data, visible success state |
| CLI/devtool champion tier | < 5 min | copy-paste quickstart and sample output |
| Current plan | unknown | no quickstart or sample vault yet |

TTHW estimate now: 30-60 min for a new implementer because Tauri, credentials, vault choice, ASR, and Whisper are undefined.

Target: < 10 min for Demo 0; < 20 min for Demo 1 with iFlytek credentials.

Magical moment:

```text
Type: copy-paste demo transcript over a sample vault.
Moment: The user types a sentence about a project/person and sees one expected note appear with an understandable reason, then opens it in Obsidian.
Why: It proves retrieval quality independent from microphone and provider setup.
```

#### Developer Journey Map

| Stage | Developer does | Friction points | Status |
|---|---|---|---|
| Discover | reads plan | no quickstart | fix now |
| Install | installs deps | stack prereqs unknown | fix now |
| Configure | chooses vault/provider | credentials/keychain undefined | fix now |
| Hello World | runs Demo 0 | sample vault missing | fix now |
| Real Usage | points at real vault | indexing/tokenization rules missing | fix now |
| Debug | investigates bad result | score breakdown missing | fix now |
| Upgrade | schema/config changes | version/migration missing | fix now |
| Privacy | reviews stored data | retention/clear controls missing | fix now |
| Package | runs outside dev | packaging boundary missing | defer after Demo 1 |

#### DX Scorecard

| Dimension | Score | Notes |
|---|---:|---|
| Getting Started | 3/10 | no quickstart/sample vault |
| API/CLI/SDK | 5/10 | internal provider/config surfaces implied but not named |
| Error Messages | 4/10 | categories exist, catalog missing |
| Documentation | 4/10 | architecture doc strong, runnable docs missing |
| Upgrade Path | 3/10 | SQLite/config versioning absent |
| Dev Environment | 4/10 | Tauri/Node/Whisper/iFlytek path unclear |
| Community/Ecosystem | 5/10 | not a commercial OSS concern yet |
| Measurement | 4/10 | no TTHW or relevance eval metric |

Overall DX: 4/10 now. Target after fixes: 8/10 for Demo 0.

#### DX Implementation Checklist

- [ ] Demo 0 TTHW < 10 min
- [ ] `examples/demo-vault` with 20-50 notes
- [ ] Demo transcript fixtures with expected top results
- [ ] Quickstart with install/run commands and expected output
- [ ] Manual transcript input is default fallback
- [ ] iFlytek test connection UI/command
- [ ] Secrets stored in OS keychain
- [ ] Error catalog with problem/cause/fix/log reference
- [ ] Debug panel with score breakdown
- [ ] SQLite/config schema versions
- [ ] Retention and clear-history controls

### DX Voice Summary

DX subagent found 12 issues. Highest severity:

- Missing zero-to-demo quickstart.
- iFlytek credential setup not actionable.
- Whisper fallback creates installation friction.
- No sample vault, hurting showcase reproducibility.

Codex DX voice was not run. Consensus count is N/A.

### Cross-Phase Themes

**Theme: Validate retrieval before audio** - flagged by CEO and DX. High-confidence signal.

**Theme: Privacy and sensitive local data** - flagged by Eng, Design, and DX. High-confidence signal.

**Theme: Missing explicit UI states** - flagged by Design, Eng, and DX. High-confidence signal.

**Theme: Relevance cannot be improved without evals/debug traces** - flagged by CEO, Eng, and DX. High-confidence signal.

**Theme: Scope is too broad for first runnable demo** - flagged by CEO and DX. High-confidence signal.

### NOT in Scope

| Item | Rationale |
|---|---|
| Built-in NotebookLM daemon | External skill boundary is correct for MVP |
| Full system-wide floating window | Conflicts with MVP scope and adds OS/window complexity |
| Vector search runtime | Defer implementation, but design schema/evals now |
| Obsidian plugin | Taste decision; keep desktop app first |
| Mobile support | Not needed for first local demo |
| Cross-source memory ingestion | Add schema hooks, defer actual ingestion |
| Packaged signed installer | Defer until Demo 0/1 are proven |
| Whisper as required fallback | Make optional after manual text fallback |

### What Already Exists

| Existing asset | Used by plan | Notes |
|---|---|---|
| Obsidian Markdown vault | yes | source of truth |
| Obsidian URI | yes | needs verifier and encoding tests |
| SQLite FTS5 | yes | needs Chinese/tokenization decision |
| NotebookLM CLI/workflow | external | define metadata contract only |
| Manual text input fallback | mentioned | promote to first-class Demo 0 |

### Dream State Delta

The reviewed plan moves toward the 12-month ideal by choosing local-first Obsidian integration, explainable retrieval, and external asset workflows. It falls short on measurable relevance, low-interruption behavior, privacy trust boundaries, and future source abstraction. With Demo 0, evals, explicit UI states, and privacy controls added, the plan becomes a credible foundation instead of a brittle live-ASR demo.

### Implementation Tasks

Synthesized from review findings.

- [ ] **T1 (P1, human: ~2h / CC: ~20min) - Scope - Add Demo 0 milestone**
  - Surfaced by: CEO User Challenge - retrieval value must be proven before ASR.
  - Files: `docs/superpowers/specs/2026-05-31-personal-knowledge-assistant-design.md`
  - Verify: plan lists Demo 0/1/2 gates and success metrics.
- [ ] **T2 (P1, human: ~3h / CC: ~30min) - Privacy - Define ASR trust boundary and secret storage**
  - Surfaced by: Eng critical findings - cloud ASR and API secret handling.
  - Files: plan, future config/keychain modules.
  - Verify: no API secret in config/logs; cloud ASR consent path exists.
- [ ] **T3 (P1, human: ~3h / CC: ~30min) - Retrieval - Add relevance eval set**
  - Surfaced by: CEO/Eng/DX - ranking quality otherwise becomes subjective.
  - Files: `examples/demo-vault`, test fixtures.
  - Verify: fixture transcript maps to expected top notes.
- [ ] **T4 (P1, human: ~4h / CC: ~45min) - UI - Specify onboarding, assistant states, and result cards**
  - Surfaced by: Design critical findings.
  - Files: plan and future UI components.
  - Verify: interaction state table covers loading/empty/error/success/partial.
- [ ] **T5 (P1, human: ~3h / CC: ~30min) - Architecture - Define event flow and state machine**
  - Surfaced by: Eng high findings - concurrency and provider cleanup.
  - Files: plan and future service/provider modules.
  - Verify: rapid toggle, stale retrieval, disconnect, fallback covered by tests.
- [ ] **T6 (P1, human: ~2h / CC: ~20min) - DX - Add Quickstart and sample vault**
  - Surfaced by: DX critical findings.
  - Files: README/future docs, `examples/demo-vault`.
  - Verify: new user can run Demo 0 in < 10 minutes.
- [ ] **T7 (P2, human: ~2h / CC: ~20min) - Indexing - Add stable IDs, content hashes, and staged rebuild**
  - Surfaced by: Eng high findings.
  - Files: future index schema/migration.
  - Verify: failed rebuild keeps previous index usable.
- [ ] **T8 (P2, human: ~2h / CC: ~20min) - Obsidian - Harden URI construction**
  - Surfaced by: Eng/DX URI findings.
  - Files: future opener module/tests.
  - Verify: Chinese, spaces, `#`, `?`, Windows separators, traversal blocked.
- [ ] **T9 (P2, human: ~2h / CC: ~20min) - Debuggability - Add debug panel and error catalog**
  - Surfaced by: DX/Eng observability findings.
  - Files: plan, future UI/service.
  - Verify: every major error has code, cause, fix, log reference.
- [ ] **T10 (P3, human: ~1d / CC: ~1h) - Future - Explore Obsidian plugin prototype**
  - Surfaced by: CEO taste decision.
  - Files: TODO only.
  - Verify: one-page comparison of plugin vs external app after Demo 0.

### Aggregated Implementation Tasks

- [ ] **T1 (P1, human: ~2h / CC: ~20min) - Scope** - Add Demo 0 typed transcript retrieval milestone.
- [ ] **T2 (P1, human: ~3h / CC: ~30min) - Privacy** - Define ASR trust boundary and keychain secret storage.
- [ ] **T3 (P1, human: ~3h / CC: ~30min) - Retrieval** - Add relevance eval fixtures.
- [ ] **T4 (P1, human: ~4h / CC: ~45min) - UI** - Specify onboarding, assistant states, and result cards.
- [ ] **T5 (P1, human: ~3h / CC: ~30min) - Architecture** - Define event flow and assistant state machine.
- [ ] **T6 (P1, human: ~2h / CC: ~20min) - DX** - Add quickstart and sample vault.
- [ ] **T7 (P2, human: ~2h / CC: ~20min) - Indexing** - Add stable IDs/content hashes/staged rebuild.
- [ ] **T8 (P2, human: ~2h / CC: ~20min) - Obsidian** - Harden URI construction and setup verifier.
- [ ] **T9 (P2, human: ~2h / CC: ~20min) - Debuggability** - Add debug panel and error catalog.
- [ ] **T10 (P3, human: ~1d / CC: ~1h) - Future** - Revisit Obsidian plugin after Demo 0.

### Deferred to TODOS.md

- Cross-source memory ingestion beyond Obsidian.
- Obsidian plugin prototype.
- Vector search implementation.
- Packaged signed installer.
- Whisper provider implementation details.
- NotebookLM asset manager UI.

### Review Scores

- CEO: concerns open; 6/6 consensus concerns in CEO dual voices.
- CEO voices: Codex 10 concerns; Claude subagent 15 concerns; consensus 6/6 confirmed concerns.
- Design: 4/10 initial, target 8/10 after specified UI/state additions.
- Design voices: subagent-only; Codex skipped.
- Eng: high-risk gaps open; critical privacy/storage gaps must be resolved before ASR.
- Eng voices: subagent-only; Codex skipped.
- DX: 4/10 initial, target 8/10 after quickstart/sample vault/error catalog.
- DX voices: subagent-only; Codex skipped.

### Final Approval Gate

Recommended approval: approve with the three User Challenges accepted.

If approved, revise the plan in this order:

1. Add Demo 0/1/2 milestones and success metrics.
2. Add UI information architecture and interaction-state table.
3. Add ASR trust boundary, keychain storage, retention policy.
4. Add retrieval eval fixtures and debug panel.
5. Add quickstart and sample vault requirements.

Open user decisions:

- Accept Challenge 1 and add Demo 0 before ASR?
- Accept Challenge 2 and add source abstraction schema while keeping Obsidian-only MVP?
- Accept Challenge 3 and add chunk/stable-ID schema plus evals while deferring vector search implementation?
- Keep external desktop app over Obsidian plugin for MVP?

### Completion Status

DONE_WITH_CONCERNS.

The review is complete enough to guide implementation, but not a fully clean `/autoplan` run because the runtime lacked AskUserQuestion and only CEO received both Codex and subagent outside voices. Design, Eng, and DX used subagent-only outside voices.
