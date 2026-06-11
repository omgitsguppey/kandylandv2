import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import type {
  SurfaceParityContract,
  SurfaceParityId,
  SurfaceParityRole,
  SurfaceRoleVisibility,
} from "@/lib/parity/surface-parity-contract";
import { getSurfaceTelemetryEventDefinitionByName } from "@/lib/telemetry/surface-telemetry-registry";

import {
  SURFACE_STATE_IDS,
  type RawSurfaceStateCopyClassification,
  type SurfaceStateContract,
  type SurfaceStateCta,
  type SurfaceStateDebugSeverity,
  type SurfaceStateDirtyClassification,
  type SurfaceStateId,
  type SurfaceStateParityReport,
  type SurfaceStateResolved,
  type SurfaceStateResolutionInput,
  type SurfaceStateRetryPolicy,
  type SurfaceStateSourceTruth,
  type SurfaceStateSurfaceRegistration,
  type SurfaceStateTelemetry,
  validateSurfaceStateRegistry,
} from "./surface-state-contract";

const RAW_DEVELOPER_ERROR_COPY = /internal server error|system error|stack trace|exception|undefined is not|cannot read properties/iu;
const GENERIC_ERROR_COPY = /something went wrong|oops|uh oh|try again later/iu;
const GENERIC_LOADING_COPY = /^loading(?:\.{3})?$/iu;
const GENERIC_EMPTY_COPY = /^empty$|^no data$/iu;

const STATE_TO_TELEMETRY_KIND: Record<SurfaceStateId, string> = {
  loading: "surface_loaded",
  empty: "surface_empty_viewed",
  ready: "surface_loaded",
  degraded: "surface_degraded_viewed",
  error: "surface_error_viewed",
  permission_denied: "surface_permission_denied",
  not_configured: "surface_not_configured_viewed",
  locked: "surface_permission_denied",
  unavailable: "surface_error_viewed",
  stale: "surface_degraded_viewed",
};

const STATE_SOURCE_TRUTH: Record<SurfaceStateId, SurfaceStateSourceTruth> = {
  loading: "client_state",
  empty: "canonical",
  ready: "canonical",
  degraded: "fallback",
  error: "unavailable",
  permission_denied: "permission_guard",
  not_configured: "configuration",
  locked: "permission_guard",
  unavailable: "unavailable",
  stale: "hot_cache",
};

const STATE_SEVERITY: Record<SurfaceStateId, SurfaceStateDebugSeverity> = {
  loading: "info",
  empty: "info",
  ready: "info",
  degraded: "warning",
  error: "error",
  permission_denied: "blocking",
  not_configured: "review",
  locked: "review",
  unavailable: "blocking",
  stale: "warning",
};

const STATE_RETRY_POLICY: Record<SurfaceStateId, SurfaceStateRetryPolicy> = {
  loading: { canRetry: false, retryEventName: null, degradeAfterMs: 10_000, degradeToState: "degraded" },
  empty: { canRetry: true, retryEventName: "surface_state_retry", degradeAfterMs: null, degradeToState: null },
  ready: { canRetry: false, retryEventName: null, degradeAfterMs: null, degradeToState: null },
  degraded: { canRetry: true, retryEventName: "surface_state_retry", degradeAfterMs: null, degradeToState: null },
  error: { canRetry: true, retryEventName: "surface_state_retry", degradeAfterMs: null, degradeToState: null },
  permission_denied: { canRetry: false, retryEventName: null, degradeAfterMs: null, degradeToState: null },
  not_configured: { canRetry: false, retryEventName: null, degradeAfterMs: null, degradeToState: null },
  locked: { canRetry: false, retryEventName: null, degradeAfterMs: null, degradeToState: null },
  unavailable: { canRetry: true, retryEventName: "surface_state_retry", degradeAfterMs: null, degradeToState: null },
  stale: { canRetry: true, retryEventName: "surface_state_retry", degradeAfterMs: null, degradeToState: null },
};

