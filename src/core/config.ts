import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AppConfig {
  vaultPath: string;
  vaultName: string;
  shortcut: string;
  iflytek: {
    appId: string;
    apiKey: string;
    apiSecret: string;
  };
  retrieval: {
    limit: number;
  };
}

export function loadConfig(configPath: string): AppConfig | null {
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

export function saveConfig(configPath: string, config: AppConfig): void {
  const dir = path.dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function getDefaultConfigPath(): string {
  const platform = os.platform();
  let baseDir: string;
  if (platform === "win32") {
    baseDir = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  } else if (platform === "darwin") {
    baseDir = path.join(os.homedir(), "Library", "Application Support");
  } else {
    baseDir = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  }
  return path.join(baseDir, "knowledge-assistant", "config.json");
}
