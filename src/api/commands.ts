import type { IndexStats } from "../core/indexer";
import type { RetrievalRequest, RetrievalResult, SearchResult, VaultValidation } from "../core/types";

export interface DemoCommands {
  validateVault(vaultPath: string): Promise<VaultValidation>;
  startIndexing(vaultPath: string): Promise<IndexStats>;
  retrieve(request: RetrievalRequest): Promise<RetrievalResult>;
  search(query: string): Promise<SearchResult[]>;
  openObsidianUri(filePath: string): Promise<string>;
  getConfig(): Promise<Record<string, unknown>>;
  saveConfig(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  getAsrConnectUrl(appId: string, apiKey: string, apiSecret: string): Promise<string>;
  getHotwords(): Promise<string[]>;
}

interface FetchCommandOptions {
  openUri: boolean;
}

export function createFetchCommands(baseUrl = "http://127.0.0.1:3760", options: FetchCommandOptions = { openUri: true }): DemoCommands {
  return {
    validateVault(vaultPath: string) {
      return post(`${baseUrl}/validate-vault`, { vaultPath });
    },
    startIndexing(vaultPath: string) {
      return post(`${baseUrl}/index`, { vaultPath });
    },
    retrieve(request: RetrievalRequest) {
      return post(`${baseUrl}/retrieve`, request);
    },
    search(query: string) {
      return post(`${baseUrl}/search`, { query });
    },
    async openObsidianUri(filePath: string) {
      const response = await post<{ uri: string }>(`${baseUrl}/open-uri`, { filePath });
      if (options.openUri) {
        await openUri(response.uri);
      }
      return response.uri;
    },
    getConfig() {
      return get(`${baseUrl}/config`);
    },
    saveConfig(config: Record<string, unknown>) {
      return post(`${baseUrl}/config`, config);
    },
    async getAsrConnectUrl(appId: string, apiKey: string, apiSecret: string) {
      const result = await post<{ url: string }>(`${baseUrl}/asr/connect-url`, { appId, apiKey, apiSecret });
      return result.url;
    },
    getHotwords() {
      return get<string[]>(`${baseUrl}/hotwords`);
    }
  };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`KA_SERVICE_REQUEST_FAILED: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: { "content-type": "application/json" }
  });
  if (!response.ok) {
    throw new Error(`KA_SERVICE_REQUEST_FAILED: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function openUri(uri: string) {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_obsidian_uri", { input: { uri } });
    return;
  }
  window.location.href = uri;
}

export const demoCommands = createFetchCommands();
