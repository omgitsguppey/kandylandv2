import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
const privacyAwareScoring = read("src/lib/behavioral/privacy-aware-scoring.ts");
const userBehaviorRollup = read("src/lib/server/user-behavior-rollup.ts");
const userBehaviorTruthRollup = read("src/lib/server/user-behavior-truth-rollup.ts");
const privacyConsent = read("src/lib/privacy-consent.ts");
const telemetry = read("src/lib/telemetry.ts");
const behavioralRuntime = read("functions/src/behavioral-intelligence-runtime.ts");
const importExportTruthPolicy = read("src/lib/analytics/import-export-truth-policy.ts");
const rebuildAnalyticsTruth = read("scripts/rebuild-analytics-truth.ts");
const rebuildBehavioral = read("scripts/rebuild-behavioral-intelligence.ts");
const analyticsTruthCli = read("functions/src/analytics-truth-cli.ts");
const bigQueryExport = read("functions/src/analytics-bigquery-export.ts");
const dataconnectAgentContext = read("dataconnect/schema/agent-context.gql");
const dataconnectProfiles = read("dataconnect/schema/structured_profiles.gql");
const doctrine = read("docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md");
const sqlSyncPayload = JSON.parse(read("agent/state/sql-sync.payload.generated.json")) as Record<string, unknown>;
const sqlMirrorStatus = JSON.parse(read("agent/state/sql-mirror-status.generated.json")) as Record<string, unknown>;

if (packageJson.scripts?.["check:privacy-import-export-cutover"] !== "tsx scripts/agent/validate-privacy-import-export-cutover.ts") {
  failures.push("package.json must expose check:privacy-import-export-cutover.");
}

requireIncludes(privacyAwareScoring, "PRIVACY_LIMITED_ENGAGEMENT_SCORE_FLOOR = 24", "Privacy-aware scoring");
requireIncludes(privacyAwareScoring, "PRIVACY_LIMITED_VALUE_SCORE_FLOOR = 22", "Privacy-aware scoring");
requireIncludes(privacyAwareScoring, "PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34", "Privacy-aware scoring");
requireIncludes(privacyAwareScoring, "capRecommendationConfidenceByDataAvailability", "Privacy-aware scoring");

requireIncludes(privacyConsent, '"privacy_limited_identified_analytics_denied"', "Privacy consent");
requireIncludes(privacyConsent, '"privacy_limited_global_privacy_control"', "Privacy consent");

requireIncludes(userBehaviorRollup, "applyPrivacyAwareEngagementFloor", "User behavior rollup");
requireIncludes(userBehaviorRollup, "applyPrivacyAwareValueFloor", "User behavior rollup");
requireIncludes(userBehaviorRollup, '"Privacy limited"', "User behavior rollup");
requireIncludes(userBehaviorRollup, "dataAvailabilityReason: privacyAvailabilityReason", "User behavior rollup");

requireIncludes(userBehaviorTruthRollup, "capRecommendationConfidenceByDataAvailability", "User behavior truth rollup");
requireIncludes(userBehaviorTruthRollup, "dataAvailabilityReason: rollup.dataAvailabilityReason", "User behavior truth rollup");

requireIncludes(telemetry, "privacy_data_availability_reason", "Telemetry");
requireIncludes(telemetry, "identified_analytics_allowed", "Telemetry");
requireIncludes(telemetry, "metric_exclusion_reason", "Telemetry");
requireIncludes(telemetry, "privacy_exclusion_reason", "Telemetry");

requireIncludes(behavioralRuntime, "PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34", "Behavioral intelligence runtime");
requireIncludes(behavioralRuntime, 'recommendationState = !consentAvailability', "Behavioral intelligence runtime");
requireIncludes(behavioralRuntime, 'recommendationCardState: recommendationState === "profile-driven" ? "profile-driven" : "fallback-limited"', "Behavioral intelligence runtime");
requireIncludes(behavioralRuntime, "dataAvailabilityReason: consentAvailability === 0", "Behavioral intelligence runtime");

requireIncludes(importExportTruthPolicy, 'ANALYTICS_IMPORT_EXPORT_TRUTH_CLASS = "analytics_evidence_only"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, '"runtime_transactions"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, '"runtime_subscriptions"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, '"runtime_support_messages"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, "idempotentImportRequired: true", "Import/export truth policy");
requireIncludes(importExportTruthPolicy, "runtimeImportBlocked: true", "Import/export truth policy");

requireIncludes(rebuildAnalyticsTruth, "CANONICAL_FACT_IMPORT_TARGETS", "Analytics rebuild");
requireIncludes(rebuildAnalyticsTruth, "FORBIDDEN_RUNTIME_MUTATION_SURFACES", "Analytics rebuild");
requireIncludes(rebuildBehavioral, "CANONICAL_FACT_IMPORT_TARGETS", "Behavioral rebuild");
requireIncludes(rebuildBehavioral, "FORBIDDEN_RUNTIME_MUTATION_SURFACES", "Behavioral rebuild");

requireIncludes(analyticsTruthCli, '"runtime_transactions"', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, '"runtime_subscriptions"', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, '"runtime_support_messages"', "Analytics truth CLI");
requireIncludes(bigQueryExport, '"runtime_transactions"', "BigQuery export");
requireIncludes(bigQueryExport, '"runtime_subscriptions"', "BigQuery export");
requireIncludes(bigQueryExport, '"runtime_support_messages"', "BigQuery export");
requireIncludes(dataconnectAgentContext, "transactions, unlocks, purchases, subscriptions, support messages", "Data Connect agent context");
requireIncludes(dataconnectProfiles, "dry-run, schema validation, and", "Data Connect structured profiles");
requireIncludes(dataconnectProfiles, "support messages, or runtime rollups", "Data Connect structured profiles");
requireIncludes(doctrine, "dry-run, schema validation, and idempotent execution", "Google analytics cloud doctrine");
requireIncludes(doctrine, "support messages, or runtime rollups", "Google analytics cloud doctrine");

const requiredForbiddenSurfaces = [
  "runtime_balances",
  "runtime_transactions",
  "runtime_unlocks",
  "runtime_purchases",
  "runtime_subscriptions",
  "runtime_support_messages",
  "runtime_user_rollups",
  "legacy_admin_metric_snapshots",
];

for (const record of [sqlSyncPayload, sqlMirrorStatus]) {
  const forbidden = Array.isArray(record.forbiddenRuntimeMutationSurfaces)
    ? record.forbiddenRuntimeMutationSurfaces
    : [];
  for (const surface of requiredForbiddenSurfaces) {
    if (!forbidden.includes(surface)) {
      failures.push(`SQL mirror artifact must include forbidden runtime mutation surface "${surface}".`);
    }
  }
  if (record.analyticsEvidenceOnly !== true) {
    failures.push("SQL mirror artifact must keep analyticsEvidenceOnly=true.");
  }
  if (record.runtimeImportBlocked !== true) {
    failures.push("SQL mirror artifact must keep runtimeImportBlocked=true.");
  }
}

if (failures.length > 0) {
  console.error("Privacy/import-export cutover validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Privacy/import-export cutover validation passed.");
