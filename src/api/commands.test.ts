import { afterEach, describe, expect, it, vi } from "vitest";
import { createFetchCommands } from "./commands";

describe("createFetchCommands", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts validate, index, retrieve, and open-uri requests", async () => {
    const responses = [
      { valid: true, path: "examples/demo-vault", markdownCount: 20, skipped: [] },
      { documentCount: 20, chunkCount: 80, indexPath: "demo.sqlite" },
      { windowId: "manual", version: 1, elapsedMs: 12, notes: [] },
      { uri: "obsidian://open?vault=Demo&file=projects%2Fknowledge-assistant.md" }
    ];
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => responses.shift()
    }));
    vi.stubGlobal("fetch", fetchMock);

    const commands = createFetchCommands("http://127.0.0.1:3760", { openUri: false });
    await expect(commands.validateVault("examples/demo-vault")).resolves.toMatchObject({ markdownCount: 20 });
    await expect(commands.startIndexing("examples/demo-vault")).resolves.toMatchObject({ documentCount: 20 });
    await expect(commands.retrieve({ transcript: "demo", windowId: "manual", version: 1 })).resolves.toMatchObject({ version: 1 });
    await expect(commands.openObsidianUri("projects/knowledge-assistant.md")).resolves.toContain("obsidian://open");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((fetchMock.mock.calls as any).map((call: any[]) => call[0])).toEqual([
      "http://127.0.0.1:3760/validate-vault",
      "http://127.0.0.1:3760/index",
      "http://127.0.0.1:3760/retrieve",
      "http://127.0.0.1:3760/open-uri"
    ]);
  });
});

describe("createFetchCommands config commands", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getConfig returns config from server", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ vaultPath: "/test", vaultName: "Test" })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const commands = createFetchCommands("http://test", { openUri: false });
    const result = await commands.getConfig();
    expect(result).toEqual({ vaultPath: "/test", vaultName: "Test" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("saveConfig posts config to server", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ vaultPath: "/test", vaultName: "Test" })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const commands = createFetchCommands("http://test", { openUri: false });
    await commands.saveConfig({ vaultPath: "/test", vaultName: "Test" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls as string[][])[0][0]).toBe("http://test/config");
  });

  it("getAsrConnectUrl posts credentials and returns URL", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: "wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1?appId=test" })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const commands = createFetchCommands("http://test", { openUri: false });
    const url = await commands.getAsrConnectUrl("test-app-id", "test-api-key", "test-api-secret");
    expect(url).toBe("wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1?appId=test");
    expect((fetchMock.mock.calls as string[][])[0][0]).toBe("http://test/asr/connect-url");
  });
});
