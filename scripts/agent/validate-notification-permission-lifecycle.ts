import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NOTIFICATION_PERMISSION_PROMPT_EVENTS,
  buildNotificationPermissionDebugLane,
} from "../../src/lib/notifications/notification-permission-contract";
import {
  buildNotificationPromptTelemetryEnvelope,
} from "../../src/lib/notifications/notification-prompt-telemetry";
import type { NotificationPromptLifecycleEvent } from "../../src/lib/notifications/notification-permission-contract";

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

type DirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_notification_logic_to_remove"
  | "stale_permission_logic_to_remove"
  | "stale_pwa_logic_to_ignore_for_this_phase"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "validator_artifact_expected"
  | "unsafe_unknown";

export type NotificationPermissionLifecycleReport = {
  generatedAtUtc: string;
  currentHead: string;
  productionReadsRequired: false;
  deployRequired: false;
  promptLifecycleEvents: NotificationPromptLifecycleEvent[];
  permissionStateTracked: boolean;
  autoFireOnPageLoadBlocked: boolean;
  cooldownPolicyPresent: boolean;
  retryPolicyPresent: boolean;
  ariaBusyPreserved: boolean;
  canonicalEnvelopeMapped: boolean;
  telemetryCatalogMapped: boolean;
  featureRegistrationMapped: boolean;
  personMetricsMapped: boolean;
  debugLanePresent: boolean;
  debugLane: ReturnType<typeof buildNotificationPermissionDebugLane>;
  scoreBefore: ScoreDimensions;
  scoreAfter: ScoreDimensions;
  scoreDimensionImpact: Record<keyof ScoreDimensions, string>;
  dirtyFiles: Array<{ path: string; classification: DirtyClassification }>;
  oldLogicReferences: Array<{ reference: string; classification: "still_required" | "stale_removed" | "stale_permission_logic_to_remove" | "unsafe_unknown"; reason: string }>;
  validationFailures: string[];
};

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..", "..");
const REPORT_PATH = "agent/state/notification-permission-lifecycle.generated.json";
const DOC_PATH = "docs/agent-truth/notification-permission-lifecycle.md";
const SCORE_KEYS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, [...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, any> {
  const raw = read(path);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return {};
  }
}

