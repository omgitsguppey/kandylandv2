import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type {
  TelemetryParityProofClass,
  TelemetryParityProofClassState,
  TelemetryParityProofStatus,
} from "@/lib/analytics/telemetry-parity-pass-gate";
import {
  MAJOR_SURFACE_PARITY_IDS,
  type SurfaceParityId,
  validateSurfaceParityRegistry,
} from "@/lib/parity/surface-parity-contract";
import { SURFACE_PARITY_REGISTRY, SUPERSEDED_PARITY_VALIDATORS } from "@/lib/parity/surface-parity-registry";
import { SURFACE_TELEMETRY_EVENT_SPINE, validateSurfaceTelemetryRegistry } from "@/lib/analytics/telemetry/surface-telemetry-contract";
import { SURFACE_TELEMETRY_REGISTRY } from "@/lib/analytics/telemetry/surface-telemetry-registry";
import { validateSurfaceStateRegistry } from "@/lib/parity/surface-state-contract";
import { SURFACE_STATE_REGISTRY } from "@/lib/parity/surface-state-resolver";
import { ROLE_PERMISSION_IDS, ROLE_PERMISSION_ROLES, validateRolePermissionRegistry } from "@/lib/parity/role-permission-contract";
import { ROLE_PERMISSION_REGISTRY } from "@/lib/parity/role-permission-resolver";
import { listWorkingTreeFiles, readRepoToolchainState } from "./shared";

export type FinalParityTelemetryLockDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "unrelated_agent_context_file_to_ignore"
  | "repo_context_artifact_outside_final_parity"
  | "agent_tooling_outside_final_parity"
  | "admin_debug_source_outside_final_parity"
  | "analytics_recovery_source_outside_final_parity"
  | "protected_economy_manual_review_outside_final_parity"
  | "shared_runtime_generated_artifact_outside_final_parity"
  | "test_artifact_outside_final_parity"
  | "source_change_outside_final_parity"
  | "stale_generated_artifact_to_regenerate"
  | "unsafe_unknown";

export interface FinalParitySurfaceLock {
  surfaceId: SurfaceParityId;
  telemetryEvents: string[];
  states: string[];
  roles: string[];
  permissions: string[];
  debugLanes: string[];
  scoreDimensions: PublicBetaHealthDimension[];
}

export interface FinalParityTelemetryLockReport {
  reportKey: "final-parity-telemetry-lock";
  generatedAtUtc: string;
  currentHead: string;
  currentHeadSource: "git" | "repo_inventory" | "generated_artifact" | "unknown";
  gitStatus: "available" | "missing" | "error";
  toolingDegraded: boolean;
  degradationReason: string | null;
  overallStatus: "pass" | "review" | "blocked";
  sourceParityStatus: "pass" | "fail";
  finalEvidenceStatus: "pass" | "review" | "blocked";
  surfaceParityStatus: "pass" | "fail";
  telemetryParityStatus: "pass" | "fail";
  stateParityStatus: "pass" | "fail";
  rolePermissionStatus: "pass" | "fail";
  debugLaneStatus: "simplified" | "conflicting";
  staleLogicRemoved: boolean;
  surfacesCovered: SurfaceParityId[];
  surfacesMissing: SurfaceParityId[];
  surfaceLocks: FinalParitySurfaceLock[];
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: PublicBetaHealthDimension[];
  proofClasses: TelemetryParityProofClassState[];
  missingProofClasses: TelemetryParityProofClass[];
  canClearSourceGate: boolean;
  canClearRuntimeGate: boolean;
  canClearProviderGate: boolean;
  canClearAdminTruthGate: boolean;
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: FinalParityTelemetryLockDirtyClassification }>;
  validationFailures: string[];
}

const STATE_PATH = "agent/state/final-parity-telemetry-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-parity-telemetry-lock.md";

const BASE_REQUIRED_STATES = ["loading", "empty", "error"] as const;
const CANONICAL_DEBUG_LANES = [
  "Surface parity doctrine",
  "Surface telemetry parity",
  "Surface state parity",
  "Role parity",
] as const;
const FINAL_SCORE_DIMENSIONS: PublicBetaHealthDimension[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
];

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function statusIncludes(report: Record<string, unknown> | null, patterns: readonly RegExp[]) {
  if (!report) return false;
  const haystack = [
    readString(report.status),
    readString(report.overallStatus),
    readString(report.externalEvidenceStatus),
    JSON.stringify(report.readinessImpact ?? {}),
    JSON.stringify(report.evidenceBoundary ?? {}),
  ].join("\n");
  return patterns.some((pattern) => pattern.test(haystack));
}

