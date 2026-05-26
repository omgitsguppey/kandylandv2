import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type {
  BodySystemId,
  ProductBodyMapReport,
  ProductLimb,
} from "@/lib/product-integrity/product-body-system-contract";
import {
  buildProductBodyMapReport,
  classifyProductBodyMapOpenPullRequest,
} from "@/lib/product-integrity/product-body-map";

export const BODY_SYSTEM_WIRING_REPAIR_VERSION = "2026.05.body-system-wiring-repair.1";

export type BodySystemWiringGapClassification =
  | "fixed"
  | "deferred_with_owner"
  | "in_flight"
  | "unsafe_unknown";

export type BodySystemWiringDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_body_map_logic_to_remove"
  | "duplicate_feature_registry_logic_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

export interface BodySystemWiringRepairGap {
  limbId: string;
  bodySystem: BodySystemId;
  limbKind: ProductLimb["kind"];
  classification: BodySystemWiringGapClassification;
  owner: string;
  reason: string;
  repairAction: string;
  evidencePolicy: "source_wiring_repaired" | "do_not_claim_runtime_proof" | "monitor_only";
  validators: string[];
  testCoverage: string[];
  scoreDimensions: PublicBetaHealthDimension[];
  debugLane: string;
  nextAction: string;
}

export interface BodySystemWiringDirtyFile {
  path: string;
  classification: BodySystemWiringDirtyClassification;
}

export interface BodySystemWiringOpenPullRequest {
  number: number;
  title: string;
  url: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
  classification: string;
}

export interface BodySystemWiringRepairDebugLane {
  label: "Body system wiring repair";
  gapsBefore: number;
  gapsFixed: number;
  gapsDeferred: number;
  unsafeUnknown: number;
  duplicateTruthSourcesActive: false;
  defaultView: "repair_summary";
  rawCatalogDefaultOpen: false;
  sourceOfTruth: "src/lib/product-integrity/body-system-wiring-repair.ts";
}

export interface BodySystemWiringRepairReport {
  reportKey: "body-system-wiring-repair";
  contractVersion: string;
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  gapsBefore: number;
  gapsFixed: BodySystemWiringRepairGap[];
  gapsDeferred: BodySystemWiringRepairGap[];
  unsafeUnknown: BodySystemWiringRepairGap[];
  bodySystemsAffected: BodySystemId[];
  scoreBefore?: Record<string, number>;
  scoreAfter?: Record<string, number>;
  scoreDimensions: PublicBetaHealthDimension[];
  debugLane: BodySystemWiringRepairDebugLane;
  dirtyFiles: BodySystemWiringDirtyFile[];
  openPullRequests: BodySystemWiringOpenPullRequest[];
  duplicateTruthSourcesActive: false;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
}

const WIRING_REPAIR_VALIDATOR = "check:body-system-wiring-repair";
const WIRING_REPAIR_SCRIPT = "tsx scripts/agent/validate-body-system-wiring-repair.ts";
const WIRING_REPAIR_TEST = "tests/unit/body-system-wiring-repair.spec.ts";
const WATCH_TIME_VALIDATOR = "check:drop-watch-time-accuracy";

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function isRuntimeWatchTimeGap(limb: ProductLimb) {
  return limb.limbId === "metric:global:runtime_watch_time";
}

function isUserVisibleOrRevenueAffecting(limb: ProductLimb) {
  return limb.kind === "surface"
    || limb.kind === "route"
    || limb.kind === "api_route"
    || limb.primaryBodySystem === "wallet_commerce"
    || limb.primaryBodySystem === "gumdrop_economy"
    || limb.primaryBodySystem === "creator_monetization"
    || limb.primaryBodySystem === "fan_pass_entitlements"
    || limb.secondaryBodySystems.some((system) =>
      system === "wallet_commerce"
      || system === "gumdrop_economy"
      || system === "creator_monetization"
      || system === "fan_pass_entitlements");
}

