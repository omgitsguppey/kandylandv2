import { buildAgentIndexes } from "./build-agent-indexes";
import { buildTaskContext } from "./build-task-context";
import { readJsonFile, writeJsonFile } from "./shared";

type EvalCase = {
  id: string;
  task: string;
  mode: string;
  files?: string[];
  expectedRelevantFiles: string[];
  expectedHelpers: string[];
  expectedVerificationCommands: string[];
  expectedScope: "narrow" | "moderate" | "broad";
};

const EVAL_CASES: EvalCase[] = [
  {
    id: "route_bug_patch",
    task: "patch a single API route bug in admin debug diagnostics",
    mode: "runtime",
    files: ["src/app/api/admin/debug/route.ts"],
    expectedRelevantFiles: ["src/app/api/admin/debug/route.ts", "src/lib/server/route-diagnostics.ts"],
    expectedHelpers: ["src/lib/server/route-diagnostics.ts", "src/lib/server/request-guard.ts"],
    expectedVerificationCommands: ["npm run test:contracts"],
    expectedScope: "moderate",
  },
  {
    id: "admin_ui_density",
    task: "densify the admin UI chart health surface without changing telemetry contracts",
    mode: "admin",
    files: ["src/app/api/admin/ui-chart-health/route.ts"],
    expectedRelevantFiles: ["src/app/api/admin/ui-chart-health/route.ts", "src/lib/admin-ui-chart-health.ts"],
    expectedHelpers: ["src/lib/admin-ui-chart-health.ts", "src/lib/server/admin-ui-chart-health.ts"],
    expectedVerificationCommands: ["npm run check:ui:audits"],
    expectedScope: "moderate",
  },
  {
    id: "chat_runtime",
    task: "modify a chat runtime fallback behavior without breaking canonical realtime handling",
    mode: "chat",
    expectedRelevantFiles: ["src/lib/chat", "src/app/api/chat"],
    expectedHelpers: ["src/lib/server/route-diagnostics.ts"],
    expectedVerificationCommands: ["npm run test:contracts"],
    expectedScope: "moderate",
  },
  {
    id: "lockfile_drift",
    task: "patch dependency lockfile drift for functions without breaking deployment parity",
    mode: "dependency",
    files: ["functions/package.json", "functions/pnpm-lock.yaml"],
    expectedRelevantFiles: ["functions/package.json", "functions/pnpm-lock.yaml"],
    expectedHelpers: [],
    expectedVerificationCommands: ["npm --prefix functions run check", "npm run check:continuity"],
    expectedScope: "broad",
  },
  {
    id: "telemetry_change",
    task: "add or modify a telemetry event safely",
    mode: "runtime",
    expectedRelevantFiles: ["src/lib/telemetry.ts"],
    expectedHelpers: ["src/lib/telemetry.ts"],
    expectedVerificationCommands: ["npm run check:telemetry"],
    expectedScope: "moderate",
  },
  {
    id: "viewer_watch_capture_hardening",
    task: "harden viewer watch session capture quality and admin analytics continuity without widening prompt scope",
    mode: "runtime",
    files: ["src/app/api/viewer/watch-session/route.ts", "src/app/admin/analytics/page.tsx"],
    expectedRelevantFiles: [
      "src/app/api/viewer/watch-session/route.ts",
      "src/lib/viewer-watch-session.ts",
      "src/lib/server/admin-analytics-capture-health.ts",
      "src/app/admin/analytics/page.tsx",
    ],
    expectedHelpers: [
      "src/lib/viewer-watch-session.ts",
      "src/lib/server/admin-analytics-capture-health.ts",
    ],
    expectedVerificationCommands: [
      "npm run check:analytics:continuity",
      "npm run check:analytics-semantics",
    ],
    expectedScope: "moderate",
  },
];

function runTaskContext(task: string, mode: string, files: string[] = []) {
  const originalArgv = [...process.argv];
  process.argv = [
    process.argv[0] ?? "node",
    process.argv[1] ?? "scripts/agent/run-evals.ts",
    `--task=${task}`,
    `--mode=${mode}`,
    ...files.map((file) => `--file=${file}`),
  ];
  buildTaskContext();
  process.argv = originalArgv;
  return readJsonFile<{
    likelyTouchedFiles: string[];
    canonicalHelpersToReuse: string[];
    requiredVerificationCommands: string[];
    scopeClassification: "narrow" | "moderate" | "broad";
  }>("agent/state/task-context.generated.json");
}

function hitsExpected(actual: string[], expected: string[]) {
  return expected.filter((needle) => actual.some((candidate) => candidate === needle || candidate.includes(needle))).length;
}

export function runAgentContextEvals() {
  buildAgentIndexes();

  const results = EVAL_CASES.map((evalCase) => {
    const context = runTaskContext(evalCase.task, evalCase.mode, evalCase.files);
    const fileHits = hitsExpected(context.likelyTouchedFiles, evalCase.expectedRelevantFiles);
    const helperHits = hitsExpected(context.canonicalHelpersToReuse, evalCase.expectedHelpers);
    const verificationHits = hitsExpected(context.requiredVerificationCommands, evalCase.expectedVerificationCommands);
    const scopeMatch = context.scopeClassification === evalCase.expectedScope;

    return {
      id: evalCase.id,
      task: evalCase.task,
      expectedScope: evalCase.expectedScope,
      actualScope: context.scopeClassification,
      fileHits,
      helperHits,
      verificationHits,
      passed: fileHits > 0 && verificationHits > 0 && scopeMatch,
      likelyTouchedFiles: context.likelyTouchedFiles.slice(0, 8),
      canonicalHelpersToReuse: context.canonicalHelpersToReuse.slice(0, 6),
      requiredVerificationCommands: context.requiredVerificationCommands,
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    status: results.every((result) => result.passed) ? "pass" : "warn",
    results,
  };

  writeJsonFile("agent/state/eval-results.generated.json", summary);
  return summary;
}

if (require.main === module) {
  const summary = runAgentContextEvals();
  console.log(`Agent context evals status: ${summary.status} (${summary.passed}/${summary.total} passing)`);
}
