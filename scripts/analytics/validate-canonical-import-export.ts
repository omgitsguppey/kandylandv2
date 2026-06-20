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
const importExportTruthPolicy = read("src/lib/analytics/import-export-truth-policy.ts");
const recoveryTimelineSpine = read("src/lib/analytics/recovery-timeline-spine.ts");
const sourceAgreementDetail = read("src/lib/analytics/source-agreement-detail.ts");
const adminAnalyticsDisplayState = read("src/lib/analytics/admin-analytics-display-state.ts");
const analyticsPanelHydrationValidator = read("scripts/agent/validate-analytics-panel-hydration.ts");
const adminAnalyticsHistoricalValidation = read("src/lib/server/admin-analytics-historical-validation.ts");
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

requireIncludes(bigQueryExport, 'db.collection("analytics_event_facts")', "BigQuery export");
requireIncludes(bigQueryExport, "truthClass: EXPORT_TRUTH_CLASS", "BigQuery export");
requireIncludes(bigQueryExport, "runtimeImportBlocked: true", "BigQuery export");
requireIncludes(bigQueryExport, 'canonicalImportTargets: [...CANONICAL_IMPORT_TARGETS]', "BigQuery export");
requireIncludes(bigQueryExport, 'forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES]', "BigQuery export");
requireExcludes(bigQueryExport, 'collection("analytics_admin_metric_snapshots")', "BigQuery export");

requireIncludes(rebuildAnalyticsTruth, 'KD_ANALYTICS_IMPORT_SCHEMA_VALIDATION_REQUIRED: "true"', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'KD_ANALYTICS_IMPORT_DRY_RUN_REQUIRED: "true"', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'KD_ANALYTICS_IMPORT_RUNTIME_MUTATION_BLOCKED: "true"', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "process.env.npm_execpath", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'hasFlag("--execute-functions")', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "executeFunctions: false", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "readSkipped: true", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS]', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, 'forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES]', "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "classifyGeneratedArtifactFromGit", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "isGeneratedArtifactCurrent", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "artifactCurrent", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "same_commit_snapshot", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "stale_generated_snapshot", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "npm run check:analytics-panel-hydration", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "expectedRangeSource", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "formalRangeStartDayKey", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "formalRangeEndDayKey", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "formalExpectedDayCount", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "evidenceDayCount", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "unprovenRanges", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "summarizeLaunchRecoveryDayEvidence", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "summarizeLaunchRecoveryFamilySourceStates", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "summarizeLaunchActiveSourceFamilyStates", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "summarizeRecoveredMetricMetadataCompleteness", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "activeSourceCoverage", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "canClearHistoricalLaunchProof", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "localEvidenceWindowSummary", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "formalLaunchDaySummary", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "recoveredMetricMetadataCompleteness", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "summarizeLaunchCoverageInputEvidence", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "launchCoverageInputEvidenceNextAction", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "const displaySummary = buildLaunchHistoryDisplaySummaryState", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "sourceWindowLabel", "Analytics truth rebuild");
requireIncludes(rebuildAnalyticsTruth, "mathReasonSamples: (displaySummary.mathReasonSamples ?? [])", "Analytics truth rebuild");
requireExcludes(rebuildAnalyticsTruth, "Launch evidence window since ${", "Analytics truth rebuild");
requireExcludes(rebuildAnalyticsTruth, "Launch history recovered since ${", "Analytics truth rebuild");
requireExcludes(rebuildAnalyticsTruth, "function readLaunchCoverageInputCandidates", "Analytics truth rebuild");
requireExcludes(rebuildAnalyticsTruth, "function launchCoverageInputNextAction", "Analytics truth rebuild");

requireIncludes(recoveryTimelineSpine, "summarizeLaunchRecoveryDayEvidence", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "summarizeLaunchRecoveryFamilySourceStates", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "summarizeLaunchActiveSourceFamilyStates", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "summarizeRecoveredMetricMetadataCompleteness", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "RECOVERED_METRIC_REQUIRED_METADATA_FIELDS", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "confidenceBandCounts", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "evidenceKindCounts", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "sourceTruthCounts", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "lateArrivalWindowDays", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "buildLaunchHistoryRangeProofState", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "buildAllLaunchHistoricalRouteRangeProofState", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "buildLaunchHistoryDisplaySummaryState", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "buildLaunchHistorySourceDayCoverageState", "Recovery timeline spine");
requireIncludes(recoveryTimelineSpine, "summarizeLaunchRecoveryConfidenceBands", "Recovery timeline spine");

