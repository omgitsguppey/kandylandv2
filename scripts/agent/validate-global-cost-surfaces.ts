import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  GLOBAL_COST_BUCKET_WEIGHTS,
  GLOBAL_COST_DOC_PATH,
  GLOBAL_COST_HARD_LIMITS,
  GLOBAL_COST_REPORT_PATH,
  GLOBAL_COST_SURFACE_BUCKETS,
  GLOBAL_COST_SURFACE_CONTRACTS,
  type GlobalCostFinding,
  type GlobalCostScoreBucket,
  type GlobalCostSurfaceId,
  type GlobalCostSurfaceReport,
} from "../../src/lib/server/global-cost-surface-contract";

const repoRoot = process.cwd();
const failures: string[] = [];
const requiredSurfaces = [
  "telemetry_event_volume",
  "posthog_event_volume",
  "ga_event_volume",
  "session_replay_future",
  "cloud_logging_volume",
  "debug_evidence_volume",
  "firebase_storage_egress",
  "media_signed_url_access",
  "image_optimization",
  "firebase_auth_abuse",
  "phone_auth_sms_future",
  "fcm_notification_fanout",
  "cloud_build_minutes",
  "app_hosting_bandwidth",
  "artifact_registry_storage",
  "visual_snapshot_testing",
  "browser_audit_tooling",
  "scheduled_rebuild_jobs",
  "analytics_materializers",
  "dependency_tooling",
  "admin_export_import_jobs",
] satisfies GlobalCostSurfaceId[];

function repoPath(relativePath: string) {
  return path.join(repoRoot, relativePath);
}

function fail(message: string) {
  failures.push(message);
}

