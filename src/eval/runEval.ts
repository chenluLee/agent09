import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildIndex } from "../core/indexer";
import { retrieveRelatedNotes } from "../core/retrieval";

interface EvalCase {
  id: string;
  transcript: string;
  expectedTop: string;
  acceptableAlternatives: string[];
  falsePositives: string[];
}

interface EvalFile {
  schemaVersion: 1;
  cases: EvalCase[];
}

export interface EvalReport {
  caseCount: number;
  failures: string[];
  latenciesMs: number[];
  p95LatencyMs: number;
}

export async function runDemoEval(): Promise<EvalReport> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "demo0-eval-"));
  try {
    const indexPath = path.join(tempDir, "index.sqlite");
    await buildIndex({ vaultPath: "examples/demo-vault", sourceId: "demo", indexPath });
    const evalFile = JSON.parse(await readFile("examples/demo-transcripts/eval.json", "utf8")) as EvalFile;
    const failures: string[] = [];
    const latenciesMs: number[] = [];

    evalFile.cases.forEach((testCase, index) => {
      const result = retrieveRelatedNotes({
        indexPath,
        request: {
          transcript: testCase.transcript,
          windowId: testCase.id,
          version: index + 1,
          limit: 5
        }
      });
      latenciesMs.push(result.elapsedMs);
      const paths = result.notes.map((note) => note.path);
      if (paths[0] !== testCase.expectedTop && !testCase.acceptableAlternatives.includes(paths[0])) {
        failures.push(`${testCase.id}: expected ${testCase.expectedTop}, got ${paths[0] ?? "none"}`);
      }
      const falsePositiveHit = paths.slice(0, 3).find((resultPath) => testCase.falsePositives.includes(resultPath));
      if (falsePositiveHit) {
        failures.push(`${testCase.id}: false positive in top 3: ${falsePositiveHit}`);
      }
    });

    return {
      caseCount: evalFile.cases.length,
      failures,
      latenciesMs,
      p95LatencyMs: percentile(latenciesMs, 0.95)
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
  return sorted[index] ?? 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runDemoEval();
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length > 0 || report.p95LatencyMs >= 200) {
    process.exit(1);
  }
}