function artifactHeadMatches(report: Record<string, unknown> | null, currentHead: string) {
  if (!report || !currentHead) return true;
  const sourceCommit = readString(report.sourceCommit);
  const reportHead = readString(report.currentHead);
  const artifactHead = sourceCommit || reportHead;
  return !artifactHead || artifactHead === currentHead;
}

function resolveFormalProofStatus(proofClass: TelemetryParityProofClass, currentHead: string): TelemetryParityProofStatus {
  if (proofClass === "source_parity") return "present";

  if (proofClass === "runtime_route_health") {
    const routeHealth = readJson("agent/state/route-health-reconciliation.generated.json");
    if (!artifactHeadMatches(routeHealth, currentHead)) return "stale";
    if (routeHealth && routeHealth.runtimeProofRequired === true) return "missing";
    if (statusIncludes(routeHealth, [/route_listener_delayed|runtime_evidence_required|runtime_unverified/iu])) return "missing";
    return statusIncludes(routeHealth, [/formal_route_health_passed|route_health_passed/iu]) ? "present" : "missing";
  }

  if (proofClass === "provider_smoke") {
    const providerSmoke = readJson("agent/state/provider-smoke-evidence.generated.json");
    if (!artifactHeadMatches(providerSmoke, currentHead)) return "stale";
    return statusIncludes(providerSmoke, [/formal_provider_smoke_passed|passed_formal_evidence/iu])
      ? "present"
      : "missing";
  }

  const adminTruth = readJson("agent/state/admin-truth-sample-evidence.generated.json");
  if (!artifactHeadMatches(adminTruth, currentHead)) return "stale";
  return statusIncludes(adminTruth, [/formal_admin_truth_sample_passed/iu])
    ? "present"
    : "missing";
}

function buildFinalProofClasses(sourceParityPass: boolean, currentHead: string): TelemetryParityProofClassState[] {
  const definitions: Array<{
    proofClass: TelemetryParityProofClass;
    evidenceKind: TelemetryParityProofClassState["evidenceKind"];
    nextAction: string;
  }> = [
    {
      proofClass: "source_parity",
      evidenceKind: "source_only",
      nextAction: sourceParityPass
        ? "Source parity is green; keep it separate from runtime/provider/admin proof."
        : "Fix source parity before promoting telemetry readiness.",
    },
    {
      proofClass: "runtime_route_health",
      evidenceKind: "runtime",
      nextAction: "Refresh formal runtime route-health evidence; source parity cannot clear runtime health.",
    },
    {
      proofClass: "provider_smoke",
      evidenceKind: "provider",
      nextAction: "Attach formal redacted provider smoke evidence; operator reports do not clear this gate.",
    },
    {
      proofClass: "admin_truth_sample",
      evidenceKind: "admin",
      nextAction: "Attach or refresh a current-head redacted Admin Truth sample with source freshness and sample counts.",
    },
  ];

  return definitions.map((definition) => ({
    proofClass: definition.proofClass,
    status: definition.proofClass === "source_parity" && !sourceParityPass
      ? "missing"
      : resolveFormalProofStatus(definition.proofClass, currentHead),
    required: true,
    evidenceKind: definition.evidenceKind,
    nextAction: definition.nextAction,
  }));
}

function readScoreFromPublicBetaScore() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const healthScore = score && typeof score.healthScore === "number" ? score.healthScore : null;
  const legacyScore = score && typeof score.score === "number" ? score.score : null;
  return healthScore ?? legacyScore ?? 0;
}

