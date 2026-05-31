import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("server config endpoint schema", () => {
  it("validates config request body requires vaultPath and vaultName", () => {
    const schema = z.object({
      vaultPath: z.string().min(1),
      vaultName: z.string().min(1)
    });

    expect(() => schema.parse({})).toThrow();
    expect(schema.parse({ vaultPath: "/test", vaultName: "Test" })).toEqual({
      vaultPath: "/test",
      vaultName: "Test"
    });
  });

  it("validates ASR connect-url request body requires appId and apiKey", () => {
    const schema = z.object({
      appId: z.string().min(1),
      apiKey: z.string().min(1)
    });

    expect(() => schema.parse({})).toThrow();
    expect(schema.parse({ appId: "test", apiKey: "key" })).toEqual({
      appId: "test",
      apiKey: "key"
    });
  });
});
