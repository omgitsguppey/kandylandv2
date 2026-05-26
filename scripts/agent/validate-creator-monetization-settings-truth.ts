import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import {
  CREATOR_MONETIZATION_DEBUG_LANE,
  CREATOR_MONETIZATION_EVENTS,
  buildCreatorMonetizationContractShape,
  validateCreatorMonetizationContractShape,
} from "@/lib/creator-monetization/creator-monetization-contract";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/creator-monetization-settings-truth.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/creator-monetization-settings-truth.md");

export type CreatorMonetizationSettingsDirtyFileClassification =
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
  classification: CreatorMonetizationSettingsDirtyFileClassification;
};

export type CreatorMonetizationSettingsTruthReport = {
  reportKey: "creator-monetization-settings-truth";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  contractStatus: "pass" | "fail";
  resolverStatus: "pass" | "fail";
  consumerStatus: "pass" | "fail";
  telemetryStatus: "pass" | "fail";
  personMetricsStatus: "pass" | "fail";
  featureRegistrationStatus: "pass" | "fail";
  debugVisibilityStatus: "pass" | "fail";
  paymentRuntimeStatus: "unchanged" | "changed";
  payoutMathStatus: "unchanged" | "changed";
  gumdropMathStatus: "unchanged" | "changed";
  debugLane: {
    label: typeof CREATOR_MONETIZATION_DEBUG_LANE;
    monitors: string[];
  };
  userFacingConsumers: string[];
  creatorFacingControls: string[];
  telemetryEvents: string[];
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

function includesAll(source: string, required: string[]) {
  return required.filter((item) => !source.includes(item));
}

export function classifyCreatorMonetizationSettingsDirtyFile(filePath: string): CreatorMonetizationSettingsDirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/creator-monetization-settings-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/creator-settings-control-plane.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/settings-connection-parity.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-settings-truth.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/creator-settings-control-plane.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/feature-registration-gate.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/settings-connection-parity.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/creator-monetization-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-math.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-admin-debug.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-settings-truth.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-settings-truth.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-math.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-revenue-entitlement-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/creator-revenue-entitlement-math.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-revenue-entitlement-ledger.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/creator-revenue-entitlement-math.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/math/creator-revenue-entitlement-math.ts") return "real_source_change_needs_review";
  if (normalized === "package.json") return "validator_artifact_expected";
  if (normalized === "src/lib/creator-monetization/creator-monetization-contract.ts") return "current_source_change";
  if (normalized === "src/lib/creator-monetization/creator-monetization-resolver.ts") return "current_source_change";
  if (normalized === "src/app/api/creator/settings/route.ts") return "current_source_change";
  if (normalized === "src/app/api/creator/subscriptions/route.ts") return "current_source_change";
  if (normalized === "src/app/api/creator/broadcasts/route.ts") return "current_source_change";
  if (normalized === "src/app/api/creators/[username]/route.ts") return "current_source_change";
  if (normalized === "src/app/creators/[username]/CreatorProfileClient.tsx") return "current_source_change";
  if (normalized === "src/components/Creators/CreatorExperiencesPanel.tsx") return "current_source_change";
  if (normalized === "src/lib/server/chat.ts") return "current_source_change";
  if (normalized === "src/lib/creator-public-pages.ts") return "current_source_change";
  if (normalized === "src/lib/telemetry-catalog.ts") return "current_source_change";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "current_source_change";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "current_source_change";
  if (normalized === "src/lib/features/feature-registration-registry.ts") return "current_source_change";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "current_source_change";
  if (normalized === "CHANGELOG.md") return "release_artifact_expected";
  if (normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
  if (normalized.includes("paypal") || normalized.includes("wallet") || normalized.includes("payout")) return "unsafe_unknown";
  if (normalized.includes("gumdrop-ledger") || normalized.includes("source-of-funds")) return "unsafe_unknown";
  if (normalized.includes("fan-pass")) return "stale_fan_pass_logic_to_remove";
  return "unsafe_unknown";
}

export function buildCreatorMonetizationSettingsTruthReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
} = {}): CreatorMonetizationSettingsTruthReport {
  const contractShape = buildCreatorMonetizationContractShape();
  const contractFailures = validateCreatorMonetizationContractShape(contractShape);
  const resolverSource = read("src/lib/creator-monetization/creator-monetization-resolver.ts");
  const settingsRoute = read("src/app/api/creator/settings/route.ts");
  const profileRoute = read("src/app/api/creators/[username]/route.ts");
  const publicPages = read("src/lib/creator-public-pages.ts");
  const chatServer = read("src/lib/server/chat.ts");
  const subscriptionsRoute = read("src/app/api/creator/subscriptions/route.ts");
  const broadcastsRoute = read("src/app/api/creator/broadcasts/route.ts");
  const creatorExperiencesPanel = read("src/components/Creators/CreatorExperiencesPanel.tsx");
  const creatorProfileClient = read("src/app/creators/[username]/CreatorProfileClient.tsx");
  const featureRegistrySource = read("src/lib/features/feature-registration-registry.ts");

  const resolverFailures = includesAll(resolverSource, [
    "resolveCreatorMonetizationSettings",
    "validateCreatorMonetizationUpdate",
    "resolveUserFacingCreatorMonetization",
    "explainCreatorMonetizationMismatch",
    "resolveCreatorPricing",
    "resolveCreatorFanPassPricing",
  ]);
  const consumerFailures = [
    ...includesAll(settingsRoute, ["resolveCreatorMonetizationSettings", "resolveUserFacingCreatorMonetization", "monetizationSettings", "creator_monetization_save_succeeded", "creator_monetization_save_failed"]).map((item) => `creator settings route missing ${item}`),
    ...includesAll(profileRoute, ["resolveCreatorMonetizationSettings", "resolveUserFacingCreatorMonetization", "userFacingMonetization"]).map((item) => `public creator profile route missing ${item}`),
    ...includesAll(publicPages, ["resolveCreatorMonetizationSettings", "resolveUserFacingCreatorMonetization", "userFacingMonetization"]).map((item) => `creator public pages missing ${item}`),
    ...includesAll(chatServer, ["resolveCreatorMonetizationSettings", "chatTextPriceGd", "chatImagePriceGd", "chatVideoPriceGd"]).map((item) => `chat pricing missing ${item}`),
    ...includesAll(subscriptionsRoute, ["resolveCreatorMonetizationSettings", "monetizationSettings.fanPassEnabled"]).map((item) => `fan pass route missing ${item}`),
    ...includesAll(broadcastsRoute, ["resolveCreatorMonetizationSettings", "monetizationSettings.broadcastsEnabled"]).map((item) => `broadcast route missing ${item}`),
    ...includesAll(creatorExperiencesPanel, ["resolveCreatorMonetizationSettings", "monetizationSettings.chatTextPriceGd"]).map((item) => `creator experiences panel missing ${item}`),
    ...includesAll(creatorProfileClient, ["userFacingMonetization.chat.textPriceGd"]).map((item) => `creator profile client missing ${item}`),
  ];
  const eventNames = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
  const telemetryFailures = CREATOR_MONETIZATION_EVENTS.filter((eventName) => !eventNames.has(eventName));
  const settingsMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "settings_actions");
  const personMetricFailures = CREATOR_MONETIZATION_EVENTS.filter((eventName) => !settingsMetric?.eventNames.includes(eventName));
  const creatorSettingsFeature = FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "creator_settings");
  const featureRegistrationFailures = [
    creatorSettingsFeature && featureRegistrySource.includes('uiSurfaces: ["creator settings", "pricing settings", "experience settings"]') ? null : "creator_settings feature missing monetization settings surface registration",
    creatorSettingsFeature && featureRegistrySource.includes('metricIds: ["creator_interactions"]') ? null : "creator_settings feature missing creator_interactions metric",
  ].filter((failure): failure is string => Boolean(failure));
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((dirtyPath) => ({
    path: dirtyPath,
    classification: classifyCreatorMonetizationSettingsDirtyFile(dirtyPath),
  }));
  const paymentRuntimeChanged = dirtyFiles.some((file) => /paypal|wallet|payment/iu.test(file.path));
  const payoutMathChanged = dirtyFiles.some((file) => /payout/iu.test(file.path));
  const gumdropMathChanged = dirtyFiles.some((file) => /gumdrop-ledger|source-of-funds/iu.test(file.path));

  const validationFailures = [
    ...contractFailures,
    ...resolverFailures.map((item) => `resolver missing ${item}`),
    ...consumerFailures,
    ...telemetryFailures.map((eventName) => `telemetry catalog missing ${eventName}`),
    ...personMetricFailures.map((eventName) => `settings_actions person metric missing ${eventName}`),
    ...featureRegistrationFailures,
    ...dirtyFiles.filter((file) => file.classification === "unsafe_unknown").map((file) => `${file.path} is unclassified for creator monetization settings truth.`),
    ...(paymentRuntimeChanged ? ["Payment runtime changed during creator monetization settings truth pass."] : []),
    ...(payoutMathChanged ? ["Creator payout math changed during creator monetization settings truth pass."] : []),
    ...(gumdropMathChanged ? ["GumDrop math changed during creator monetization settings truth pass."] : []),
  ];

  return {
    reportKey: "creator-monetization-settings-truth",
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? commandOutput("git rev-parse --short HEAD"),
    status: validationFailures.length === 0 ? "pass" : "fail",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    contractStatus: contractFailures.length === 0 ? "pass" : "fail",
    resolverStatus: resolverFailures.length === 0 ? "pass" : "fail",
    consumerStatus: consumerFailures.length === 0 ? "pass" : "fail",
    telemetryStatus: telemetryFailures.length === 0 ? "pass" : "fail",
    personMetricsStatus: personMetricFailures.length === 0 ? "pass" : "fail",
    featureRegistrationStatus: featureRegistrationFailures.length === 0 ? "pass" : "fail",
    debugVisibilityStatus: contractShape.debugLane === CREATOR_MONETIZATION_DEBUG_LANE ? "pass" : "fail",
    paymentRuntimeStatus: paymentRuntimeChanged ? "changed" : "unchanged",
    payoutMathStatus: payoutMathChanged ? "changed" : "unchanged",
    gumdropMathStatus: gumdropMathChanged ? "changed" : "unchanged",
    debugLane: {
      label: CREATOR_MONETIZATION_DEBUG_LANE,
      monitors: ["mismatches", "stale settings", "missing consumer", "invalid pricing", "not_configured"],
    },
    userFacingConsumers: [...contractShape.userFacingConsumers],
    creatorFacingControls: [...contractShape.creatorFacingControls],
    telemetryEvents: [...CREATOR_MONETIZATION_EVENTS],
    scoreBefore: input.scoreBefore ?? 77.83,
    scoreAfter: input.scoreAfter ?? 77.83,
    scoreDimensions: ["sourceHealth", "evidenceCompleteness", "runtimeHealth"],
    remainingGaps: validationFailures.length === 0 ? [] : ["Fix the first failing resolver, consumer, telemetry, or dirty-file scope assertion."],
    nextExactSteps: validationFailures.length === 0
      ? ["Keep creator monetization changes routed through the resolver before touching user-facing consumers."]
      : ["Repair the first validation failure and rerun npm run check:creator-monetization-settings-truth."],
    dirtyFiles,
    validationFailures,
  };
}

