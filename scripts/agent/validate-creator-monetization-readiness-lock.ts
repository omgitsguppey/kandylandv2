import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import {
  FAN_PASS_LIFECYCLE_EVENTS,
  buildFanPassLifecycleReportShape,
  validateFanPassLifecycleReportShape,
} from "@/lib/fan-pass/fan-pass-lifecycle-contract";
import { CREATOR_MONETIZATION_EVENTS, buildCreatorMonetizationContractShape, validateCreatorMonetizationContractShape } from "@/lib/creator-monetization/creator-monetization-contract";
import { buildCreatorEntitlementContractShape, validateCreatorEntitlementShape } from "@/lib/creator-monetization/creator-entitlement-contract";
import { ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS, buildCreatorMonetizationAdminDebugLane } from "@/lib/admin/creator-monetization-debug-contract";
import { buildEventTranslationBridgeReport } from "@/lib/analytics/event-translation-bridge";
import { buildFanPassLifecycleReport, validateFanPassLifecycleReport } from "./validate-fan-pass-lifecycle";
import { buildCreatorMonetizationSettingsTruthReport, validateCreatorMonetizationSettingsTruthReport } from "./validate-creator-monetization-settings-truth";
import { buildCreatorRevenueEntitlementLedgerReport, validateCreatorRevenueEntitlementLedgerReport } from "./validate-creator-revenue-entitlement-ledger";
import { buildCreatorMonetizationAdminDebugReport, validateCreatorMonetizationAdminDebugReport } from "./validate-creator-monetization-admin-debug";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/creator-monetization-readiness-lock.generated.json";
const DOC_PATH = "docs/agent-truth/creator-monetization-readiness-lock.md";

export type CreatorMonetizationReadinessLockDirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "unrelated_agent_context_file_to_ignore"
  | "current_source_change"
  | "unsafe_unknown";

type DirtyFile = {
  path: string;
  classification: CreatorMonetizationReadinessLockDirtyFileClassification;
};