function findSurfaceLock(surfaceId: SurfaceParityId): FinalParitySurfaceLock | null {
  const parity = SURFACE_PARITY_REGISTRY.find((surface) => surface.surfaceId === surfaceId);
  const telemetry = SURFACE_TELEMETRY_REGISTRY.find((surface) => surface.surfaceId === surfaceId);
  const state = SURFACE_STATE_REGISTRY.find((surface) => surface.surfaceId === surfaceId);
  const role = ROLE_PERMISSION_REGISTRY.find((surface) => surface.surfaceId === surfaceId);
  if (!parity || !telemetry || !state || !role) return null;

  return {
    surfaceId,
    telemetryEvents: SURFACE_TELEMETRY_EVENT_SPINE.filter((event) => Boolean(telemetry.events[event])),
    states: Object.keys(state.states),
    roles: ROLE_PERMISSION_ROLES.filter((roleId) => Boolean(role.roles[roleId])),
    permissions: ROLE_PERMISSION_IDS.filter((permission) => Boolean(role.permissions[permission])),
    debugLanes: unique([
      "Surface parity doctrine",
      telemetry.debugLane,
      state.debugLane,
      role.debugLane,
    ]),
    scoreDimensions: unique([
      ...parity.scoreDimensionImpact.dimensions,
      ...telemetry.scoreDimensionImpact.dimensions,
      ...state.scoreDimensionImpact.dimensions,
      ...role.scoreDimensionImpact.dimensions,
    ]),
  };
}