requireIncludes(sourceAgreementDetail, "summarizeLaunchCoverageInputEvidence", "Source agreement detail");
requireIncludes(sourceAgreementDetail, "launchCoverageInputEvidenceNextAction", "Source agreement detail");
requireIncludes(sourceAgreementDetail, "LaunchCoverageInputEvidenceSummary", "Source agreement detail");
requireIncludes(sourceAgreementDetail, "LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY", "Source agreement detail");
requireIncludes(sourceAgreementDetail, "buildLaunchHistoryCoverageRangeProofEligibility", "Source agreement detail");
requireExcludes(sourceAgreementDetail, "function hasExplicitAllLaunchRangeProof", "Source agreement detail");
requireExcludes(sourceAgreementDetail, "function proofModeAllowsLaunchRangeProof", "Source agreement detail");
requireExcludes(sourceAgreementDetail, "function coverageWindowKindForLaunchHistoryCoverage", "Source agreement detail");

requireIncludes(analyticsPanelHydrationValidator, "buildLaunchHistoryRangeProofState", "Analytics panel hydration validator");
requireIncludes(analyticsPanelHydrationValidator, "rangeProof: buildLaunchHistoryRangeProofState", "Analytics panel hydration validator");
requireIncludes(analyticsPanelHydrationValidator, "displaySummary: buildLaunchHistoryDisplaySummaryState", "Analytics panel hydration validator");
requireIncludes(analyticsPanelHydrationValidator, "buildLaunchHistorySourceCoverageRowsState", "Analytics panel hydration validator");
requireIncludes(analyticsPanelHydrationValidator, "input.sourceAgreementResult.inputHead", "Analytics panel hydration validator");
requireIncludes(analyticsPanelHydrationValidator, "sourceAgreementEvidence.inputHead", "Analytics panel hydration validator");
requireIncludes(analyticsPanelHydrationValidator, "sourceAgreementInputHead", "Analytics panel hydration validator");
requireExcludes(analyticsPanelHydrationValidator, "const sourceAgreementHead = input.currentHead", "Analytics panel hydration validator");
requireExcludes(analyticsPanelHydrationValidator, "firstParty: firstPartyDays.size", "Analytics panel hydration validator");
requireExcludes(analyticsPanelHydrationValidator, "const computedMissingDaysBySource = {", "Analytics panel hydration validator");
requireIncludes(adminAnalyticsHistoricalValidation, "buildAllLaunchHistoricalRouteRangeProofState", "Admin analytics historical validation");
requireIncludes(adminAnalyticsHistoricalValidation, "rangeProof: historicalRouteRangeProof.rangeProof", "Admin analytics historical validation");
requireIncludes(adminAnalyticsHistoricalValidation, "displaySummary: buildLaunchHistoryDisplaySummaryState", "Admin analytics historical validation");
requireIncludes(adminAnalyticsHistoricalValidation, "buildLaunchHistorySourceCoverageRowsState", "Admin analytics historical validation");
requireExcludes(adminAnalyticsHistoricalValidation, "All-time historical route evidence covers ${expectedDays.length}", "Admin analytics historical validation");
requireExcludes(adminAnalyticsHistoricalValidation, "firstPartyPresentDayKeys.filter((dayKey) => expectedDaySet.has(dayKey)).length", "Admin analytics historical validation");
requireIncludes(adminAnalyticsDisplayState, "buildLaunchHistoryDisplaySummaryState", "Admin analytics display state");
requireIncludes(adminAnalyticsDisplayState, "coverage?.displaySummary ?? buildLaunchHistoryDisplaySummaryState", "Admin analytics display state");
requireExcludes(adminAnalyticsDisplayState, "formalExpectedDayCount > expectedDayCount", "Admin analytics display state");
requireExcludes(adminAnalyticsDisplayState, "coverage.days?.map", "Admin analytics display state");

