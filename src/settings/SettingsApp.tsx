import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { createFetchCommands } from "../api/commands";
import type { AppConfig } from "../core/config";

const commands = createFetchCommands();

const defaultConfig: AppConfig = {
  vaultPath: "",
  vaultName: "",
  shortcut: "Ctrl+Shift+Space",
  iflytek: { appId: "", apiKey: "", apiSecret: "" },
  retrieval: { limit: 5 }
};

export function SettingsApp() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [status, setStatus] = useState("加载中...");
  const [hotwords, setHotwords] = useState<string[]>([]);
  const [hotwordStatus, setHotwordStatus] = useState("");

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const loaded = await commands.getConfig() as unknown as AppConfig;
      setConfig(loaded);
      setStatus("设置已加载。");
    } catch {
      setStatus("加载设置失败，请检查服务是否运行。");
    }
  }

  async function handleSave() {
    try {
      setStatus("正在保存...");
      await commands.saveConfig(config as unknown as Record<string, unknown>);
      setStatus("设置已保存。");
    } catch {
      setStatus("保存失败。");
    }
  }

  async function handleIndex() {
    try {
      setStatus("正在索引知识库...");
      const stats = await commands.startIndexing(config.vaultPath);
      setStatus(`已索引 ${stats.documentCount} 篇笔记，共 ${stats.chunkCount} 个片段。`);
    } catch {
      setStatus("索引失败，请检查知识库路径。");
    }
  }

  async function handleExtractHotwords() {
    try {
      setHotwordStatus("正在提取...");
      const result = await commands.getHotwords();
      setHotwords(result);
      setHotwordStatus(result.length > 0 ? `已提取 ${result.length} 个热词。` : "未找到符合条件的热词。");
    } catch {
      setHotwordStatus("提取热词失败，请先索引知识库。");
    }
  }

  async function handleCopyHotwords() {
    if (!navigator.clipboard) {
      setHotwordStatus("复制失败：剪贴板 API 不可用。");
      return;
    }
    try {
      await navigator.clipboard.writeText(hotwords.join("\n"));
      setHotwordStatus("已复制到剪贴板。");
    } catch {
      setHotwordStatus("复制失败。");
    }
  }

  return (
    <main className="settings-shell">
      <header>
        <h1>知识助手设置</h1>
        <p>{status}</p>
      </header>

      <section className="settings-section">
        <h2>知识库</h2>
        <label className="settings-field">
          <span>知识库路径</span>
          <input
            value={config.vaultPath}
            onChange={(e) => setConfig({ ...config, vaultPath: e.target.value })}
            aria-label="知识库路径"
          />
        </label>
        <label className="settings-field">
          <span>知识库名称</span>
          <input
            value={config.vaultName}
            onChange={(e) => setConfig({ ...config, vaultName: e.target.value })}
            aria-label="知识库名称"
          />
        </label>
        <button className="settings-btn" type="button" onClick={handleIndex}>
          <RefreshCw size={16} />
          索引知识库
        </button>
      </section>

      <section className="settings-section">
        <h2>iFlytek 语音识别</h2>
        <label className="settings-field">
          <span>App ID</span>
          <input
            value={config.iflytek.appId}
            onChange={(e) =>
              setConfig({ ...config, iflytek: { ...config.iflytek, appId: e.target.value } })
            }
            aria-label="App ID"
          />
        </label>
        <label className="settings-field">
          <span>API Key</span>
          <input
            type="password"
            value={config.iflytek.apiKey}
            onChange={(e) =>
              setConfig({ ...config, iflytek: { ...config.iflytek, apiKey: e.target.value } })
            }
            aria-label="API Key"
          />
        </label>
        <label className="settings-field">
          <span>API Secret</span>
          <input
            type="password"
            value={config.iflytek.apiSecret}
            onChange={(e) =>
              setConfig({ ...config, iflytek: { ...config.iflytek, apiSecret: e.target.value } })
            }
            aria-label="API Secret"
          />
        </label>
      </section>

      <section className="settings-section">
        <h2>热词管理</h2>
        <p>从已索引的标签中提取纯中文、不超过 7 字的热词，用于讯飞语音识别热词表。</p>
        <button
          className="settings-btn"
          type="button"
          onClick={handleExtractHotwords}
          disabled={hotwordStatus === "正在提取..."}
        >
          <RefreshCw size={16} />
          提取热词
        </button>
        {hotwords.length > 0 && (
          <>
            <textarea
              value={hotwords.join("\n")}
              readOnly
              rows={Math.min(hotwords.length, 10)}
              aria-label="热词列表"
            />
            <button className="settings-btn" type="button" onClick={handleCopyHotwords}>
              复制到剪贴板
            </button>
          </>
        )}
        {hotwordStatus && <p>{hotwordStatus}</p>}
      </section>

      <footer>
        <button className="settings-btn primary" type="button" onClick={handleSave}>
          保存设置
        </button>
      </footer>
    </main>
  );
}
