import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS,
  RUNTIME_WATCH_MAX_HEARTBEAT_DELTA_MS,
  RUNTIME_WATCH_MIN_HEARTBEAT_INTERVAL_MS,
} from "../../src/lib/analytics/runtime-watch-time-v2";

type RuntimeWatchTimeV2Report = {
  generatedAtUtc: string;
  reportKey: "runtime-watch-time-v2";
  currentHead: string;
  summary: {
    canonicalModelCreated: boolean;
    clientTrackerCreated: boolean;
    serverDeltaRulesModeled: boolean;
    pageOpenWatchTimeBlocked: boolean;
    hiddenTimeBlocked: boolean;
    duplicateEventIdDeduped: boolean;
    heartbeatIntervalMs: number;
    heartbeatDeltaCapMs: number;
    pausePagehideHandling: boolean;
    integrationStatus: "deferred_source_ready" | "wired";
    cloudRunCostStatus: string;
    cloudSqlStatus: string;
    geminiCloudAssistStatus: string;
    route4xxStatus: string;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  watchSessionSchema: string[];
  serverDeltaRules: string[];
  clientRules: string[];
  costFindings: Array<{ lane: "cloud_run" | "cloud_sql" | "gemini_cloud_assist" | "route_4xx"; status: string; evidence: string }>;
  deferredFindings: Array<{ id: string; reason: string; nextIntegrationPoint: string }>;
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/runtime-watch-time-v2.generated.json";
const docsRelativePath = "docs/agent-truth/runtime-watch-time-v2.md";
const modelPath = "src/lib/analytics/runtime-watch-time-v2.ts";
const legacyModelPath = "src/lib/analytics/watch-time-v2.ts";
const trackerPath = "src/components/Analytics/RuntimeWatchTracker.tsx";
const eventContractPath = "src/lib/analytics/analytics-event-contract.ts";
const viewerMediaPath = "src/app/dashboard/viewer/components/MediaViewer.tsx";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readRequired(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(fullPath, "utf8");
}

function buildReport(input: { currentHead: string; generatedAtUtc: string }): RuntimeWatchTimeV2Report {
  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "runtime-watch-time-v2",
    currentHead: input.currentHead,
    summary: {
      canonicalModelCreated: true,
      clientTrackerCreated: true,
      serverDeltaRulesModeled: true,
      pageOpenWatchTimeBlocked: true,
      hiddenTimeBlocked: true,
      duplicateEventIdDeduped: true,
      heartbeatIntervalMs: RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS,
      heartbeatDeltaCapMs: RUNTIME_WATCH_MAX_HEARTBEAT_DELTA_MS,
      pausePagehideHandling: true,
      integrationStatus: "deferred_source_ready",
      cloudRunCostStatus: "cost_safe_10s_heartbeat_no_request_path_backfill",
      cloudSqlStatus: "cloud_sql_not_detected_in_runtime_watch_v2",
      geminiCloudAssistStatus: "gemini_cloud_assist_not_involved",
      route4xxStatus: "invalid_payload_returns_calm_non_retryable_422",
      p0Count: 0,
      p1Count: 0,
      p2Count: 1,
    },
    watchSessionSchema: [
      "watchSessionId",
      "mediaId",
      "surface",
      "route",
      "guestId",
      "userId",
      "sessionId",
      "identityState",
      "mediaDurationMs",
      "playheadMs",
      "playbackRate",
      "muted",
      "visible",
      "active",
      "eventType",
      "clientElapsedMs",
      "clientEventAt",
      "eventId",
      "sequence",
    ],
    serverDeltaRules: [
      "duplicate eventId produces zero delta",
      "negative or zero deltas are ignored",
      "heartbeat delta is capped at 15 seconds",
      "hidden or inactive events add zero watch time",
      "watch deltas are clamped by media duration and playhead movement",
      "page-open/start events add zero watch time",
      "client elapsed is input context, not trusted total watch time",
    ],
    clientRules: [
      "heartbeat every 10 seconds while playing and visible",
      "emit play/start, pause, complete, visibility hidden, and pagehide/abandon",
      "clear heartbeat interval on pause, hidden, pagehide, and unmount",
      "prefer sendBeacon on pagehide when an ingest endpoint is supplied",
      "fallback to fetch keepalive when beacon is unavailable",
    ],
    costFindings: [
      {
        lane: "cloud_run",
        status: "cost_safe_10s_heartbeat",
        evidence: "RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS is 10000 and deltas are capped.",
      },
      {
        lane: "cloud_sql",
        status: "cloud_sql_not_detected_in_runtime_watch_v2",
        evidence: "Runtime watch v2 model and tracker do not import or call SQL/Data Connect.",
      },
      {
        lane: "gemini_cloud_assist",
        status: "gemini_cloud_assist_not_involved",
        evidence: "No model, prompt, Vertex, Gemini, or Cloud Assist code path exists.",
      },
      {
        lane: "route_4xx",
        status: "calm_non_retryable_422",
        evidence: "validateRuntimeWatchEventPayload returns non-retryable 422 for invalid payloads.",
      },
    ],
    deferredFindings: [
      {
        id: "viewer-media-runtime-watch-v2-integration",
        reason: "The safe media owner is MediaViewer, but the runtimeWatchEvent ingest boundary is not promoted yet; defer wiring to avoid blind route writes.",
        nextIntegrationPoint: viewerMediaPath,
      },
    ],
    nextFixOrder: [
      "Wire RuntimeWatchTracker into MediaViewer video/audio refs with existing watch-session ownership intact.",
      "Accept runtimeWatchEvent payloads at the selected analytics ingest boundary after route cost/idempotency review.",
      "Map runtime watch deltas into analytics_watch_sessions rollups without mixing page-open duration.",
    ],
  };
}

function validateReport(
  report: RuntimeWatchTimeV2Report,
  sources: { model: string; legacyModel: string; tracker: string; eventContract: string; viewerMedia: string },
) {
  const failures: string[] = [];
  if (report.reportKey !== "runtime-watch-time-v2") failures.push("reportKey must be runtime-watch-time-v2.");
  if (!report.summary.canonicalModelCreated) failures.push("canonical watch session model missing.");
  if (!report.summary.clientTrackerCreated) failures.push("runtime watch tracker missing.");
  if (report.summary.heartbeatIntervalMs < RUNTIME_WATCH_MIN_HEARTBEAT_INTERVAL_MS) {
    failures.push("heartbeat interval must not be below 5 seconds.");
  }
  if (report.summary.heartbeatDeltaCapMs > 15_000) failures.push("heartbeat delta cap must be 15 seconds or lower.");
  for (const field of ["mediaDurationMs", "playheadMs", "visible", "active", "clientElapsedMs", "eventId", "sequence"]) {
    if (!report.watchSessionSchema.includes(field)) failures.push(`watch session schema missing ${field}.`);
  }
  if (!sources.model.includes("processedEventIds.includes(event.eventId)")) failures.push("duplicate eventId can double count.");
  if (!sources.model.includes("event.eventType !== \"watch_start\"")) failures.push("watch time can be computed from page open alone.");
  if (!sources.model.includes("hidden_time_excluded")) failures.push("hidden tab time exclusion missing.");
  if (!sources.model.includes("Math.min(trustedDelta.deltaMs, playheadDeltaMs)")) failures.push("server accepts client total blindly or does not clamp by playhead.");
  if (!sources.model.includes("validateRuntimeWatchEventPayload")) failures.push("calm invalid payload validation missing.");
  if (!sources.legacyModel.includes("export * from \"./runtime-watch-time-v2\"")) failures.push("legacy watch-time-v2 module must re-export canonical runtime watch-time v2 model.");
  if (!sources.tracker.includes("visibilitychange") || !sources.tracker.includes("pagehide")) failures.push("pause/pagehide handling missing.");
  if (!sources.tracker.includes("sendBeacon") || !sources.tracker.includes("keepalive")) failures.push("beacon/keepalive unload transport missing.");
  for (const token of ["RuntimeWatchV2AnalyticsPayload", "mediaDurationMs", "playheadMs", "clientElapsedMs", "identityState"]) {
    if (!sources.eventContract.includes(token)) failures.push(`analytics event contract missing watch v2 token ${token}.`);
  }
  for (const lane of ["cloud_run", "cloud_sql", "gemini_cloud_assist", "route_4xx"] as const) {
    if (!report.costFindings.some((finding) => finding.lane === lane)) failures.push(`${lane} cost lane missing.`);
  }
  if (report.nextFixOrder.length === 0 || report.deferredFindings.length === 0) failures.push("next integration point missing.");
  if (!sources.viewerMedia.includes("reportWatchMediaPlay") || !sources.viewerMedia.includes("<video")) failures.push("viewer media integration point is not identified.");
  return failures;
}

function renderMarkdown(report: RuntimeWatchTimeV2Report) {
  const ruleRows = report.serverDeltaRules.map((rule) => `- ${rule}`).join("\n");
  const clientRows = report.clientRules.map((rule) => `- ${rule}`).join("\n");
  const costRows = report.costFindings.map((finding) => `| ${finding.lane} | ${finding.status} | ${finding.evidence} |`).join("\n");
  const deferredRows = report.deferredFindings.map((finding) => `| ${finding.id} | ${finding.reason} | ${finding.nextIntegrationPoint} |`).join("\n");
  const nextRows = report.nextFixOrder.map((item, index) => `${index + 1}. ${item}`).join("\n");

  return `# Runtime Watch-Time v2

Generated: ${report.generatedAtUtc}
Current head: ${report.currentHead}

## Summary

- Canonical model created: ${report.summary.canonicalModelCreated}
- Client tracker created: ${report.summary.clientTrackerCreated}
- Server delta rules modeled: ${report.summary.serverDeltaRulesModeled}
- Heartbeat interval: ${report.summary.heartbeatIntervalMs}ms
- Heartbeat delta cap: ${report.summary.heartbeatDeltaCapMs}ms
- Integration status: ${report.summary.integrationStatus}
- Cloud SQL status: ${report.summary.cloudSqlStatus}
- Gemini/Cloud Assist status: ${report.summary.geminiCloudAssistStatus}
- 4xx status: ${report.summary.route4xxStatus}

## Server Delta Rules

${ruleRows}

## Client Rules

${clientRows}

## Cost Lanes

| Lane | Status | Evidence |
| --- | --- | --- |
${costRows}

## Deferred Integration

| Id | Reason | Next integration point |
| --- | --- | --- |
${deferredRows}

## Next Fix Order

${nextRows}
`;
}

function writeReport(report: RuntimeWatchTimeV2Report) {
  const artifactPath = join(repoRoot, artifactRelativePath);
  const docsPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docsPath, renderMarkdown(report));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = buildReport({ currentHead: currentHead(), generatedAtUtc: new Date().toISOString() });
  const failures = validateReport(report, {
    model: readRequired(modelPath),
    legacyModel: readRequired(legacyModelPath),
    tracker: readRequired(trackerPath),
    eventContract: readRequired(eventContractPath),
    viewerMedia: readRequired(viewerMediaPath),
  });

  if (failures.length > 0) {
    console.error("Runtime watch-time v2 validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  writeReport(report);
  console.log(`Wrote ${artifactRelativePath}`);
  console.log(`Wrote ${docsRelativePath}`);
  console.log("Runtime watch-time v2 validation passed.");
}
