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
