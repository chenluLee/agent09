import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { demoCommands } from "./api/commands";
import type { RetrievalResult } from "./core/types";

const defaultTranscript = "演示 0：输入文本检索，显示匹配原因并支持通过 Obsidian URI 打开笔记。";

export function App() {
  const [vaultPath, setVaultPath] = useState("examples/demo-vault");
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [status, setStatus] = useState("就绪");
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [version, setVersion] = useState(0);
  const [indexed, setIndexed] = useState(false);

  const topNotes = useMemo(() => result?.notes ?? [], [result]);

  useEffect(() => {
    void indexVault();
  }, []);

  async function indexVault() {
    setStatus("正在索引知识库...");
    const validation = await demoCommands.validateVault(vaultPath);
    if (!validation.valid) {
      setStatus("知识库无效：请选择包含 Markdown 文件的文件夹。");
      return;
    }
    const stats = await demoCommands.startIndexing(vaultPath);
    setStatus(`已索引 ${stats.documentCount} 篇笔记，共 ${stats.chunkCount} 个片段。`);
    setIndexed(true);
  }

  async function retrieve() {
    if (!indexed) {
      setStatus("请先点击「索引知识库」构建索引后再检索。");
      return;
    }
    const nextVersion = version + 1;
    setVersion(nextVersion);
    setStatus("正在检索相关笔记...");
    const nextResult = await demoCommands.retrieve({
      transcript,
      windowId: "manual",
      version: nextVersion,
      limit: 5
    });
    setResult(nextResult);
    setStatus(`检索到 ${nextResult.notes.length} 篇相关笔记，耗时 ${nextResult.elapsedMs} 毫秒。`);
  }

  async function openNote(path: string) {
    const uri = await demoCommands.openObsidianUri(path);
    window.location.href = uri;
  }

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="知识库设置">
        <div>
          <h1>个人知识助手 Demo 0</h1>
          <p>{status}</p>
        </div>
        <label className="field">
          <span>知识库路径</span>
          <input value={vaultPath} onChange={(event) => setVaultPath(event.target.value)} />
        </label>
        <button className="icon-button text-button" type="button" onClick={indexVault}>
          <RefreshCw size={18} />
          索引知识库
        </button>
      </section>

      <section className="workspace">
        <form className="transcript-panel" onSubmit={(event) => { event.preventDefault(); void retrieve(); }}>
          <label className="field">
            <span>输入文本</span>
            <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={9} />
          </label>
          <button className="icon-button text-button primary" type="submit">
            <Search size={18} />
            检索笔记
          </button>
        </form>

        <section className="results-panel" aria-label="相关笔记">
          {topNotes.length === 0 ? (
            <div className="empty-state">{indexed ? "暂无相关笔记。" : "请先索引知识库后再检索。"}</div>
          ) : (
            topNotes.map((note) => (
              <article className="result-card" key={note.documentId}>
                <div className="result-header">
                  <div>
                    <h2>{note.title}</h2>
                    <p>{note.path}</p>
                  </div>
                  <button className="icon-button" type="button" onClick={() => void openNote(note.path)} aria-label={`打开 ${note.title}`}>
                    <ExternalLink size={18} />
                  </button>
                </div>
                <p className="snippet" dangerouslySetInnerHTML={{ __html: note.snippet }} />
                <div className="chips">
                  {note.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                </div>
                <details>
                  <summary>评分 {note.score}</summary>
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