export type CreatorMonetizationReadinessLockReport = {
  reportKey: "creator-monetization-readiness-lock";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  fanPassLifecycleStatus: "pass" | "fail";
  creatorSettingsTruthStatus: "pass" | "fail";
  entitlementLedgerStatus: "pass" | "fail";
  chatPricingStatus: "pass" | "fail";
  accessRulesStatus: "pass" | "fail";
  adminDebugStatus: "pass" | "fail";
  telemetryStatus: "pass" | "fail";
  personMetricsStatus: "pass" | "fail";
  paymentRuntimeStatus: "unchanged" | "changed";
  gumdropMathStatus: "unchanged" | "changed";
  privacyStatus: "pass" | "fail";
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  phaseArtifacts: {
    fanPassLifecycle: string;
    creatorSettingsTruth: string;
    entitlementLedger: string;
    adminDebug: string;
  };
  dirtyFiles: DirtyFile[];
  validationFailures: string[];
};

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function write(relativePath: string, value: string) {
  const fullPath = join(ROOT, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function includesAll(source: string, required: readonly string[]) {
  return required.filter((item) => !source.includes(item));
}

function isRuntimeSourcePath(filePath: string) {
  return /^(src|functions)\//u.test(filePath) && !/\.spec\./u.test(filePath);
}

export function classifyCreatorMonetizationReadinessLockDirtyFile(filePath: string): CreatorMonetizationReadinessLockDirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === STATE_PATH || normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-fan-pass-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-settings-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-admin-debug.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "current_source_change";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "current_source_change";
  if (normalized === "scripts/agent/validate-targeted-behavior-evidence.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-targeted-behavior-evidence-repair.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-media-discovery-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-current-beta-exit-status.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-evidence-capture-status.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-admin-truth-sample-evidence.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-admin-truth-source-sample.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/targeted-behavior-evidence-repair.spec.ts") return "test_artifact_expected";
  if (/^agent\/evidence\/admin-truth-sample\/automated-admin-truth-sample\.[^.]+\.(?:redacted\.)?json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (
    /^agent\/state\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|feature-registration-gate|activity-verification-engine|event-translation-bridge|person-metrics-hydration|final-parity-telemetry-lock|media-discovery-score-lock)\.generated\.json$/u.test(normalized)
  ) return "current_generated_artifact_to_commit";
  if (
    /^docs\/agent-truth\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|feature-registration-gate|event-translation-bridge|person-metrics-hydration|final-parity-telemetry-lock|media-discovery-score-lock)\.md$/u.test(normalized)
  ) return "documentation_artifact_expected";
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/.+\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts" || /^scripts\/agent\/validate-(analytics-panel-hydration|creator-dashboard-error-cost-inventory|post-economy-creator-flow-qa|public-beta-score|score-80-reconciliation-lock|score-80-refresh-pass|score-80-cost-readiness|user-facing-feature-connection-audit)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(creator-dashboard-error-cost-inventory|creator-experiences-panel|post-economy-creator-flow-qa|public-beta-score|purchase-modal|score-80-refresh-pass)\.spec\.tsx?$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/agent-score\/.+\.ts$/u.test(normalized)) return "current_source_change";
  if (normalized === "package.json") return "validator_artifact_expected";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal|payment|wallet|payout|provider-payload|providerPayload/iu.test(normalized)) return "unsafe_unknown";
  if (/gumdrop-ledger|source-of-funds/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function buildCreatorMonetizationReadinessLockReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
} = {}): CreatorMonetizationReadinessLockReport {
  const scoreBefore = input.scoreBefore ?? 77.83;
  const scoreAfter = input.scoreAfter ?? scoreBefore;
  const currentHead = input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]);
  const fanPassReport = buildFanPassLifecycleReport({ currentHead, dirtyFiles: [], scoreBefore, scoreAfter });
  const settingsReport = buildCreatorMonetizationSettingsTruthReport({ currentHead, dirtyFiles: [], scoreBefore, scoreAfter });
  const entitlementReport = buildCreatorRevenueEntitlementLedgerReport({ currentHead, dirtyFiles: [], scoreBefore, scoreAfter });
  const adminDebugReport = buildCreatorMonetizationAdminDebugReport({ currentHead, dirtyFiles: [], scoreBefore, scoreAfter });
  const chatServer = read("src/lib/server/chat.ts");
  const chatUi = read("src/components/Chat/ChatExperience.tsx");
  const fanPassResolver = read("src/lib/fan-pass/fan-pass-access-resolver.ts");
  const entitlementResolver = read("src/lib/creator-monetization/creator-entitlement-resolver.ts");
  const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
  const eventBridge = read("src/lib/analytics/event-translation-bridge.ts");
  const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));
  const telemetryEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
  const requiredEvents = [
    ...FAN_PASS_LIFECYCLE_EVENTS,
    ...CREATOR_MONETIZATION_EVENTS,
    ...ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS,
  ];
  const requiredPersonMetricEvents = [
    ...FAN_PASS_LIFECYCLE_EVENTS,
    ...CREATOR_MONETIZATION_EVENTS,
  ];
  const eventTranslationReport = buildEventTranslationBridgeReport();

  const fanPassFailures = [
    ...validateFanPassLifecycleReportShape(buildFanPassLifecycleReportShape()),
    ...validateFanPassLifecycleReport(fanPassReport),
  ];
  const settingsFailures = [
    ...validateCreatorMonetizationContractShape(buildCreatorMonetizationContractShape()),
    ...validateCreatorMonetizationSettingsTruthReport(settingsReport),
  ];
  const entitlementFailures = [
    ...validateCreatorEntitlementShape(buildCreatorEntitlementContractShape()),
    ...validateCreatorRevenueEntitlementLedgerReport(entitlementReport),
  ];
  const chatPricingFailures = [
    ...includesAll(chatServer, [
      "resolveCreatorMonetizationSettings",
      "chatTextPriceGd",
      "chatImagePriceGd",
      "chatVideoPriceGd",
      "subscriberFreeChatEnabled",
    ]).map((item) => `chat pricing server path missing ${item}`),
    ...includesAll(chatUi, ["subscriberFreeChatApplies", "proactivePaidGdGate"]).map((item) => `chat UI paid-GD gate missing ${item}`),
  ];
  const accessRuleFailures = [
    ...includesAll(fanPassResolver, ["resolveFanPassAccess", "buildFanPassTelemetry", "access_denied"]).map((item) => `Fan Pass access resolver missing ${item}`),
    ...includesAll(entitlementResolver, ["resolveCreatorEntitlementAccess", "paid_source_required", "reward_gumdrops"]).map((item) => `creator entitlement access resolver missing ${item}`),
  ];
  const adminDebugFailures = [
    ...validateCreatorMonetizationAdminDebugReport(adminDebugReport),
    buildCreatorMonetizationAdminDebugLane().rawDetailsDefault === "drilldown_only" ? null : "creator monetization admin debug must keep raw details drilldown-only",
  ].filter((failure): failure is string => Boolean(failure));
  const telemetryFailures = [
    ...requiredEvents.filter((eventName) => !telemetryEvents.has(eventName)).map((eventName) => `telemetry catalog missing ${eventName}`),
    ...includesAll(telemetryCatalog, ["admin_creator_monetization_summary_viewed", "fan_pass_purchase_attempted", "creator_monetization_mismatch_detected"]).map((item) => `telemetry catalog missing ${item}`),
    eventTranslationReport.status === "pass" ? null : "event translation bridge report is failing",
    eventBridge.includes("buildEventEnvelope") ? null : "event translation bridge missing event envelope mapping",
  ].filter((failure): failure is string => Boolean(failure));
  const personMetricFailures = [
    ...requiredPersonMetricEvents.filter((eventName) => !personMetricEvents.has(eventName)).map((eventName) => `person metrics missing ${eventName}`),
  ];
  const privacyFailures = [
    adminDebugReport.privacyStatus === "pass" ? null : "admin debug privacy status is failing",
    JSON.stringify(adminDebugReport.summaryPreview).includes("user_private") ? "admin debug summary leaks raw private user id" : null,
    adminDebugReport.summaryPreview.privacy.rawPaymentProviderPayloadVisible ? "admin debug summary exposes payment provider payloads" : null,
  ].filter((failure): failure is string => Boolean(failure));
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((dirtyPath) => ({
    path: dirtyPath,
    classification: classifyCreatorMonetizationReadinessLockDirtyFile(dirtyPath),
  }));
  const paymentRuntimeChanged = dirtyFiles.some((file) => isRuntimeSourcePath(file.path) && /paypal|payment|wallet|payout/iu.test(file.path));
  const gumdropMathChanged = dirtyFiles.some((file) => isRuntimeSourcePath(file.path) && /gumdrop-ledger|source-of-funds/iu.test(file.path));
  const dirtyFailures = dirtyFiles
    .filter((file) => file.classification === "unsafe_unknown")
    .map((file) => `${file.path} is unclassified for creator monetization readiness lock.`);
  const validationFailures = [
    ...fanPassFailures,
    ...settingsFailures,
    ...entitlementFailures,
    ...chatPricingFailures,
    ...accessRuleFailures,
    ...adminDebugFailures,
    ...telemetryFailures,
    ...personMetricFailures,
    ...privacyFailures,
    ...dirtyFailures,
    ...(paymentRuntimeChanged ? ["Payment runtime changed during creator monetization readiness lock."] : []),
    ...(gumdropMathChanged ? ["GumDrop math changed during creator monetization readiness lock."] : []),
  ];

  return {
    reportKey: "creator-monetization-readiness-lock",
    generatedAtUtc: new Date().toISOString(),
    currentHead,
    status: validationFailures.length === 0 ? "pass" : "fail",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    fanPassLifecycleStatus: fanPassFailures.length === 0 ? "pass" : "fail",
    creatorSettingsTruthStatus: settingsFailures.length === 0 ? "pass" : "fail",
    entitlementLedgerStatus: entitlementFailures.length === 0 ? "pass" : "fail",
    chatPricingStatus: chatPricingFailures.length === 0 ? "pass" : "fail",
    accessRulesStatus: accessRuleFailures.length === 0 ? "pass" : "fail",
    adminDebugStatus: adminDebugFailures.length === 0 ? "pass" : "fail",
    telemetryStatus: telemetryFailures.length === 0 ? "pass" : "fail",
    personMetricsStatus: personMetricFailures.length === 0 ? "pass" : "fail",
    paymentRuntimeStatus: paymentRuntimeChanged ? "changed" : "unchanged",
    gumdropMathStatus: gumdropMathChanged ? "changed" : "unchanged",
    privacyStatus: privacyFailures.length === 0 ? "pass" : "fail",
    scoreBefore,
    scoreAfter,
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"],
    remainingGaps: validationFailures.length === 0 ? [] : validationFailures,
    nextExactSteps: validationFailures.length === 0
      ? ["Keep Fan Pass purchases paid-source only and route future monetization consumers through the creator monetization resolver."]
      : ["Repair creator monetization readiness lock failures before promoting new Fan Pass or creator monetization surfaces."],
    phaseArtifacts: {
      fanPassLifecycle: "agent/state/fan-pass-lifecycle.generated.json",
      creatorSettingsTruth: "agent/state/creator-monetization-settings-truth.generated.json",
      entitlementLedger: "agent/state/creator-revenue-entitlement-ledger.generated.json",
      adminDebug: "agent/state/creator-monetization-admin-debug.generated.json",
    },
    dirtyFiles,
    validationFailures,
  };
}