function fixedRuntimeWatchGap(limb: ProductLimb): BodySystemWiringRepairGap {
  return {
    limbId: limb.limbId,
    bodySystem: limb.primaryBodySystem,
    limbKind: limb.kind,
    classification: "fixed",
    owner: limb.owner || "viewer-runtime",
    reason: "Converted an unexplained product-body orphan into explicit source-ready evidence-gap wiring.",
    repairAction: "Route the gap through Product body map, Drop watch time, Product brain, and beta score evidence as degraded instead of healthy.",
    evidencePolicy: "source_wiring_repaired",
    validators: [WIRING_REPAIR_VALIDATOR, "check:product-body-map", WATCH_TIME_VALIDATOR],
    testCoverage: [WIRING_REPAIR_TEST],
    scoreDimensions: unique(limb.scoreImpact.length ? limb.scoreImpact : ["evidenceCompleteness", "freshness"]),
    debugLane: "Body system wiring repair",
    nextAction: "Keep the repair visible while runtime watch proof remains deferred to persisted watch-session evidence.",
  };
}

function deferredRuntimeWatchGap(limb: ProductLimb): BodySystemWiringRepairGap {
  return {
    limbId: limb.limbId,
    bodySystem: limb.primaryBodySystem,
    limbKind: limb.kind,
    classification: "deferred_with_owner",
    owner: "viewer-runtime",
    reason: "Runtime watch-time cannot be marked live until persisted watch-session evidence proves the metric in admin/debug output.",
    repairAction: "Preserve source-ready wiring and block page-duration or source-only runtime trackers from becoming product truth.",
    evidencePolicy: "do_not_claim_runtime_proof",
    validators: [WIRING_REPAIR_VALIDATOR, WATCH_TIME_VALIDATOR, "check:watch-time-rollup-truth"],
    testCoverage: [WIRING_REPAIR_TEST, "tests/unit/drop-watch-time-accuracy.spec.ts"],
    scoreDimensions: unique(limb.scoreImpact.length ? limb.scoreImpact : ["evidenceCompleteness", "freshness"]),
    debugLane: "Drop watch time",
    nextAction: limb.nextAction,
  };
}

function unsafeGap(limb: ProductLimb): BodySystemWiringRepairGap {
  return {
    limbId: limb.limbId,
    bodySystem: limb.primaryBodySystem,
    limbKind: limb.kind,
    classification: "unsafe_unknown",
    owner: limb.owner || "product-integrity",
    reason: `Disconnected ${limb.kind} lacks a safe repair classification.`,
    repairAction: "Classify as fixed, deferred, or in-flight before treating the body map as repaired.",
    evidencePolicy: "monitor_only",
    validators: [WIRING_REPAIR_VALIDATOR],
    testCoverage: [],
    scoreDimensions: unique(limb.scoreImpact),
    debugLane: limb.debugVisibility.lane,
    nextAction: limb.nextAction,
  };
}

function buildRepairQueue(limbs: readonly ProductLimb[]) {
  const activeGaps = limbs.filter((limb) => limb.status !== "connected" && limb.status !== "deprecated");
  const gapsFixed: BodySystemWiringRepairGap[] = [];
  const gapsDeferred: BodySystemWiringRepairGap[] = [];
  const unsafeUnknown: BodySystemWiringRepairGap[] = [];

  for (const limb of activeGaps) {
    if (isRuntimeWatchTimeGap(limb)) {
      gapsFixed.push(fixedRuntimeWatchGap(limb));
      gapsDeferred.push(deferredRuntimeWatchGap(limb));
      continue;
    }

    if (isUserVisibleOrRevenueAffecting(limb) && limb.owner && limb.nextAction) {
      gapsDeferred.push({
        limbId: limb.limbId,
        bodySystem: limb.primaryBodySystem,
        limbKind: limb.kind,
        classification: "deferred_with_owner",
        owner: limb.owner,
        reason: `Disconnected ${limb.kind} remains deferred with owner and next action rather than being hidden.`,
        repairAction: "Keep the gap visible in Product body map and Product brain until the owning lane lands.",
        evidencePolicy: "monitor_only",
        validators: [WIRING_REPAIR_VALIDATOR, ...limb.validators],
        testCoverage: [WIRING_REPAIR_TEST],
        scoreDimensions: unique(limb.scoreImpact),
        debugLane: limb.debugVisibility.lane,
        nextAction: limb.nextAction,
      });
      continue;
    }

    unsafeUnknown.push(unsafeGap(limb));
  }

  return { activeGaps, gapsFixed, gapsDeferred, unsafeUnknown };
}