const SURFACE_LABELS: Record<SurfaceParityId, string> = {
  public_homepage: "Drops",
  auth: "Sign in",
  user_dashboard: "Dashboard",
  wallet_purchase_modal: "Wallet",
  drops_library: "Library",
  creator_dashboard: "Creator dashboard",
  creator_settings: "Creator settings",
  creator_drop_manager: "Drop manager",
  creator_profile_timeline: "Creator profile",
  chat: "Chat",
  daily_tasks_checkin: "Daily check-in",
  notifications_pwa_prompt: "Notifications",
  account_settings: "Account settings",
  admin_dashboard: "Admin dashboard",
  admin_debug: "Admin debug",
  user_management: "User management",
  support_policies: "Support",
};

function cta(label: string, action: SurfaceStateCta["action"]): SurfaceStateCta {
  return { label, action };
}

function copyFor(surface: SurfaceParityContract, state: SurfaceStateId) {
  const label = SURFACE_LABELS[surface.surfaceId];
  if (surface.surfaceId === "wallet_purchase_modal" && state === "permission_denied") {
    return {
      copy: {
        title: "Sign in first",
        body: "Please sign in before you refill GumDrops or review wallet details.",
      },
      cta: cta("Sign in", "sign_in"),
    };
  }
  if (surface.rolePermissionStatus === "admin_only" && state === "permission_denied") {
    return {
      copy: {
        title: "Admin access required",
        body: "This surface is limited to admins. Use an admin account or return to your dashboard.",
      },
      cta: cta("Go back", "go_back"),
    };
  }
  if (surface.rolePermissionStatus === "creator_only" && state === "permission_denied") {
    return {
      copy: {
        title: "Creator access required",
        body: "Open the Creator Dashboard with a creator account to use this surface.",
      },
      cta: cta("Open dashboard", "open_dashboard"),
    };
  }

  const byState: Record<SurfaceStateId, { copy: { title: string; body: string }; cta: SurfaceStateCta }> = {
    loading: {
      copy: { title: `${label} is loading`, body: "KandyDrops is preparing this view. If it takes too long, the state will switch to degraded." },
      cta: cta("Wait", "none"),
    },
    empty: {
      copy: { title: `No ${label.toLowerCase()} yet`, body: "There is no current activity for this surface. Start with the next available action." },
      cta: cta(surface.surfaceId === "public_homepage" ? "Explore Drops" : "Refresh", surface.surfaceId === "public_homepage" ? "go_back" : "refresh"),
    },
    ready: {
      copy: { title: `${label} is ready`, body: "This surface is loaded from its expected source." },
      cta: cta("Continue", "none"),
    },
    degraded: {
      copy: { title: `${label} is partially available`, body: "Some source detail is delayed or incomplete. Keep the visible values, then refresh if you need the latest state." },
      cta: cta("Refresh", "refresh"),
    },
    error: {
      copy: { title: `${label} could not load`, body: "Refresh this surface or send a bug if the issue repeats." },
      cta: cta("Retry", "retry"),
    },
    permission_denied: {
      copy: { title: "Access is required", body: "Use the right account for this surface before continuing." },
      cta: cta("Sign in", "sign_in"),
    },
    not_configured: {
      copy: { title: `${label} needs setup`, body: "This surface needs configuration before it can show live state." },
      cta: cta(surface.surfaceOwner.startsWith("admin") ? "Review setup" : "Open settings", surface.surfaceOwner.startsWith("admin") ? "configure" : "open_settings"),
    },
    locked: {
      copy: { title: `${label} is locked`, body: "Unlock the required access before using this surface." },
      cta: cta(surface.surfaceId === "wallet_purchase_modal" ? "Refill GumDrops" : "Open settings", surface.surfaceId === "wallet_purchase_modal" ? "refill_gumdrops" : "open_settings"),
    },
    unavailable: {
      copy: { title: `${label} is unavailable`, body: "The source for this surface is not answering. Try again soon or contact support." },
      cta: cta("Contact support", "contact_support"),
    },
    stale: {
      copy: { title: `${label} needs a refresh`, body: "This view is using older source data. Refresh before making decisions." },
      cta: cta("Refresh", "refresh"),
    },
  };

  return byState[state];
}

function telemetryEventName(surfaceId: SurfaceParityId, state: SurfaceStateId) {
  const eventName = `${surfaceId}_${STATE_TO_TELEMETRY_KIND[state]}`;
  return getSurfaceTelemetryEventDefinitionByName(eventName)?.eventName ?? eventName;
}

