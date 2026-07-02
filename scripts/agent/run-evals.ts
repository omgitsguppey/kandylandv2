import { buildAgentIndexes } from "./build-agent-indexes";
import { buildTaskContext } from "./build-task-context";
import { readJsonFile, writeJsonFile } from "./shared";
import { selectVerificationPlan } from "./verification-selector";

type EvalCase = {
  id: string;
  task: string;
  mode: string;
  files?: string[];
  expectedRelevantFiles: string[];
  expectedHelpers: string[];
  expectedFastCommands: string[];
  expectedSignoffCommands: string[];
  expectedScope: "narrow" | "moderate" | "broad";
  forbiddenFiles?: string[];
  forbiddenCommands?: string[];
};

const EVAL_CASES: EvalCase[] = [
  {
    id: "narrow_route_fix",
    task: "patch a single creator settings API route bug without touching payments or ledgers",
    mode: "runtime",
    files: ["src/app/api/creator/settings/route.ts"],
    expectedRelevantFiles: ["src/app/api/creator/settings/route.ts", "src/lib/server/route-diagnostics.ts"],
    expectedHelpers: ["src/lib/server/route-diagnostics.ts", "src/lib/server/request-guard.ts"],
    expectedFastCommands: ["npm run agent:test -- src/app/api/creator/settings/route.ts", "npm run typecheck"],
    expectedSignoffCommands: [],
    expectedScope: "moderate",
    forbiddenFiles: ["src/lib/gumdrop-ledger.ts", "src/lib/server/paypal.ts"],
    forbiddenCommands: ["npm run check:continuity"],
  },
  {
    id: "telemetry_safe_change",
    task: "add or modify a telemetry event safely without touching the economy or payments paths",
    mode: "runtime",
    files: ["src/lib/telemetry.ts"],
    expectedRelevantFiles: ["src/lib/telemetry.ts"],
    expectedHelpers: ["src/lib/telemetry.ts"],
    expectedFastCommands: ["npm run check:telemetry", "npm run check:analytics-semantics"],
    expectedSignoffCommands: ["npm run check:analytics:continuity"],
    expectedScope: "moderate",
    forbiddenFiles: ["src/lib/gumdrop-ledger.ts", "src/lib/server/paypal.ts"],
    forbiddenCommands: ["npm run check:firebase:rules"],
  },
  {
    id: "admin_debug_surface_change",
    task: "tighten an admin debug truth surface without changing telemetry naming",
    mode: "admin",
    files: ["src/app/admin/debug/page.tsx"],
    expectedRelevantFiles: ["src/app/admin/debug/page.tsx", "src/app/api/admin/debug/route.ts"],
    expectedHelpers: ["src/lib/server/route-diagnostics.ts"],
    expectedFastCommands: ["npm run check:ui:coverage", "npm run check:admin-browser-surface-smoke"],
    expectedSignoffCommands: ["npm run check:continuity"],
    expectedScope: "moderate",
    forbiddenFiles: ["src/lib/gumdrop-ledger.ts", "src/lib/server/paypal.ts"],
  },
  {
    id: "functions_runtime_change",
    task: "repair a functions runtime helper without widening into payments or ledger logic",
    mode: "functions",
    files: ["functions/src/queue-runtime.ts"],
    expectedRelevantFiles: ["functions/src/queue-runtime.ts", "functions/src/index.ts"],
    expectedHelpers: [],
    expectedFastCommands: ["npm --prefix functions run check", "npm run typecheck"],
    expectedSignoffCommands: ["npm run check:scheduler:freshness", "npm run check:queue:runtime", "npm run check:runtime:continuity"],
    expectedScope: "broad",
    forbiddenFiles: ["src/lib/gumdrop-ledger.ts", "src/lib/server/paypal.ts"],
  },
  {
    id: "ranking_behavioral_data_change",
    task: "harden deterministic behavioral ranking data without touching PayPal or the economy ledger",
    mode: "runtime",
    files: ["src/lib/server/behavioral-intelligence.ts"],
    expectedRelevantFiles: [
      "src/lib/server/behavioral-intelligence.ts",
      "functions/src/behavioral-intelligence-runtime.ts",
    ],
    expectedHelpers: [
      "src/lib/telemetry.ts",
    ],
    expectedFastCommands: ["npm run check:telemetry", "npm run check:analytics-semantics", "npm run typecheck"],
    expectedSignoffCommands: ["npm run check:analytics:continuity", "npm run check:continuity"],
    expectedScope: "moderate",
    forbiddenFiles: ["src/lib/gumdrop-ledger.ts", "src/lib/server/paypal.ts"],
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
    fastVerificationCommands: string[];
    signoffVerificationCommands: string[];
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
    const verificationPlan = selectVerificationPlan({ paths: evalCase.files ?? context.likelyTouchedFiles.slice(0, 2) });
    const fileHits = hitsExpected(context.likelyTouchedFiles, evalCase.expectedRelevantFiles);
    const helperHits = hitsExpected(context.canonicalHelpersToReuse, evalCase.expectedHelpers);
    const fastHits = hitsExpected(verificationPlan.fastCommands, evalCase.expectedFastCommands);
    const signoffHits = hitsExpected(verificationPlan.signoffCommands, evalCase.expectedSignoffCommands);
    const scopeMatch = context.scopeClassification === evalCase.expectedScope;
    const forbiddenFileHits = (evalCase.forbiddenFiles ?? []).filter((needle) =>
      context.likelyTouchedFiles.some((candidate) => candidate === needle || candidate.includes(needle)),
    );
    const forbiddenCommandHits = (evalCase.forbiddenCommands ?? []).filter((needle) =>
      verificationPlan.fastCommands.some((candidate) => candidate.includes(needle))
      || verificationPlan.signoffCommands.some((candidate) => candidate.includes(needle)),
    );
    const failureCategories = [
      ...(fileHits > 0 ? [] : ["missed_file_precision"]),
      ...(helperHits > 0 || evalCase.expectedHelpers.length === 0 ? [] : ["missed_canonical_helper"]),
      ...(fastHits > 0 ? [] : ["missed_fast_lane"]),
      ...(signoffHits > 0 || evalCase.expectedSignoffCommands.length === 0 ? [] : ["missed_signoff_lane"]),
      ...(scopeMatch ? [] : ["wrong_scope"]),
      ...(forbiddenFileHits.length === 0 ? [] : ["forbidden_surface_selected"]),
      ...(forbiddenCommandHits.length === 0 ? [] : ["over_broad_verification"]),
    ];

    return {
      id: evalCase.id,
      task: evalCase.task,
      expectedScope: evalCase.expectedScope,
      actualScope: context.scopeClassification,
      fileHits,
      helperHits,
      fastHits,
      signoffHits,
      passed: failureCategories.length === 0,
      failureCategories,
      failureReview: failureCategories.map((entry) => ({
        category: entry,
        note:
          entry === "missed_file_precision" ? "The ranked files did not stay focused on the intended surface."
            : entry === "missed_canonical_helper" ? "The task context did not elevate the expected canonical helpers."
              : entry === "missed_fast_lane" ? "The selector missed a required fast-loop verification command."
                : entry === "missed_signoff_lane" ? "The selector missed a required signoff command."
                  : entry === "wrong_scope" ? "Scope classification drifted from the expected width."
                    : entry === "forbidden_surface_selected" ? `Selected forbidden surfaces: ${forbiddenFileHits.join(", ")}`
                      : `Selected forbidden verification commands: ${forbiddenCommandHits.join(", ")}`,
      })),
      likelyTouchedFiles: context.likelyTouchedFiles.slice(0, 8),
      canonicalHelpersToReuse: context.canonicalHelpersToReuse.slice(0, 6),
      fastVerificationCommands: verificationPlan.fastCommands,
      signoffVerificationCommands: verificationPlan.signoffCommands,
    };
  });

  const failures = results.filter((result) => !result.passed);

  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: failures.length,
    status: results.every((result) => result.passed) ? "pass" : "warn",
    failureCategories: Array.from(new Set(failures.flatMap((result) => result.failureCategories))).sort(),
    results,
  };

  writeJsonFile("agent/state/eval-results.generated.json", summary);
  return summary;
}

if (require.main === module) {
  const summary = runAgentContextEvals();
  console.log(`Agent context evals status: ${summary.status} (${summary.passed}/${summary.total} passing)`);
}
