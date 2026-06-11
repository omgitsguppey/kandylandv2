import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import { FAN_PASS_LIFECYCLE_EVENTS, buildFanPassLifecycleDebugLane, buildFanPassLifecycleReportShape, validateFanPassLifecycleReportShape } from "@/lib/fan-pass/fan-pass-lifecycle-contract";
import { buildFanPassTelemetry } from "@/lib/fan-pass/fan-pass-access-resolver";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/fan-pass-lifecycle.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/fan-pass-lifecycle.md");

type FanPassDirtyFileClassification =
  | "current_source_change"
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_fan_pass_logic_to_remove"
  | "stale_subscription_logic_to_remove"
  | "duplicate_creator_monetization_logic_to_remove"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

type DirtyFile = {
  path: string;
  classification: FanPassDirtyFileClassification;
};

export type FanPassLifecycleReport = {
  reportKey: "fan-pass-lifecycle";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  lifecycleStatus: "pass" | "fail";
  accessResolverStatus: "pass" | "fail";
  telemetryStatus: "pass" | "fail";
  personMetricsStatus: "pass" | "fail";
  featureRegistrationStatus: "pass" | "fail";
  debugVisibilityStatus: "pass" | "fail";
  chatBypassStatus: "pass" | "fail";
  creatorSettingsStatus: "pass" | "fail";
  notificationStatus: "pass" | "fail";
  paymentRuntimeStatus: "unchanged" | "changed";
  gumdropMathStatus: "unchanged" | "changed";
  eventSpine: string[];
  contractShape: ReturnType<typeof buildFanPassLifecycleReportShape>;
  debugLane: ReturnType<typeof buildFanPassLifecycleDebugLane>;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFiles: DirtyFile[];
  validationFailures: string[];
};

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function commandOutput(command: string) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function currentDirtyFiles() {
  const tracked = commandOutput("git diff --name-only").split(/\r?\n/u).filter(Boolean);
  const untracked = commandOutput("git ls-files --others --exclude-standard").split(/\r?\n/u).filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

export function classifyFanPassLifecycleDirtyFile(filePath: string): FanPassDirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/fan-pass-lifecycle.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/fan-pass-lifecycle.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-fan-pass-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/fan-pass-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/fan-pass/fan-pass-lifecycle-contract.ts") return "current_source_change";
  if (normalized === "src/lib/fan-pass/fan-pass-access-resolver.ts") return "current_source_change";
  if (normalized === "src/lib/creator-monetization/creator-entitlement-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/creator-monetization/creator-entitlement-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/creator-monetization/creator-monetization-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/creator-monetization/creator-monetization-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/creator-monetization-settings-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-settings-truth.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-settings-truth.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-settings-truth.spec.ts") return "test_artifact_expected";
  if (normalized === "src/app/api/creator/broadcasts/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/settings/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creators/[username]/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/creators/[username]/CreatorProfileClient.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Creators/CreatorExperiencesPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/creator-public-pages.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-math.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-ledger.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-math.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-revenue-entitlement-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/creator-revenue-entitlement-math.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-revenue-entitlement-ledger.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/creator-revenue-entitlement-math.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/math/creator-revenue-entitlement-math.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-creator-monetization-admin-debug.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-admin-debug.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-monetization-admin-debug.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-admin-debug.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/admin/creator-monetization-debug-contract.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-monetization-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/features/feature-registration-registry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/chat/chat-gating-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/chat.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/subscriptions/route.ts") return "real_source_change_needs_review";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/creator-settings-control-plane.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/creator-pricing-wiring.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/settings-connection-parity.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/feature-registration-gate.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/creator-settings-control-plane.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/creator-pricing-wiring.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/settings-connection-parity.md") return "documentation_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal|payment|wallet|gumdrop-ledger|gumdrop-ledger|source-of-funds/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function includesAll(source: string, required: readonly string[]) {
  return required.filter((item) => !source.includes(item));
}

function hasAny(source: string, required: readonly string[]) {
  return required.some((item) => source.includes(item));
}

function buildMarkdown(report: FanPassLifecycleReport) {
  const eventRows = report.eventSpine.map((eventName) => `| ${eventName} | registered |`).join("\n");
  const dirtyRows = report.dirtyFiles.map((entry) => `| ${entry.path} | ${entry.classification} |`).join("\n");
  return `# Fan Pass Lifecycle

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Summary

- Lifecycle contract: ${report.lifecycleStatus}
- Access resolver: ${report.accessResolverStatus}
- Telemetry mapping: ${report.telemetryStatus}
- Person metrics mapping: ${report.personMetricsStatus}
- Feature registration: ${report.featureRegistrationStatus}
- Debug visibility: ${report.debugVisibilityStatus}
- Chat bypass contract: ${report.chatBypassStatus}
- Creator settings source: ${report.creatorSettingsStatus}
- Notification intent: ${report.notificationStatus}
- Payment runtime: ${report.paymentRuntimeStatus}
- GumDrop math: ${report.gumdropMathStatus}
- Production reads performed: ${report.productionReadsPerformed}
- Provider calls performed: ${report.providerCallsPerformed}

## Debug Lane

- Label: ${report.debugLane.label}
- Status: ${report.debugLane.status}
- Configured creators: ${report.debugLane.configuredCreators}
- Views: ${report.debugLane.viewedCount}
- Attempts: ${report.debugLane.attemptedCount}
- Successes: ${report.debugLane.succeededCount}
- Failures: ${report.debugLane.failedCount}
- Access mismatches: ${report.debugLane.accessMismatchCount}
- Chat bypass mismatches: ${report.debugLane.chatBypassMismatchCount}
- Not configured surfaces: ${report.debugLane.notConfiguredSurfaceCount}

## Event Spine

| Event | Status |
| --- | --- |
${eventRows}

## Score

- Before: ${report.scoreBefore}
- After: ${report.scoreAfter}
- Dimensions: ${report.scoreDimensions.join(", ")}

## Dirty Files

| File | Classification |
| --- | --- |
${dirtyRows || "| none | none |"}

## Remaining Gaps

${report.remainingGaps.map((gap) => `- ${gap}`).join("\n")}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}

## Validation Failures

${report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`;
}

export function buildFanPassLifecycleReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
} = {}): FanPassLifecycleReport {
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((filePath) => ({
    path: filePath,
    classification: classifyFanPassLifecycleDirtyFile(filePath),
  }));
  const telemetryEventNames = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
  const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));
  const fanPassFeature = FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "fan_pass");
  const contractShape = buildFanPassLifecycleReportShape();
  const samplePayloads = FAN_PASS_LIFECYCLE_EVENTS.map((eventName) => buildFanPassTelemetry({
    eventName,
    creatorId: "creator_source_check",
    fanUserId: "fan_source_check",
    fanPassId: "fan_source_check__creator_source_check",
    state: eventName === "fan_pass_access_granted" ? "access_granted" : eventName === "fan_pass_access_denied" ? "access_denied" : "viewed",
    sourceTruth: eventName === "fan_pass_surface_viewed" ? "creator_settings" : "creator_subscription",
    price: 250,
    surface: "creator_profile",
    route: "/creators/[username]",
    failureReason: eventName.includes("failed") || eventName.includes("denied") ? "subscription_missing" : "none",
  }));

  const validationFailures: string[] = [
    ...validateFanPassLifecycleReportShape(contractShape),
  ];
  const telemetryMissing = FAN_PASS_LIFECYCLE_EVENTS.filter((eventName) => !telemetryEventNames.has(eventName));
  if (telemetryMissing.length) validationFailures.push(`Fan Pass lifecycle events missing from telemetry catalog: ${telemetryMissing.join(", ")}`);
  const personMetricMissing = FAN_PASS_LIFECYCLE_EVENTS.filter((eventName) => !personMetricEvents.has(eventName));
  if (personMetricMissing.length) validationFailures.push(`Fan Pass lifecycle events missing from person/global metric mapping: ${personMetricMissing.join(", ")}`);
  if (!fanPassFeature) validationFailures.push("Fan Pass feature registration missing.");
  if (fanPassFeature && !FAN_PASS_LIFECYCLE_EVENTS.every((eventName) => fanPassFeature.telemetryEvents.includes(eventName))) {
    validationFailures.push("Fan Pass feature registration lacks lifecycle event spine.");
  }
  for (const payload of samplePayloads) {
    if (payload.paymentRuntimeTouched) validationFailures.push(`${payload.eventName} claims payment runtime was touched.`);
    if (payload.gumdropMathTouched) validationFailures.push(`${payload.eventName} claims GumDrop math was touched.`);
  }

  const subscriptionRoute = read("src/app/api/creator/subscriptions/route.ts");
  const chatServer = read("src/lib/server/chat.ts");
  const creatorSettings = read("src/lib/creator-settings/creator-settings-contract.ts");
  const notificationIntent = read("src/lib/notifications/notification-intent-contract.ts");

  for (const missing of includesAll(subscriptionRoute, [
    "fan_pass_purchase_attempted",
    "fan_pass_purchase_succeeded",
    "fan_pass_purchase_failed",
    "fan_pass_cancelled",
    "creator_subscription_paid_only",
    "spendCreatorExperienceGumdrops",
  ])) {
    validationFailures.push(`creator subscription route lacks ${missing}.`);
  }
  if (!hasAny(chatServer, ["resolveFanPassAccess", "buildFanPassTelemetry"])) {
    validationFailures.push("chat subscriber bypass does not register Fan Pass access resolver.");
  }
  for (const missing of includesAll(creatorSettings, ["fanPassEnabled", "fanPassPriceGd", "fan_pass"])) {
    validationFailures.push(`creator settings control plane lacks ${missing}.`);
  }
  for (const missing of includesAll(notificationIntent, ["fan_pass_update", "fan_pass_subscribers", "fan_pass_updates_enabled"])) {
    validationFailures.push(`notification intent contract lacks ${missing}.`);
  }
  for (const entry of dirtyFiles) {
    if (entry.classification === "unsafe_unknown") {
      validationFailures.push(`${entry.path} is unclassified for Fan Pass lifecycle.`);
    }
  }

  const lifecycleStatus = validationFailures.some((failure) => failure.includes("lifecycle state") || failure.includes("lifecycle event")) ? "fail" : "pass";
  const accessResolverStatus = validationFailures.some((failure) => failure.includes("access resolver")) ? "fail" : "pass";
  const telemetryStatus = telemetryMissing.length ? "fail" : "pass";
  const personMetricsStatus = personMetricMissing.length ? "fail" : "pass";
  const featureRegistrationStatus = fanPassFeature ? "pass" : "fail";
  const chatBypassStatus = validationFailures.some((failure) => failure.includes("chat subscriber bypass")) ? "fail" : "pass";
  const creatorSettingsStatus = validationFailures.some((failure) => failure.includes("creator settings")) ? "fail" : "pass";
  const notificationStatus = validationFailures.some((failure) => failure.includes("notification intent")) ? "fail" : "pass";
  const paymentRuntimeStatus = dirtyFiles.some((entry) => /paypal|payment|wallet/iu.test(entry.path)) ? "changed" : "unchanged";
  const gumdropMathStatus = dirtyFiles.some((entry) => /gumdrop-ledger|source-of-funds/iu.test(entry.path)) ? "changed" : "unchanged";

  const report: FanPassLifecycleReport = {
    reportKey: "fan-pass-lifecycle",
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? (commandOutput("git rev-parse HEAD") || undefined),
    status: validationFailures.length ? "fail" : "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    lifecycleStatus,
    accessResolverStatus,
    telemetryStatus,
    personMetricsStatus,
    featureRegistrationStatus,
    debugVisibilityStatus: validationFailures.some((failure) => failure.includes("debug")) ? "fail" : "pass",
    chatBypassStatus,
    creatorSettingsStatus,
    notificationStatus,
    paymentRuntimeStatus,
    gumdropMathStatus,
    eventSpine: [...FAN_PASS_LIFECYCLE_EVENTS],
    contractShape,
    debugLane: buildFanPassLifecycleDebugLane(),
    scoreBefore: input.scoreBefore ?? 77.83,
    scoreAfter: input.scoreAfter ?? 77.83,
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"],
    remainingGaps: [
      "Runtime subscription provider smoke remains outside this source-only lifecycle contract.",
    ],
    nextExactSteps: [
      "Use this contract when wiring future Fan Pass renewal and cancellation provider evidence.",
    ],
    dirtyFiles,
    validationFailures,
  };

  return report;
}