export function classifyFinalParityTelemetryLockDirtyFile(pathValue: string): FinalParityTelemetryLockDirtyClassification {
  const normalized = pathValue.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/(context|index|prompts|schemas)\//u.test(normalized)) return "repo_context_artifact_outside_final_parity";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/final-parity-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/current-beta-exit-status.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/current-beta-exit-status.md") return "documentation_artifact_expected";
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^docs\/agent-truth\/.+\.md$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (
    /^agent\/state\/(surface-parity-doctrine|surface-telemetry-parity|surface-state-parity|role-permission-parity)\.generated\.json$/u.test(normalized)
    || /^docs\/agent-truth\/(surface-parity-doctrine|surface-telemetry-parity|surface-state-parity|role-permission-parity)\.md$/u.test(normalized)
  ) return "stale_generated_artifact_to_regenerate";
  if (
    /^agent\/state\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|feature-registration-gate|activity-verification-engine|event-translation-bridge|person-metrics-hydration|creator-monetization-readiness-lock|media-discovery-score-lock)\.generated\.json$/u.test(normalized)
    || /^docs\/agent-truth\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|feature-registration-gate|event-translation-bridge|person-metrics-hydration|creator-monetization-readiness-lock|media-discovery-score-lock)\.md$/u.test(normalized)
  ) return "stale_generated_artifact_to_regenerate";
  if (
    normalized === "scripts/agent/validate-targeted-behavior-evidence.ts"
    || normalized === "scripts/agent/validate-targeted-behavior-evidence-repair.ts"
    || normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts"
    || normalized === "scripts/agent/validate-media-discovery-score-lock.ts"
    || /^scripts\/agent\/validate-(analytics-panel-hydration|creator-dashboard-error-cost-inventory|post-economy-creator-flow-qa|public-beta-score|score-80-reconciliation-lock|score-80-refresh-pass|score-80-cost-readiness|user-facing-feature-connection-audit)\.ts$/u.test(normalized)
  ) return "validator_artifact_expected";
  if (/^scripts\/agent\//u.test(normalized) || normalized === "scripts/repo-inventory.ts" || /^\.agent\//u.test(normalized) || normalized === "agent/README.md") {
    return "agent_tooling_outside_final_parity";
  }
  if (
    normalized === "tests/unit/targeted-behavior-evidence-repair.spec.ts"
    || /^tests\/unit\/(creator-dashboard-error-cost-inventory|creator-experiences-panel|post-economy-creator-flow-qa|public-beta-score|purchase-modal|score-80-refresh-pass)\.spec\.tsx?$/u.test(normalized)
  ) return "test_artifact_expected";
  if (/^tests\/unit\//u.test(normalized)) return "test_artifact_outside_final_parity";
  if (/^src\/lib\/agent-score\/.+\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/app\/admin\//u.test(normalized) || /^src\/app\/api\/admin\//u.test(normalized) || /^src\/lib\/admin/u.test(normalized)) {
    return "admin_debug_source_outside_final_parity";
  }
  if (/^src\/lib\/analytics\//u.test(normalized) || /^src\/app\/api\/user\/activity\//u.test(normalized)) {
    return "analytics_recovery_source_outside_final_parity";
  }
  if (
    normalized === "src/lib/platform-economy.ts"
    || normalized === "src/lib/server/platform-economy.ts"
    || normalized === "functions/src/analytics-transactions.ts"
  ) return "protected_economy_manual_review_outside_final_parity";
  if (/^shared\/runtime\/.+\.(js|js\.map)$/u.test(normalized)) return "shared_runtime_generated_artifact_outside_final_parity";
  if (/^src\//u.test(normalized) || /^functions\//u.test(normalized)) return "source_change_outside_final_parity";
  return "unsafe_unknown";
}

function classifyStatus(failures: readonly string[]) {
  return failures.length === 0 ? "pass" as const : "fail" as const;
}

function staleLogicRemoved() {
  const activeDuplicateValidator = SUPERSEDED_PARITY_VALIDATORS.some((validator) =>
    validator.authority !== "surface_parity_doctrine" && validator.status !== "still_required",
  );
  const unsafeRoleLogic = ROLE_PERMISSION_REGISTRY.some((surface) => surface.oldLogicStatus === "unsafe_unknown");
  return !activeDuplicateValidator && !unsafeRoleLogic;
}

export function buildFinalParityTelemetryLockReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  scoreBefore?: number;
  scoreAfter?: number;
  omitSurfaceForTest?: SurfaceParityId;
} = {}): FinalParityTelemetryLockReport {
  const toolchain = readRepoToolchainState();
  const currentHead = input.currentHead ?? toolchain.currentHead ?? "unknown";
  const surfaceParityFailures = validateSurfaceParityRegistry(SURFACE_PARITY_REGISTRY, SUPERSEDED_PARITY_VALIDATORS);
  const telemetryFailures = validateSurfaceTelemetryRegistry(SURFACE_TELEMETRY_REGISTRY);
  const stateFailures = validateSurfaceStateRegistry(SURFACE_STATE_REGISTRY);
  const roleFailures = validateRolePermissionRegistry(ROLE_PERMISSION_REGISTRY);
  const dirtyFiles = [...(input.dirtyFiles ?? [])].map((filePath) => ({
    path: filePath,
    classification: classifyFinalParityTelemetryLockDirtyFile(filePath),
  }));
  const surfaceLocks = MAJOR_SURFACE_PARITY_IDS
    .filter((surfaceId) => surfaceId !== input.omitSurfaceForTest)
    .map(findSurfaceLock)
    .filter((surface): surface is FinalParitySurfaceLock => Boolean(surface));
  const surfacesCovered = surfaceLocks.map((surface) => surface.surfaceId);
  const surfacesMissing = MAJOR_SURFACE_PARITY_IDS.filter((surfaceId) => !surfacesCovered.includes(surfaceId));
  const debugLaneStatus = surfaceLocks.every((surface) =>
    CANONICAL_DEBUG_LANES.every((lane) => surface.debugLanes.includes(lane)),
  ) ? "simplified" : "conflicting";
  const scoreAfter = input.scoreAfter ?? readScoreFromPublicBetaScore();
  const scoreBefore = input.scoreBefore ?? scoreAfter;
  const sourceParityStatus = [
    surfaceParityFailures,
    telemetryFailures,
    stateFailures,
    roleFailures,
  ].every((failures) => failures.length === 0) && debugLaneStatus === "simplified" && staleLogicRemoved()
    ? "pass" as const
    : "fail" as const;
  const proofClasses = buildFinalProofClasses(sourceParityStatus === "pass", currentHead);
  const missingProofClasses = proofClasses
    .filter((proof) => proof.required && proof.status !== "present")
    .map((proof) => proof.proofClass);
  const finalEvidenceStatus =
    sourceParityStatus === "fail"
      ? "blocked" as const
      : missingProofClasses.length === 0
        ? "pass" as const
        : "review" as const;

  const report: FinalParityTelemetryLockReport = {
    reportKey: "final-parity-telemetry-lock",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead,
    currentHeadSource: toolchain.currentHeadSource,
    gitStatus: toolchain.gitStatus,
    toolingDegraded: toolchain.toolingDegraded,
    degradationReason: toolchain.degradationReason,
    overallStatus: finalEvidenceStatus,
    sourceParityStatus,
    finalEvidenceStatus,
    surfaceParityStatus: classifyStatus(surfaceParityFailures),
    telemetryParityStatus: classifyStatus(telemetryFailures),
    stateParityStatus: classifyStatus(stateFailures),
    rolePermissionStatus: classifyStatus(roleFailures),
    debugLaneStatus,
    staleLogicRemoved: staleLogicRemoved(),
    surfacesCovered,
    surfacesMissing,
    surfaceLocks,
    scoreBefore,
    scoreAfter,
    scoreDimensions: unique([
      ...surfaceLocks.flatMap((surface) => surface.scoreDimensions),
      ...FINAL_SCORE_DIMENSIONS,
    ]),
    proofClasses,
    missingProofClasses,
    canClearSourceGate: sourceParityStatus === "pass",
    canClearRuntimeGate: proofClasses.find((proof) => proof.proofClass === "runtime_route_health")?.status === "present",
    canClearProviderGate: proofClasses.find((proof) => proof.proofClass === "provider_smoke")?.status === "present",
    canClearAdminTruthGate: proofClasses.find((proof) => proof.proofClass === "admin_truth_sample")?.status === "present",
    remainingGaps: [
      ...(missingProofClasses.length > 0
        ? [`Formal proof classes still incomplete: ${missingProofClasses.join(", ")}.`]
        : []),
      "Source parity is source-only evidence and does not prove runtime route health, provider smoke, or admin truth samples.",
      "Public beta score must remain capped/review until current-head external/runtime/admin evidence gates are attached.",
    ],
    nextExactSteps: [
      "Keep check:surface-parity-doctrine, check:surface-telemetry-parity, check:surface-state-parity, and check:role-permission-parity green before new surface work.",
      ...proofClasses
        .filter((proof) => proof.required && proof.status !== "present")
        .map((proof) => proof.nextAction),
      "Run npm run check:final-parity-telemetry-lock after any parity, telemetry, state, role, or debug-lane change.",
    ],
    dirtyFiles,
    validationFailures: [],
  };

  return {
    ...report,
    validationFailures: validateFinalParityTelemetryLockReport(report),
  };
}

