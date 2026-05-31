import crypto from "node:crypto";

/**
 * Build authenticated WebSocket URL for iFlytek Real-time ASR.
 *
 * Auth formula: signa = base64(hmac-sha1(md5(appid + ts), apiKey))
 * Docs: https://www.xfyun.cn/doc/asr/rtasr/API.html
 */
export function buildIflytekAuthUrl(appId: string, apiKey: string): string {
  const ts = Math.floor(Date.now() / 1000).toString();
  const baseString = appId + ts;
  const md5 = crypto.createHash("md5").update(baseString).digest("hex");
  const signa = crypto.createHmac("sha1", apiKey).update(md5).digest("base64");

  const params = new URLSearchParams({
    appid: appId,
    ts,
    signa,
    lang: "cn",
  });

  return `wss://rtasr.xfyun.cn/v1/ws?${params.toString()}`;
}
