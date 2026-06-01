import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildIflytekAuthUrl } from "./iflytek-auth";

describe("buildIflytekAuthUrl (rtasr-llm)", () => {
  it("generates URL with correct endpoint and protocol", () => {
    const url = buildIflytekAuthUrl("test-app-id", "test-api-key", "test-api-secret");
    const parsed = new URL(url);

    expect(parsed.protocol).toBe("wss:");
    expect(parsed.hostname).toBe("office-api-ast-dx.iflyaisol.com");
    expect(parsed.pathname).toBe("/ast/communicate/v1");
  });

  it("includes all required query parameters", () => {
    const url = buildIflytekAuthUrl("test-app-id", "test-api-key", "test-api-secret");
    const parsed = new URL(url);

    expect(parsed.searchParams.get("appId")).toBe("test-app-id");
    expect(parsed.searchParams.get("accessKeyId")).toBe("test-api-key");
    expect(parsed.searchParams.get("utc")).toBeTruthy();
    expect(parsed.searchParams.get("signature")).toBeTruthy();
    expect(parsed.searchParams.get("lang")).toBe("autodialect");
    expect(parsed.searchParams.get("audio_encode")).toBe("pcm_s16le");
    expect(parsed.searchParams.get("samplerate")).toBe("16000");
  });

  it("generates signature using parameter-sorted HMAC-SHA1", () => {
    vi.useFakeTimers();
    const fixedDate = new Date("2025-09-04T15:38:07+08:00");
    vi.setSystemTime(fixedDate);

    const appId = "595f23df";
    const apiKey = "d9f4aa7ea6d94faca62cd88a28fd5234";
    const apiSecret = "abcdef1234567890abcdef1234567890";

    const url = buildIflytekAuthUrl(appId, apiKey, apiSecret);
    const parsed = new URL(url);

    // Reconstruct the expected signature:
    // 1. Collect params (except signature), sort by key name
    // 2. URL-encode keys and values, join with &
    // 3. HMAC-SHA1 with apiSecret, base64 encode
    const utcFromUrl = parsed.searchParams.get("utc")!;
    const allParams: Record<string, string> = {
      appId,
      accessKeyId: apiKey,
      utc: utcFromUrl,
      lang: "autodialect",
      audio_encode: "pcm_s16le",
      samplerate: "16000",
    };

    // Sort keys alphabetically
    const sortedKeys = Object.keys(allParams).sort();
    const baseString = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
      .join("&");

    const expectedSignature = crypto
      .createHmac("sha1", apiSecret)
      .update(baseString)
      .digest("base64");

    expect(parsed.searchParams.get("signature")).toBe(expectedSignature);

    vi.useRealTimers();
  });

  it("uses different signatures for different timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-04T10:00:00+08:00"));
    const url1 = buildIflytekAuthUrl("app", "key", "secret");
    const sig1 = new URL(url1).searchParams.get("signature");

    vi.setSystemTime(new Date("2025-09-04T11:00:00+08:00"));
    const url2 = buildIflytekAuthUrl("app", "key", "secret");
    const sig2 = new URL(url2).searchParams.get("signature");

    expect(sig1).not.toBe(sig2);
    vi.useRealTimers();
  });
});