export function validateCreatorMonetizationSettingsTruthReport(report: CreatorMonetizationSettingsTruthReport) {
  const failures = [...report.validationFailures];
  if (report.status !== "pass") failures.push("Creator monetization settings truth report is failing.");
  if (report.contractStatus !== "pass") failures.push("Creator monetization contract failed.");
  if (report.resolverStatus !== "pass") failures.push("Creator monetization resolver failed.");
  if (report.consumerStatus !== "pass") failures.push("Creator monetization consumers are not all routed through the resolver.");
  if (report.telemetryStatus !== "pass") failures.push("Creator monetization telemetry missing.");
  if (report.personMetricsStatus !== "pass") failures.push("Creator monetization person metrics missing.");
  if (report.featureRegistrationStatus !== "pass") failures.push("Creator monetization feature registration missing.");
  if (report.debugVisibilityStatus !== "pass") failures.push("Creator monetization debug lane missing.");
  if (report.paymentRuntimeStatus !== "unchanged") failures.push("Payment runtime changed.");
  if (report.payoutMathStatus !== "unchanged") failures.push("Creator payout math changed.");
  if (report.gumdropMathStatus !== "unchanged") failures.push("GumDrop math changed.");
  if (report.scoreDimensions.length === 0) failures.push("Score dimension before/after evidence missing.");
  return [...new Set(failures)];
}

