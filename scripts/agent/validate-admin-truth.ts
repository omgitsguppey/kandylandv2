import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

const packageJson = read("package.json");
const truthBadge = read("src/components/Admin/AdminTruthBadge.tsx");
const debugPrimitives = read("src/app/admin/debug/components/DebugPrimitives.tsx");
const adminDebugRoute = read("src/app/api/admin/debug/route.ts");
const recoveryEvidenceComponent = read("src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx");
const debugNow = read("src/app/admin/debug/components/DebugTabNow.tsx");
const audienceTab = read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx");
const operationsTab = read("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const commerceTab = read("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const displayStateHelper = read("src/lib/analytics/admin-analytics-display-state.ts");

requireIncludes(packageJson, "\"check:admin-truth\"", "package.json");
requireIncludes(truthBadge, "data-admin-truth-state", "AdminTruthBadge");
requireIncludes(debugPrimitives, "AdminTruthBadge", "Admin Debug primitives");
requireIncludes(debugPrimitives, "resolveAdminInputTruthState", "Admin Debug primitives");

for (const expected of [
  "adminAnalyticsRecoveryEvidence",
  "productionAllowedNow: false",
  "adminAnalyticsPromotedNow: false",
  "debug_only",
  "needs_review",
  "recovery_evidence_debug_first",
  "source_confidence",
  "mapping_warning",
  "production_backfill_disabled",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin Debug recovery truth payload");
}

for (const expected of [
  "DebugRecoveryEvidenceSummary",
  "data-admin-debug-recovery-evidence",
  "data-admin-debug-recovery-production-allowed",
  "data-admin-debug-recovery-promoted-now",
  "productionAllowedNow=false",
  "adminAnalyticsPromotedNow",
]) {
  requireIncludes(recoveryEvidenceComponent, expected, "Admin Debug recovery evidence summary");
}

requireIncludes(debugNow, "<DebugRecoveryEvidenceSummary recoveryEvidence={data?.adminAnalyticsRecoveryEvidence} />", "Admin Debug Right Now tab");
requireNotIncludes(adminDebugRoute, "adminAnalyticsPromotedNow: true", "Admin Debug recovery truth payload");
requireNotIncludes(adminDebugRoute, "productionAllowedNow: true", "Admin Debug recovery truth payload");

for (const expected of [
  "Verified snapshot",
  "Verified snapshot, refresh due",
  "Current activity source",
  "Estimated from vendor analytics",
  "Debug-only recovery evidence",
  "Needs review before promotion",
]) {
  requireIncludes(displayStateHelper, expected, "Admin Analytics source label helper");
}

for (const [label, source] of [
  ["Admin Analytics Audience module", audienceTab],
  ["Admin Analytics Operations module", operationsTab],
  ["Admin Analytics Commerce module", commerceTab],
] as const) {
  requireIncludes(source, "data-admin-analytics-snapshot-priority=\"analytics_admin_metric_snapshots\"", label);
  requireIncludes(source, "data-admin-analytics-vendor-source-label=\"vendor_evidence\"", label);
  requireIncludes(source, "data-admin-analytics-recovery-promotion=\"debug_only_not_promoted\"", label);
}

requireIncludes(audienceTab, "supporting evidence, not product truth", "Admin Analytics Audience module");
requireIncludes(operationsTab, "supports comparison only", "Admin Analytics Operations module");
requireIncludes(commerceTab, "stays supporting evidence, not product truth", "Admin Analytics Commerce module");

if (failures.length > 0) {
  console.error("Admin truth validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin truth validation passed.");
