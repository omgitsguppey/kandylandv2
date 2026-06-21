import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import {
  buildBodySystemWiringRepairReport,
  classifyBodySystemWiringOpenPullRequest,
  type BodySystemWiringRepairReport,
} from "@/lib/product-integrity/body-system-wiring-repair";
import {
  buildCentralNormalizerSpineReport,
  normalizeProductSignal,
} from "@/lib/product-integrity/central-normalizer";
import type {
  CentralNormalizerSpineReport,
  ProductSignal,
} from "@/lib/product-integrity/central-normalizer-contract";
import {
  buildInterpretiveBrainDebugTriageReport,
  interpretNormalizedSignal,
} from "@/lib/product-integrity/interpretive-brain";
import type { InterpretiveBrainDebugTriageReport } from "@/lib/product-integrity/interpretive-brain-contract";
import { buildProductBodyMapReport } from "@/lib/product-integrity/product-body-map";
import {
  BODY_SYSTEM_IDS,
  type BodySystemId,
  type ProductBodyMapReport,
} from "@/lib/product-integrity/product-body-system-contract";

export const FINAL_PRODUCT_INTEGRITY_LOCK_VERSION = "2026.05.final-product-integrity-lock.1";

const FINAL_PRODUCT_INTEGRITY_VALIDATOR = "check:final-product-integrity-lock";
const FINAL_PRODUCT_INTEGRITY_SCRIPT = "tsx scripts/agent/validate-final-product-integrity-lock.ts";

export type FinalProductIntegrityStatus = "pass" | "fail";
export type FinalProductIntegrityDebugSummaryStatus =
  | "product_brain_root_cause_ready"
  | "missing_product_brain_summary"
  | "raw_debug_default_open"
  | "missing_root_cause_findings";
export type FinalProductIntegrityGapClassification =
  | "resolved"
  | "deferred_with_owner"
  | "in_flight"
  | "intentionally_deprecated"
  | "unsafe_unknown";
export type FinalProductIntegrityDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_body_map_logic_to_remove"
  | "stale_feature_inventory_to_remove"
  | "duplicate_feature_registry_logic_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "unsafe_unknown";
export type LaunchBlockerClassification =
  | "formal_evidence_required"
  | "source_confidence_ready"
  | "operator_review_required"
  | "stale_artifact_refresh_needed"
  | "external_review_required"
  | "classified";

export interface FinalProductIntegrityDirtyFile {
  path: string;
  classification: FinalProductIntegrityDirtyClassification;
}

export interface FinalProductIntegrityOpenPullRequest {
  number: number;
  title: string;
  url: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
  classification: string;
}

export interface FinalProductIntegrityGap {
  gapId: string;
  classification: FinalProductIntegrityGapClassification;
  owner: string;
  bodySystem: BodySystemId;
  reason: string;
  nextAction: string;
}

export interface FinalProductIntegrityLaunchBlocker {
  blockerId: string;
  label: string;
  classification: LaunchBlockerClassification;
  formalGateCleared: false;
  nextAction: string;
}

