import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import {
  MAJOR_SURFACE_PARITY_IDS,
  type SurfaceParityId,
  validateSurfaceParityRegistry,
} from "@/lib/parity/surface-parity-contract";
import { SURFACE_PARITY_REGISTRY, SUPERSEDED_PARITY_VALIDATORS } from "@/lib/parity/surface-parity-registry";
import { SURFACE_TELEMETRY_EVENT_SPINE, validateSurfaceTelemetryRegistry } from "@/lib/telemetry/surface-telemetry-contract";
import { SURFACE_TELEMETRY_REGISTRY } from "@/lib/telemetry/surface-telemetry-registry";
import { validateSurfaceStateRegistry } from "@/lib/parity/surface-state-contract";
import { SURFACE_STATE_REGISTRY } from "@/lib/parity/surface-state-resolver";
import { ROLE_PERMISSION_IDS, ROLE_PERMISSION_ROLES, validateRolePermissionRegistry } from "@/lib/parity/role-permission-contract";
import { ROLE_PERMISSION_REGISTRY } from "@/lib/parity/role-permission-resolver";

export type FinalParityTelemetryLockDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "unrelated_agent_context_file_to_ignore"
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

function git(args: string[]) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
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

  const report: FinalParityTelemetryLockReport = {
    reportKey: "final-parity-telemetry-lock",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"]),
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
    remainingGaps: [
      "Runtime/provider/admin truth evidence remains outside this source-only parity lock.",
      "Public beta score remains owner_review until external/runtime evidence gates are attached.",
    ],
    nextExactSteps: [
      "Keep check:surface-parity-doctrine, check:surface-telemetry-parity, check:surface-state-parity, and check:role-permission-parity green before new surface work.",
      "Attach runtime/provider/admin truth evidence before using parity source readiness as beta-exit proof.",
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
Status: ${report.validationFailures.length === 0 ? "pass" : "fail"}

## Summary

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
  const dirtyFiles = git(["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean)
    .concat(git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean));
  const report = buildFinalParityTelemetryLockReport({ dirtyFiles });
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error(`final parity telemetry lock failed:\n${report.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`final parity telemetry lock pass: surfaces=${report.surfacesCovered.length}, score=${report.scoreBefore}->${report.scoreAfter}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
