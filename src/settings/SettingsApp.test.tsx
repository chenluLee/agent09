import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsApp } from "./SettingsApp";

// Mock fetch for settings to avoid real network calls
vi.stubGlobal("fetch", vi.fn(async () => ({
  ok: true,
  json: async () => ({
    vaultPath: "",
    vaultName: "",
    shortcut: "Ctrl+Shift+Space",
    iflytek: { appId: "", apiKey: "", apiSecret: "" },
    retrieval: { limit: 5 }
  })
})));

describe("SettingsApp", () => {
  it("renders settings form with vault path input", () => {
    render(<SettingsApp />);
    expect(screen.getByText("知识助手设置")).toBeInTheDocument();
    expect(screen.getByLabelText("知识库路径")).toBeInTheDocument();
  });

  it("renders iFlytek credential fields", () => {
    render(<SettingsApp />);
    expect(screen.getByLabelText("App ID")).toBeInTheDocument();
    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("API Secret")).toBeInTheDocument();
  });

  it("renders index button", () => {
    render(<SettingsApp />);
    expect(screen.getByText("索引知识库")).toBeInTheDocument();
  });

  it("renders hotword section", () => {
    render(<SettingsApp />);
    expect(screen.getByText("热词管理")).toBeInTheDocument();
    expect(screen.getByText("提取热词")).toBeInTheDocument();
  });
});
