export type OpsHealthCanonicalStateStatus =
  | "healthy_current"
  | "degraded_current"
  | "source_ready_collecting"
  | "stale_artifact_refresh_required"
  | "route_listener_delayed"
  | "route_listener_delayed_with_last_verified_sample"
  | "canonical_state_missing"
  | "canonical_state_missing_actionable"
  | "failed_current"
  | "unknown";

export interface OpsHealthCanonicalStateInput {
  canonicalStateStatus?: string | null;
  canonicalStateReason?: string | null;
  newestSampleAgeMs?: number | null;
  activeRouteFailures: number;
  currentOpenActionGroups: number;
  routeListenerFailed: boolean;
  canTrustLastVerifiedRouteSample?: boolean;
  criticalFailureGroups?: number;
  debugRuntimeEvidenceFailed?: boolean;
  aiFallbackAccepted?: boolean;
  aiFeedFailed?: boolean;
  aiRequiredForOpsHealth?: boolean;
}

export interface OpsHealthCanonicalStateDecision {
  status: OpsHealthCanonicalStateStatus;
  displayLabel: string;
  sourceExplanation: string;
  nextAction: string;
  degradesSystemSafety: boolean;
}

function isRecentSample(ageMs: number | null | undefined) {
  return typeof ageMs === "number" && Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 5 * 60_000;
}

function normalizeExistingStatus(status?: string | null): OpsHealthCanonicalStateStatus | null {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "live" || normalized === "healthy" || normalized === "healthy_current") return "healthy_current";
  if (normalized === "degraded" || normalized === "degraded_current") return "degraded_current";
  if (normalized === "failed" || normalized === "failed_current") return "failed_current";
  if (normalized === "stale" || normalized === "stale_artifact_refresh_required") return "stale_artifact_refresh_required";
  return null;
}

export function deriveOpsHealthCanonicalState(input: OpsHealthCanonicalStateInput): OpsHealthCanonicalStateDecision {
  const existing = normalizeExistingStatus(input.canonicalStateStatus);
  const hasRecentSample = isRecentSample(input.newestSampleAgeMs);
  const criticalFailureGroups = Math.max(0, input.criticalFailureGroups ?? 0);
  const hasCurrentFailures = input.activeRouteFailures > 0 || input.currentOpenActionGroups > 0 || criticalFailureGroups > 0 || input.debugRuntimeEvidenceFailed === true;
  const aiFallbackOnly = input.aiFallbackAccepted === true && input.aiRequiredForOpsHealth !== true;

  if (existing && existing !== "canonical_state_missing") {
    return {
      status: existing,
      displayLabel: existing,
      sourceExplanation: input.canonicalStateReason || "Ops health provided a canonical state.",
      nextAction: existing === "healthy_current" ? "No action needed." : "Open the current diagnostics below.",
      degradesSystemSafety: existing === "degraded_current" || existing === "failed_current",
    };
  }

  if (input.routeListenerFailed && input.canTrustLastVerifiedRouteSample && hasRecentSample && !hasCurrentFailures) {
    return {
      status: "route_listener_delayed_with_last_verified_sample",
      displayLabel: "Route listener delayed",
      sourceExplanation: "Route listener failed, but a recent sample and last verified route snapshot are available.",
      nextAction: "Repair or refresh the route listener; keep using the last verified route sample until live checks resume.",
      degradesSystemSafety: false,
    };
  }

  if (hasCurrentFailures) {
    return {
      status: input.activeRouteFailures > 0 || criticalFailureGroups > 0 ? "failed_current" : "degraded_current",
      displayLabel: input.activeRouteFailures > 0 || criticalFailureGroups > 0 ? "Current failures" : "Needs review",
      sourceExplanation: `Current groups: routeFailures=${input.activeRouteFailures}, openActions=${input.currentOpenActionGroups}, critical=${criticalFailureGroups}.`,
      nextAction: "Open the current failure groups and fix the highest severity item first.",
      degradesSystemSafety: true,
    };
  }

  if (input.routeListenerFailed) {
    return {
      status: "route_listener_delayed",
      displayLabel: "Route listener delayed",
      sourceExplanation: "Route listener failed and no trusted last verified route sample was supplied.",
      nextAction: "Refresh route runtime evidence and repair the route listener.",
      degradesSystemSafety: false,
    };
  }

  if (hasRecentSample) {
    return {
      status: "healthy_current",
      displayLabel: "Healthy",
      sourceExplanation: aiFallbackOnly
        ? "recent sample has no active failures; deterministic AI fallback is accepted and does not define ops safety."
        : "recent sample has no active failures.",
      nextAction: "No action needed.",
      degradesSystemSafety: false,
    };
  }

  return {
    status: "canonical_state_missing_actionable",
    displayLabel: "Canonical state missing",
    sourceExplanation: "Ops health did not provide canonical state and no recent sample can replace it.",
    nextAction: "Refresh /api/admin/debug and verify opsHealth.canonicalState source wiring.",
    degradesSystemSafety: false,
  };
}