export interface FinalProductIntegrityLockReport {
  reportKey: "final-product-integrity-lock";
  contractVersion: string;
  generatedAtUtc: string;
  currentHead?: string;
  status: FinalProductIntegrityStatus;
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  bodySystems: BodySystemId[];
  mappedLimbCount: number;
  connectedLimbCount: number;
  orphanedLimbCount: number;
  duplicatedLimbCount: number;
  staleLimbCount: number;
  unsafeUnknownCount: number;
  centralNormalizerStatus: CentralNormalizerSpineReport["status"] | "missing";
  interpretiveBrainStatus: InterpretiveBrainDebugTriageReport["status"] | "missing";
  wiringRepairStatus: BodySystemWiringRepairReport["status"] | "missing";
  debugSummaryStatus: FinalProductIntegrityDebugSummaryStatus;
  scoreBefore?: Record<string, number>;
  scoreAfter?: Record<string, number>;
  scoreDimensions: Record<PublicBetaHealthDimension | "overallHealthScore", {
    before: number;
    after: number;
    target: number;
    status: "meets_target" | "below_target";
    nextAction: string;
  }>;
  launchBlockers: FinalProductIntegrityLaunchBlocker[];
  remainingGaps: FinalProductIntegrityGap[];
  nextExactSteps: string[];
  bodySystemsWithScoreVisibility: BodySystemId[];
  bodySystemsWithDebugVisibility: BodySystemId[];
  duplicateTruthSourcesActive: false;
  dirtyFiles: FinalProductIntegrityDirtyFile[];
  openPullRequests: FinalProductIntegrityOpenPullRequest[];
  validationFailures: string[];
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function finalLockSampleSignal(): ProductSignal {
  return {
    signalId: "final-product-integrity-lock-drop-preview",
    signalKind: "UserActionSignal",
    eventName: "drop_preview_opened",
    featureId: "drops",
    surface: "drops_library",
    who: {
      userId: "sample_user",
      sessionId: "sample_session",
      actorKind: "signed_in_user",
    },
    what: {
      objectType: "drop",
      objectId: "sample_drop",
      dropId: "sample_drop",
    },
    when: {
      occurredAtUtc: "2026-05-26T12:00:00.000Z",
      timestampMs: 1779800000000,
    },
    where: {
      surface: "drops_library",
      route: "/drops/sample_drop",
      sourceComponent: "DropCard",
    },
    how: {
      action: "click",
      method: "tap",
      source: "client",
    },
    howLong: {
      durationMs: 1200,
      activeMs: 900,
    },
    identityState: "signed_in",
    confidence: "exact",
    sourceTruth: "client",
    dedupeKey: "final-product-integrity-lock-drop-preview",
    privacyClass: "minimal_product",
    costClass: "hot_path_summary",
    debugVisibility: "debug_visible",
    scoreImpact: ["evidenceCompleteness", "runtimeHealth"],
  };
}

function scoreDimensionInput(scoreAfter?: Record<string, number>) {
  return ([
    "sourceHealth",
    "runtimeHealth",
    "evidenceCompleteness",
    "freshness",
    "costRisk",
    "regressionRisk",
  ] as PublicBetaHealthDimension[]).map((dimension) => ({
    dimension,
    score: Number(scoreAfter?.[dimension] ?? 0),
    reason: dimension === "costRisk"
      ? "Cost risk remains owner-review/external billing separated from source guards."
      : `${dimension} is represented in the current beta score artifact.`,
    nextAction: dimension === "costRisk"
      ? "Resolve owner-review cost lanes without touching payment or GumDrop runtime math."
      : "No score action needed for this dimension.",
  }));
}

function scoreDimensions(
  scoreBefore?: Record<string, number>,
  scoreAfter?: Record<string, number>,
): FinalProductIntegrityLockReport["scoreDimensions"] {
  const dimensions = [
    "sourceHealth",
    "runtimeHealth",
    "evidenceCompleteness",
    "freshness",
    "costRisk",
    "regressionRisk",
    "overallHealthScore",
  ] as const;
  return Object.fromEntries(dimensions.map((dimension) => {
    const after = Number(scoreAfter?.[dimension] ?? 0);
    return [dimension, {
      before: Number(scoreBefore?.[dimension] ?? after),
      after,
      target: 80,
      status: after >= 80 ? "meets_target" : "below_target",
      nextAction: after >= 80
        ? "No score action needed for this dimension."
        : `${dimension} remains below 80; keep exact owner next action visible in Product brain and beta score.`,
    }];
  })) as FinalProductIntegrityLockReport["scoreDimensions"];
}

function classifyLaunchBlocker(label: string): FinalProductIntegrityLaunchBlocker {
  const normalized = label.toLowerCase();
  if (normalized.includes("runtime") || normalized.includes("provider") || normalized.includes("admin truth")) {
    return {
      blockerId: normalized
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "")
        .replace(/-runtime-unverified$/u, "")
        .replace(/-ready-with-smoke-required$/u, ""),
      label,
      classification: "formal_evidence_required",
      formalGateCleared: false,
      nextAction: "Produce the required deployed route, provider-backed site activity, or admin source activity artifact before clearing this gate.",
    };
  }
  if (normalized.includes("stale")) {
    return {
      blockerId: normalized.replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
      label,
      classification: "stale_artifact_refresh_needed",
      formalGateCleared: false,
      nextAction: "Refresh or retire the stale artifact before interpreting launch readiness.",
    };
  }
  return {
    blockerId: normalized.replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "classified-blocker",
    label,
    classification: "classified",
    formalGateCleared: false,
    nextAction: "Keep this blocker classified with owner evidence before clearing it.",
  };
}