function currentHead() {
  return shell("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
}

function dirtyFiles() {
  const changed = shell("git", ["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const untracked = shell("git", ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean);
  return [...new Set([...changed, ...untracked].map((path) => path.replace(/\\/gu, "/")))].sort();
}

function classifyDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/push-token-registration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "docs/agent-truth/push-token-registration.md") return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-permission-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-pwa-service-worker.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/notification-permission-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/push-token-registration.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/lib/notifications/notification-permission-contract.ts"
    || normalized === "src/lib/notifications/notification-prompt-telemetry.ts"
    || normalized === "src/lib/notifications/push-token-contract.ts"
    || normalized === "src/lib/notifications/push-token-telemetry.ts"
    || normalized === "src/lib/browser-notification-enrollment.ts"
    || normalized === "src/app/api/notifications/push-token/route.ts"
    || normalized === "src/components/Dashboard/NotificationPromptBanner.tsx"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "package.json"
  ) return "real_source_change_needs_review";
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
  const score = readJson("agent/state/public-beta-score.generated.json");
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

function lifecycleEventsMapped(telemetryCatalog: string) {
  return NOTIFICATION_PERMISSION_PROMPT_EVENTS.every((eventName) =>
    telemetryCatalog.includes(`eventName: "${eventName}"`),
  );
}

function oldLogicReferences(banner: string) {
  const references: NotificationPermissionLifecycleReport["oldLogicReferences"] = [];
  if (banner.includes("notification_prompt_banner_viewed")) {
    references.push({
      reference: "notification_prompt_banner_viewed",
      classification: "stale_permission_logic_to_remove",
      reason: "Legacy banner-view event should be an alias only; current source should use notification_prompt_viewed.",
    });
  }
  if (banner.includes("notification_prompt_banner_dismissed")) {
    references.push({
      reference: "notification_prompt_banner_dismissed",
      classification: "stale_permission_logic_to_remove",
      reason: "Legacy banner-dismiss event should be an alias only; current source should use notification_prompt_dismissed.",
    });
  }
  if (banner.includes("aria-busy")) {
    references.push({
      reference: "aria-busy",
      classification: "still_required",
      reason: "Loading state accessibility remains required on the permission CTA.",
    });
  }
  return references;
}

export function buildNotificationPermissionLifecycleReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  scoreBefore?: ScoreDimensions;
  scoreAfter?: ScoreDimensions;
} = {}): NotificationPermissionLifecycleReport {
  const banner = read("src/components/Dashboard/NotificationPromptBanner.tsx");
  const contract = read("src/lib/notifications/notification-permission-contract.ts");
  const telemetry = read("src/lib/notifications/notification-prompt-telemetry.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const personMetrics = read("src/lib/analytics/person-metrics-contract.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const featureRegistry = read("src/lib/features/feature-registration-registry.ts");
  const sampleEnvelope = buildNotificationPromptTelemetryEnvelope({
    eventName: "notification_prompt_viewed",
    permissionState: "default",
    promptStatus: "shown",
    userScope: "signed_in",
    featureSource: "dashboard",
    sourceComponent: "NotificationPromptBanner",
    route: "/dashboard",
    cooldownRemainingMs: 0,
    retryCount: 0,
  });
  const score = scoreSnapshot();
  const files = input.dirtyFiles ?? dirtyFiles();
  const debugLane = buildNotificationPermissionDebugLane({
    eligibleCount: 1,
    viewedCount: 1,
    grantedCount: 1,
    telemetryMapped: lifecycleEventsMapped(telemetryCatalog),
  });
  const report: NotificationPermissionLifecycleReport = {
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? currentHead(),
    productionReadsRequired: false,
    deployRequired: false,
    promptLifecycleEvents: NOTIFICATION_PERMISSION_PROMPT_EVENTS,
    permissionStateTracked: contract.includes("NotificationPermissionState") && banner.includes("classifyNotificationPermissionState"),
    autoFireOnPageLoadBlocked: !/useEffect\([\s\S]{0,1800}(enableBrowserNotifications|requestBrowserNotificationAccess|Notification\.requestPermission)/u.test(banner),
    cooldownPolicyPresent: contract.includes("NOTIFICATION_PROMPT_COOLDOWN_MS") && banner.includes("resolveNotificationPromptCooldown"),
    retryPolicyPresent: banner.includes("retryCount") && contract.includes("retryPolicy"),
    ariaBusyPreserved: banner.includes("aria-busy={loading}"),
    canonicalEnvelopeMapped: telemetry.includes("buildEventEnvelope") && sampleEnvelope.featureId === "notifications" && sampleEnvelope.pipelineStatus === "normal",
    telemetryCatalogMapped: lifecycleEventsMapped(telemetryCatalog),
    featureRegistrationMapped: featureRegistry.includes('featureId: "notifications"') && featureRegistry.includes('behaviorFeatures: ["notifications"]'),
    personMetricsMapped: NOTIFICATION_PERMISSION_PROMPT_EVENTS.every((eventName) => personMetrics.includes(`"${eventName}"`)),
    debugLanePresent: debugSummary.includes("notification_permission") && debugSummary.includes("Notification permission"),
    debugLane,
    scoreBefore: input.scoreBefore ?? score,
    scoreAfter: input.scoreAfter ?? score,
    scoreDimensionImpact: {
      sourceHealth: "Notification prompt lifecycle has explicit source contract, telemetry events, and validator coverage.",
      runtimeHealth: "Runtime push/provider proof remains separate; this phase adds source-safe lifecycle readiness only.",
      evidenceCompleteness: "Prompt views, grants, denials, failures, cooldown, and blocked browser states feed debug evidence.",
      freshness: "Notification lifecycle report is regenerated from current source.",
      costRisk: "Prompt state is local and event-only; no production reads or provider calls are added.",
      regressionRisk: "Unit and validator checks protect no-auto-prompt, cooldown, telemetry mapping, debug lane, and protected-surface boundaries.",
      overallHealthScore: "Moves notification readiness evidence without clearing formal runtime/provider gates.",
    },
    dirtyFiles: files.map((path) => ({ path, classification: classifyDirtyFile(path) })),
    oldLogicReferences: oldLogicReferences(banner),
    validationFailures: [],
  };
  report.validationFailures = validateNotificationPermissionLifecycleReport(report);
  return report;
}

export function validateNotificationPermissionLifecycleReport(report: NotificationPermissionLifecycleReport): string[] {
  const failures: string[] = [];
  if (!report.autoFireOnPageLoadBlocked) failures.push("permission prompt can auto-fire on page load.");
  if (!report.permissionStateTracked) failures.push("permission state is not tracked.");
  if (!report.telemetryCatalogMapped) failures.push("granted/denied/failure events are missing.");
  if (!report.cooldownPolicyPresent || !report.retryPolicyPresent) failures.push("prompt can spam after dismissal.");
  if (!report.ariaBusyPreserved) failures.push("aria-busy lost.");
  if (!report.canonicalEnvelopeMapped || !report.featureRegistrationMapped || !report.personMetricsMapped) failures.push("notification events lack identity/feature/telemetry mapping.");
  if (!report.debugLanePresent || report.debugLane.label !== "Notification permission") failures.push("debug lane missing.");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("chat/payment/GumDrop files changed.");
  if (Object.keys(report.scoreDimensionImpact).length !== SCORE_KEYS.length) failures.push("score dimension impact missing.");
  return failures;
}

function writeReport(report: NotificationPermissionLifecycleReport) {
  const reportPath = join(ROOT, REPORT_PATH);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const docPath = join(ROOT, DOC_PATH);
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, [
    "# Notification Permission Lifecycle",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    "",
    "## Status",
    "",
    `- Permission state tracked: ${report.permissionStateTracked}`,
    `- Auto prompt on page load blocked: ${report.autoFireOnPageLoadBlocked}`,
    `- Cooldown policy present: ${report.cooldownPolicyPresent}`,
    `- Retry policy present: ${report.retryPolicyPresent}`,
    `- Aria busy preserved: ${report.ariaBusyPreserved}`,
    `- Canonical envelope mapped: ${report.canonicalEnvelopeMapped}`,
    `- Telemetry catalog mapped: ${report.telemetryCatalogMapped}`,
    `- Feature registration mapped: ${report.featureRegistrationMapped}`,
    `- Person metrics mapped: ${report.personMetricsMapped}`,
    `- Debug lane present: ${report.debugLanePresent}`,
    "",
    "## Lifecycle Events",
    "",
    ...report.promptLifecycleEvents.map((eventName) => `- ${eventName}`),
    "",
    "## Debug Lane",
    "",
    `- Label: ${report.debugLane.label}`,
    `- Telemetry: ${report.debugLane.telemetryStatus}`,
    `- Raw details collapsed: ${report.debugLane.rawDetailsCollapsedByDefault}`,
    "",
    "## Score Impact",
    "",
    ...SCORE_KEYS.map((key) => `- ${key}: ${report.scoreBefore[key]} -> ${report.scoreAfter[key]} (${report.scoreDimensionImpact[key]})`),
    "",
    "## Dirty Files",
    "",
    ...report.dirtyFiles.map((entry) => `- ${entry.path}: ${entry.classification}`),
    "",
  ].join("\n"));
}

function main() {
  const report = buildNotificationPermissionLifecycleReport();
  writeReport(report);

  if (report.validationFailures.length > 0) {
    console.error("Notification permission lifecycle validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("Notification permission lifecycle validation passed.");
}

main();
