import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/notification-pwa-score-lock.generated.json";
const DOC_PATH = "docs/agent-truth/notification-pwa-score-lock.md";

const SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

const REQUIRED_TELEMETRY_EVENTS = [
  "notification_prompt_viewed",
  "notification_permission_granted",
  "notification_permission_denied",
  "notification_permission_failed",
  "push_token_registered",
  "push_token_registration_failed",
  "notification_targeting_dry_run_eligible",
  "pwa_service_worker_registered",
  "pwa_update_available",
  "pwa_offline_seen",
] as const;

type ScoreDimension = typeof SCORE_DIMENSIONS[number];
type ScoreSnapshot = Record<ScoreDimension, number>;
type StatusName = "pass" | "fail" | "review";

export type NotificationPwaStatus = {
  status: StatusName;
  evidence: string[];
  missing: string[];
  nextAction: string;
};

export type NotificationPwaScoreLockReport = {
  generatedAtUtc: string;
  currentHead: string;
  productionReadsRequired: false;
  providerCallsRequired: false;
  deployRequired: false;
  realPushNotificationsSent: boolean;
  permissionLifecycleStatus: NotificationPwaStatus;
  pushTokenStatus: NotificationPwaStatus;
  targetingIntentStatus: NotificationPwaStatus;
  pwaServiceWorkerStatus: NotificationPwaStatus;
  offlineSafetyStatus: NotificationPwaStatus;
  notificationTelemetryStatus: NotificationPwaStatus;
  debugVisibilityStatus: NotificationPwaStatus;
  scoreBefore: ScoreSnapshot;
  scoreAfter: ScoreSnapshot;
  scoreDimensions: Record<ScoreDimension, {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    nextExactAction: string;
  }>;
  remainingGaps: string[];
  nextExactSteps: string[];
  sourceReports: Record<string, string>;
  dirtyFiles: Array<{ path: string; classification: string }>;
  oldLogicClassification: Array<{
    reference: string;
    classification: "still_required" | "superseded" | "stale_removed" | "unsafe_unknown";
    reason: string;
  }>;
  protectedSurfaceStatus: {
    chatTouched: boolean;
    taskTouched: boolean;
    paymentRuntimeTouched: boolean;
    gumdropRuntimeTouched: boolean;
  };
  validationFailures: string[];
};

type BuildInput = {
  currentHead?: string;
  scoreBefore?: Partial<ScoreSnapshot>;
  scoreAfter?: Partial<ScoreSnapshot>;
  permissionReport?: Record<string, any>;
  pushReport?: Record<string, any>;
  targetingReport?: Record<string, any>;
  pwaReport?: Record<string, any>;
  featureRegistrationReport?: Record<string, any>;
  featureRegistryText?: string;
  telemetryCatalogText?: string;
  dirtyFiles?: string[];
  oldLogicClassification?: NotificationPwaScoreLockReport["oldLogicClassification"];
};