export function buildBodySystemWiringRepairDebugLane(report: Pick<BodySystemWiringRepairReport, "gapsBefore" | "gapsFixed" | "gapsDeferred" | "unsafeUnknown">): BodySystemWiringRepairDebugLane {
  return {
    label: "Body system wiring repair",
    gapsBefore: report.gapsBefore,
    gapsFixed: report.gapsFixed.length,
    gapsDeferred: report.gapsDeferred.length,
    unsafeUnknown: report.unsafeUnknown.length,
    duplicateTruthSourcesActive: false,
    defaultView: "repair_summary",
    rawCatalogDefaultOpen: false,
    sourceOfTruth: "src/lib/product-integrity/body-system-wiring-repair.ts",
  };
}

export function classifyBodySystemWiringDirtyFile(path: string): BodySystemWiringDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/state/body-system-wiring-repair.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/final-product-integrity-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/product-body-map.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/interpretive-brain-debug-triage.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/body-system-wiring-repair.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/final-product-integrity-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/product-body-map.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/interpretive-brain-debug-triage.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/product-integrity/body-system-wiring-repair.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/final-product-integrity-lock.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/product-body-map.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/product-body-system-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/central-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/interpretive-brain.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-body-system-wiring-repair.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-product-integrity-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/body-system-wiring-repair.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-product-integrity-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md") return "release_artifact_expected";
  if (normalized === "public/kandydrops-release-notes.json") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/public-release-notes.ts") return "release_artifact_expected";
  if (normalized === "src/lib/release-notes/release-version-contract.ts") return "release_artifact_expected";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/paypal|wallet|payment|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|navbar/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function classifyBodySystemWiringOpenPullRequest(input: Omit<BodySystemWiringOpenPullRequest, "classification">): BodySystemWiringOpenPullRequest {
  return {
    ...input,
    classification: classifyProductBodyMapOpenPullRequest(input),
  };
}

export function validateBodySystemWiringRepairReport(report: BodySystemWiringRepairReport): string[] {
  const failures: string[] = [];
  if (report.scoreDimensions.length === 0) failures.push("Score dimensions missing.");
  if (report.duplicateTruthSourcesActive) failures.push("Duplicate truth sources remain active.");
  if (report.debugLane.label !== "Body system wiring repair") failures.push("Body system wiring repair debug lane missing.");
  if (report.debugLane.rawCatalogDefaultOpen !== false) failures.push("Body system wiring raw catalog is default-open.");
  if (report.unsafeUnknown.length > 0) {
    failures.push(`Unsafe unknown wiring gaps remain: ${report.unsafeUnknown.map((gap) => gap.limbId).join(", ")}`);
  }

  for (const gap of report.gapsFixed) {
    if (gap.validators.length === 0) failures.push(`${gap.limbId} fixed gap lacks validator.`);
    if (gap.testCoverage.length === 0) failures.push(`${gap.limbId} fixed gap lacks test coverage.`);
    if (gap.scoreDimensions.length === 0) failures.push(`${gap.limbId} fixed gap lacks score dimension.`);
  }

  for (const gap of report.gapsDeferred) {
    if (!gap.owner || !gap.reason || !gap.nextAction) {
      failures.push(`${gap.limbId} deferred gap lacks owner, reason, or next action.`);
    }
    if (gap.limbId === "metric:global:runtime_watch_time" && gap.evidencePolicy !== "do_not_claim_runtime_proof") {
      failures.push("runtime_watch_time must not claim runtime proof from source-only wiring.");
    }
  }

  for (const dirtyFile of report.dirtyFiles) {
    if (dirtyFile.classification === "unsafe_unknown") failures.push(`Dirty file ${dirtyFile.path} is unsafe_unknown.`);
  }

  for (const pr of report.openPullRequests) {
    if (pr.classification === "unsafe_unknown") failures.push(`Open PR #${pr.number} is unsafe_unknown.`);
  }

  if (!report.nextExactSteps.length) failures.push("Next exact steps missing.");
  return unique([...failures, ...report.validationFailures]);
}

