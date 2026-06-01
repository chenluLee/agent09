import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsApp } from "./SettingsApp";

const defaultConfig = {
  vaultPath: "",
  vaultName: "",
  shortcut: "Ctrl+Shift+Space",
  iflytek: { appId: "", apiKey: "", apiSecret: "" },
  retrieval: { limit: 5 }
};

// Mock fetch for settings to avoid real network calls
vi.stubGlobal("fetch", vi.fn(async () => ({
  ok: true,
  json: async () => ({ ...defaultConfig })
})));

describe("SettingsApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // Restore fetch mock to default config
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ...defaultConfig })
    })));
  });

  it("renders settings form with vault path input", async () => {
    render(<SettingsApp />);
    await screen.findByText("设置已加载。");
    expect(screen.getByText("知识助手设置")).toBeInTheDocument();
    expect(screen.getByLabelText("知识库路径")).toBeInTheDocument();
  });

  it("renders iFlytek credential fields", async () => {
    render(<SettingsApp />);
    await screen.findByText("设置已加载。");
    expect(screen.getByLabelText("App ID")).toBeInTheDocument();
    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("API Secret")).toBeInTheDocument();
  });

  it("renders index button", async () => {
    render(<SettingsApp />);
    await screen.findByText("设置已加载。");
    expect(screen.getByText("索引知识库")).toBeInTheDocument();
  });

  it("renders hotword section", async () => {
    render(<SettingsApp />);
    await screen.findByText("设置已加载。");
    expect(screen.getByText("热词管理")).toBeInTheDocument();
    expect(screen.getByText("提取热词")).toBeInTheDocument();
  });

  it("extracts and displays hotwords, and copies to clipboard", async () => {
    const mockHotwords = ["人工智能", "机器学习"];
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (url.endsWith("/config")) {
        return { ok: true, json: async () => ({ ...defaultConfig }) };
      }
      if (url.endsWith("/hotwords")) {
        return { ok: true, json: async () => mockHotwords };
      }
      return { ok: false };
    }));

    render(<SettingsApp />);
    await screen.findByText("设置已加载。");

    const extractBtn = screen.getByText("提取热词");
    fireEvent.click(extractBtn);

    expect(await screen.findByText("已提取 2 个热词。")).toBeInTheDocument();
    const textarea = screen.getByLabelText("热词列表") as HTMLTextAreaElement;
    expect(textarea.value).toBe("人工智能\n机器学习");

    // Mock clipboard
    const writeTextMock = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText: writeTextMock } });

    const copyBtn = screen.getByText("复制到剪贴板");
    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith("人工智能\n机器学习");
    expect(await screen.findByText("已复制到剪贴板。")).toBeInTheDocument();
  });

  it("displays empty message if no hotwords returned", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (url.endsWith("/config")) {
        return { ok: true, json: async () => ({ ...defaultConfig }) };
      }
      if (url.endsWith("/hotwords")) {
        return { ok: true, json: async () => [] };
      }
      return { ok: false };
    }));

    render(<SettingsApp />);
    await screen.findByText("设置已加载。");

    const extractBtn = screen.getByText("提取热词");
    fireEvent.click(extractBtn);

    expect(await screen.findByText("未找到符合条件的热词。")).toBeInTheDocument();
    expect(screen.queryByLabelText("热词列表")).not.toBeInTheDocument();
  });

  it("displays failure message when hotwords api fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (url.endsWith("/config")) {
        return { ok: true, json: async () => ({ ...defaultConfig }) };
      }
      if (url.endsWith("/hotwords")) {
        return { ok: false };
      }
      return { ok: false };
    }));

    render(<SettingsApp />);
    await screen.findByText("设置已加载。");

    const extractBtn = screen.getByText("提取热词");
    fireEvent.click(extractBtn);

    expect(await screen.findByText("提取热词失败，请先索引知识库。")).toBeInTheDocument();
  });
});