export function validateFinalParityTelemetryLockReport(report: FinalParityTelemetryLockReport) {
  const failures: string[] = [];
  for (const surfaceId of MAJOR_SURFACE_PARITY_IDS) {
    const lock = report.surfaceLocks.find((surface) => surface.surfaceId === surfaceId);
    if (!lock) {
      failures.push(`${surfaceId} missing from final parity telemetry lock.`);
      continue;
    }
    if (lock.telemetryEvents.length !== SURFACE_TELEMETRY_EVENT_SPINE.length) {
      failures.push(`${surfaceId} missing telemetry spine.`);
    }
    for (const state of BASE_REQUIRED_STATES) {
      if (!lock.states.includes(state)) failures.push(`${surfaceId} missing ${state} state.`);
    }
    if (lock.roles.length !== ROLE_PERMISSION_ROLES.length) failures.push(`${surfaceId} missing role permission mapping.`);
    if (lock.permissions.length !== ROLE_PERMISSION_IDS.length) failures.push(`${surfaceId} missing permission mapping.`);
    if (!CANONICAL_DEBUG_LANES.every((lane) => lock.debugLanes.includes(lane))) {
      failures.push(`${surfaceId} has duplicated/conflicting debug lanes.`);
    }
    if (lock.scoreDimensions.length === 0) failures.push(`${surfaceId} missing score dimensions.`);
  }
  if (report.surfaceParityStatus !== "pass") failures.push("surface parity status is not pass.");
  if (report.telemetryParityStatus !== "pass") failures.push("telemetry parity status is not pass.");
  if (report.stateParityStatus !== "pass") failures.push("state parity status is not pass.");
  if (report.rolePermissionStatus !== "pass") failures.push("role permission status is not pass.");
  if (report.debugLaneStatus !== "simplified") failures.push("debug lanes duplicated/conflicting.");
  if (!report.staleLogicRemoved) failures.push("stale parity logic remains active.");
  if (report.sourceParityStatus === "pass" && !report.canClearSourceGate) failures.push("source gate cannot clear despite source parity pass.");
  if (report.finalEvidenceStatus === "pass" && report.missingProofClasses.length > 0) {
    failures.push("final evidence status cannot pass while proof classes are missing.");
  }
  const proofStatus = (proofClass: TelemetryParityProofClass) =>
    report.proofClasses.find((proof) => proof.proofClass === proofClass)?.status ?? "missing";
  if (report.canClearRuntimeGate !== (proofStatus("runtime_route_health") === "present")) {
    failures.push("runtime gate clear flag does not match runtime route-health proof status.");
  }
  if (report.canClearProviderGate !== (proofStatus("provider_smoke") === "present")) {
    failures.push("provider gate clear flag does not match provider smoke proof status.");
  }
  if (report.canClearAdminTruthGate !== (proofStatus("admin_truth_sample") === "present")) {
    failures.push("admin truth gate clear flag does not match admin truth sample proof status.");
  }
  if (report.overallStatus === "pass" && report.finalEvidenceStatus !== "pass") {
    failures.push("overall status cannot pass without final evidence pass.");
  }
  if (report.gitStatus !== "available") {
    failures.push(`git_required: final parity lock cannot clear current-head or dirty-tree proof while Git is unavailable (${report.degradationReason ?? "git unavailable"}).`);
  }
  if (report.telemetryParityStatus === "pass" && report.finalEvidenceStatus !== "pass" && report.remainingGaps.length === 0) {
    failures.push("source telemetry pass must declare remaining formal proof gaps.");
  }
  for (const proofClass of ["source_parity", "runtime_route_health", "provider_smoke", "admin_truth_sample"] satisfies TelemetryParityProofClass[]) {
    if (!report.proofClasses.some((proof) => proof.proofClass === proofClass)) {
      failures.push(`${proofClass} proof class missing from final parity telemetry lock.`);
    }
  }
  if (report.scoreDimensions.length === 0) failures.push("score dimensions missing.");
  failures.push(...report.dirtyFiles
    .filter((file) => file.classification === "unsafe_unknown")
    .map((file) => `${file.path} is unclassified for final parity telemetry lock.`));
  return unique(failures);
}

