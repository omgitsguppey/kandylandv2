import { existsSync, readFileSync } from "node:fs";
import {
  buildModuleSourceMap,
  calculateModuleCoverage,
  getModuleCoveragePolicy,
} from "../../src/lib/analytics/module-source-mapping-engine";

const failures: string[] = [];
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");

const dailyTasks = calculateModuleCoverage(getModuleCoveragePolicy("daily_tasks"), { task_lifecycle: { count: 500 } });
expect(dailyTasks.status === "partial", "accepted task lifecycle evidence must not be marked empty or clean without event/fact support.");
expect(dailyTasks.presentAcceptedSources.includes("Task lifecycle"), "accepted substitute evidence ignored.");
expect(!dailyTasks.missingRequiredSources.includes("GA4"), "GA4 treated as required module source.");

const summary = buildModuleSourceMap({
  range: "30d",
  generatedAtUtc: "2026-05-24T15:57:48.000Z",
  evidenceByModule: {
    admin: { admin_truth_snapshot: { count: 1 }, debug_evidence: { count: 1 } },
    runtime: { route_runtime: { count: 1 }, debug_evidence: { count: 1 } },
  },
});
expect(summary.optionalGaps > 0 && summary.requiredGaps > 0, "required and optional gaps are not separated.");
expect(Boolean(summary.blockedReason?.startsWith("module_empty:")), "required empty modules are not named in blocked reason.");
expect(summary.parityScoreFormula.includes("Required verified=1.0"), "parity score formula missing.");
expect(read("agent/state/module-source-mapping-engine.generated.json").includes("accepted_substitute_source"), "mapping engine artifact missing substitute status.");
expect(read("docs/agent-truth/module-source-mapping-engine.md").includes("module-specific"), "mapping engine doc missing module-specific policy.");

if (failures.length) {
  console.error("module-source-mapping-engine failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("module-source-mapping-engine: pass");