function writeReport(report: CreatorMonetizationSettingsTruthReport) {
  mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(DOC_PATH, [
    "# Creator Monetization Settings Truth",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    `Status: ${report.status}`,
    "",
    "## Coverage",
    "",
    `- Contract: ${report.contractStatus}`,
    `- Resolver: ${report.resolverStatus}`,
    `- Consumers: ${report.consumerStatus}`,
    `- Telemetry: ${report.telemetryStatus}`,
    `- Person metrics: ${report.personMetricsStatus}`,
    `- Feature registration: ${report.featureRegistrationStatus}`,
    `- Debug lane: ${report.debugLane.label}`,
    `- Payment runtime: ${report.paymentRuntimeStatus}`,
    `- Payout math: ${report.payoutMathStatus}`,
    `- GumDrop math: ${report.gumdropMathStatus}`,
    "",
    "## User-Facing Consumers",
    "",
    ...report.userFacingConsumers.map((consumer) => `- ${consumer}`),
    "",
    "## Telemetry Events",
    "",
    ...report.telemetryEvents.map((eventName) => `- ${eventName}`),
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length > 0 ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- None"]),
    "",
  ].join("\n"));
}

if (require.main === module) {
  const report = buildCreatorMonetizationSettingsTruthReport();
  writeReport(report);
  const failures = validateCreatorMonetizationSettingsTruthReport(report);
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`Creator monetization settings truth: ${report.status}`);
}