function writeDoc(report: FinalParityTelemetryLockReport) {
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  const rows = report.surfaceLocks.map((surface) =>
    `| ${surface.surfaceId} | ${surface.telemetryEvents.length} | ${surface.states.length} | ${surface.roles.length} | ${surface.permissions.length} | ${surface.debugLanes.join(", ")} |`,
  ).join("\n");
  fs.writeFileSync(DOC_PATH, `# Final Parity Telemetry Lock

Generated: ${report.generatedAtUtc}
Head: ${report.currentHead}
Head source: ${report.currentHeadSource}
Git status: ${report.gitStatus}
Tooling degraded: ${report.toolingDegraded}
Status: ${report.overallStatus}

## Summary

- Overall status: ${report.overallStatus}
- Source parity status: ${report.sourceParityStatus}
- Final evidence status: ${report.finalEvidenceStatus}
- Surface parity: ${report.surfaceParityStatus}
- Telemetry parity: ${report.telemetryParityStatus}
- State parity: ${report.stateParityStatus}
- Role permissions: ${report.rolePermissionStatus}
- Debug lanes: ${report.debugLaneStatus}
- Stale parity logic removed: ${report.staleLogicRemoved}
- Surfaces covered: ${report.surfacesCovered.length}
- Surfaces missing: ${report.surfacesMissing.length}
- Score: ${report.scoreBefore} -> ${report.scoreAfter}
- Score dimensions: ${report.scoreDimensions.join(", ")}
- Can clear source gate: ${report.canClearSourceGate}
- Can clear runtime gate: ${report.canClearRuntimeGate}
- Can clear provider gate: ${report.canClearProviderGate}
- Can clear admin truth gate: ${report.canClearAdminTruthGate}

## Proof Classes

| Proof class | Status | Evidence kind | Required | Next action |
| --- | --- | --- | --- | --- |
${report.proofClasses.map((proof) => `| ${proof.proofClass} | ${proof.status} | ${proof.evidenceKind} | ${proof.required} | ${proof.nextAction} |`).join("\n")}

## Surface Locks

| Surface | Telemetry spine events | States | Roles | Permissions | Debug lanes |
| --- | ---: | ---: | ---: | ---: | --- |
${rows}

## Remaining Gaps

${report.remainingGaps.map((gap) => `- ${gap}`).join("\n")}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}

## Validation

${report.validationFailures.length === 0 ? "- No validation failures." : report.validationFailures.map((failure) => `- ${failure}`).join("\n")}
`);
}

function main() {
  const dirtyFiles = listWorkingTreeFiles();
  const report = buildFinalParityTelemetryLockReport({ dirtyFiles });
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error(`final parity telemetry lock failed:\n${report.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`final parity telemetry lock ${report.finalEvidenceStatus}: source=${report.sourceParityStatus}, missingProof=${report.missingProofClasses.join(", ") || "none"}, score=${report.scoreBefore}->${report.scoreAfter}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