export function validateCreatorMonetizationReadinessLockReport(report: CreatorMonetizationReadinessLockReport) {
  const failures = [...report.validationFailures];
  if (report.fanPassLifecycleStatus !== "pass") failures.push("Fan Pass lifecycle missing or failing.");
  if (report.creatorSettingsTruthStatus !== "pass") failures.push("creator monetization settings source-of-truth missing or failing.");
  if (report.entitlementLedgerStatus !== "pass") failures.push("creator entitlement ledger missing or failing.");
  if (report.chatPricingStatus !== "pass") failures.push("chat pricing bypasses creator monetization readiness.");
  if (report.accessRulesStatus !== "pass") failures.push("creator monetization access rules missing or failing.");
  if (report.adminDebugStatus !== "pass") failures.push("creator monetization admin/debug missing or failing.");
  if (report.telemetryStatus !== "pass") failures.push("creator monetization telemetry missing or failing.");
  if (report.personMetricsStatus !== "pass") failures.push("creator monetization person metrics missing or failing.");
  if (report.paymentRuntimeStatus !== "unchanged") failures.push("payment runtime changed.");
  if (report.gumdropMathStatus !== "unchanged") failures.push("GumDrop math changed.");
  if (report.scoreDimensions.length === 0) failures.push("score dimensions missing.");
  return [...new Set(failures)];
}