function readRequired(relativePath: string) {
  const fullPath = repoPath(relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function readJsonReport() {
  const source = readRequired(GLOBAL_COST_REPORT_PATH);
  if (!source) return null;
  try {
    return JSON.parse(source) as GlobalCostSurfaceReport;
  } catch (error) {
    fail(`${GLOBAL_COST_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function requireNotMatches(source: string, pattern: RegExp, label: string, message: string) {
  if (pattern.test(source)) {
    fail(`${label}: ${message}`);
  }
}

function validateFinding(finding: GlobalCostFinding, index: number) {
  for (const field of [
    "id",
    "surface",
    "severity",
    "bucket",
    "title",
    "filePath",
    "expectedRule",
    "actualPattern",
    "suggestedFix",
  ] as const) {
    if (typeof finding[field] !== "string" || finding[field].trim().length === 0) {
      fail(`findings[${index}].${field} must be a non-empty string.`);
    }
  }
  if (!requiredSurfaces.includes(finding.surface)) {
    fail(`findings[${index}].surface is not a known global cost surface.`);
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    fail(`findings[${index}].severity is invalid.`);
  }
  if (!Object.keys(GLOBAL_COST_BUCKET_WEIGHTS).includes(finding.bucket)) {
    fail(`findings[${index}].bucket is invalid.`);
  }
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    fail(`findings[${index}].evidence must be non-empty.`);
  }
  if (typeof finding.scoreImpact !== "number" || finding.scoreImpact > 0 || finding.scoreImpact < -25) {
    fail(`findings[${index}].scoreImpact must be between -25 and 0.`);
  }
}

function validateContracts() {
  const seen = new Set<string>();
  for (const surface of requiredSurfaces) {
    const contract = GLOBAL_COST_SURFACE_CONTRACTS.find((entry) => entry.surface === surface);
    if (!contract) {
      fail(`Missing global cost contract for ${surface}.`);
      continue;
    }
    if (seen.has(surface)) {
      fail(`Duplicate global cost contract for ${surface}.`);
    }
    seen.add(surface);

    if (!contract.owner.trim()) fail(`${surface} must have an owner.`);
    if (!contract.validator.trim()) fail(`${surface} must declare a validator.`);
    if (!["low", "medium", "high", "critical"].includes(contract.costRisk)) fail(`${surface} has invalid risk.`);
    if (!Array.isArray(contract.sourceFiles) || contract.sourceFiles.length === 0) fail(`${surface} must list source files.`);
    if (typeof contract.defaultAllowedInCI !== "boolean") fail(`${surface}.defaultAllowedInCI must be boolean.`);
    if (typeof contract.defaultAllowedOnPageLoad !== "boolean") fail(`${surface}.defaultAllowedOnPageLoad must be boolean.`);
    if (typeof contract.maxRetries !== "number" || contract.maxRetries < 0) fail(`${surface}.maxRetries must be non-negative.`);
    if (!contract.cachePolicy.trim()) fail(`${surface} must declare cachePolicy.`);
    if (!contract.samplingPolicy.trim()) fail(`${surface} must declare samplingPolicy.`);
    if (!contract.requiredRateLimit.trim()) fail(`${surface} must declare requiredRateLimit.`);
    if (!contract.requiredDebugEvidence.trim()) fail(`${surface} must declare requiredDebugEvidence.`);
    if (!contract.requiredKillSwitch.trim()) fail(`${surface} must declare requiredKillSwitch.`);
    if (!GLOBAL_COST_SURFACE_BUCKETS[contract.surface]) fail(`${surface} must map to a score bucket.`);

    const limitFields = [
      contract.maxEventsPerUserPerMinute,
      contract.maxEventsPerSession,
      contract.maxBytesPerRequest,
      contract.maxRowsPerRun,
      contract.maxRuntimeMs,
    ];
    if (!limitFields.some((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)) {
      fail(`${surface} must declare at least one numeric budget limit.`);
    }
  }
}

function validateHardLimitSources() {
  const watchSource = [
    readRequired("src/hooks/useViewerWatchSession.ts"),
    readRequired("src/app/dashboard/viewer/adapters/ViewerTelemetryAdapter.ts"),
    readRequired("src/components/Analytics/DeepTracker.tsx"),
  ].join("\n");
  const tickMatch = /WATCH_VISIBLE_TICK_INTERVAL_MS\s*=\s*([0-9_]+)/u.exec(watchSource);
  if (!tickMatch) {
    fail("useViewerWatchSession must expose WATCH_VISIBLE_TICK_INTERVAL_MS for cost validation.");
  } else if (Number(tickMatch[1].replace(/_/gu, "")) < 5_000) {
    fail("Watch/session ticks must not run faster than every 5 seconds.");
  }
  requireNotMatches(
    watchSource,
    /setInterval\s*\([\s\S]{0,220},\s*1_?000\s*\)/u,
    "telemetry/watch source",
    "must not contain a 1s telemetry interval.",
  );

  const debugStore = readRequired("src/lib/server/debug-evidence-store.ts");
  requireIncludes(debugStore, "DEBUG_EVIDENCE_MAX_EVENT_WRITES_PER_FINGERPRINT_PER_HOUR", "debug evidence store");
  requireIncludes(debugStore, "suppressedEventWriteCount", "debug evidence store");
  requireIncludes(debugStore, "dedupePolicy", "debug evidence store");

  const debugContract = readRequired("src/lib/debug-evidence-contract.ts");
  requireIncludes(debugContract, "contentUrl", "debug evidence sensitive keys");
  requireIncludes(debugContract, "rawBody", "debug evidence sensitive keys");

  const serverDiagnostics = readRequired("src/lib/server/server-diagnostics.ts");
  const routeDiagnostics = readRequired("src/lib/server/route-diagnostics.ts");
  requireIncludes(serverDiagnostics, "slice(0, 500)", "server diagnostics");
  requireIncludes(routeDiagnostics, "slice(0, 500)", "route diagnostics");

  const mediaRoute = readRequired("src/app/api/drops/content/route.ts");
  for (const needle of [
    "MEDIA_PROXY",
    "MEDIA_PROXY_MAX_BYTES_PER_REQUEST",
    "cache: \"no-store\"",
    "Cache-Control",
    "private, no-store",
    "isAllowedRemoteMediaUrl",
    "X-KandyDrops-Media-Proxy-Approx-Bytes",
  ]) {
    requireIncludes(mediaRoute, needle, "drops content media proxy route");
  }

  const fcmUtils = readRequired("src/lib/server/fcm-utils.ts");
  for (const needle of [
    "FCM_MULTICAST_BATCH_SIZE",
    "FCM_MAX_RECIPIENTS_PER_BROADCAST_RUN",
    "FCM_MAX_BATCHES_PER_BROADCAST_RUN",
    "FCM_MAX_RETRIES_PER_BROADCAST",
    "duplicatePushPreventedCount",
    "recipientCapReached",
    "batchCapReached",
  ]) {
    requireIncludes(fcmUtils, needle, "FCM fan-out utility");
  }

  for (const routeFile of [
    "src/app/api/auth/manual-sign-in-lookup/route.ts",
    "src/app/api/auth/navigation-session/route.ts",
    "src/app/api/user/register/route.ts",
  ]) {
    const source = readRequired(routeFile);
    requireIncludes(source, "guardApiRequest", routeFile);
    requireIncludes(source, "rateLimit", routeFile);
    requireIncludes(source, "requireTrustedOrigin", routeFile);
  }

  for (const scriptFile of [
    "scripts/rebuild-analytics-truth.ts",
    "scripts/rebuild-behavioral-intelligence.ts",
  ]) {
    const source = readRequired(scriptFile);
    for (const needle of ["--dry-run", "MAX_ROWS", "MAX_RUNTIME_MS", "MAX_RETRIES", "KD_REBUILD_MAX_ROWS"]) {
      requireIncludes(source, needle, scriptFile);
    }
  }

  const ci = readRequired(".github/workflows/ci.yml");
  requireNotMatches(
    ci,
    /playwright|cypress|lighthouse|check:ui:audits|check:ui:lighthouse|npm run check(?:\s|$)/imu,
    ".github/workflows/ci.yml",
    "default CI must not run browser/visual/full checks.",
  );

  const telemetrySources = [
    readRequired("src/lib/telemetry.ts"),
    readRequired("src/components/Analytics/DeepTracker.tsx"),
    readRequired("src/app/api/analytics/ingest/route.ts"),
    readRequired("src/app/api/analytics/ingest-identified/route.ts"),
  ].join("\n");
  requireNotMatches(
    telemetrySources,
    /(contentUrl|contentUrls|downloadURL|signedUrl|targetUrl)/u,
    "telemetry ingest sources",
    "raw/internal content URLs must not be sent to telemetry.",
  );

  const packageJson = readRequired("package.json");
  for (const toolingName of ["posthog-js", "playwright", "lighthouse", "cypress", "puppeteer", "firebase-tools"]) {
    requireIncludes(packageJson, toolingName, "paid-risk tooling inventory");
  }
  for (const surface of [
    "posthog_event_volume",
    "browser_audit_tooling",
    "visual_snapshot_testing",
    "cloud_build_minutes",
  ] satisfies GlobalCostSurfaceId[]) {
    if (!GLOBAL_COST_SURFACE_CONTRACTS.some((contract) => contract.surface === surface)) {
      fail(`Paid-risk tooling surface ${surface} must have a cost contract.`);
    }
  }

  const releaseVersionContract = readRequired("src/lib/release-notes/release-version-contract.ts");
  if (!releaseVersionContract.includes("agent\\/state") && !releaseVersionContract.includes("agent/state")) {
    fail("release version generated-file exclusions must include agent/state generated reports.");
  }
  if (!releaseVersionContract.includes("agent/cache/") && !releaseVersionContract.includes("agent\\/cache")) {
    fail("release version generated-file exclusions must include agent/cache.");
  }
  for (const needle of [".generated.json", "coverage/", ".next/", "package-lock.json"]) {
    requireIncludes(releaseVersionContract, needle, "release version generated-file exclusions");
  }
}

function validateReport(report: GlobalCostSurfaceReport | null) {
  if (!report) return;
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
    fail("Report generatedAt must be an ISO timestamp.");
  }
  if (typeof report.overallScore !== "number" || report.overallScore < 0 || report.overallScore > 100) {
    fail("Report overallScore must be between 0 and 100.");
  }
  if (!["clean", "pass", "warning", "fail"].includes(report.status)) {
    fail("Report status is invalid.");
  }
  if (!Array.isArray(report.surfaces) || report.surfaces.length !== requiredSurfaces.length) {
    fail(`Report must include ${requiredSurfaces.length} surfaces.`);
  }
  for (const surface of requiredSurfaces) {
    if (!report.surfaces.some((entry) => entry.surface === surface)) {
      fail(`Report missing surface ${surface}.`);
    }
  }
  for (const bucket of Object.keys(GLOBAL_COST_BUCKET_WEIGHTS) as GlobalCostScoreBucket[]) {
    if (typeof report.bucketScores?.[bucket] !== "number") {
      fail(`Report missing bucket score ${bucket}.`);
    }
  }
  report.findings?.forEach(validateFinding);
  if (!Array.isArray(report.criticalFindings)) {
    fail("Report criticalFindings must be an array.");
  } else if (report.criticalFindings.length > 0) {
    fail(`Report has ${report.criticalFindings.length} critical global cost finding(s).`);
  }
  for (const hardLimit of GLOBAL_COST_HARD_LIMITS) {
    if (!report.hardLimits?.includes(hardLimit)) {
      fail(`Report hardLimits missing: ${hardLimit}`);
    }
  }
  if (!report.minimalVerificationCommands?.includes("npm run score:global-cost")) {
    fail("Report must list score:global-cost as minimal verification.");
  }
  if (!report.forbiddenCommands?.includes("lighthouse")) {
    fail("Report must list lighthouse as forbidden by default.");
  }
}

function validateDocsAndPackage() {
  const packageJson = readRequired("package.json");
  requireIncludes(packageJson, "\"score:global-cost\"", "package scripts");
  requireIncludes(packageJson, "\"check:global-cost\"", "package scripts");

  const docs = readRequired(GLOBAL_COST_DOC_PATH);
  for (const surface of requiredSurfaces) {
    requireIncludes(docs, surface, GLOBAL_COST_DOC_PATH);
  }
  requireIncludes(docs, "No 1s telemetry ticks", GLOBAL_COST_DOC_PATH);
  requireIncludes(docs, "Debug evidence", GLOBAL_COST_DOC_PATH);
  requireIncludes(docs, "browser audits", GLOBAL_COST_DOC_PATH);
}

validateContracts();
validateHardLimitSources();
validateReport(readJsonReport());
validateDocsAndPackage();

if (failures.length > 0) {
  console.error("Global cost surface validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Global cost surface validation passed.");
