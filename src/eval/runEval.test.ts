import { describe, expect, it } from "vitest";
import { runDemoEval } from "./runEval";

describe("runDemoEval", () => {
  it("passes all demo transcript cases", async () => {
    const report = await runDemoEval();
    expect(report.caseCount).toBe(4);
    expect(report.failures).toEqual([]);
    expect(report.p95LatencyMs).toBeLessThan(200);
  });
});
