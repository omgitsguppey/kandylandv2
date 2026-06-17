import fs from "node:fs";

const requiredFiles = [
  "src/lib/debug/source-window-zero-shell-classifier.ts",
  "src/lib/behavioral/behavior-normalization-internals-engine.ts",
  "src/lib/tasks/task-catalog-coverage-engine.ts",
  "src/lib/tasks/task-telemetry-mapping-engine.ts",
  "src/lib/behavioral/behavioral-intelligence-snapshot-status.ts",
  "src/lib/analytics/telemetry-truth-recovery-formulas.ts",
  "src/lib/features/experiments/experiment-rollout-registry-status.ts",
  "agent/state/debug-cockpit-batch35-behavior-stack.generated.json",
  "docs/agent-truth/debug-cockpit-batch35-behavior-stack.md",
];
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

for (const file of requiredFiles) {
  expect(fs.existsSync(file), `missing required file ${file}`);
}

const route = fs.readFileSync("src/app/api/admin/debug/route.ts", "utf8");
const report = JSON.parse(fs.readFileSync("agent/state/debug-cockpit-batch35-behavior-stack.generated.json", "utf8"));
expect(route.includes("behaviorNormalizationInternals"), "route missing behaviorNormalizationInternals payload.");
expect(route.includes("taskCatalogRuntimeStatus"), "route missing taskCatalogRuntimeStatus payload.");
expect(route.includes("registryStatus"), "route missing registryStatus payload.");
expect(Array.isArray(report.zeroShellPanelsBefore), "report missing zeroShellPanelsBefore.");
expect(Array.isArray(report.zeroShellPanelsAfter), "report missing zeroShellPanelsAfter.");
expect(report.scoreDimensions && typeof report.scoreDimensions === "object", "score dimensions missing.");
expect(report.remainingGaps.every((gap: string) => !gap.includes("unsafe_unknown")), "unsafe_unknown remaining gap found.");

if (failures.length) {
  console.error("Debug Cockpit Batch 35 behavior stack validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Debug Cockpit Batch 35 behavior stack validator passed.");
