import { readFileSync } from "node:fs";
import path from "node:path";

import { buildTrackingSurfaceCoverageReport } from "./score-tracking-surface-coverage";
import { ROOT } from "./shared";

function read(repoPath: string) {
  return readFileSync(path.join(ROOT, repoPath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const report = buildTrackingSurfaceCoverageReport();
const viewerHook = read("src/hooks/useViewerWatchSession.ts");
const watchRoute = read("src/app/api/viewer/watch-session/route.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
const eventContract = read("src/lib/behavioral/event-fact-contract.ts");
const telemetrySafety = read("src/lib/telemetry-safety.ts");
const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
const serverAnalytics = read("src/lib/server/analytics.ts");
const dropUnlockRoute = read("src/app/api/drops/unlock/route.ts");
const paypalCaptureRoute = read("src/app/api/paypal/capture/route.ts");
const surfaceMap = read("src/lib/behavioral/tracking-surface-map.ts");
const doc = read("docs/agent-truth/tracking-surface-coverage.md");

assert(report.surfaces.length >= 8, "Coverage report is missing tracked surfaces.");
assert(surfaceMap.includes("TRACKING_SURFACE_MAP"), "Tracking surface map is missing.");

assert(telemetryCatalog.includes('eventName: "purchase_verified"'), "Purchase success is missing from the telemetry catalog.");
assert(paypalCaptureRoute.includes('trackServerEvent("purchase_verified"'), "Purchase success is not recorded from the server route.");
assert(paypalCaptureRoute.includes('"gumdrops_purchase_completed"'), "Purchase completion is not server-backed from PayPal capture.");

assert(dropUnlockRoute.includes('"unlock_drop_success"'), "Unlock success is missing from the canonical unlock route.");
assert(serverAnalytics.includes("normalizedActionSourceTruth"), "Server analytics are not persisting canonical source truth.");

assert(viewerHook.includes('trackEvent("watch_session_started"'), "Viewer is missing watch_session_started.");
assert(
  watchRoute.includes("watch_session_id") || watchRoute.includes("watchSessionId"),
  "Viewer watch-session route is missing watch session identity handling.",
);
assert(viewerHook.includes("drop_id"), "Viewer tracking is missing drop_id.");
assert(
  viewerHook.includes("file_id") || viewerHook.includes("media_index") || viewerHook.includes("fileId"),
  "Viewer tracking is missing file or media identity.",
);

assert(normalizer.includes('notification_read: { normalizedAction: "notification_read"'), "Notification read is not canonical for scoring.");
assert(normalizer.includes("unknown_event_name"), "Unsupported events are not routed to diagnostics.");

assert(telemetrySafety.includes("[redacted_sensitive_url]"), "Sensitive URL redaction is missing.");
assert(telemetrySafety.includes("[redacted_sensitive_text]"), "Sensitive text redaction is missing.");
assert(identifiedIngest.includes("normalizedActionReasonCode"), "Identified ingest is missing canonical reason-code persistence.");

assert(eventContract.includes('"source_component"') || read("src/lib/behavioral/event-fact-contract.ts").includes("sourceComponent"), "Behavioral event fact contract is missing source component support.");
assert(doc.includes("Money, unlock, and entitlement facts stay server-truth first."), "Tracking surface coverage doctrine is missing server-truth guidance.");

assert(!report.criticalFailure, `Tracking surface coverage still has critical failures:\n${report.criticalFindings.map((finding) => `- ${finding.title} (${finding.filePath})`).join("\n")}`);

console.log(`Tracking surface coverage validator passed (${report.overallScore}/100).`);