function writeArtifacts(report: CreatorMonetizationReadinessLockReport) {
  write(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, [
    "# Creator Monetization Readiness Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    "",
    "## Lock Status",
    "",
    `- Fan Pass lifecycle: ${report.fanPassLifecycleStatus}`,
    `- Creator settings truth: ${report.creatorSettingsTruthStatus}`,
    `- Entitlement ledger: ${report.entitlementLedgerStatus}`,
    `- Chat pricing: ${report.chatPricingStatus}`,
    `- Access rules: ${report.accessRulesStatus}`,
    `- Admin debug: ${report.adminDebugStatus}`,
    `- Telemetry: ${report.telemetryStatus}`,
    `- Person metrics: ${report.personMetricsStatus}`,
    `- Payment runtime: ${report.paymentRuntimeStatus}`,
    `- GumDrop math: ${report.gumdropMathStatus}`,
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length === 0 ? ["- None."] : report.remainingGaps.map((gap) => `- ${gap}`)),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n"));
}

if (require.main === module) {
  const report = buildCreatorMonetizationReadinessLockReport();
  writeArtifacts(report);
  if (report.status !== "pass") {
    console.error("Creator monetization readiness lock validation failed:");
    for (const failure of validateCreatorMonetizationReadinessLockReport(report)) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("Creator monetization readiness lock: pass");
}
