import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    fail(`${label} must not include "${forbidden}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const controlTowerTruth = readRequired("src/lib/admin/debug/control-tower-truth.ts");
const controlTowerLoader = readRequired("src/lib/server/admin-debug-control-tower-loader.ts");
const controlTowerRoute = readRequired("src/app/api/admin/debug/control-tower/route.ts");
const controlTowerComponent = readRequired("src/app/admin/debug/components/DebugControlTower.tsx");
const businessTruthComponent = readRequired("src/app/admin/debug/components/DebugControlTowerBusinessTruth.tsx");
const runtimeEvidenceComponent = readRequired("src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx");
const debugTabNow = readRequired("src/app/admin/debug/components/DebugTabNow.tsx");
const mainDebugRoute = readRequired("src/app/api/admin/debug/route.ts");
const modelHelper = readRequired("src/lib/admin-debug-control-tower.ts");
const cards = readRequired("src/app/admin/debug/components/DebugControlTowerCards.tsx");

if (packageJson.scripts?.["check:debug-control-tower-cutover"] !== "tsx scripts/agent/validate-debug-control-tower-cutover.ts") {
  fail("package.json must expose check:debug-control-tower-cutover.");
}

for (const expected of [
  "resolveControlTowerBusinessTruthState",
  "groupRuntimeEvidenceByFingerprintAndSource",
  "CONTROL_TOWER_BUSINESS_CONFIDENCE_THRESHOLD = 80",
  "fingerprint: string",
  "source: DebugEvidenceAuditSummary[\"source\"]",
]) {
  requireIncludes(controlTowerTruth, expected, "Control-tower truth helper");
}

for (const expected of [
  "loadAdminDebugControlTower",
  "readAdminUserTruthSnapshot",
  "buildAdminDebugControlTowerModel",
  "businessSnapshot",
  "businessTruthState",
  "runtimeEvidenceGroups",
  "reportFreshnessState",
]) {
  requireIncludes(controlTowerLoader, expected, "Control-tower loader");
}

for (const expected of [
  "loadAdminDebugControlTower",
  "const model = await loadAdminDebugControlTower({ evidenceLimit: 60 });",
]) {
  requireIncludes(controlTowerRoute, expected, "Control-tower route");
}
requireNotIncludes(controlTowerRoute, "listRecentDebugEvidence({ limit: 60 })", "Control-tower route");
requireNotIncludes(controlTowerRoute, "buildAdminDebugControlTowerModel({", "Control-tower route");

for (const expected of [
  "resolvedBusinessSnapshot = model?.businessSnapshot ?? businessSnapshot ?? null",
  "resolveControlTowerBusinessTruthState",
  "data-debug-report-freshness={model?.reportFreshnessState ?? \"unknown\"}",
  "DebugControlTowerBusinessTruth",
  "DebugRuntimeEvidenceGroups",
]) {
  requireIncludes(controlTowerComponent, expected, "Control-tower component");
}
requireNotIncludes(controlTowerComponent, "function businessTruthState", "Control-tower component");

for (const expected of [
  "Canonical Business Truth",
  "do not inherit ops-health status",
  "businessSnapshot.issues.length > 0",
]) {
  requireIncludes(businessTruthComponent, expected, "Business-truth component");
}

for (const expected of [
  "Runtime Evidence Groups",
  "grouped by fingerprint and source",
  "<details",
]) {
  requireIncludes(runtimeEvidenceComponent, expected, "Runtime-evidence component");
}

for (const expected of [
  "resolveControlTowerBusinessTruthState(adminUserTruthSnapshot)",
  "<DebugControlTower businessSnapshot={adminUserTruthSnapshot} />",
]) {
  requireIncludes(debugTabNow, expected, "DebugTabNow");
}
requireNotIncludes(debugTabNow, "function businessTruthState", "DebugTabNow");

for (const expected of [
  "readAdminUserTruthSnapshot",
  "const adminUserTruthSnapshot = await readAdminUserTruthSnapshot({",
  "adminUserTruthSnapshot,",
]) {
  requireIncludes(mainDebugRoute, expected, "Main debug route");
}
for (const forbidden of [
  "@/lib/server/analytics-metrics",
  "@/lib/server/admin-analytics-shared",
  "@/lib/admin-analytics-live-runtime",
]) {
  requireNotIncludes(mainDebugRoute, forbidden, "Main debug route");
}

for (const expected of [
  "businessSnapshot: AdminUserTruthSnapshot | null",
  "businessTruthState: AdminTruthState",
  "runtimeEvidenceGroups: AdminDebugRuntimeEvidenceGroup[]",
  "reportFreshnessState:",
]) {
  requireIncludes(modelHelper, expected, "Control-tower model helper");
}

for (const expected of [
  "Raw support/user bodies stay redacted and collapsed.",
  "<details",
  "<summary",
]) {
  requireIncludes(cards, expected, "Control-tower cards");
}

if (failures.length > 0) {
  console.error("Debug Control Tower cutover validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Debug Control Tower cutover validation passed.");
