import { existsSync } from "node:fs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultConfigPath, loadConfig, saveConfig } from "./config";
import type { AppConfig } from "./config";

describe("config", () => {
  const tmpDir = path.join(os.tmpdir(), "ka-config-test-" + process.pid);

  afterEach(() => {
    if (existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("loadConfig", () => {
    it("returns null when config file does not exist", () => {
      const configPath = path.join(tmpDir, "missing.json");
      expect(loadConfig(configPath)).toBeNull();
    });

    it("reads valid config from file", () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      const configPath = path.join(tmpDir, "config.json");
      const config: AppConfig = {
        vaultPath: "/path/to/vault",
        vaultName: "MyVault",
        shortcut: "Ctrl+Shift+Space",
        iflytek: {
          appId: "test-app-id",
          apiKey: "test-api-key",
          apiSecret: "test-api-secret"
        },
        retrieval: {
          limit: 5
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

      const loaded = loadConfig(configPath);
      expect(loaded).toEqual(config);
    });

    it("returns null for invalid JSON", () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      const configPath = path.join(tmpDir, "config.json");
      fs.writeFileSync(configPath, "{invalid", "utf-8");

      expect(loadConfig(configPath)).toBeNull();
    });
  });

  describe("saveConfig", () => {
    it("writes config to file creating parent directories", () => {
      const configPath = path.join(tmpDir, "nested", "config.json");
      const config: AppConfig = {
        vaultPath: "/path/to/vault",
        vaultName: "MyVault",
        shortcut: "Ctrl+Shift+Space",
        iflytek: {
          appId: "app-id",
          apiKey: "api-key",
          apiSecret: "api-secret"
        },
        retrieval: {
          limit: 5
        }
      };

      saveConfig(configPath, config);

      expect(existsSync(configPath)).toBe(true);
      const loaded = loadConfig(configPath);
      expect(loaded).toEqual(config);
    });
  });

  describe("getDefaultConfigPath", () => {
    it("returns a path ending with config.json", () => {
      const result = getDefaultConfigPath();
      expect(result.endsWith("knowledge-assistant/config.json")).toBe(true);
    });
  });
});
