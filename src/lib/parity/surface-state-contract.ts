import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type {
  SurfaceParityId,
  SurfaceParityRole,
  SurfaceRoleVisibility,
} from "@/lib/parity/surface-parity-contract";

export const SURFACE_STATE_IDS = [
  "loading",
  "empty",
  "ready",
  "degraded",
  "error",
  "permission_denied",
  "not_configured",
  "locked",
  "unavailable",
  "stale",
] as const;

export type SurfaceStateId = typeof SURFACE_STATE_IDS[number];

export type SurfaceStateDebugSeverity =
  | "info"
  | "review"
  | "warning"
  | "error"
  | "blocking";

export type SurfaceStateCtaAction =
  | "none"
  | "retry"
  | "refresh"
  | "sign_in"
  | "open_settings"
  | "contact_support"
  | "submit_bug"
  | "go_back"
  | "configure"
  | "refill_gumdrops"
  | "open_dashboard";

export type SurfaceStateSourceTruth =
  | "canonical"
  | "hot_cache"
  | "client_state"
  | "permission_guard"
  | "configuration"
  | "fallback"
  | "unavailable";

export type RawSurfaceStateCopyClassification =
  | "approved_surface_state_copy"
  | "raw_developer_error_copy"
  | "generic_error_copy"
  | "generic_loading_copy"
  | "generic_empty_copy";

export interface SurfaceStateCopy {
  title: string;
  body: string;
}

export interface SurfaceStateCta {
  label: string;
  action: SurfaceStateCtaAction;
}

export interface SurfaceStateRetryPolicy {
  canRetry: boolean;
  retryEventName: string | null;
  degradeAfterMs: number | null;
  degradeToState: SurfaceStateId | null;
}

export interface SurfaceStateContract {
  state: SurfaceStateId;
  copy: SurfaceStateCopy;
  cta: SurfaceStateCta;
  telemetryEventName: string;
  retryPolicy: SurfaceStateRetryPolicy;
  debugLane: "Surface state parity";
  debugSeverity: SurfaceStateDebugSeverity;
  roleVisibility: Record<SurfaceParityRole, SurfaceRoleVisibility>;
  sourceTruth: SurfaceStateSourceTruth;
  requiresSafeFingerprint: boolean;
}

export interface SurfaceStateSurfaceRegistration {
  surfaceId: SurfaceParityId;
  surfaceOwner: string;
  featureId: string;
  states: Record<SurfaceStateId, SurfaceStateContract>;
  debugLane: "Surface state parity";
  scoreDimensionImpact: {
    before: string;
    after: string;
    dimensions: PublicBetaHealthDimension[];
  };
}

export interface SurfaceStateResolutionInput {
  surfaceId: SurfaceParityId;
  state: SurfaceStateId;
  role?: SurfaceParityRole;
  reason?: string | null;
  hasData?: boolean;
  sourceFreshness?: "fresh" | "stale" | "missing" | "failed" | "partial";
  configured?: boolean;
}

export interface SurfaceStateResolved extends SurfaceStateContract {
  surfaceId: SurfaceParityId;
  featureId: string;
  role: SurfaceParityRole;
  safeFingerprint: string;
}

export interface SurfaceStateTelemetry {
  eventName: string;
  surfaceId: SurfaceParityId;
  featureId: string;
  state: SurfaceStateId;
  safeFingerprint: string;
  debugSeverity: SurfaceStateDebugSeverity;
  sourceTruth: SurfaceStateSourceTruth;
}

export type SurfaceStateDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_state_logic_to_remove"
  | "duplicate_state_validator_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "unsafe_unknown";

export interface SurfaceStateDirtyFile {
  path: string;
  classification: SurfaceStateDirtyClassification;
}

export interface SurfaceStateParityReport {
  reportKey: "surface-state-parity";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  majorSurfacesRegistered: number;
  stateKinds: SurfaceStateId[];
  debugLane: {
    label: "Surface state parity";
    missingStateCoverage: Record<string, string[]>;
    rawErrorCopyFindings: string[];
    endlessLoadingRisks: string[];
    missingCtaFindings: string[];
  };
  scoreDimensionBeforeAfter: {
    before: string;
    after: string;
    dimensions: PublicBetaHealthDimension[];
  };
  dirtyFiles: SurfaceStateDirtyFile[];
  validationFailures: string[];
}

const REQUIRED_BASE_STATES: SurfaceStateId[] = [
  "loading",
  "empty",
  "error",
  "degraded",
  "permission_denied",
  "not_configured",
];

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

export function validateSurfaceStateRegistry(registry: readonly SurfaceStateSurfaceRegistration[]) {
  const failures: string[] = [];
  const ids = new Set<SurfaceParityId>();

  for (const surface of registry) {
    if (ids.has(surface.surfaceId)) failures.push(`${surface.surfaceId} is duplicated.`);
    ids.add(surface.surfaceId);
    if (!surface.scoreDimensionImpact.before || !surface.scoreDimensionImpact.after || surface.scoreDimensionImpact.dimensions.length === 0) {
      failures.push(`${surface.surfaceId} lacks score dimension before/after evidence.`);
    }
    for (const state of SURFACE_STATE_IDS) {
      const contract = surface.states[state];
      if (!contract) {
        failures.push(`${surface.surfaceId} missing ${state} state.`);
        continue;
      }
      if (!contract.copy.title || !contract.copy.body) failures.push(`${surface.surfaceId}.${state} missing copy.`);
      if (!contract.cta.label) failures.push(`${surface.surfaceId}.${state} missing CTA label.`);
      if (!contract.telemetryEventName) failures.push(`${surface.surfaceId}.${state} missing telemetry event.`);
      if (!contract.debugLane || !contract.debugSeverity) failures.push(`${surface.surfaceId}.${state} missing debug severity.`);
      if (!contract.sourceTruth) failures.push(`${surface.surfaceId}.${state} missing source truth.`);
      if (Object.keys(contract.roleVisibility).length !== 4) failures.push(`${surface.surfaceId}.${state} missing role visibility.`);
      if (state === "loading" && (!contract.retryPolicy.degradeAfterMs || contract.retryPolicy.degradeToState !== "degraded")) {
        failures.push(`${surface.surfaceId}.loading can spin forever without degraded timeout.`);
      }
      if ((state === "error" || state === "permission_denied" || state === "not_configured") && contract.cta.action === "none") {
        failures.push(`${surface.surfaceId}.${state} lacks next action.`);
      }
      if ((state === "error" || state === "unavailable") && !contract.requiresSafeFingerprint) {
        failures.push(`${surface.surfaceId}.${state} must require a safe fingerprint.`);
      }
    }
    for (const state of REQUIRED_BASE_STATES) {
      if (!surface.states[state]) failures.push(`${surface.surfaceId} lacks required ${state} state.`);
    }
  }

  return unique(failures);
}
