import { normalizeVaultPath } from "./ids";

interface BuildUriInput {
  vaultName: string;
  filePath: string;
}

export function buildObsidianOpenUri(input: BuildUriInput): string {
  const file = normalizeVaultPath(input.filePath);
  return `obsidian://open?vault=${encodeURIComponent(input.vaultName)}&file=${encodeURIComponent(file)}`;
}