export function buildBodySystemWiringRepairReport(input: {
  productBodyMapReport?: ProductBodyMapReport;
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: Array<string | BodySystemWiringDirtyFile>;
  openPullRequests?: Array<Omit<BodySystemWiringOpenPullRequest, "classification"> | BodySystemWiringOpenPullRequest>;
  packageScripts?: Record<string, string>;
  scoreBefore?: Record<string, number>;
  scoreAfter?: Record<string, number>;
} = {}): BodySystemWiringRepairReport {
  const productBodyMapReport = input.productBodyMapReport ?? buildProductBodyMapReport({
    packageScripts: input.packageScripts,
  });
  const { activeGaps, gapsFixed, gapsDeferred, unsafeUnknown } = buildRepairQueue(productBodyMapReport.limbs);
  const bodySystemsAffected = unique([...gapsFixed, ...gapsDeferred, ...unsafeUnknown].map((gap) => gap.bodySystem));
  const scoreDimensions = unique([...gapsFixed, ...gapsDeferred, ...unsafeUnknown].flatMap((gap) => gap.scoreDimensions));
  const dirtyFiles = (input.dirtyFiles ?? []).map((entry) => typeof entry === "string"
    ? { path: entry, classification: classifyBodySystemWiringDirtyFile(entry) }
    : entry);
  const openPullRequests = (input.openPullRequests ?? []).map((entry) => "classification" in entry
    ? entry
    : classifyBodySystemWiringOpenPullRequest(entry));
  const validationFailures = input.packageScripts?.[WIRING_REPAIR_VALIDATOR] === WIRING_REPAIR_SCRIPT
    ? []
    : [`${WIRING_REPAIR_VALIDATOR} package script is missing.`];

  const reportBase = {
    gapsBefore: activeGaps.length,
    gapsFixed,
    gapsDeferred,
    unsafeUnknown,
  };
  const debugLane = buildBodySystemWiringRepairDebugLane(reportBase);
  const remainingGaps = gapsDeferred.map((gap) => `${gap.limbId}: ${gap.nextAction}`);
  const nextExactSteps = remainingGaps.length > 0
    ? remainingGaps
    : ["Keep new product limbs wired through route, feature, surface, telemetry, normalizer, metrics, journey, debug, and score before release."];

  const report: BodySystemWiringRepairReport = {
    reportKey: "body-system-wiring-repair",
    contractVersion: BODY_SYSTEM_WIRING_REPAIR_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    gapsBefore: activeGaps.length,
    gapsFixed,
    gapsDeferred,
    unsafeUnknown,
    bodySystemsAffected,
    scoreBefore: input.scoreBefore,
    scoreAfter: input.scoreAfter,
    scoreDimensions,
    debugLane,
    dirtyFiles,
    openPullRequests,
    duplicateTruthSourcesActive: false,
    remainingGaps,
    nextExactSteps,
    validationFailures,
  };
  const failures = validateBodySystemWiringRepairReport(report);
  return {
    ...report,
    status: failures.length > 0 ? "fail" : "pass",
    validationFailures: failures,
  };
}
