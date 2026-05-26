import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS,
  buildCreatorMonetizationAdminDebugLane,
  buildCreatorMonetizationAdminDebugSummary,
  validateCreatorMonetizationAdminDebugSummary,
} from "@/lib/admin/creator-monetization-debug-contract";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/creator-monetization-admin-debug.generated.json";
const DOC_PATH = "docs/agent-truth/creator-monetization-admin-debug.md";

export type CreatorMonetizationAdminDebugDirtyFileClassification =
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
  classification: CreatorMonetizationAdminDebugDirtyFileClassification;
};

export type CreatorMonetizationAdminDebugReport = {
  reportKey: "creator-monetization-admin-debug";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  adminSummaryStatus: "pass" | "fail";
  debugRouteStatus: "pass" | "fail";
  privacyStatus: "pass" | "fail";
  telemetryStatus: "pass" | "fail";
  featureRegistrationStatus: "pass" | "fail";
  costReadStatus: "pass" | "fail";
  paymentRuntimeStatus: "unchanged" | "changed";
  gumdropMathStatus: "unchanged" | "changed";
  debugLane: ReturnType<typeof buildCreatorMonetizationAdminDebugLane>;
  summaryPreview: ReturnType<typeof buildCreatorMonetizationAdminDebugSummary>;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
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

export function classifyCreatorMonetizationAdminDebugDirtyFile(filePath: string): CreatorMonetizationAdminDebugDirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "src/lib/admin/creator-monetization-debug-contract.ts") return "current_source_change";
  if (normalized === "src/app/api/admin/debug/route.ts") return "current_source_change";
  if (normalized === "src/lib/telemetry-catalog.ts") return "current_source_change";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "current_source_change";
  if (normalized === "scripts/agent/validate-creator-monetization-admin-debug.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-admin-debug.spec.ts") return "test_artifact_expected";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "package.json") return "validator_artifact_expected";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal|payment|wallet|payout/iu.test(normalized)) return "unsafe_unknown";
  if (/gumdrop-ledger|source-of-funds/iu.test(normalized)) return "unsafe_unknown";
  if (/fan-pass|subscription/iu.test(normalized)) return "stale_fan_pass_logic_to_remove";
  return "unsafe_unknown";
}

export function buildCreatorMonetizationAdminDebugReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
} = {}): CreatorMonetizationAdminDebugReport {
  const contractSource = read("src/lib/admin/creator-monetization-debug-contract.ts");
  const routeSource = read("src/app/api/admin/debug/route.ts");
  const telemetryEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
  const featureRegistrySource = read("src/lib/features/feature-registration-registry.ts");
  const adminDebugFeature = FEATURE_REGISTRATION_REGISTRY.find((entry) => entry.featureId === "admin_debug") as
    | { metricIds?: string[]; uiMetrics?: Array<{ metricId?: string }> }
    | undefined;
  const lane = buildCreatorMonetizationAdminDebugLane();
  const summaryPreview = buildCreatorMonetizationAdminDebugSummary({
    creators: [{
      creatorId: "preview_creator",
      creatorSettings: {
        subscriptionsEnabled: true,
        subscriptionPriceGd: 900,
        messagingEnabled: true,
        chatFreeForSubscribers: true,
      },
      creatorSettingsUpdatedAt: Date.now(),
    }],
    entitlements: [{
      entitlementType: "fan_pass_access",
      status: "active",
      sourceFeature: "fan_pass",
      sourceOfFunds: "paid_gumdrops",
      creatorId: "preview_creator",
      userId: "redacted_preview_user",
    }],
    transactions: [{ type: "creator_message_text", status: "completed", purchasedAmountSpent: 1, rewardAmountSpent: 0 }],
    accessFailures: [{ reason: "fan_pass_inactive" }],
  });

  const summaryFailures = [
    ...validateCreatorMonetizationAdminDebugSummary(summaryPreview),
    ...includesAll(contractSource, [
      "ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS",
      "buildCreatorMonetizationAdminDebugLane",
      "buildCreatorMonetizationAdminDebugSummary",
      "validateCreatorMonetizationAdminDebugSummary",
      "rawPaymentProviderPayloadVisible: false",
      "privateUserPiiVisible: false",
    ]).map((item) => `contract missing ${item}`),
  ];
  const debugRouteFailures = [
    ...includesAll(routeSource, [
      "buildCreatorMonetizationAdminDebugSummary",
      "creatorMonetizationAdminDebug",
      "creatorSubscriptionsSnapshot",
      "creatorMessagesSnapshot",
      "creatorSpendParity",
      "trackingSummary",
    ]).map((item) => `admin debug route missing ${item}`),
    routeSource.includes("providerPayload") || routeSource.includes("paymentProviderPayload")
      ? "admin debug route references raw payment provider payloads"
      : null,
  ].filter((failure): failure is string => Boolean(failure));
  const telemetryFailures = ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS
    .filter((eventName) => !telemetryEvents.has(eventName))
    .map((eventName) => `telemetry catalog missing ${eventName}`);
  const featureRegistrationFailures = [
    (adminDebugFeature?.metricIds?.includes("admin_debug_evidence")
      || adminDebugFeature?.uiMetrics?.some((metric) => metric.metricId === "admin_debug_evidence"))
      && featureRegistrySource.includes("Admin debug must show unknown/stale")
      ? null
      : "admin_debug feature registration missing admin evidence parity",
  ].filter((failure): failure is string => Boolean(failure));
  const privacyFailures = [
    JSON.stringify(summaryPreview).includes("redacted_preview_user") ? "summary preview leaks raw user id" : null,
    summaryPreview.privacy.rawPaymentProviderPayloadVisible ? "summary exposes payment provider payloads" : null,
    summaryPreview.privacy.privateUserPiiVisible ? "summary exposes private user PII" : null,
    summaryPreview.drilldown.containsRawPaymentProviderPayload ? "drilldown exposes payment provider payloads by default" : null,
  ].filter((failure): failure is string => Boolean(failure));
  const costFailures = [
    routeSource.includes('collection("payment_provider') ? "admin debug route reads payment provider payloads by default" : null,
    routeSource.includes('collection("paypal') ? "admin debug route reads PayPal payloads by default" : null,
  ].filter((failure): failure is string => Boolean(failure));
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((dirtyPath) => ({
    path: dirtyPath,
    classification: classifyCreatorMonetizationAdminDebugDirtyFile(dirtyPath),
  }));
  const paymentRuntimeChanged = dirtyFiles.some((file) => /paypal|payment|wallet|payout/iu.test(file.path));
  const gumdropMathChanged = dirtyFiles.some((file) => /gumdrop-ledger|source-of-funds/iu.test(file.path));
  const dirtyFailures = dirtyFiles
    .filter((file) => file.classification === "unsafe_unknown")
    .map((file) => `${file.path} is unclassified for creator monetization admin debug.`);
  const validationFailures = [
    ...summaryFailures,
    ...debugRouteFailures,
    ...telemetryFailures,
    ...featureRegistrationFailures,
    ...privacyFailures,
    ...costFailures,
    ...dirtyFailures,
    ...(paymentRuntimeChanged ? ["Payment runtime changed during creator monetization admin debug pass."] : []),
    ...(gumdropMathChanged ? ["GumDrop math changed during creator monetization admin debug pass."] : []),
  ];

  return {
    reportKey: "creator-monetization-admin-debug",
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]),
    status: validationFailures.length === 0 ? "pass" : "fail",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    adminSummaryStatus: summaryFailures.length === 0 ? "pass" : "fail",
    debugRouteStatus: debugRouteFailures.length === 0 ? "pass" : "fail",
    privacyStatus: privacyFailures.length === 0 ? "pass" : "fail",
    telemetryStatus: telemetryFailures.length === 0 ? "pass" : "fail",
    featureRegistrationStatus: featureRegistrationFailures.length === 0 ? "pass" : "fail",
    costReadStatus: costFailures.length === 0 ? "pass" : "fail",
    paymentRuntimeStatus: paymentRuntimeChanged ? "changed" : "unchanged",
    gumdropMathStatus: gumdropMathChanged ? "changed" : "unchanged",
    debugLane: lane,
    summaryPreview,
    scoreBefore: input.scoreBefore ?? 77.83,
    scoreAfter: input.scoreAfter ?? input.scoreBefore ?? 77.83,
    scoreDimensions: ["sourceHealth", "evidenceCompleteness", "runtimeHealth"],
    remainingGaps: validationFailures.length === 0 ? [] : validationFailures,
    nextExactSteps: validationFailures.length === 0
      ? ["Keep raw creator monetization/payment details behind explicit admin drilldown."]
      : ["Repair creator monetization admin debug validation failures before signoff."],
    dirtyFiles,
    validationFailures,
  };
}

export function validateCreatorMonetizationAdminDebugReport(report: CreatorMonetizationAdminDebugReport) {
  const failures = [...report.validationFailures];
  if (report.adminSummaryStatus !== "pass") failures.push("creator monetization admin summary is not passing.");
  if (report.debugRouteStatus !== "pass") failures.push("creator monetization admin debug route is not wired.");
  if (report.privacyStatus !== "pass") failures.push("creator monetization admin debug privacy is not passing.");
  if (report.telemetryStatus !== "pass") failures.push("creator monetization admin debug telemetry is not passing.");
  if (report.scoreDimensions.length === 0) failures.push("creator monetization admin debug score dimensions missing.");
  return [...new Set(failures)];
}

function writeArtifacts(report: CreatorMonetizationAdminDebugReport) {
  write(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, [
    "# Creator Monetization Admin Debug",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    "",
    "## Summary",
    "",
    "- Admin debug shows creator monetization configuration, Fan Pass status, chat pricing health, access denial reasons, and source-of-funds mismatch counts as a compact summary.",
    "- Raw creator monetization records, private user identifiers, and payment/provider payloads remain outside the default admin summary.",
    "- The admin route reuses already loaded creator/user/transaction snapshots and does not add provider reads.",
    "",
    "## Telemetry",
    "",
    ...ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS.map((eventName) => `- ${eventName}`),
    "",
    "## Validation",
    "",
    ...(
      report.validationFailures.length === 0
        ? ["- No validation failures."]
        : report.validationFailures.map((failure) => `- ${failure}`)
    ),
    "",
  ].join("\n"));
}

if (require.main === module) {
  const report = buildCreatorMonetizationAdminDebugReport();
  writeArtifacts(report);
  if (report.status !== "pass") {
    console.error(JSON.stringify(report.validationFailures, null, 2));
    process.exit(1);
  }
  console.log(`creator monetization admin debug ${report.status}`);
}
