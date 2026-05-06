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

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const viewerClient = readRequired("src/app/dashboard/viewer/ViewerClient.tsx");
const mediaViewer = readRequired("src/app/dashboard/viewer/components/MediaViewer.tsx");
const telemetryAdapter = readRequired("src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts");
const watchHook = readRequired("src/hooks/useViewerWatchSession.ts");
const watchLib = readRequired("src/lib/viewer-watch-session.ts");
const watchRoute = readRequired("src/app/api/viewer/watch-session/route.ts");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const telemetrySafety = readRequired("src/lib/telemetry-safety.ts");
const routeTests = readRequired("tests/unit/viewer-watch-session-route.spec.ts");
const viewerTests = readRequired("tests/unit/viewer-file-tracking.spec.ts");
const telemetryContracts = readRequired("tests/contracts/telemetry-contracts.spec.ts");
const adminAnalyticsCommerceTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx");
const adminAnalyticsHistoricalViewer = readRequired("src/lib/server/admin-analytics-historical-viewer.ts");
const adminAnalyticsShared = readRequired("src/lib/server/admin-analytics-shared.ts");

if (packageJson.scripts?.["check:viewer-file-tracking"] !== "tsx scripts/agent/validate-viewer-file-tracking.ts") {
  failures.push("package.json must expose check:viewer-file-tracking.");
}

requireIncludes(viewerClient, 'telemetry.handleAssetSwitch(activeIndex, resolvedContent.kind)', "ViewerClient");
requireIncludes(mediaViewer, 'key={`viewer-image-${contentBlobUrl}`}', "MediaViewer");
requireIncludes(telemetryAdapter, 'trackEvent("file_viewed"', "Viewer telemetry adapter");
requireIncludes(telemetryAdapter, "VIEWER_FILE_VIEW_DEDUPE_WINDOW_MS", "Viewer telemetry adapter dedupe");
requireExcludes(telemetryAdapter, 'trackEvent("viewer_asset_started"', "Viewer telemetry adapter");
requireExcludes(telemetryAdapter, 'trackEvent("viewer_asset_changed"', "Viewer telemetry adapter");

requireIncludes(watchLib, "VIEWER_FILE_VIEW_DEDUPE_WINDOW_MS = 30_000", "Viewer watch session library");
requireIncludes(watchLib, "buildViewerFileTelemetryContext", "Viewer watch session library");
requireIncludes(watchLib, "viewer_session_id", "Viewer watch session library");
requireIncludes(watchLib, "watch_session_id", "Viewer watch session library");

requireIncludes(watchHook, "dropContentFileNames", "Viewer watch hook file metadata");
requireIncludes(watchHook, 'trackEvent("watch_session_started"', "Viewer watch hook");
requireIncludes(watchHook, 'trackEvent("watch_session_ended"', "Viewer watch hook");
requireIncludes(watchHook, "fileId:", "Viewer watch hook session payload");
requireIncludes(watchHook, "mediaIndex:", "Viewer watch hook session payload");
requireIncludes(watchHook, "mediaType:", "Viewer watch hook session payload");

requireIncludes(watchRoute, "fileId: z.string().min(1).max(180).nullable().optional()", "Viewer watch route file id schema");
requireIncludes(watchRoute, "mediaIndex: z.number().int().min(1).max(100).nullable().optional()", "Viewer watch route media index schema");
requireIncludes(watchRoute, "mediaType: z.enum(VIEWER_WATCH_CONTENT_KINDS).nullable().optional()", "Viewer watch route media type schema");
requireExcludes(watchRoute, "contentUrls:", "Viewer watch route internal URL storage");
requireExcludes(watchRoute, "contentUrl:", "Viewer watch route internal URL storage");

requireIncludes(telemetryCatalog, '{ eventName: "file_viewed"', "Telemetry catalog file viewed event");
requireIncludes(telemetryCatalog, 'aliases: ["viewer_asset_started", "viewer_asset_changed"]', "Telemetry catalog file viewed aliases");
requireIncludes(telemetryCatalog, 'viewerSessionId: "viewer_session_id"', "Telemetry catalog viewer session param alias");
requireIncludes(telemetryCatalog, 'fileId: "file_id"', "Telemetry catalog file id alias");

requireIncludes(telemetrySafety, '"viewer_session_id"', "Telemetry safety viewer session priority");
requireIncludes(telemetrySafety, '"file_id"', "Telemetry safety file id priority");

requireIncludes(routeTests, 'fileId: "drop_1:file:1"', "Viewer watch route tests");
requireIncludes(viewerTests, "VIEWER_FILE_VIEW_DEDUPE_WINDOW_MS", "Viewer file tracking tests");
requireIncludes(telemetryContracts, 'normalizeTelemetryEventName("viewer_asset_started")).toBe("file_viewed")', "Telemetry contracts alias test");

requireIncludes(adminAnalyticsShared, "lastSeenAtMs?: number", "Admin viewer user option source timestamp");
requireIncludes(adminAnalyticsHistoricalViewer, "lastSeenAtMs: Math.max(", "Historical viewer source timestamp hydration");
requireIncludes(adminAnalyticsCommerceTab, "data-library-viewer-user-session-count", "Library Viewer username/session separator");
requireIncludes(adminAnalyticsCommerceTab, "{item.sessionCount.toLocaleString()} sessions", "Library Viewer username/session label");
requireIncludes(adminAnalyticsCommerceTab, "Last viewer session unavailable", "Library Viewer journey timestamp fallback");
requireIncludes(adminAnalyticsCommerceTab, "openedWithoutDepthCount", "Library Viewer opened-no-depth source");
requireIncludes(adminAnalyticsCommerceTab, "earlyExitFormula", "Library Viewer early-exit formula");
requireIncludes(adminAnalyticsCommerceTab, "Viewer opened but did not reach 10s watch", "Library Viewer no-depth definition");

if (failures.length > 0) {
  console.error("Viewer file tracking validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Viewer file tracking validator passed.");