requireIncludes(rebuildBehavioral, 'runFunctionsCommand("rebuild:analytics-truth")', "Behavioral rebuild");
requireIncludes(rebuildBehavioral, 'KD_ANALYTICS_IMPORT_SCHEMA_VALIDATION_REQUIRED: "true"', "Behavioral rebuild");
requireIncludes(rebuildBehavioral, "process.env.npm_execpath", "Behavioral rebuild");
requireIncludes(rebuildBehavioral, 'hasFlag("--execute-functions")', "Behavioral rebuild");
requireIncludes(rebuildBehavioral, "executeFunctions: false", "Behavioral rebuild");
requireIncludes(rebuildBehavioral, "readSkipped: true", "Behavioral rebuild");
requireIncludes(rebuildBehavioral, 'canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS]', "Behavioral rebuild");

requireIncludes(importExportTruthPolicy, 'ANALYTICS_IMPORT_EXPORT_TRUTH_CLASS = "analytics_evidence_only"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, '"runtime_transactions"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, '"runtime_subscriptions"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, '"runtime_support_messages"', "Import/export truth policy");
requireIncludes(importExportTruthPolicy, "idempotentImportRequired: true", "Import/export truth policy");

requireIncludes(analyticsTruthCli, 'truthClass: "canonical_fact_materializer_only"', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, 'importWritesLegacySnapshotsForbidden: true', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, '"analytics_watch_sessions"', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, '"runtime_transactions"', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, '"runtime_subscriptions"', "Analytics truth CLI");
requireIncludes(analyticsTruthCli, '"runtime_support_messages"', "Analytics truth CLI");

requireIncludes(analyticsTruthRuntime, "buildCanonicalMetricFacts", "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, 'db.collection("analytics_event_facts")', "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, 'db.collection("analytics_watch_sessions")', "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, "readNormalizedAction", "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, "KD_ANALYTICS_IMPORT_DRY_RUN_REQUIRED", "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, "KD_ANALYTICS_IMPORT_RUNTIME_MUTATION_BLOCKED", "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, "mutationSkipped: true", "Analytics truth runtime");
requireIncludes(analyticsTruthRuntime, "readSkipped: true", "Analytics truth runtime");
requireExcludes(analyticsTruthRuntime, 'analytics_admin_metric_snapshots', "Analytics truth runtime");

requireIncludes(sourceHierarchy, "BigQuery/GA4 are validation lanes", "Analytics source hierarchy");
requireIncludes(cloudGuardrails, "BigQuery is a validation/export lane, not product truth by default.", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "BigQuery runtime imports are blocked.", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "schema validation", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "dry-run mode", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "idempotent", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "canonical event facts or metric facts", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "legacy admin metric snapshots", "Cloud guardrails docs");
requireIncludes(cloudGuardrails, "support messages", "Cloud guardrails docs");

if (sqlMirrorPayload.analyticsEvidenceOnly !== true) {
  failures.push("SQL mirror payload must set analyticsEvidenceOnly=true.");
}
if (sqlMirrorPayload.runtimeImportBlocked !== true) {
  failures.push("SQL mirror payload must set runtimeImportBlocked=true.");
}
if (!Array.isArray(sqlMirrorPayload.canonicalFactImportTargets) || !sqlMirrorPayload.canonicalFactImportTargets.includes("analytics_event_facts") || !sqlMirrorPayload.canonicalFactImportTargets.includes("analytics_metric_facts")) {
  failures.push("SQL mirror payload must declare canonicalFactImportTargets for analytics_event_facts and analytics_metric_facts.");
}
if (!Array.isArray(sqlMirrorPayload.forbiddenRuntimeMutationSurfaces) || !sqlMirrorPayload.forbiddenRuntimeMutationSurfaces.includes("runtime_transactions") || !sqlMirrorPayload.forbiddenRuntimeMutationSurfaces.includes("runtime_subscriptions") || !sqlMirrorPayload.forbiddenRuntimeMutationSurfaces.includes("runtime_support_messages")) {
  failures.push("SQL mirror payload must block runtime transactions, subscriptions, and support message mutations.");
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
if (!Array.isArray(sqlMirrorStatus.forbiddenRuntimeMutationSurfaces) || !sqlMirrorStatus.forbiddenRuntimeMutationSurfaces.includes("runtime_transactions") || !sqlMirrorStatus.forbiddenRuntimeMutationSurfaces.includes("runtime_subscriptions") || !sqlMirrorStatus.forbiddenRuntimeMutationSurfaces.includes("runtime_support_messages")) {
  failures.push("SQL mirror status must block runtime transactions, subscriptions, and support message mutations.");
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