export function validateFanPassLifecycleReport(report: FanPassLifecycleReport) {
  const failures = [...report.validationFailures];
  if (report.lifecycleStatus !== "pass") failures.push("Fan Pass lifecycle status failed.");
  if (report.accessResolverStatus !== "pass") failures.push("Fan Pass access resolver status failed.");
  if (report.telemetryStatus !== "pass") failures.push("Fan Pass telemetry status failed.");
  if (report.personMetricsStatus !== "pass") failures.push("Fan Pass person metrics status failed.");
  if (report.featureRegistrationStatus !== "pass") failures.push("Fan Pass feature registration status failed.");
  if (report.chatBypassStatus !== "pass") failures.push("Fan Pass chat bypass status failed.");
  if (report.creatorSettingsStatus !== "pass") failures.push("Fan Pass creator settings source failed.");
  if (report.notificationStatus !== "pass") failures.push("Fan Pass notification status failed.");
  if (report.paymentRuntimeStatus !== "unchanged") failures.push("payment runtime changed.");
  if (report.gumdropMathStatus !== "unchanged") failures.push("GumDrop math changed.");
  if (!report.scoreDimensions.length) failures.push("score dimensions missing.");
  if (report.productionReadsPerformed) failures.push("validator performed production reads.");
  if (report.providerCallsPerformed) failures.push("validator performed provider calls.");
  return [...new Set(failures)];
}

function main() {
  const report = buildFanPassLifecycleReport();
  const failures = validateFanPassLifecycleReport(report);
  const finalReport = { ...report, status: failures.length ? "fail" as const : "pass" as const, validationFailures: failures };
  mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
  writeFileSync(DOC_PATH, buildMarkdown(finalReport));
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`Fan Pass lifecycle validation passed: ${STATE_PATH}`);
}

if (process.argv[1]?.replace(/\\/gu, "/").endsWith("scripts/agent/validate-fan-pass-lifecycle.ts")) {
  main();
}