function finalGaps(
  productBodyMapReport: ProductBodyMapReport,
  wiringReport: BodySystemWiringRepairReport,
): FinalProductIntegrityGap[] {
  const deferred = wiringReport.gapsDeferred.map((gap) => ({
    gapId: gap.limbId,
    classification: gap.classification === "deferred_with_owner" ? "deferred_with_owner" as const : "unsafe_unknown" as const,
    owner: gap.owner,
    bodySystem: gap.bodySystem,
    reason: gap.reason,
    nextAction: gap.nextAction,
  }));
  const deprecated = productBodyMapReport.disconnectedLimbs
    .filter((limb) => limb.status === "deprecated")
    .map((limb) => ({
      gapId: limb.limbId,
      classification: "intentionally_deprecated" as const,
      owner: limb.owner,
      bodySystem: limb.primaryBodySystem,
      reason: "Deprecated/archive-only limb remains mapped so it cannot be treated as live product truth.",
      nextAction: limb.nextAction,
    }));
  const unsafe = wiringReport.unsafeUnknown.map((gap) => ({
    gapId: gap.limbId,
    classification: "unsafe_unknown" as const,
    owner: gap.owner,
    bodySystem: gap.bodySystem,
    reason: gap.reason,
    nextAction: gap.nextAction,
  }));
  return unique([...deferred, ...deprecated, ...unsafe].map((gap) => JSON.stringify(gap))).map((gap) => JSON.parse(gap) as FinalProductIntegrityGap);
}

function bodySystemsWithScoreVisibility(report: ProductBodyMapReport): BodySystemId[] {
  return BODY_SYSTEM_IDS.filter((system) => (report.scoreDimensionImpact[system] ?? []).length > 0);
}

function bodySystemsWithDebugVisibility(report: ProductBodyMapReport): BodySystemId[] {
  return BODY_SYSTEM_IDS.filter((system) => report.limbs.some((limb) =>
    (limb.primaryBodySystem === system || limb.secondaryBodySystems.includes(system))
    && Boolean(limb.debugVisibility.lane)));
}

function debugSummaryStatus(input: {
  interpretiveReport: InterpretiveBrainDebugTriageReport;
  centralReport: CentralNormalizerSpineReport;
  productBodyMapReport: ProductBodyMapReport;
  wiringReport: BodySystemWiringRepairReport;
}): FinalProductIntegrityDebugSummaryStatus {
  const summary = buildDebugPanelTrackingSummary({
    interpretiveBrainDebugTriage: { debugLane: input.interpretiveReport.debugLane },
    centralNormalizerSpine: { debugLane: input.centralReport.debugLane },
    productBodyMap: { debugLane: input.productBodyMapReport.debugLane },
    bodySystemWiringRepair: { debugLane: input.wiringReport.debugLane },
  });
  if (summary.rawDetailsDefaultOpen) return "raw_debug_default_open";
  if (!summary.lanes.some((lane) => lane.id === "product_brain")) return "missing_product_brain_summary";
  if (!input.interpretiveReport.findings.some((finding) => finding.rootCause && finding.nextAction?.action)) {
    return "missing_root_cause_findings";
  }
  return "product_brain_root_cause_ready";
}

