import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  NOTIFICATION_INTENT_TYPES,
  NOTIFICATION_TARGETING_TELEMETRY_EVENTS,
  buildNotificationTargetingDebugLane,
  getNotificationIntentContract,
} from "@/lib/notifications/notification-intent-contract";
import {
  buildNotificationTargetingSummary,
  resolveNotificationTargetingDryRun,
} from "@/lib/notifications/notification-targeting-resolver";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/notification-targeting-intent.generated.json";
const DOC_PATH = "docs/agent-truth/notification-targeting-intent.md";
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
  | "stale_targeting_logic_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), "utf8") : "";
}

function write(path: string, value: string) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value);
}

function currentHead() {
  return shell("git", ["rev-parse", "HEAD"]) || "unknown";
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
  if (normalized === "scripts/agent/validate-notification-targeting-intent.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-permission-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/notification-targeting-intent.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-pwa-score-lock.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/lib/notifications/notification-intent-contract.ts"
    || normalized === "src/lib/notifications/notification-targeting-resolver.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
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
  if (/chat|task|payment|wallet|gumdrop|paypal/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function scoreSnapshot(): ScoreDimensions {
  const raw = read("agent/state/public-beta-score.generated.json");
  const parsed = raw ? JSON.parse(raw) : {};
  const dimensions = parsed.scoreDimensions ?? parsed.healthV2?.metrics ?? parsed;
  return Object.fromEntries(SCORE_KEYS.map((key) => [
    key,
    Number(
      key === "overallHealthScore"
        ? dimensions[key] ?? dimensions[`${key}Score`] ?? parsed.overallHealthScore ?? parsed.healthScore ?? 0
        : dimensions[key] ?? dimensions[`${key}Score`] ?? parsed[`${key}Score`] ?? parsed[key] ?? 0,
    ),
  ])) as ScoreDimensions;
}

function renderDoc(report: any) {
  const intentRows = report.intentContracts.map((intent: any) =>
    `- ${intent.intentType}: audience=${intent.audienceSource}; optIn=${intent.optInRequirement}; consent=${intent.consentRequirement}; route=${intent.deepLinkRoute}`,
  );
  const scoreRows = SCORE_KEYS.map((key) => `- ${key}: before=${report.scoreBefore[key]}; after=${report.scoreAfter[key]}; ${report.scoreDimensionImpact[key]}`);
  const dirtyRows = report.dirtyFiles.map((file: any) => `- ${file.path}: ${file.classification}`);
  return [
    "# Notification Targeting Intent",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- This is delivery-intent truth only; it does not execute provider sends.",
    "- Targeting requires permission, push token presence, opt-in settings, consent eligibility, audience source, dedupe, throttle, telemetry, and debug visibility.",
    "- Chat notifications target recipients only, never the sender.",
    "- Creator broadcasts respect creator audience settings.",
    "- Daily task reminders require task eligibility and reset truth.",
    "- Notification payload policy forbids raw PII and raw push tokens.",
    "",
    "## Intents",
    "",
    ...intentRows,
    "",
    "## Debug Lane",
    "",
    `- Intent types registered: ${report.debugLane.intentTypesRegistered}`,
    `- Missing audience source: ${report.debugLane.missingAudienceSource}`,
    `- Blocked by opt-out: ${report.debugLane.blockedByOptOut}`,
    `- Blocked by missing token: ${report.debugLane.blockedByMissingToken}`,
    `- Blocked by consent: ${report.debugLane.blockedByConsent}`,
    `- Dry-run eligible: ${report.debugLane.dryRunEligible}`,
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
  const contractSource = read("src/lib/notifications/notification-intent-contract.ts");
  const resolverSource = read("src/lib/notifications/notification-targeting-resolver.ts");
  const debugSource = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const catalogSource = read("src/lib/telemetry-catalog.ts");
  const personMetricsSource = read("src/lib/analytics/person-metrics-contract.ts");
  const packageJson = read("package.json");
  const testSource = read("tests/unit/notification-targeting-intent.spec.ts");
  const dirtyFileClassifications = dirtyFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const score = scoreSnapshot();
  const dryRunResults = [
    resolveNotificationTargetingDryRun({
      intentType: "drop_live",
      recipientUserId: "fixture_user",
      notificationSettings: { browserPushEnabled: true, newDropAlerts: true },
      permissionState: "granted",
      hasPushToken: true,
      consentMode: "minimal_analytics",
      nowMs: 1,
    }),
    resolveNotificationTargetingDryRun({
      intentType: "chat_message",
      actorUserId: "same_user",
      recipientUserId: "same_user",
      notificationSettings: { browserPushEnabled: true, chatNotifications: true },
      permissionState: "granted",
      hasPushToken: true,
      consentMode: "minimal_analytics",
      nowMs: 1,
    }),
    resolveNotificationTargetingDryRun({
      intentType: "daily_task_available",
      recipientUserId: "fixture_user",
      notificationSettings: { browserPushEnabled: true, dailyTaskReminders: true },
      permissionState: "granted",
      hasPushToken: false,
      consentMode: "minimal_analytics",
      taskEligible: false,
      nowMs: 1,
    }),
  ];
  const summary = buildNotificationTargetingSummary(dryRunResults);
  const debugLane = buildNotificationTargetingDebugLane({
    intentTypesRegistered: NOTIFICATION_INTENT_TYPES.length,
    missingAudienceSourceCount: summary.missingAudienceSource,
    blockedByOptOutCount: summary.blockedByOptOut,
    blockedByMissingTokenCount: summary.blockedByMissingToken,
    blockedByConsentCount: summary.blockedByConsent,
    dryRunEligibleCount: summary.dryRunEligible,
    telemetryMapped: true,
  });
  const failures: string[] = [];
  const intentContracts = NOTIFICATION_INTENT_TYPES.map((intentType) => getNotificationIntentContract(intentType));

  for (const intent of intentContracts) {
    if (!intent.audienceSource) failures.push(`${intent.intentType} lacks audience source.`);
    if (!intent.eligibility.length) failures.push(`${intent.intentType} lacks eligibility rules.`);
    if (!intent.optInRequirement) failures.push(`${intent.intentType} lacks opt-in requirement.`);
    if (!intent.consentRequirement) failures.push(`${intent.intentType} lacks consent requirement.`);
    if (!intent.dedupeKeyTemplate.includes(intent.intentType)) failures.push(`${intent.intentType} lacks intent-specific dedupe key.`);
    if (!intent.telemetryEvents.includes("notification_intent_evaluated")) failures.push(`${intent.intentType} lacks targeting telemetry.`);
    if (intent.payloadPolicy.rawPiiAllowed || intent.payloadPolicy.rawTokenAllowed) failures.push(`${intent.intentType} allows raw PII/token payload.`);
  }
  if (!resolverSource.includes("blocked_by_opt_out") || !resolverSource.includes("settings.browserPushEnabled !== true")) {
    failures.push("push can target opted-out users.");
  }
  if (!resolverSource.includes("blocked_sender_is_recipient")) {
    failures.push("chat notification can target sender instead of recipient.");
  }
  if (!resolverSource.includes("blocked_by_creator_audience_setting")) {
    failures.push("broadcast notification ignores creator audience setting.");
  }
  if (!resolverSource.includes("blocked_task_not_eligible")) {
    failures.push("daily task notification ignores task eligibility/reset.");
  }
  if (!contractSource.includes("throttleCooldownMs") || !contractSource.includes("dedupeKeyTemplate")) {
    failures.push("no dedupe/throttle policy.");
  }
  for (const eventName of NOTIFICATION_TARGETING_TELEMETRY_EVENTS) {
    if (!catalogSource.includes(`eventName: "${eventName}"`) || !personMetricsSource.includes(`"${eventName}"`)) {
      failures.push(`${eventName} telemetry/person metric mapping missing.`);
    }
  }
  if (!debugSource.includes("notification_targeting") || !debugSource.includes("Notification targeting")) {
    failures.push("notification targeting debug lane missing.");
  }
  if (/broadcastFCM|sendEachForMulticast|getMessaging|admin\.messaging|fetch\(["']\/api\/notifications/iu.test(testSource)) {
    failures.push("real sends occur in tests.");
  }
  if (!packageJson.includes('"check:notification-targeting-intent": "tsx scripts/agent/validate-notification-targeting-intent.ts"')) {
    failures.push("package script check:notification-targeting-intent missing.");
  }
  if (dirtyFileClassifications.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("dirty files unclassified or protected files changed.");
  }

  const reportHead = currentHead();
  if (!/^[0-9a-f]{40}$/iu.test(reportHead)) {
    failures.push("current git head is missing or is not a full commit SHA.");
  }

  const output = {
    reportKey: "notification-targeting-intent",
    generatedAtUtc,
    currentHead: reportHead,
    sourceCommit: reportHead,
    status: failures.length > 0 ? "fail" : "pass",
    passed: failures.length === 0,
    canClearSourceGate: failures.length === 0,
    productionReadsRequired: false,
    providerCallsRequired: false,
    realPushNotificationsSent: false,
    intentTypes: NOTIFICATION_INTENT_TYPES,
    intentContracts,
    dryRunSummary: summary,
    debugLane,
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensionImpact: {
      sourceHealth: "Notification targeting now has explicit intent contracts for drops, broadcasts, chat, tasks, Fan Pass, wallet, system, and support notices.",
      runtimeHealth: "Provider delivery remains unclaimed; this phase validates dry-run delivery intent only.",
      evidenceCompleteness: "Targeting rules expose opt-out, missing-token, consent, audience-source, and dry-run eligibility states to debug evidence.",
      freshness: "Notification targeting intent report is regenerated from current source.",
      costRisk: "No production fanout, provider send, or push test execution is performed.",
      regressionRisk: "Unit and source validators cover sender exclusion, creator audience settings, task eligibility, opt-out, token, consent, dedupe, and debug mapping.",
      overallHealthScore: "Improves notification readiness evidence without clearing formal runtime/provider gates.",
    },
    dirtyFiles: dirtyFileClassifications,
    validationFailures: [...new Set(failures)],
  };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (output.validationFailures.length > 0) {
    console.error(`Notification targeting intent validation failed:\n${output.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`Notification targeting intent validation passed: intents=${output.intentTypes.length}, dryRunEligible=${output.dryRunSummary.dryRunEligible}.`);
}

main();
