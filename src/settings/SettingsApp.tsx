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

      <footer>
        <button className="settings-btn primary" type="button" onClick={handleSave}>
          保存设置
        </button>
      </footer>
    </main>
  );
}