export function classifyFinalProductIntegrityLockDirtyFile(path: string): FinalProductIntegrityDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/state/final-product-integrity-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/final-product-integrity-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-final-product-integrity-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/final-product-integrity-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/product-integrity/final-product-integrity-lock.ts") return "real_source_change_needs_review";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/(product-body-map|central-normalizer-spine|interpretive-brain-debug-triage|body-system-wiring-repair|feature-registration-gate|event-translation-bridge|person-metrics-hydration|user-journey-behavioral-intelligence|sql-database-parity-cost-lock|debug-backlog-engine|surface-parity-doctrine|surface-telemetry-parity|public-beta-score|current-beta-exit-status|overnight-beta-readiness-lock|evidence-capture-status)\.generated\.json$/u.test(normalized)) {
    return "current_generated_artifact_to_commit";
  }
  if (/^docs\/agent-truth\/(product-body-map|central-normalizer-spine|interpretive-brain-debug-triage|body-system-wiring-repair|event-translation-bridge|person-metrics-hydration|user-journey-behavioral-intelligence|sql-database-parity-cost-lock|debug-backlog-engine|surface-parity-doctrine|surface-telemetry-parity|current-beta-exit-status|overnight-beta-readiness-lock|evidence-capture-status)\.md$/u.test(normalized)) {
    return "documentation_artifact_expected";
  }
  if (/^src\/lib\/product-integrity\/(product-body-map|central-normalizer|central-normalizer-contract|interpretive-brain|interpretive-brain-contract|body-system-wiring-repair|product-body-system-contract)\.ts$/u.test(normalized)) {
    return "real_source_change_needs_review";
  }
  if (/^src\/lib\/analytics\/(event-translation-bridge|person-metrics-hydration)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(product-body-map|central-normalizer-spine|interpretive-brain-debug-triage|body-system-wiring-repair)\.ts$/u.test(normalized)) {
    return "validator_artifact_expected";
  }
  if (/^tests\/unit\/(product-body-map|central-normalizer-spine|interpretive-brain-debug-triage|body-system-wiring-repair)\.spec\.ts$/u.test(normalized)) {
    return "test_artifact_expected";
  }
  if (normalized === "package.json") return "validator_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) {
    return "release_artifact_expected";
  }
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/paypal|wallet\/runtime|payment|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|navbar/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function validateFinalProductIntegrityLockReport(report: FinalProductIntegrityLockReport): string[] {
  const failures: string[] = [];
  for (const system of BODY_SYSTEM_IDS) {
    if (!report.bodySystems.includes(system)) failures.push(`${system} body system missing.`);
    if (!report.bodySystemsWithScoreVisibility.includes(system)) failures.push(`${system} lacks score visibility.`);
    if (!report.bodySystemsWithDebugVisibility.includes(system)) failures.push(`${system} lacks debug visibility.`);
  }
  if (report.centralNormalizerStatus !== "pass") failures.push("Central normalizer missing or failing.");
  if (report.interpretiveBrainStatus !== "pass") failures.push("Interpretive brain missing or failing.");
  if (report.wiringRepairStatus !== "pass") failures.push("Body system wiring repair missing or failing.");
  if (report.debugSummaryStatus !== "product_brain_root_cause_ready") failures.push("Debug summary does not use Product brain root-cause triage.");
  if (report.unsafeUnknownCount > 0) failures.push("Unsafe unknown limbs remain.");
  if (report.duplicatedLimbCount > 0 || report.duplicateTruthSourcesActive) failures.push("Duplicate truth source remains active without classification.");
  if (!Object.keys(report.scoreDimensions).length) failures.push("Score dimensions missing.");
  if (!report.nextExactSteps.length) failures.push("Next exact steps missing.");

  for (const gap of report.remainingGaps) {
    if (gap.classification === "unsafe_unknown") failures.push(`${gap.gapId} remains unsafe_unknown.`);
    if (!gap.owner || !gap.reason || !gap.nextAction) failures.push(`${gap.gapId} lacks owner, reason, or next action.`);
    if (
      (gap.gapId.startsWith("surface:")
        || gap.gapId.startsWith("route:")
        || gap.gapId.startsWith("api_route:")
        || ["wallet_commerce", "gumdrop_economy", "creator_monetization", "fan_pass_entitlements"].includes(gap.bodySystem))
      && gap.classification !== "deferred_with_owner"
      && gap.classification !== "resolved"
      && gap.classification !== "intentionally_deprecated"
    ) {
      failures.push(`${gap.gapId} user-visible or revenue-affecting gap is not safely classified.`);
    }
  }

  for (const blocker of report.launchBlockers) {
    if (!blocker.classification || !blocker.nextAction) failures.push(`${blocker.blockerId} launch blocker lacks classification or next action.`);
    if (blocker.formalGateCleared) failures.push(`${blocker.blockerId} falsely clears a formal gate.`);
  }

  for (const dirtyFile of report.dirtyFiles) {
    if (dirtyFile.classification === "unsafe_unknown") failures.push(`Dirty file ${dirtyFile.path} is unsafe_unknown.`);
  }
  for (const pr of report.openPullRequests) {
    if (pr.classification === "unsafe_unknown") failures.push(`Open PR #${pr.number} is unsafe_unknown.`);
  }

  return unique([...failures, ...report.validationFailures]);
}

export function buildFinalProductIntegrityLockReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  openPullRequests?: ReadonlyArray<{ number: number; title: string; url: string; mergeStateStatus?: string; isDraft?: boolean }>;
  packageScripts?: Record<string, string>;
  scoreBefore?: Record<string, number>;
  scoreAfter?: Record<string, number>;
  launchBlockers?: readonly string[];
} = {}): FinalProductIntegrityLockReport {
  const dirtyFiles = (input.dirtyFiles ?? []).map((path) => ({
    path,
    classification: classifyFinalProductIntegrityLockDirtyFile(path),
  }));
  const openPullRequests = (input.openPullRequests ?? []).map((pr) => classifyBodySystemWiringOpenPullRequest(pr));
  const productBodyMapReport = buildProductBodyMapReport({
    packageScripts: input.packageScripts,
    dirtyFiles: [],
    openPullRequests: [],
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
  });
  const sample = normalizeProductSignal(finalLockSampleSignal());
  const centralReport = buildCentralNormalizerSpineReport({
    sample,
    dirtyFiles: [],
    openPullRequests: input.openPullRequests,
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
  });
  const interpretiveFindings = interpretNormalizedSignal({
    ...sample,
    scoreDimensions: scoreDimensionInput(input.scoreAfter),
    formalEvidence: [
      {
        gateId: "runtime-provider-smoke",
        status: "formal_artifact_missing",
        owner: "operator",
        nextAction: "Produce provider-backed site activity and deployed route evidence before clearing the beta gate.",
      },
      {
        gateId: "admin-truth-sample",
        status: "formal_artifact_missing",
        owner: "admin-debug",
        nextAction: "Produce a redacted admin source activity sample before clearing the admin evidence gate.",
      },
    ],
    runtimeSample: [{
      sampleId: "deployed-runtime-smoke",
      status: "runtime_unverified",
      nextAction: "Produce deployed route evidence outside source-only validation.",
    }],
    adminTruthSample: [{
      sampleId: "admin-truth-production-sample",
      status: "formal_artifact_missing",
      nextAction: "Produce redacted admin source activity sample evidence before clearing this gate.",
    }],
  });
  const interpretiveReport = buildInterpretiveBrainDebugTriageReport({
    findings: interpretiveFindings,
    dirtyFiles: [],
    openPullRequests: input.openPullRequests,
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"],
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
  });
  const wiringReport = buildBodySystemWiringRepairReport({
    productBodyMapReport,
    packageScripts: input.packageScripts,
    dirtyFiles: [],
    openPullRequests: [...(input.openPullRequests ?? [])],
    scoreBefore: input.scoreBefore,
    scoreAfter: input.scoreAfter,
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
  });
  const gaps = finalGaps(productBodyMapReport, wiringReport);
  const finalLaunchBlockers = (input.launchBlockers ?? []).map(classifyLaunchBlocker);
  const disconnected = productBodyMapReport.disconnectedByStatus;
  const validationFailures = [
    ...(input.packageScripts?.[FINAL_PRODUCT_INTEGRITY_VALIDATOR] === FINAL_PRODUCT_INTEGRITY_SCRIPT
      ? []
      : [`${FINAL_PRODUCT_INTEGRITY_VALIDATOR} package script is missing.`]),
    ...centralReport.validationFailures,
    ...interpretiveReport.validationFailures,
    ...wiringReport.validationFailures,
  ];

  const report: FinalProductIntegrityLockReport = {
    reportKey: "final-product-integrity-lock",
    contractVersion: FINAL_PRODUCT_INTEGRITY_LOCK_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    bodySystems: BODY_SYSTEM_IDS.slice(),
    mappedLimbCount: productBodyMapReport.totalLimbs,
    connectedLimbCount: disconnected.connected,
    orphanedLimbCount: disconnected.orphaned,
    duplicatedLimbCount: disconnected.duplicated,
    staleLimbCount: disconnected.stale,
    unsafeUnknownCount: disconnected.unsafe_unknown,
    centralNormalizerStatus: centralReport.status,
    interpretiveBrainStatus: interpretiveReport.status,
    wiringRepairStatus: wiringReport.status,
    debugSummaryStatus: debugSummaryStatus({
      interpretiveReport,
      centralReport,
      productBodyMapReport,
      wiringReport,
    }),
    scoreBefore: input.scoreBefore,
    scoreAfter: input.scoreAfter,
    scoreDimensions: scoreDimensions(input.scoreBefore, input.scoreAfter),
    launchBlockers: finalLaunchBlockers,
    remainingGaps: gaps,
    nextExactSteps: [
      ...gaps.map((gap) => `${gap.gapId}: ${gap.nextAction}`),
      ...finalLaunchBlockers.map((blocker) => `${blocker.blockerId}: ${blocker.nextAction}`),
      "Keep new product limbs wired through route, feature, surface, telemetry, normalizer, metrics, journey, debug, and score before release.",
    ],
    bodySystemsWithScoreVisibility: bodySystemsWithScoreVisibility(productBodyMapReport),
    bodySystemsWithDebugVisibility: bodySystemsWithDebugVisibility(productBodyMapReport),
    duplicateTruthSourcesActive: false,
    dirtyFiles,
    openPullRequests,
    validationFailures,
  };
  const failures = validateFinalProductIntegrityLockReport(report);
  return {
    ...report,
    status: failures.length > 0 ? "fail" : "pass",
    validationFailures: failures,
  };
}
