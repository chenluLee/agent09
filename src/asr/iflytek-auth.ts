import crypto from "node:crypto";

/**
 * Build authenticated WebSocket URL for iFlytek Real-time ASR LLM (rtasr-llm).
 *
 * Auth formula:
 *   1. Collect all params (except signature), sort by key name
 *   2. URL-encode each key and value, join with &
 *   3. signature = base64(hmac-sha1(baseString, accessKeySecret))
 *
 * Docs: https://www.xfyun.cn/doc/spark/asr_llm/rtasr_llm.html
 */
export function buildIflytekAuthUrl(
  appId: string,
  accessKeyId: string,
  accessKeySecret: string
): string {
  // UTC timestamp in ISO format: 2025-09-04T15:38:07+0800
  const now = new Date();
  const utc = formatUtc(now);

  const params: Record<string, string> = {
    appId,
    accessKeyId,
    utc,
    lang: "autodialect",
    audio_encode: "pcm_s16le",
    samplerate: "16000",
  };

  // Sort keys alphabetically, URL-encode keys and values, join
  const sortedKeys = Object.keys(params).sort();
  const baseString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  // HMAC-SHA1 with accessKeySecret, base64 encode
  const signature = crypto
    .createHmac("sha1", accessKeySecret)
    .update(baseString)
    .digest("base64");

  const allParams = new URLSearchParams();
  // Add sorted params + signature
  for (const key of sortedKeys) {
    allParams.set(key, params[key]);
  }
  allParams.set("signature", signature);

  return `wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1?${allParams.toString()}`;
}

/**
 * Format date to timestamp string with timezone offset: 2025-09-04T15:38:07+0800
 */
function formatUtc(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const minutes = String(absOffset % 60).padStart(2, "0");

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${h}:${m}:${s}${sign}${hours}${minutes}`;
}
