import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function readJsonRequired<T = Record<string, unknown>>(relativePath: string): T | null {
  const source = readRequired(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    failures.push(`Invalid JSON report: ${relativePath} (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireCondition(condition: unknown, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

type GeneratedReport = Record<string, unknown>;

const contract = readRequired("src/lib/analytics/legacy-recovery-contract.ts");
const mapperContract = readRequired("src/lib/analytics/legacy-event-mapping.ts");
const inventoryScript = readRequired("scripts/analytics/inventory-legacy-sources.ts");
const mappingScript = readRequired("scripts/analytics/map-legacy-events.ts");
const parityScript = readRequired("scripts/analytics/check-analytics-ecosystem-parity.ts");
const debugRoute = readRequired("src/app/api/admin/debug/route.ts");
const legacyDoc = readRequired("docs/agent-truth/analytics-legacy-recovery.md");
const parityDoc = readRequired("docs/agent-truth/analytics-ecosystem-parity.md");
const inventoryReport = readJsonRequired<GeneratedReport>("agent/state/analytics-legacy-source-inventory.generated.json");
const mappingReport = readJsonRequired<GeneratedReport>("agent/state/analytics-legacy-mapping-report.generated.json");
const parityReport = readJsonRequired<GeneratedReport>("agent/state/analytics-ecosystem-parity.generated.json");

for (const sourceName of [
  "analytics_event_facts",
  "analytics_guest_batches",
  "transactions",
  "unlocks",
  "drop_views",
  "analytics_watch_sessions",
  "daily_task_events",
  "task_lifecycle_logs",
  "notifications",
  "onboarding_steps",
  "users",
  "presence",
  "admin_audit_logs",
  "ga4_daily",
  "ga4_intraday",
  "analytics_admin_metric_snapshots",
]) {
  requireIncludes(inventoryScript, sourceName, "Legacy source inventory script");
}

for (const requiredNeedle of [
  "parseLegacyRecoveryCliArgs",
  "dryRun: true",
  "--write",
  "--source",
  "--range",
]) {
  requireIncludes(contract, requiredNeedle, "Legacy recovery contract");
}

for (const writeGuardNeedle of [
  "ANALYTICS_LEGACY_WRITE_ENABLED",
  "writeModeRequested",
  "writeModeEnabled",
  "writeTargetImplemented: false",
]) {
  requireIncludes(mappingScript, writeGuardNeedle, "Legacy mapping script");
}

for (const recordField of [
  "legacySource",
  "legacyId",
  "legacyTimestamp",
  "mappedEventName",
  "mappingConfidence",
  "mappingWarnings",
  "recoveredAt",
  "actorConfidence",
  "objectConfidence",
  "sourceMode",
  "includedInSnapshot",
  "excludedReason",
]) {
  requireIncludes(contract, recordField, "Legacy recovered record contract");
}

requireIncludes(contract, "legacy_mapped", "Legacy recovered record source mode");
requireIncludes(mapperContract, "serverConfirmed: false", "Legacy mapper server truth guard");
requireIncludes(mapperContract, "legacy_directional_only", "Legacy mapper mixing policy");

for (const lane of [
  "purchases",
  "unlocks",
  "tasks",
  "notifications",
  "onboarding",
  "guest_auth",
  "admin_exclusion",
  "snapshots",
  "legacy_mapping",
]) {
  requireIncludes(contract, `"${lane}"`, "Analytics parity lane contract");
  requireIncludes(parityScript, `lane: "${lane}"`, "Analytics ecosystem parity script");
}

for (const regressionNeedle of [
  "authenticated-only totals",
  "admin events",
  "guest traffic",
  "stale cache",
  "fake zeros",
  "raw task events",
  "raw funnel event ratios",
  "unknown source",
  "Data Validation",
]) {
  requireIncludes(parityDoc, regressionNeedle, "Analytics ecosystem parity doctrine");
}

for (const debugNeedle of [
  "adminAnalyticsLegacyParity",
  "Analytics Legacy + Parity",
  "legacySourceCount",
  "mappedRecordCount",
  "skippedRecordCount",
  "lowConfidenceCount",
  "highestSeverity",
  "manualReviewItems",
  "writeModeEnabled",
]) {
  requireIncludes(debugRoute, debugNeedle, "Admin Debug legacy parity metadata");
}

for (const docNeedle of [
  "dry-run",
  "legacySource",
  "mappingConfidence",
  "mappingWarnings",
  "sourceMode = legacy_mapped",
  "includedInSnapshot",
  "Legacy mapped records are never server-confirmed",
]) {
  requireIncludes(legacyDoc, docNeedle, "Legacy recovery doctrine");
}

for (const docNeedle of [
  "purchase",
  "unlock",
  "task",
  "notification",
  "onboarding",
  "guest",
  "admin exclusion",
  "snapshot",
  "confidence scoring",
  "self-healing",
]) {
  requireIncludes(parityDoc, docNeedle, "Ecosystem parity doctrine");
}

if (inventoryReport) {
  requireCondition(inventoryReport.dryRun === true, "Legacy inventory report must be a dry run.");
  requireCondition(inventoryReport.liveScanEnabled === false, "Legacy inventory report must not live-scan by default.");
  requireCondition(Array.isArray(inventoryReport.sources) && inventoryReport.sources.length >= 10, "Legacy inventory report must include broad source coverage.");
}

if (mappingReport) {
  requireCondition(mappingReport.dryRun === true, "Legacy mapping report must be dry-run by default.");
  requireCondition(mappingReport.writeModeEnabled === false, "Legacy mapping report must keep write mode disabled by default.");
  requireCondition(Number(mappingReport.scanned) > 0, "Legacy mapping report must include scanned records.");
  requireCondition(Number(mappingReport.mapped) > 0, "Legacy mapping report must include mapped records.");
  const recoveredEvents = Array.isArray(mappingReport.recoveredEvents) ? mappingReport.recoveredEvents as Array<Record<string, unknown>> : [];
  requireCondition(recoveredEvents.length > 0, "Legacy mapping report must include recovered event samples.");
  for (const [index, event] of recoveredEvents.entries()) {
    requireCondition(event.sourceMode === "legacy_mapped", `Recovered event ${index} must use sourceMode=legacy_mapped.`);
    requireCondition(event.serverConfirmed === false, `Recovered event ${index} must not be server-confirmed.`);
    requireCondition(typeof event.mappingConfidence === "string", `Recovered event ${index} must include mappingConfidence.`);
    requireCondition(Array.isArray(event.mappingWarnings), `Recovered event ${index} must include mappingWarnings.`);
    requireCondition(typeof event.includedInSnapshot === "boolean", `Recovered event ${index} must include includedInSnapshot.`);
  }
}

if (parityReport) {
  const lanes = Array.isArray(parityReport.lanes) ? parityReport.lanes as Array<Record<string, unknown>> : [];
  const laneNames = new Set(lanes.map((lane) => lane.lane));
  for (const lane of [
    "purchases",
    "unlocks",
    "tasks",
    "notifications",
    "onboarding",
    "guest_auth",
    "admin_exclusion",
    "snapshots",
    "legacy_mapping",
  ]) {
    requireCondition(laneNames.has(lane), `Parity report must include lane: ${lane}`);
  }
  requireCondition((parityReport.snapshotParityIntegration as Record<string, unknown> | undefined)?.blocksUiRendering === false, "Parity report must not block UI rendering.");
}

if (failures.length > 0) {
  console.error("Analytics legacy recovery validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Analytics legacy recovery validation passed.");