function buildStateContract(surface: SurfaceParityContract, state: SurfaceStateId): SurfaceStateContract {
  const copyAndCta = copyFor(surface, state);
  return {
    state,
    copy: copyAndCta.copy,
    cta: copyAndCta.cta,
    telemetryEventName: telemetryEventName(surface.surfaceId, state),
    retryPolicy: STATE_RETRY_POLICY[state],
    debugLane: "Surface state parity",
    debugSeverity: STATE_SEVERITY[state],
    roleVisibility: { ...surface.roleVisibility },
    sourceTruth: STATE_SOURCE_TRUTH[state],
    requiresSafeFingerprint: state === "error" || state === "unavailable" || state === "permission_denied",
  };
}

function buildSurfaceStateRegistration(surface: SurfaceParityContract): SurfaceStateSurfaceRegistration {
  const states = Object.fromEntries(
    SURFACE_STATE_IDS.map((state) => [state, buildStateContract(surface, state)]),
  ) as SurfaceStateSurfaceRegistration["states"];
  return {
    surfaceId: surface.surfaceId,
    surfaceOwner: surface.surfaceOwner,
    featureId: surface.featureId,
    states,
    debugLane: "Surface state parity",
    scoreDimensionImpact: {
      before: `${surface.surfaceId} had state handling split across page-local loading, empty, and error branches.`,
      after: `${surface.surfaceId} state feedback now has shared copy, CTA, telemetry, debug severity, retry, role, and source-truth contracts.`,
      dimensions: [...surface.scoreDimensionImpact.dimensions],
    },
  };
}

export const SURFACE_STATE_REGISTRY: SurfaceStateSurfaceRegistration[] =
  SURFACE_PARITY_REGISTRY.map(buildSurfaceStateRegistration);

const SURFACE_STATE_REGISTRY_BY_ID = Object.fromEntries(
  SURFACE_STATE_REGISTRY.map((surface) => [surface.surfaceId, surface]),
) as Record<SurfaceParityId, SurfaceStateSurfaceRegistration>;

function normalizeFingerprint(reason: string | null | undefined, state: SurfaceStateId) {
  const raw = (reason ?? state).trim().toLowerCase();
  return raw
    .replace(/[^a-z0-9_ -]/gu, "")
    .replace(/\s+/gu, "_")
    .slice(0, 80) || state;
}

export function resolveSurfaceState(input: SurfaceStateResolutionInput): SurfaceStateResolved {
  const surface = SURFACE_STATE_REGISTRY_BY_ID[input.surfaceId];
  const state = surface.states[input.state];
  return {
    ...state,
    surfaceId: input.surfaceId,
    featureId: surface.featureId,
    role: input.role ?? "user",
    safeFingerprint: normalizeFingerprint(input.reason, input.state),
  };
}

export function buildSurfaceStateCopy(input: SurfaceStateResolved | SurfaceStateResolutionInput) {
  return "copy" in input ? input.copy : resolveSurfaceState(input).copy;
}

export function buildSurfaceStateTelemetry(input: SurfaceStateResolved | SurfaceStateResolutionInput): SurfaceStateTelemetry {
  const resolved = "telemetryEventName" in input ? input : resolveSurfaceState(input);
  return {
    eventName: resolved.telemetryEventName,
    surfaceId: resolved.surfaceId,
    featureId: resolved.featureId,
    state: resolved.state,
    safeFingerprint: resolved.safeFingerprint,
    debugSeverity: resolved.debugSeverity,
    sourceTruth: resolved.sourceTruth,
  };
}

export function classifySurfaceStateSeverity(input: SurfaceStateResolved | SurfaceStateResolutionInput) {
  return ("debugSeverity" in input ? input : resolveSurfaceState(input)).debugSeverity;
}

export function getSurfaceStateCta(input: SurfaceStateResolved | SurfaceStateResolutionInput) {
  return ("cta" in input ? input : resolveSurfaceState(input)).cta;
}

export function classifyRawSurfaceStateCopy(value: string): RawSurfaceStateCopyClassification {
  const trimmed = value.trim();
  if (RAW_DEVELOPER_ERROR_COPY.test(trimmed)) return "raw_developer_error_copy";
  if (GENERIC_ERROR_COPY.test(trimmed)) return "generic_error_copy";
  if (GENERIC_LOADING_COPY.test(trimmed)) return "generic_loading_copy";
  if (GENERIC_EMPTY_COPY.test(trimmed)) return "generic_empty_copy";
  return "approved_surface_state_copy";
}

