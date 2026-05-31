import { buildIndex, type IndexStats } from "../core/indexer";
import { retrieveRelatedNotes } from "../core/retrieval";
import { searchIndex } from "../core/search";
import { validateVault } from "../core/scanner";
import type { RetrievalRequest, RetrievalResult, SearchResult, VaultValidation } from "../core/types";
import { buildObsidianOpenUri } from "../core/uri";

export interface DemoCommands {
  validateVault(vaultPath: string): Promise<VaultValidation>;
  startIndexing(vaultPath: string): Promise<IndexStats>;
  retrieve(request: RetrievalRequest): Promise<RetrievalResult>;
  search(query: string): Promise<SearchResult[]>;
  openObsidianUri(filePath: string): Promise<string>;
}

interface LocalCommandOptions {
  indexPath: string;
  sourceId: string;
  vaultName: string;
}

export function createLocalCommands(options: LocalCommandOptions): DemoCommands {
  return {
    validateVault,
    startIndexing(vaultPath: string) {
      return buildIndex({ vaultPath, sourceId: options.sourceId, indexPath: options.indexPath });
    },
    async retrieve(request: RetrievalRequest) {
      return retrieveRelatedNotes({ indexPath: options.indexPath, request });
    },
    async search(query: string) {
      return searchIndex({ indexPath: options.indexPath, query, limit: 10 });
    },
    async openObsidianUri(filePath: string) {
      return buildObsidianOpenUri({ vaultName: options.vaultName, filePath });
    }
  };
}

export const demoCommands = createLocalCommands({
  indexPath: "knowledge-assistant-demo0.sqlite",
  sourceId: "demo",
  vaultName: "Demo Vault"
});
