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

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, banned: string, label: string) {
  if (source.includes(banned)) {
    failures.push(`${label} must not include "${banned}".`);
  }
}

function readJson(relativePath: string) {
  const source = readRequired(relativePath);
  if (!source) {
    return null;
  }

  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

const report = readJson("agent/state/telemetry-orphan-cleanup-audit.generated.json");
const doc = readRequired("docs/agent-truth/telemetry-orphan-cleanup-audit.md");
const route = readRequired("src/app/api/analytics/ingest-identified/route.ts");
const tests = readRequired("tests/unit/analytics-ingest-identified-route.spec.ts");
const packageJson = readJson("package.json") as { scripts?: Record<string, string> } | null;

if (report) {
  const surfaces = Array.isArray(report.surfacesAudited) ? report.surfacesAudited as Array<Record<string, unknown>> : [];
  const surfaceKeys = new Set(surfaces.map((surface) => surface.surfaceKey));

  for (const requiredSurface of [
    "client_track_event",
    "authenticated_ingest_api",
    "server_track_server_event",
    "anonymous_guest_ingest",
    "functions_callable_ingest",
    "task_runtime_telemetry",
    "security_telemetry",
    "admin_debug_orphan_reporting",
    "legacy_recovery_mapping",
  ]) {
    if (!surfaceKeys.has(requiredSurface)) {
      failures.push(`Telemetry cleanup report is missing surface ${requiredSurface}.`);
    }
  }

  const startupEvidence = report.startupEvidence as Record<string, unknown> | undefined;
  const preEditTelemetryCheck = startupEvidence?.preEditTelemetryCheck as Record<string, unknown> | undefined;
  if (preEditTelemetryCheck?.catalogedEventsWithoutDetectedEmitter !== 0) {
    failures.push("Telemetry cleanup report must record zero cataloged events without detected emitters before cleanup.");
  }

  const cleanupActions = Array.isArray(report.cleanupActions) ? report.cleanupActions as Array<Record<string, unknown>> : [];
  if (!cleanupActions.some((action) => action.key === "skip_uncataloged_identified_ingest_events" && action.status === "done")) {
    failures.push("Telemetry cleanup report must record the unsupported identified ingest cleanup action.");
  }
}

requireIncludes(doc, "Unsupported telemetry must be rejected before it becomes an analytics fact", "telemetry cleanup doc");
requireIncludes(doc, "`functions/src/analytics-event-facts.ts` remains an exported legacy callable", "telemetry cleanup doc");
requireIncludes(doc, "Future agents must not remove legacy aliases", "telemetry cleanup doc");

requireIncludes(route, "resolveTrackedTelemetryEvent", "identified ingest route");
requireIncludes(route, "if (!telemetryEvent.isKnownEvent)", "identified ingest route");
requireIncludes(route, "skippedUnsupported", "identified ingest route");
requireIncludes(route, "eventName: canonicalEventName", "identified ingest route");
requireIncludes(route, "recordLegacyClientDiagnostic", "identified ingest route");
requireIncludes(route, "telemetryCleanup: \"skipped_uncataloged_diagnostic_event\"", "identified ingest route");
requireIncludes(route, "params: enrichedParams", "identified ingest route");
requireNotIncludes(route, "eventName: rawEvent.eventName", "identified ingest route");
requireNotIncludes(route, "lastEventName: rawEvent.eventName", "identified ingest route");

requireIncludes(tests, "orphan_probe_event", "identified ingest tests");
requireIncludes(tests, "notification_read", "identified ingest tests");
requireIncludes(tests, "admin_ui_error", "identified ingest tests");
requireIncludes(tests, "not.toHaveBeenCalled()", "identified ingest tests");

if (packageJson?.scripts?.["check:telemetry-orphan-cleanup"] !== "tsx scripts/agent/validate-telemetry-orphan-cleanup.ts") {
  failures.push("package.json must expose check:telemetry-orphan-cleanup.");
}

if (failures.length > 0) {
  console.error("Telemetry orphan cleanup validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Telemetry orphan cleanup validation passed.");