function shell(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function git(args: string[]) {
  return shell("git", args);
}

function currentHead() {
  return git(["rev-parse", "HEAD"]);
}

function readText(path: string) {
  const absolute = join(ROOT, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
}

function readJson(path: string): Record<string, any> {
  const text = readText(path);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function readState(name: string) {
  return readJson(`agent/state/${name}`);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(score: Record<string, any>): ScoreSnapshot {
  return {
    sourceHealth: numberValue(score.sourceHealthScore ?? score.sourceHealth),
    runtimeHealth: numberValue(score.runtimeHealthScore ?? score.runtimeHealth),
    evidenceCompleteness: numberValue(score.evidenceCompletenessScore ?? score.evidenceCompleteness),
    freshness: numberValue(score.freshnessScore ?? score.freshness),
    costRisk: numberValue(score.costRiskScore ?? score.costRisk),
    regressionRisk: numberValue(score.regressionRiskScore ?? score.regressionRisk),
    overallHealthScore: numberValue(score.healthScore ?? score.overallHealthScore),
  };
}

function mergeScore(base: ScoreSnapshot, override?: Partial<ScoreSnapshot>): ScoreSnapshot {
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [
    dimension,
    numberValue(override?.[dimension], base[dimension]),
  ])) as ScoreSnapshot;
}

function listDirtyFiles(input?: string[]) {
  if (input) return input.map((path) => path.replace(/\\/gu, "/")).sort();
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of git([...args]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

export function classifyNotificationPwaScoreLockDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/notification-pwa-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "documentation_artifact_expected";
  if (normalized.startsWith("scripts/agent/validate-notification-") || normalized === "scripts/agent/validate-pwa-service-worker-safety.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(drop-watch-time-accuracy|session-bounce-calculation|user-journey-behavioral-intelligence|sql-database-parity-cost-lock|event-translation-bridge|person-metrics-hydration)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized.startsWith("tests/unit/notification-") || normalized === "tests/unit/pwa-service-worker-safety.spec.ts") return "test_artifact_expected";
  if (
    normalized.startsWith("src/lib/notifications/")
    || normalized.startsWith("src/lib/features/pwa/")
    || normalized === "src/lib/debug/empty-live-lane-classifier.ts"
    || normalized === "src/lib/debug/admin-summary-lane-status-classifier.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx"
    || normalized === "src/components/PwaRuntimeBridge.tsx"
    || normalized === "public/firebase-messaging-sw.js"
    || normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/admin/user-management-contract.ts"
  ) return "real_source_change_needs_review";
  if (normalized === "scripts/agent/admin-status-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-summary-lane-status-classifier|user-management-status-truth|testing-coverage-status-cleanup|settings-health-status-cleanup|auth-lane-status-cleanup|notification-lane-status-cleanup|daily-task-lane-status-cleanup|debug-cockpit-batch4-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  return "unsafe_unknown";
}

function protectedSurfaceStatus(dirtyFiles: string[]): NotificationPwaScoreLockReport["protectedSurfaceStatus"] {
  return {
    chatTouched: dirtyFiles.some((path) => /^src\/(components\/Chat|lib\/chat|app\/api\/.*chat)/u.test(path)),
    taskTouched: dirtyFiles.some((path) => /^src\/(lib\/tasks|app\/api\/checkin|components\/Dashboard\/DailyCheckIn)/u.test(path)),
    paymentRuntimeTouched: dirtyFiles.some((path) => /^src\/(app\/api\/(paypal|checkout|wallet)|lib\/wallet|lib\/paypal|components\/PurchaseModal)/u.test(path)),
    gumdropRuntimeTouched: dirtyFiles.some((path) => /^src\/lib\/gumdrop/u.test(path)),
  };
}

function statusFrom(condition: boolean, evidence: string[], missing: string[], nextAction: string): NotificationPwaStatus {
  return {
    status: condition ? "pass" : "fail",
    evidence,
    missing,
    nextAction,
  };
}

function buildScoreDimensions(before: ScoreSnapshot, after: ScoreSnapshot): NotificationPwaScoreLockReport["scoreDimensions"] {
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const value = after[dimension];
    return [dimension, {
      before: before[dimension],
      after: value,
      target: 80,
      status: value >= 80 ? "target_met" : "below_target",
      nextExactAction: value >= 80 ? "No notification/PWA-specific score action needed." : belowTargetNextAction(dimension),
    }];
  })) as NotificationPwaScoreLockReport["scoreDimensions"];
}

function belowTargetNextAction(dimension: ScoreDimension) {
  switch (dimension) {
    case "evidenceCompleteness":
      return "Attach formal provider/runtime/admin evidence; notification/PWA source wiring is locked but does not fake formal proof.";
    case "costRisk":
      return "Complete external owner-review cost lanes without calling providers or changing runtime notification sends.";
    case "overallHealthScore":
      return "Raise below-target component dimensions before treating the overall score as solved.";
    case "runtimeHealth":
      return "Run formal runtime smoke when allowed; source-side notification/PWA validators remain source evidence only.";
    case "freshness":
      return "Refresh stale score-impacting artifacts with targeted validators.";
    case "regressionRisk":
      return "Refresh targeted regression evidence for changed notification/PWA lock files.";
    case "sourceHealth":
      return "Fix source registration or telemetry catalog gaps if this dimension drops below target.";
  }
}

function featureTelemetryText(report: Record<string, any>, fallbackText: string) {
  const features = Array.isArray(report.features) ? report.features : [];
  const notifications = features.find((feature) => feature?.featureId === "notifications");
  if (notifications && Array.isArray(notifications.telemetryEvents)) {
    return notifications.telemetryEvents.join(" ");
  }
  return fallbackText;
}

function sourceReportStatus(report: Record<string, any>) {
  return report.status === "pass" || report.status === undefined;
}

export function buildNotificationPwaScoreLockReport(input: BuildInput = {}): NotificationPwaScoreLockReport {
  const permission = input.permissionReport ?? readState("notification-permission-lifecycle.generated.json");
  const push = input.pushReport ?? readState("push-token-registration.generated.json");
  const targeting = input.targetingReport ?? readState("notification-targeting-intent.generated.json");
  const pwa = input.pwaReport ?? readState("pwa-service-worker-safety.generated.json");
  const featureRegistration = input.featureRegistrationReport ?? readState("feature-registration-gate.generated.json");
  const beta = readState("public-beta-score.generated.json");
  const baseScore = scoreSnapshot(beta);
  const scoreAfter = mergeScore(baseScore, input.scoreAfter);
  const scoreBefore = mergeScore(scoreAfter, input.scoreBefore);
  const dirtyPaths = listDirtyFiles(input.dirtyFiles);
  const dirtyFiles = dirtyPaths.map((path) => ({
    path,
    classification: classifyNotificationPwaScoreLockDirtyFile(path),
  }));
  const telemetryText = input.telemetryCatalogText ?? readText("src/lib/telemetry-catalog.ts");
  const featureText = featureTelemetryText(featureRegistration, input.featureRegistryText ?? readText("src/lib/features/feature-registration-registry.ts"));
  const telemetryMapped = REQUIRED_TELEMETRY_EVENTS.every((event) => telemetryText.includes(event) && featureText.includes(event));
  const permissionOk = Boolean(
    permission.permissionStateTracked
      && permission.autoFireOnPageLoadBlocked
      && permission.cooldownPolicyPresent
      && permission.canonicalEnvelopeMapped
      && permission.telemetryCatalogMapped
      && permission.featureRegistrationMapped
      && permission.personMetricsMapped
      && permission.debugLanePresent
      && Array.isArray(permission.promptLifecycleEvents)
      && permission.promptLifecycleEvents.includes("notification_prompt_viewed")
      && permission.promptLifecycleEvents.includes("notification_permission_granted"),
  );
  const pushOk = Boolean(
    sourceReportStatus(push)
      && push.authenticatedOnly
      && push.arbitraryUserBindingBlocked
      && push.rawTokenExposureBlocked
      && push.routeResponseExposesRawToken === false
      && push.realPushNotificationsSent === false
      && Array.isArray(push.telemetryEvents)
      && push.telemetryEvents.includes("push_token_registered")
      && push.debugLane?.status === "live"
      && push.debugLane?.rawTokenExposureCount === 0,
  );
  const targetingOk = Boolean(
    sourceReportStatus(targeting)
      && targeting.realPushNotificationsSent === false
      && Array.isArray(targeting.intentTypes)
      && targeting.intentTypes.includes("chat_message")
      && targeting.intentTypes.includes("daily_task_available")
      && targeting.intentTypes.includes("wallet_payment_success")
      && (targeting.debugLane?.status === "live" || JSON.stringify(targeting).includes("Notification targeting")),
  );
  const pwaPolicy = pwa.serviceWorkerSafetyStatus?.cachePolicy ?? {};
  const pwaOk = Boolean(
    sourceReportStatus(pwa)
      && pwa.realPushNotificationsSent === false
      && pwa.debugLane?.status === "live"
      && pwa.debugLane?.notificationCompatible === true
      && pwa.debugLane?.forbiddenCacheSafe === true
      && pwa.serviceWorkerSafetyStatus?.debugVisibility === "debug_visible",
  );
  const offlineOk = Boolean(
    pwa.debugLane?.offlineFallbackSafe === true
      && pwaPolicy.forbiddenCacheSafe === true
      && pwaPolicy.offlineFallbackShowsPrivateTruth === false,
  );
  const debugOk = Boolean(
    permission.debugLanePresent
      && permission.debugLane?.status === "live"
      && push.debugLane?.status === "live"
      && (targeting.debugLane?.status === "live" || JSON.stringify(targeting).includes("Notification targeting"))
      && pwa.debugLane?.status === "live",
  );

  const statuses = {
    permissionLifecycleStatus: statusFrom(permissionOk, ["Notification prompt lifecycle events, permission state, cooldown, envelope, metrics, and debug lane are mapped."], permissionOk ? [] : ["notification prompt lifecycle missing"], "Run npm run check:notification-permission-lifecycle and fix the first missing prompt lifecycle link."),
    pushTokenStatus: statusFrom(pushOk, ["Push token registration is authenticated, redacted, idempotent, telemetry-mapped, and debug-visible."], pushOk ? [] : ["push token registration status missing"], "Run npm run check:push-token-registration and fix auth/redaction/telemetry gaps."),
    targetingIntentStatus: statusFrom(targetingOk, ["Notification targeting intent contracts cover safe dry-run delivery intent without provider sends."], targetingOk ? [] : ["notification targeting intent missing"], "Run npm run check:notification-targeting-intent and fix audience/opt-in/dedupe gaps."),
    pwaServiceWorkerStatus: statusFrom(pwaOk, ["PWA service worker registration/update/offline safety is source-validated and debug-visible."], pwaOk ? [] : ["PWA/service worker safety missing"], "Run npm run check:pwa-service-worker-safety and fix registration/update/debug gaps."),
    offlineSafetyStatus: statusFrom(offlineOk, ["Forbidden sensitive cache paths and private offline fallback behavior are guarded."], offlineOk ? [] : ["sensitive route caching risk unresolved"], "Fix service worker forbidden cache/offline fallback policy before treating PWA safety as locked."),
    notificationTelemetryStatus: statusFrom(telemetryMapped, ["Notification, push, targeting, and PWA events are present in telemetry catalog and feature registration."], telemetryMapped ? [] : ["notification telemetry missing from feature registry"], "Add missing notification/PWA events to canonical telemetry catalog and feature registration."),
    debugVisibilityStatus: statusFrom(debugOk, ["Notification permission, push token, targeting, and PWA debug lanes are visible without raw token/message payloads."], debugOk ? [] : ["debug lane missing"], "Connect the missing notification/PWA lane to debug tracking summary."),
  };
  const protectedStatus = protectedSurfaceStatus(dirtyPaths);
  const realPushNotificationsSent = Boolean(
    permission.realPushNotificationsSent
      || push.realPushNotificationsSent
      || targeting.realPushNotificationsSent
      || pwa.realPushNotificationsSent,
  );
  const remainingGaps = Object.entries(statuses)
    .flatMap(([key, value]) => value.status === "pass" ? [] : [`${key}: ${value.missing.join(", ")}`]);
  for (const dimension of SCORE_DIMENSIONS) {
    if (scoreAfter[dimension] < 80) remainingGaps.push(`${dimension} below 80: ${belowTargetNextAction(dimension)}`);
  }
  const nextExactSteps = remainingGaps.length > 0
    ? remainingGaps.map((gap) => `Resolve ${gap}`)
    : ["Continue with formal runtime/provider/admin evidence capture when allowed; do not send real push notifications for source-only validation."];

  const report: NotificationPwaScoreLockReport = {
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? currentHead(),
    productionReadsRequired: false,
    providerCallsRequired: false,
    deployRequired: false,
    realPushNotificationsSent,
    ...statuses,
    scoreBefore,
    scoreAfter,
    scoreDimensions: buildScoreDimensions(scoreBefore, scoreAfter),
    remainingGaps,
    nextExactSteps,
    sourceReports: {
      permissionLifecycle: "agent/state/notification-permission-lifecycle.generated.json",
      pushToken: "agent/state/push-token-registration.generated.json",
      targetingIntent: "agent/state/notification-targeting-intent.generated.json",
      pwaServiceWorker: "agent/state/pwa-service-worker-safety.generated.json",
      publicBetaScore: "agent/state/public-beta-score.generated.json",
    },
    dirtyFiles,
    oldLogicClassification: input.oldLogicClassification ?? [
      {
        reference: "notification_prompt_banner_viewed alias",
        classification: "superseded",
        reason: "The canonical lifecycle event is notification_prompt_viewed; the old banner event remains only as telemetry alias compatibility.",
      },
      {
        reference: "PWA service worker public shell cache",
        classification: "still_required",
        reason: "Public shell caching remains valid while sensitive wallet, chat, auth, admin, and notification routes are bypassed.",
      },
    ],
    protectedSurfaceStatus: protectedStatus,
    validationFailures: [],
  };
  report.validationFailures = validateNotificationPwaScoreLockReport(report);
  return report;
}

export function validateNotificationPwaScoreLockReport(report: NotificationPwaScoreLockReport) {
  const failures: string[] = [];
  const statusEntries: Array<[string, NotificationPwaStatus]> = [
    ["notification prompt lifecycle missing", report.permissionLifecycleStatus],
    ["push token registration status missing", report.pushTokenStatus],
    ["targeting intent missing", report.targetingIntentStatus],
    ["PWA/service worker safety missing", report.pwaServiceWorkerStatus],
    ["sensitive route caching risk unresolved", report.offlineSafetyStatus],
    ["notification telemetry missing from feature registry", report.notificationTelemetryStatus],
    ["debug lane missing", report.debugVisibilityStatus],
  ];
  for (const [message, status] of statusEntries) {
    if (!status || status.status !== "pass") failures.push(message);
  }
  if (report.productionReadsRequired || report.providerCallsRequired || report.deployRequired) {
    failures.push("lock requires production reads, provider calls, or deploy.");
  }
  if (report.realPushNotificationsSent) failures.push("real pushes are sent in tests.");
  if (!report.scoreDimensions || SCORE_DIMENSIONS.some((dimension) => !report.scoreDimensions[dimension])) {
    failures.push("score dimensions missing.");
  }
  for (const dimension of SCORE_DIMENSIONS) {
    const detail = report.scoreDimensions?.[dimension];
    if (!detail) continue;
    if (detail.after < 80 && !detail.nextExactAction) failures.push(`${dimension} below 80 lacks next action.`);
  }
  if ((report.remainingGaps?.length ?? 0) === 0 && SCORE_DIMENSIONS.some((dimension) => report.scoreAfter[dimension] < 80)) {
    failures.push("below-target score dimensions missing from remainingGaps.");
  }
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps missing.");
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (Object.values(report.protectedSurfaceStatus).some(Boolean)) failures.push("chat/task/payment/GumDrop runtime changed.");
  if (report.oldLogicClassification.some((entry) => entry.classification === "unsafe_unknown")) failures.push("remaining old notification/PWA logic unclassified.");
  return [...new Set(failures)];
}

function renderDoc(report: NotificationPwaScoreLockReport) {
  const statusRows = [
    ["Permission lifecycle", report.permissionLifecycleStatus],
    ["Push token registration", report.pushTokenStatus],
    ["Targeting intent", report.targetingIntentStatus],
    ["PWA/service worker", report.pwaServiceWorkerStatus],
    ["Offline safety", report.offlineSafetyStatus],
    ["Notification telemetry", report.notificationTelemetryStatus],
    ["Debug visibility", report.debugVisibilityStatus],
  ].map(([label, status]) => {
    const value = status as NotificationPwaStatus;
    return `| ${label} | ${value.status} | ${value.evidence.join("; ")} | ${value.nextAction} |`;
  }).join("\n");
  const scoreRows = SCORE_DIMENSIONS.map((dimension) => {
    const detail = report.scoreDimensions[dimension];
    return `| ${dimension} | ${detail.before} | ${detail.after} | ${detail.status} | ${detail.nextExactAction} |`;
  }).join("\n");
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`).join("\n") || "- None";
  return `# Notification + PWA Score Lock

Generated: ${report.generatedAtUtc}

Current head: ${report.currentHead}

## Status

| Lane | Status | Evidence | Next action |
| --- | --- | --- | --- |
${statusRows}

## Score Dimensions

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
${scoreRows}

## Remaining Gaps

${report.remainingGaps.map((gap) => `- ${gap}`).join("\n") || "- None"}

## Dirty File Classification

${dirtyRows}

## Old Logic Classification

${report.oldLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification}; ${entry.reason}`).join("\n")}
`;
}

function main() {
  const report = buildNotificationPwaScoreLockReport();
  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));

  const failures = validateNotificationPwaScoreLockReport(report);
  if (failures.length > 0) {
    console.error("Notification + PWA score lock validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Notification + PWA score lock passed. gaps=${report.remainingGaps.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
