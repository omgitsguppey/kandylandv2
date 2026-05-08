import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition: unknown, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

const files = {
  packageJson: read("package.json"),
  truthState: read("src/lib/admin-truth-state.ts"),
  truthBadge: read("src/components/Admin/AdminTruthBadge.tsx"),
  metricCard: read("src/components/Admin/AdminMetricCard.tsx"),
  statsBar: read("src/components/Admin/AdminStatsBar.tsx"),
  moduleVerificationCard: read("src/components/Admin/AdminModuleVerificationCard.tsx"),
  analyticsHelpers: read("src/app/admin/analytics/AnalyticsHelpers.tsx"),
  debugPrimitives: read("src/app/admin/debug/components/DebugPrimitives.tsx"),
  aiHelpers: read("src/app/admin/ai/AiHelpers.tsx"),
};

const failures: string[] = [];

assert(files.packageJson.includes('"check:admin-ui-primitives-cutover"'), "package.json must expose check:admin-ui-primitives-cutover.", failures);
assert(files.metricCard.includes("export function AdminMetricCard"), "AdminMetricCard must exist.", failures);
assert(files.metricCard.includes("truthState: AdminTruthState"), "AdminMetricCard must accept AdminTruthState only.", failures);
assert(files.metricCard.includes("hasUsableValue: boolean"), "AdminMetricCard must require explicit usable-value ownership.", failures);
assert(files.metricCard.includes("AdminTruthBadge"), "AdminMetricCard must render the canonical truth badge.", failures);
assert(!files.metricCard.includes("?? 0"), "AdminMetricCard must not coerce missing values to 0.", failures);
assert(!files.metricCard.includes("|| 0"), "AdminMetricCard must not coerce missing values to 0.", failures);

assert(files.truthState.includes("confidenceThreshold"), "admin-truth-state must support confidence-threshold gating.", failures);
assert(files.truthState.includes("resolveAdminInputTruthState"), "admin-truth-state must expose canonical primitive truth normalization.", failures);
assert(files.truthState.includes("resolveAdminVerificationTruthState"), "admin-truth-state must expose canonical verification truth normalization.", failures);
assert(files.truthBadge.includes("pendingInitialLoad") && files.truthBadge.includes("hasUsableValue"), "AdminTruthBadge must preserve WAIT-only-first-load behavior.", failures);

for (const [label, source] of [
  ["AdminStatsBar", files.statsBar],
  ["AdminModuleVerificationCard", files.moduleVerificationCard],
  ["DebugPrimitives", files.debugPrimitives],
  ["AiHelpers", files.aiHelpers],
] as const) {
  assert(!source.includes("coerceAdminTruthState("), `${label} must not define local truth coercion.`, failures);
  assert(!source.includes("resolveAdminTruthState("), `${label} must not resolve truth state locally.`, failures);
}

assert(files.statsBar.includes("AdminMetricCard"), "AdminStatsBar must render the shared AdminMetricCard.", failures);
assert(files.moduleVerificationCard.includes("resolveAdminVerificationTruthState"), "AdminModuleVerificationCard must use canonical verification truth normalization.", failures);
assert(files.debugPrimitives.includes("resolveAdminInputTruthState"), "DebugPrimitives must use canonical primitive truth normalization.", failures);
assert(files.aiHelpers.includes("resolveAdminInputTruthState"), "AiHelpers must use canonical primitive truth normalization.", failures);
assert(files.aiHelpers.includes("AdminMetricCard"), "AiHelpers MetricCard must wrap AdminMetricCard.", failures);
assert(!files.analyticsHelpers.includes("resolveAdminTruthState("), "AnalyticsHelpers must not own local truth-state resolution.", failures);

if (failures.length > 0) {
  console.error("Admin UI primitives cutover validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin UI primitives cutover validation passed.");
