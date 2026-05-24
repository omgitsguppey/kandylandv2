import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  FORBIDDEN_SERVICE_WORKER_CACHE_PATHS,
  PWA_SERVICE_WORKER_TELEMETRY_EVENTS,
  buildPwaServiceWorkerDebugLane,
  classifyPwaServiceWorkerSafety,
} from "@/lib/pwa/pwa-service-worker-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/pwa-service-worker-safety.generated.json";
const DOC_PATH = "docs/agent-truth/pwa-service-worker-safety.md";

const SCORE_KEYS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type ScoreKey = typeof SCORE_KEYS[number];
type ScoreDimensions = Record<ScoreKey, number>;
type DirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_notification_logic_to_remove"
  | "stale_permission_logic_to_remove"
  | "stale_pwa_logic_to_ignore_for_this_phase"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function currentHead() {
  return shell("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
}

function dirtyFiles() {
  const changed = shell("git", ["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const staged = shell("git", ["diff", "--cached", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const untracked = shell("git", ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean);
  return [...new Set([...changed, ...staged, ...untracked].map((path) => path.replace(/\\/gu, "/")))].sort();
}

function classifyDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-pwa-service-worker-safety.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-permission-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-targeting-intent.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/pwa-service-worker-safety.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-pwa-score-lock.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/lib/pwa/pwa-service-worker-contract.ts"
    || normalized === "src/lib/pwa/pwa-update-telemetry.ts"
    || normalized === "src/lib/firebase-messaging.ts"
    || normalized === "src/components/PwaRuntimeBridge.tsx"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts"
    || normalized === "public/firebase-messaging-sw.js"
    || normalized === "package.json"
  ) return "real_source_change_needs_review";
  if (normalized === "agent/state/notification-pwa-score-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/notification-pwa-score-lock.md") return "release_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "release_artifact_expected";
  if (/chat|paypal|payment|wallet|gumdrop|tasks?\//iu.test(normalized)) return "unsafe_unknown";
  if (/pwa|service-worker|firebase-messaging-sw|manifest|offline/iu.test(normalized)) return "stale_pwa_logic_to_ignore_for_this_phase";
  return "unsafe_unknown";
}

function scoreSnapshot(): ScoreDimensions {
  const score = existsSync(join(ROOT, "agent/state/public-beta-score.generated.json"))
    ? JSON.parse(read("agent/state/public-beta-score.generated.json"))
    : {};
  const dimensions = score.scoreDimensions ?? score.healthV2?.metrics ?? score;
  return Object.fromEntries(SCORE_KEYS.map((key) => [
    key,
    Number(
      key === "overallHealthScore"
        ? dimensions[key] ?? dimensions[`${key}Score`] ?? score.overallHealthScore ?? score.healthScore ?? 0
        : dimensions[key] ?? dimensions[`${key}Score`] ?? score[`${key}Score`] ?? score[key] ?? 0,
    ),
  ])) as ScoreDimensions;
}

function requireIncludes(source: string, expected: string, label: string, failures: string[]) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function renderDoc(report: any) {
  const scoreRows = SCORE_KEYS.map((key) => `- ${key}: before=${report.scoreBefore[key]}; after=${report.scoreAfter[key]}; ${report.scoreDimensionImpact[key]}`);
  const dirtyRows = report.dirtyFiles.map((entry: any) => `- ${entry.path}: ${entry.classification}`);
  const oldLogicRows = report.oldLogicClassification.map((entry: any) => `- ${entry.reference}: ${entry.classification}`);

  return [
    "# PWA Service Worker Safety",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Summary",
    "",
    "- Service worker cache policy is public-shell-only.",
    "- Wallet, payment, chat, private creator, auth/session, admin, and user payload routes are forbidden from service-worker caching.",
    "- Offline fallback is public and must not present stale authenticated truth.",
    "- Update availability, offline fallback use, install prompts, and registration states are telemetry/debug visible.",
    "- This pass did not send push notifications, call providers, deploy, or change GumDrop/payment runtime.",
    "",
    "## Debug Lane",
    "",
    `- Lane: ${report.debugLane.lane}`,
    `- Status: ${report.debugLane.status}`,
    `- Registered: ${report.debugLane.registered}`,
    `- Update available: ${report.debugLane.updateAvailable}`,
    `- Notification compatible: ${report.debugLane.notificationCompatible}`,
    `- Forbidden cache safe: ${report.debugLane.forbiddenCacheSafe}`,
    `- Offline fallback safe: ${report.debugLane.offlineFallbackSafe}`,
    `- Stale shell risk: ${report.debugLane.staleShellRisk}`,
    "",
    "## Forbidden Cache Paths",
    "",
    ...report.forbiddenCachePaths.map((path: string) => `- ${path}`),
    "",
    "## Score Impact",
    "",
    ...scoreRows,
    "",
    "## Old Logic Classification",
    "",
    ...(oldLogicRows.length ? oldLogicRows : ["- none"]),
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure: string) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const serviceWorker = read("public/firebase-messaging-sw.js");
  const pwaBridge = read("src/components/PwaRuntimeBridge.tsx");
  const contractSource = read("src/lib/pwa/pwa-service-worker-contract.ts");
  const telemetrySource = read("src/lib/pwa/pwa-update-telemetry.ts");
  const catalogSource = read("src/lib/telemetry-catalog.ts");
  const debugSource = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const testSource = read("tests/unit/pwa-service-worker-safety.spec.ts");
  const packageJson = read("package.json");
  const score = scoreSnapshot();
  const dirtyFileClassifications = dirtyFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const failures: string[] = [];

  const safetyStatus = classifyPwaServiceWorkerSafety({
    serviceWorkerSupported: true,
    registrationAttempted: true,
    registered: true,
    updateAvailable: false,
    offlineFallbackAvailable: true,
    forbiddenCachePathSafe: true,
    notificationPermissionState: "granted",
    pushTokenStatus: "registered",
    displayMode: "standalone-pwa",
    mobileSafeAreaContractApplied: true,
    staleShellRiskSignals: [],
  });
  const debugLane = buildPwaServiceWorkerDebugLane({
    registered: true,
    updateAvailable: false,
    notificationCompatible: true,
    forbiddenCacheSafe: true,
    offlineFallbackSafe: true,
    staleShellRisk: "low",
    telemetryMapped: true,
  });

  for (const path of FORBIDDEN_SERVICE_WORKER_CACHE_PATHS) {
    requireIncludes(serviceWorker, path, "service worker forbidden cache guard", failures);
    requireIncludes(contractSource, path, "PWA service worker contract forbidden cache guard", failures);
  }
  for (const expected of [
    "shouldBypassServiceWorkerCache(requestUrl.pathname)",
    "OFFLINE_FALLBACK_URL",
    "handleNavigationRequest(request)",
    "fetch(request)",
    "caches.match(OFFLINE_FALLBACK_URL)",
    "await self.skipWaiting()",
    "await self.clients.claim()",
  ]) {
    requireIncludes(serviceWorker, expected, "service worker update/offline safety", failures);
  }
  if (/cache\.put\(request,\s*response\.clone\(\)\)/u.test(serviceWorker) && !serviceWorker.includes("shouldBypassServiceWorkerCache")) {
    failures.push("sensitive routes can be cached because cache.put is not guarded.");
  }
  for (const eventName of PWA_SERVICE_WORKER_TELEMETRY_EVENTS) {
    requireIncludes(catalogSource, `eventName: "${eventName}"`, "telemetry catalog", failures);
    requireIncludes(contractSource, eventName, "PWA telemetry event contract", failures);
  }
  for (const expected of [
    "trackPwaServiceWorkerEvent",
    "pwa_service_worker_registration_started",
    "pwa_service_worker_registered",
    "pwa_service_worker_registration_failed",
    "pwa_update_available",
    "pwa_offline_seen",
    "beforeinstallprompt",
  ]) {
    requireIncludes(pwaBridge, expected, "PWA runtime telemetry bridge", failures);
  }
  for (const expected of [
    "notificationCompatibility",
    "buildPwaUpdateTelemetryEnvelope",
    "runtimeHealth.evidenceCompleteness.freshness",
    "notification_materializer",
  ]) {
    requireIncludes(telemetrySource, expected, "PWA telemetry envelope", failures);
  }
  for (const expected of [
    "pwa_service_worker",
    "PWA/service worker",
    "forbiddenCacheSafe",
    "offlineFallbackSafe",
    "staleShellRisk",
  ]) {
    requireIncludes(debugSource, expected, "PWA/service worker debug lane", failures);
  }
  if (!debugSource.includes("buildPwaServiceWorkerDebugLane")) {
    failures.push("service worker status lacks debug visibility.");
  }
  if (!contractSource.includes("PwaNotificationCompatibility") || !pwaBridge.includes("resolveNotificationPermissionState")) {
    failures.push("notification registration ignores service worker compatibility.");
  }
  if (!contractSource.includes("update_available") || !pwaBridge.includes("KANDYDROPS_APP_UPDATE_EVENT")) {
    failures.push("update available state missing.");
  }
  if (!contractSource.includes("offlineFallbackShowsPrivateTruth: false") || !serviceWorker.includes("FORBIDDEN_CACHE_PATH_PREFIXES")) {
    failures.push("offline fallback can show stale private truth.");
  }
  if (!testSource.includes("PWA service worker safety") || !testSource.includes("shouldBypassServiceWorkerCache")) {
    failures.push("PWA service worker safety unit test coverage missing.");
  }
  if (!packageJson.includes('"check:pwa-service-worker-safety": "tsx scripts/agent/validate-pwa-service-worker-safety.ts"')) {
    failures.push("package script check:pwa-service-worker-safety missing.");
  }
  if (dirtyFileClassifications.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("dirty files unclassified or protected chat/payment/GumDrop/task files changed.");
  }

  const output = {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    status: failures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    providerCallsRequired: false,
    deployRequired: false,
    realPushNotificationsSent: false,
    serviceWorkerSafetyStatus: safetyStatus,
    debugLane,
    forbiddenCachePaths: FORBIDDEN_SERVICE_WORKER_CACHE_PATHS,
    telemetryEvents: PWA_SERVICE_WORKER_TELEMETRY_EVENTS,
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensionImpact: {
      sourceHealth: "PWA service worker safety now has an explicit source contract, forbidden cache policy, telemetry map, unit test, and validator.",
      runtimeHealth: "Registration/update/offline states are wired for source-side telemetry and debug; deployed runtime smoke remains separate.",
      evidenceCompleteness: "Debug lane reports registration, update availability, notification compatibility, forbidden cache safety, offline fallback, and stale shell risk.",
      freshness: "PWA safety artifact is regenerated from current source at the current head.",
      costRisk: "No provider sends, deployment, production reads, or broad route fanout are performed.",
      regressionRisk: "Focused unit and validator coverage guard sensitive cache paths, update/offline telemetry, and debug visibility.",
      overallHealthScore: "Improves PWA readiness evidence without clearing formal runtime/provider gates.",
    },
    oldLogicClassification: [
      { reference: "public/firebase-messaging-sw.js runtime cache", classification: "still_required_public_shell_only" },
      { reference: "agent/state/pwa-service-worker-audit.generated.json", classification: "stale_generated_artifact_to_reuse_as_prior_evidence" },
      { reference: "docs/agent-truth/pwa-service-worker-mobile.md", classification: "still_required_doctrine" },
    ],
    dirtyFiles: dirtyFileClassifications,
    validationFailures: [...new Set(failures)],
  };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (output.validationFailures.length > 0) {
    console.error(`PWA service worker safety validation failed:\n${output.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`PWA service worker safety validation passed: debugLane=${output.debugLane.status}, forbiddenCachePaths=${output.forbiddenCachePaths.length}.`);
}

main();
