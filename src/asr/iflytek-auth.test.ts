import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildIflytekAuthUrl } from "./iflytek-auth";

describe("buildIflytekAuthUrl", () => {
  it("generates URL with correct query parameters", () => {
    const url = buildIflytekAuthUrl("test-app-id", "test-api-key");
    const parsed = new URL(url);

    expect(parsed.protocol).toBe("wss:");
    expect(parsed.hostname).toBe("rtasr.xfyun.cn");
    expect(parsed.pathname).toBe("/v1/ws");
    expect(parsed.searchParams.get("appid")).toBe("test-app-id");
    expect(parsed.searchParams.get("ts")).toMatch(/^\d+$/);
    expect(parsed.searchParams.get("signa")).toBeTruthy();
    expect(parsed.searchParams.get("lang")).toBe("cn");
  });

  it("generates signa using HMAC-SHA1 of MD5(appid+ts)", () => {
    const fixedTs = "1512041814";
    vi.spyOn(Date, "now").mockReturnValue(Number(fixedTs) * 1000);

    const appId = "595f23df";
    const apiKey = "d9f4aa7ea6d94faca62cd88a28fd5234";

    const expectedBaseString = appId + fixedTs;
    const expectedMd5 = crypto.createHash("md5").update(expectedBaseString).digest("hex");
    const expectedSigna = crypto.createHmac("sha1", apiKey).update(expectedMd5).digest("base64");

    const url = buildIflytekAuthUrl(appId, apiKey);
    const parsed = new URL(url);

    expect(parsed.searchParams.get("signa")).toBe(expectedSigna);
    vi.restoreAllMocks();
  });
});
