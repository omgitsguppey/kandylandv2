import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireExcludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

const bigQueryExport = read("functions/src/analytics-bigquery-export.ts");
const rebuildAnalyticsTruth = read("scripts/rebuild-analytics-truth.ts");
const rebuildBehavioral = read("scripts/rebuild-behavioral-intelligence.ts");
const analyticsTruthCli = read("functions/src/analytics-truth-cli.ts");
const analyticsTruthRuntime = read("functions/src/analytics-truth-runtime.ts");
const sourceHierarchy = read("docs/agent-truth/analytics-source-hierarchy.md");
const cloudGuardrails = read("docs/agent-truth/cloudrun-sql-bigquery-guardrails.md");
const sqlMirrorPayload = JSON.parse(read("agent/state/sql-sync.payload.generated.json")) as Record<string, unknown>;
const sqlMirrorStatus = JSON.parse(read("agent/state/sql-mirror-status.generated.json")) as Record<string, unknown>;
const dataconnectAgentContext = read("dataconnect/schema/agent-context.gql");
const dataconnectProfiles = read("dataconnect/schema/structured_profiles.gql");
const legacyInventory = read("scripts/analytics/inventory-legacy-sources.ts");
const legacyMapping = read("scripts/analytics/map-legacy-events.ts");

requireIncludes(bigQueryExport, 'document: "analytics_event_facts/{eventId}"', "BigQuery export");
requireIncludes(bigQueryExport, "truthClass: EXPORT_TRUTH_CLASS", "BigQuery export");
requireIncludes(bigQueryExport, "runtimeImportBlocked: true", "BigQuery export");
requireIncludes(bigQueryExport, 'canonicalImportTargets: [...CANONICAL_IMPORT_TARGETS]', "BigQuery export");
requireIncludes(bigQueryExport, 'forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES]', "BigQuery export");
requireExcludes(bigQueryExport, 'collection("analytics_admin_metric_snapshots")', "BigQuery export");

requireIncludes(rebuildAnalyticsTruth, 'KD_ANALYTICS_IMPORT_SCHEMA_VALIDATION_REQUIRED: "true"', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'KD_ANALYTICS_IMPORT_DRY_RUN_REQUIRED: "true"', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'KD_ANALYTICS_IMPORT_RUNTIME_MUTATION_BLOCKED: "true"', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS]', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES]', "Analytics truth rebuild");

requireIncludes(rebuildBehavioral, 'runFunctionsCommand("rebuild:analytics-truth")', "Behavioral rebuild");
requireIncludes(rebuildBehavioral, 'KD_ANALYTICS_IMPORT_SCHEMA_VALIDATION_REQUIRED: "true"', "Behavioral rebuild");
requireIncludes(rebuildBehavioral, 'canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS]', "Behavioral rebuild");

requireIncludes(analyticsTruthCli, 'truthClass: "canonical_fact_materializer_only"', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, 'importWritesLegacySnapshotsForbidden: true', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, '"analytics_watch_sessions"', "Analytics truth CLI");

requireIncludes(analyticsTruthRuntime, "buildCanonicalMetricFacts", "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, 'db.collection("analytics_event_facts")', "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, 'db.collection("analytics_watch_sessions")', "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, "readNormalizedAction", "Analytics truth runtime");
requireExcludes(analyticsTruthRuntime, 'analytics_admin_metric_snapshots', "Analytics truth runtime");

requireIncludes(sourceHierarchy, "BigQuery/GA4 are validation lanes", "Analytics source hierarchy");
requireIncludes(cloudGuardrails, "BigQuery is a validation/export lane, not product truth by default.", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "BigQuery runtime imports are blocked.", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "schema validation", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "dry-run mode", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "canonical event facts or metric facts", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "legacy admin metric snapshots", "Cloud guardrails docs");

if (sqlMirrorPayload.analyticsEvidenceOnly !== true) {
  failures.push("SQL mirror payload must set analyticsEvidenceOnly=true.");
}
if (sqlMirrorPayload.runtimeImportBlocked !== true) {
  failures.push("SQL mirror payload must set runtimeImportBlocked=true.");
}
if (!Array.isArray(sqlMirrorPayload.canonicalFactImportTargets) || !sqlMirrorPayload.canonicalFactImportTargets.includes("analytics_event_facts") || !sqlMirrorPayload.canonicalFactImportTargets.includes("analytics_metric_facts")) {
  failures.push("SQL mirror payload must declare canonicalFactImportTargets for analytics_event_facts and analytics_metric_facts.");
}
if (sqlMirrorStatus.analyticsEvidenceOnly !== true) {
  failures.push("SQL mirror status must set analyticsEvidenceOnly=true.");
}
if (sqlMirrorStatus.runtimeImportBlocked !== true) {
  failures.push("SQL mirror status must set runtimeImportBlocked=true.");
}
if (!Array.isArray(sqlMirrorStatus.canonicalFactImportTargets) || !sqlMirrorStatus.canonicalFactImportTargets.includes("analytics_event_facts") || !sqlMirrorStatus.canonicalFactImportTargets.includes("analytics_metric_facts")) {
  failures.push("SQL mirror status must declare canonicalFactImportTargets for analytics_event_facts and analytics_metric_facts.");
}

requireIncludes(dataconnectAgentContext, "never as runtime product truth", "Data Connect agent-context schema");
requireIncludes(dataconnectProfiles, "forbidden by default", "Data Connect profile schema");

requireIncludes(legacyInventory, "must never be a direct import/export mutation target", "Legacy source inventory");
requireIncludes(legacyMapping, "normalized event-fact or metric-fact writes with schema validation", "Legacy mapping");
requireIncludes(legacyMapping, "Legacy admin metric snapshots are never a write target", "Legacy mapping");

if (failures.length > 0) {
  console.error("Canonical analytics import/export validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Canonical analytics import/export validation passed.");
