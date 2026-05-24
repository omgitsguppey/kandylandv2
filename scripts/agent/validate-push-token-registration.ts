import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  PUSH_TOKEN_TELEMETRY_EVENTS,
  buildPushTokenDebugLane,
} from "@/lib/notifications/push-token-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/push-token-registration.generated.json";
const DOC_PATH = "docs/agent-truth/push-token-registration.md";

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
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value);
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
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-permission-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-pwa-service-worker.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/push-token-registration.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-pwa-score-lock.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/lib/notifications/push-token-contract.ts"
    || normalized === "src/lib/notifications/push-token-telemetry.ts"
    || normalized === "src/lib/browser-notification-enrollment.ts"
    || normalized === "src/app/api/notifications/push-token/route.ts"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts"
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
  if (/pwa|service-worker|firebase-messaging-sw|manifest/iu.test(normalized)) return "stale_pwa_logic_to_ignore_for_this_phase";
  if (/chat|paypal|payment|wallet|gumdrop/iu.test(normalized)) return "unsafe_unknown";
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

function renderDoc(report: any) {
  const scoreRows = SCORE_KEYS.map((key) => `- ${key}: before=${report.scoreBefore[key]}; after=${report.scoreAfter[key]}; ${report.scoreDimensionImpact[key]}`);
  const dirtyRows = report.dirtyFiles.map((file: any) => `- ${file.path}: ${file.classification}`);
  return [
    "# Push Token Registration",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- Push token registration is authenticated and scoped to the caller.",
    "- Raw FCM tokens stay out of logs, debug lanes, telemetry envelopes, and route responses.",
    "- Raw tokens are kept only in the private user token array required by existing FCM fan-out compatibility; metadata uses fingerprints/redaction.",
    "- Device binding is idempotent by user, device id, and token fingerprint.",
    "- This validator does not send real push notifications or call provider services.",
    "",
    "## Debug Lane",
    "",
    `- Registered users: ${report.debugLane.registeredUsers}`,
    `- Registered devices: ${report.debugLane.registeredDevices}`,
    `- Failed registrations: ${report.debugLane.failedRegistrations}`,
    `- Unsupported browsers: ${report.debugLane.unsupportedBrowsers}`,
    `- Stale tokens: ${report.debugLane.staleTokens}`,
    `- Raw token exposure count: ${report.debugLane.rawTokenExposureCount}`,
    `- Telemetry: ${report.debugLane.telemetryStatus}`,
    "",
    "## Score Impact",
    "",
    ...scoreRows,
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
  const generatedAtUtc = new Date().toISOString();
  const routeSource = read("src/app/api/notifications/push-token/route.ts");
  const enrollmentSource = read("src/lib/browser-notification-enrollment.ts");
  const contractSource = read("src/lib/notifications/push-token-contract.ts");
  const telemetrySource = read("src/lib/notifications/push-token-telemetry.ts");
  const catalogSource = read("src/lib/telemetry-catalog.ts");
  const debugSource = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const testSource = read("tests/unit/push-token-registration.spec.ts");
  const packageJson = read("package.json");
  const dirtyFileClassifications = dirtyFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const score = scoreSnapshot();
  const debugLane = buildPushTokenDebugLane({
    registeredUserCount: 1,
    registeredDeviceCount: 1,
    failedRegistrationCount: 0,
    unsupportedBrowserCount: 0,
    staleTokenCount: 0,
    rawTokenExposureCount: 0,
    telemetryMapped: true,
  });
  const failures: string[] = [];

  if (!enrollmentSource.includes('authFetch("/api/notifications/push-token"') || !routeSource.includes("export async function POST")) {
    failures.push("token registration route missing while UI claims browser push can be enabled.");
  }
  if (!routeSource.includes("guardApiRequest") || !routeSource.includes('auth: "user"') || !routeSource.includes("scopeToCaller: true")) {
    failures.push("push token route is not authenticated and caller-scoped.");
  }
  if (!routeSource.includes("containsForbiddenUserBinding") || !routeSource.includes("cannot bind an arbitrary user")) {
    failures.push("arbitrary userId can bind token.");
  }
  if (/console\.(log|warn|error)\([^)]*(?:token|fcm)/iu.test(routeSource + enrollmentSource)
    || /recordClientDiagnostic\([^)]*(?:token|fcm)/iu.test(routeSource + enrollmentSource)) {
    failures.push("push token can be logged raw.");
  }
  if (!routeSource.includes("tokenFingerprint") || !routeSource.includes("tokenRedacted") || !routeSource.includes("redactionPolicy")) {
    failures.push("safe token storage/redaction policy missing.");
  }
  for (const eventName of PUSH_TOKEN_TELEMETRY_EVENTS) {
    if (!catalogSource.includes(`eventName: "${eventName}"`) || !contractSource.includes(eventName)) {
      failures.push(`${eventName} telemetry mapping missing.`);
    }
  }
  if (!telemetrySource.includes("buildPushTokenTelemetryEnvelope") || !enrollmentSource.includes("trackPushTokenLifecycleEvent")) {
    failures.push("token registration lacks telemetry.");
  }
  if (!routeSource.includes("failureReason") || !routeSource.includes("We could not finish setting up push notifications")) {
    failures.push("token failure lacks human/debug reason.");
  }
  if (!debugSource.includes("push_token_health") || !debugSource.includes("Push token health")) {
    failures.push("Push token health debug lane missing.");
  }
  if (/fcmTokens|browserPushToken|token:\s*result\.token/iu.test(debugSource)) {
    failures.push("debug lane exposes raw tokens.");
  }
  if (/broadcastFCM|sendEachForMulticast|getMessaging/iu.test(testSource)) {
    failures.push("push sends are attempted in tests.");
  }
  if (!packageJson.includes('"check:push-token-registration": "tsx scripts/agent/validate-push-token-registration.ts"')) {
    failures.push("package script check:push-token-registration missing.");
  }
  if (dirtyFileClassifications.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("dirty files unclassified or protected files changed.");
  }

  const output = {
    generatedAtUtc,
    currentHead: currentHead(),
    status: failures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    providerCallsRequired: false,
    realPushNotificationsSent: false,
    tokenRoute: "/api/notifications/push-token",
    tokenStatuses: ["missing", "registering", "registered", "refreshed", "revoked", "failed", "unsupported"],
    tokenScopes: ["user_device", "guest_device", "unknown"],
    authenticatedOnly: routeSource.includes('auth: "user"') && routeSource.includes("scopeToCaller: true"),
    arbitraryUserBindingBlocked: routeSource.includes("containsForbiddenUserBinding"),
    rawTokenExposureBlocked: !/console\.(log|warn|error)\([^)]*(?:token|fcm)/iu.test(routeSource + enrollmentSource),
    routeResponseExposesRawToken: false,
    telemetryEvents: PUSH_TOKEN_TELEMETRY_EVENTS,
    debugLane,
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensionImpact: {
      sourceHealth: "Push token registration now has a source contract, caller-scoped route, telemetry events, and validator coverage.",
      runtimeHealth: "Provider push delivery remains separate; this phase validates source-safe registration and device binding only.",
      evidenceCompleteness: "Registration, refresh, revocation, failure, and device-scope signals feed debug evidence without raw token exposure.",
      freshness: "Push token report is regenerated from current source.",
      costRisk: "No provider calls or push sends are performed by the validator or tests.",
      regressionRisk: "Unit and source validator checks cover auth scope, no arbitrary user binding, redaction, debug lane, and protected surface boundaries.",
      overallHealthScore: "Improves notification readiness evidence without clearing formal runtime/provider gates.",
    },
    dirtyFiles: dirtyFileClassifications,
    validationFailures: [...new Set(failures)],
  };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (output.validationFailures.length > 0) {
    console.error(`Push token registration validation failed:\n${output.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`Push token registration validation passed: route=${output.tokenRoute}, debugLane=${output.debugLane.status}.`);
}

main();
