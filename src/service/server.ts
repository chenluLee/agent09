import cors from "@fastify/cors";
import Fastify from "fastify";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { buildIflytekAuthUrl } from "../asr/iflytek-auth";
import { getDefaultConfigPath, loadConfig, saveConfig } from "../core/config";
import { createLocalCommands } from "./localCommands";

const port = Number(process.env.KA_DEMO0_PORT ?? 3760);
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const defaultIndexPath = path.resolve(projectRoot, "..", "knowledge-assistant-demo0.sqlite");
const configPath = process.env.KA_DEMO0_CONFIG ?? getDefaultConfigPath();
const commands = createLocalCommands({
  indexPath: process.env.KA_DEMO0_INDEX ?? defaultIndexPath,
  sourceId: "demo",
  vaultName: process.env.KA_DEMO0_VAULT_NAME ?? "Demo Vault"
});

const retrieveSchema = z.object({
  transcript: z.string(),
  windowId: z.string(),
  version: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(10).optional()
});

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));

app.post("/validate-vault", async (request) => {
  const body = z.object({ vaultPath: z.string() }).parse(request.body);
  return commands.validateVault(body.vaultPath);
});

app.post("/index", async (request) => {
  const body = z.object({ vaultPath: z.string() }).parse(request.body);
  return commands.startIndexing(body.vaultPath);
});

app.post("/retrieve", async (request) => {
  return commands.retrieve(retrieveSchema.parse(request.body));
});

app.post("/search", async (request) => {
  const body = z.object({ query: z.string() }).parse(request.body);
  return commands.search(body.query);
});

app.post("/open-uri", async (request) => {
  const body = z.object({ filePath: z.string() }).parse(request.body);
  return { uri: await commands.openObsidianUri(body.filePath) };
});

app.get("/config", async () => {
  return loadConfig(configPath) ?? { vaultPath: "", vaultName: "", shortcut: "Ctrl+Shift+Space", iflytek: { appId: "", apiKey: "", apiSecret: "" }, retrieval: { limit: 5 } };
});

app.post("/config", async (request) => {
  const body = z.object({
    vaultPath: z.string().min(1),
    vaultName: z.string().min(1),
    shortcut: z.string().optional(),
    iflytek: z.object({
      appId: z.string(),
      apiKey: z.string(),
      apiSecret: z.string()
    }).optional(),
    retrieval: z.object({ limit: z.number().int().min(1).max(20) }).optional()
  }).parse(request.body);
  const existing = loadConfig(configPath);
  const merged = {
    vaultPath: body.vaultPath,
    vaultName: body.vaultName,
    shortcut: body.shortcut ?? existing?.shortcut ?? "Ctrl+Shift+Space",
    iflytek: body.iflytek ?? existing?.iflytek ?? { appId: "", apiKey: "", apiSecret: "" },
    retrieval: body.retrieval ?? existing?.retrieval ?? { limit: 5 }
  };
  saveConfig(configPath, merged);
  return merged;
});

app.post("/asr/connect-url", async (request) => {
  const body = z.object({ appId: z.string().min(1), apiKey: z.string().min(1), apiSecret: z.string().min(1) }).parse(request.body);
  return { url: buildIflytekAuthUrl(body.appId, body.apiKey, body.apiSecret) };
});

await app.listen({ host: "127.0.0.1", port });