export function classifySurfaceStateDirtyFile(path: string): SurfaceStateDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/surface-state-parity.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/frontend-telemetry-consolidation.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/surface-state-parity.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/frontend-telemetry-consolidation.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-surface-state-parity.ts") return "validator_artifact_expected";
  if (/^agent\/context\//u.test(normalized) || /^agent\/index\//u.test(normalized)) return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^docs\/agent-truth\/.+\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/.+\.ts$/u.test(normalized) || normalized === "scripts/repo-inventory.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/surface-state-parity.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/surface-telemetry-parity.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/creator-discovery-rail.spec.tsx") return "test_artifact_expected";
  if (/^src\/lib\/parity\/surface-state-(contract|resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/lib\/parity\/role-permission-(contract|resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry/surface-telemetry-registry.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/CreatorDiscoveryRail.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/problem-state-copy.ts" || normalized === "src/lib/errors/error-dictionary.ts") return "real_source_change_needs_review";
  if (
    normalized === "agent/state/surface-telemetry-parity.generated.json"
    || normalized === "agent/state/surface-parity-doctrine.generated.json"
    || normalized === "agent/state/public-beta-score.generated.json"
  ) return "stale_generated_artifact_to_regenerate";
  if (
    normalized === "docs/agent-truth/surface-telemetry-parity.md"
    || normalized === "docs/agent-truth/surface-parity-doctrine.md"
  ) return "stale_generated_artifact_to_regenerate";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/surface.*state|state.*parity|loading-state|error.*copy/iu.test(normalized)) return "stale_state_logic_to_remove";
  return "unsafe_unknown";
}

export function buildSurfaceStateParityReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  rawErrorCopyFindings?: readonly string[];
  endlessLoadingRisks?: readonly string[];
  missingCtaFindings?: readonly string[];
  registry?: readonly SurfaceStateSurfaceRegistration[];
} = {}): SurfaceStateParityReport {
  const registry = [...(input.registry ?? SURFACE_STATE_REGISTRY)];
  const missingStateCoverage = Object.fromEntries(
    registry
      .map((surface) => [
        surface.surfaceId,
        SURFACE_STATE_IDS.filter((state) => !surface.states[state]),
      ])
      .filter(([, missing]) => (missing as string[]).length > 0),
  ) as Record<string, string[]>;
  const dirtyFiles = [...(input.dirtyFiles ?? [])].map((path) => ({
    path,
    classification: classifySurfaceStateDirtyFile(path),
  }));
  const validationFailures = [
    ...validateSurfaceStateRegistry(registry),
    ...dirtyFiles
      .filter((file) => file.classification === "unsafe_unknown")
      .map((file) => `${file.path} is unclassified for surface state parity.`),
    ...(input.rawErrorCopyFindings ?? []).map((finding) => `raw developer-facing state copy remains: ${finding}`),
    ...(input.endlessLoadingRisks ?? []).map((finding) => `endless loading risk remains: ${finding}`),
    ...(input.missingCtaFindings ?? []).map((finding) => `state CTA missing: ${finding}`),
  ];

  return {
    reportKey: "surface-state-parity",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    majorSurfacesRegistered: registry.length,
    stateKinds: [...SURFACE_STATE_IDS],
    debugLane: {
      label: "Surface state parity",
      missingStateCoverage,
      rawErrorCopyFindings: [...(input.rawErrorCopyFindings ?? [])],
      endlessLoadingRisks: [...(input.endlessLoadingRisks ?? [])],
      missingCtaFindings: [...(input.missingCtaFindings ?? [])],
    },
    scoreDimensionBeforeAfter: {
      before: "Surface loading, empty, failed, degraded, permission, and configuration states were validated by separate page-local patterns.",
      after: "Major surfaces now share one state vocabulary with copy, CTA, telemetry, debug severity, retry policy, role visibility, and source truth.",
      dimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "regressionRisk"],
    },
    dirtyFiles,
    validationFailures,
  };
}
