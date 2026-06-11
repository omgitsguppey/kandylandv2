import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import type { SurfaceParityContract, SurfaceParityId, SurfaceRoleVisibility } from "./surface-parity-contract";
import {
  ROLE_PERMISSION_IDS,
  ROLE_PERMISSION_PARITY_VERSION,
  ROLE_PERMISSION_ROLES,
  type RolePermissionDecision,
  type RolePermissionDecisionInput,
  type RolePermissionDirtyClassification,
  type RolePermissionId,
  type RolePermissionParityReport,
  type RolePermissionResolvedDeniedState,
  type RolePermissionRole,
  type RolePermissionRoleRule,
  type RolePermissionRule,
  type RolePermissionSourceTruth,
  type RolePermissionSurfaceRegistration,
  type RolePermissionTelemetry,
  type RolePermissionTelemetryOutcome,
  validateRolePermissionRegistry,
} from "./role-permission-contract";

type RoleSet = readonly RolePermissionRole[];

const AUTHENTICATED_ROLES = ["user", "creator", "admin"] as const;
const CREATOR_OR_ADMIN = ["creator", "admin"] as const;
const ADMIN_OR_SYSTEM = ["admin", "system"] as const;

function normalizeFingerprint(reason: string | null | undefined, fallback: string) {
  const raw = (reason ?? fallback).trim().toLowerCase();
  return raw
    .replace(/[^a-z0-9_ -]/gu, "")
    .replace(/\s+/gu, "_")
    .slice(0, 80) || fallback;
}

function visibilityAllowsView(visibility: SurfaceRoleVisibility) {
  return visibility === "visible" || visibility === "readonly" || visibility === "admin_only" || visibility === "creator_only";
}

function roleRuleFor(surface: SurfaceParityContract, role: RolePermissionRole): RolePermissionRoleRule {
  if (role === "system") {
    const serviceAllowed = surface.featureId === "admin_debug"
      || surface.surfaceId === "user_management"
      || surface.surfaceId === "support_policies";
    return {
      role,
      visibility: serviceAllowed ? "service_only" : "denied",
      canView: serviceAllowed,
      reason: serviceAllowed
        ? "System jobs may read this surface contract for scheduled audit or materialized evidence only."
        : "System role has no UI surface access.",
      sourceTruth: "service_job",
    };
  }

  const visibility = surface.roleVisibility[role];
  const canView = visibilityAllowsView(visibility);
  return {
    role,
    visibility: canView
      ? visibility === "readonly"
        ? "readonly"
        : "allowed"
      : visibility === "redirect"
        ? "redirect"
        : "denied",
    canView,
    reason: canView
      ? `${role} may access ${surface.surfaceId} through the surface parity registry.`
      : `${role} is denied or redirected away from ${surface.surfaceId}.`,
    sourceTruth: "surface_parity_registry",
  };
}

function allowedViewRoles(surface: SurfaceParityContract): RolePermissionRole[] {
  return ROLE_PERMISSION_ROLES.filter((role) => roleRuleFor(surface, role).canView);
}

function allowedRolesForPermission(surface: SurfaceParityContract, permission: RolePermissionId): RolePermissionRole[] {
  const viewRoles = allowedViewRoles(surface);
  switch (permission) {
    case "view_surface":
      return viewRoles;
    case "use_action":
      return viewRoles.filter((role) => role !== "system");
    case "mutate_settings":
      if (surface.surfaceId === "account_settings") return ["user", "creator", "admin"];
      if (surface.surfaceId === "creator_settings") return ["creator", "admin"];
      if (surface.surfaceId.startsWith("admin") || surface.surfaceId === "user_management") return ["admin", "system"];
      return [];
    case "submit_drop":
      return surface.surfaceId === "creator_drop_manager" ? [...CREATOR_OR_ADMIN] : [];
    case "approve_drop":
      return surface.surfaceId === "creator_drop_manager" || surface.surfaceId.startsWith("admin")
        ? [...ADMIN_OR_SYSTEM]
        : [];
    case "view_admin_truth":
      return surface.surfaceId.startsWith("admin") || surface.surfaceId === "user_management"
        ? [...ADMIN_OR_SYSTEM]
        : [];
    case "view_creator_metrics":
      return surface.surfaceId.startsWith("creator") || surface.featureId.startsWith("creator")
        ? [...CREATOR_OR_ADMIN, "system"]
        : [];
    case "view_user_wallet":
      return surface.surfaceId === "wallet_purchase_modal" || surface.surfaceId === "user_dashboard" || surface.surfaceId === "account_settings"
        ? [...AUTHENTICATED_ROLES]
        : [];
    case "send_chat":
      return surface.surfaceId === "chat" ? ["user", "creator"] : [];
    case "manage_support":
      return surface.surfaceId === "support_policies" ? ["user", "creator", "admin", "system"] : surface.featureId === "admin_debug" ? [...ADMIN_OR_SYSTEM] : [];
    case "receive_notification":
      return surface.surfaceId === "notifications_pwa_prompt" ? [...AUTHENTICATED_ROLES] : [];
    default:
      return [];
  }
}

function permissionRuleFor(surface: SurfaceParityContract, permission: RolePermissionId): RolePermissionRule {
  const allowedRoles = allowedRolesForPermission(surface, permission);
  const sourceTruth: RolePermissionSourceTruth = permission === "view_surface"
    ? "surface_parity_registry"
    : allowedRoles.includes("system")
      ? "server_auth_guard"
      : "auth_profile_role";
  return {
    permission,
    allowedRoles,
    deniedStateReason: `${permission} requires ${allowedRoles.length > 0 ? allowedRoles.join(", ") : "no role on this surface"}.`,
    sourceTruth,
  };
}

function deniedCopyFor(surface: SurfaceParityContract) {
  if (surface.surfaceId.startsWith("admin") || surface.surfaceId === "user_management") {
    return {
      copy: {
        title: "Admin access required",
        body: "This surface is limited to admins. Use an admin account or return to your dashboard.",
      },
      cta: { label: "Go back", action: "go_back" as const },
    };
  }
  if (surface.surfaceId.startsWith("creator") || surface.rolePermissionStatus === "creator_only") {
    return {
      copy: {
        title: "Creator access required",
        body: "Open the Creator Dashboard with a creator account to use this surface.",
      },
      cta: { label: "Open dashboard", action: "open_dashboard" as const },
    };
  }
  if (surface.surfaceId === "wallet_purchase_modal") {
    return {
      copy: {
        title: "Sign in first",
        body: "Please sign in before you refill GumDrops or review wallet details.",
      },
      cta: { label: "Sign in", action: "sign_in" as const },
    };
  }
  return {
    copy: {
      title: "Access is required",
      body: "Use the right account for this surface before continuing.",
    },
    cta: { label: "Sign in", action: "sign_in" as const },
  };
}

function telemetryFor(surfaceId: SurfaceParityId) {
  return {
    permissionGranted: `${surfaceId}_permission_granted`,
    permissionDenied: `${surfaceId}_permission_denied`,
    roleSurfaceMismatch: `${surfaceId}_role_surface_mismatch`,
    staleRoleRouteRedirected: `${surfaceId}_stale_role_route_redirected`,
  };
}

function buildSurfaceRolePermissionRegistration(surface: SurfaceParityContract): RolePermissionSurfaceRegistration {
  const roles = Object.fromEntries(
    ROLE_PERMISSION_ROLES.map((role) => [role, roleRuleFor(surface, role)]),
  ) as RolePermissionSurfaceRegistration["roles"];
  const permissions = Object.fromEntries(
    ROLE_PERMISSION_IDS.map((permission) => [permission, permissionRuleFor(surface, permission)]),
  ) as RolePermissionSurfaceRegistration["permissions"];
  const denied = deniedCopyFor(surface);
  return {
    surfaceId: surface.surfaceId,
    surfaceOwner: surface.surfaceOwner,
    featureId: surface.featureId,
    canonicalRoute: surface.canonicalRoute,
    roles,
    permissions,
    deniedState: {
      ...denied,
      debugSeverity: surface.surfaceId.startsWith("admin") || surface.rolePermissionStatus === "creator_only" ? "blocking" : "review",
      sourceTruth: "auth_profile_role",
    },
    telemetry: telemetryFor(surface.surfaceId),
    debugLane: "Role parity",
    scoreDimensionImpact: {
      before: `${surface.surfaceId} role checks were distributed across route guards, client branches, and feature-specific validators.`,
      after: `${surface.surfaceId} role visibility, permissions, denied copy, telemetry, and debug ownership are declared in one role parity contract.`,
      dimensions: [...surface.scoreDimensionImpact.dimensions],
    },
    oldLogicStatus: surface.surfaceId === "chat" ? "classified_only" : surface.surfaceId === "wallet_purchase_modal" ? "protected_runtime" : "active_canonical",
  };
}

export const ROLE_PERMISSION_REGISTRY: RolePermissionSurfaceRegistration[] =
  SURFACE_PARITY_REGISTRY.map(buildSurfaceRolePermissionRegistration);

const ROLE_PERMISSION_REGISTRY_BY_ID = Object.fromEntries(
  ROLE_PERMISSION_REGISTRY.map((surface) => [surface.surfaceId, surface]),
) as Record<SurfaceParityId, RolePermissionSurfaceRegistration>;

function getSurface(surfaceId: SurfaceParityId) {
  return ROLE_PERMISSION_REGISTRY_BY_ID[surfaceId];
}

export function canViewSurface(input: RolePermissionDecisionInput): RolePermissionDecision {
  const surface = getSurface(input.surfaceId);
  const roleRule = surface.roles[input.role];
  return {
    allowed: roleRule.canView,
    visibility: roleRule.visibility,
    surfaceId: input.surfaceId,
    role: input.role,
    permission: "view_surface",
    reason: input.reason ?? roleRule.reason,
    sourceTruth: roleRule.sourceTruth,
  };
}

export function canUseAction(input: RolePermissionDecisionInput & { permission: RolePermissionId }): RolePermissionDecision {
  const surface = getSurface(input.surfaceId);
  const roleRule = surface.roles[input.role];
  const permissionRule = surface.permissions[input.permission];
  const allowed = roleRule.canView && permissionRule.allowedRoles.includes(input.role);
  return {
    allowed,
    visibility: allowed ? roleRule.visibility : "denied",
    surfaceId: input.surfaceId,
    role: input.role,
    permission: input.permission,
    reason: input.reason ?? (allowed ? `${input.role} may ${input.permission} on ${input.surfaceId}.` : permissionRule.deniedStateReason),
    sourceTruth: permissionRule.sourceTruth,
  };
}

export function buildPermissionTelemetry(input: RolePermissionDecisionInput & {
  permission: RolePermissionId;
  outcome: RolePermissionTelemetryOutcome;
}): RolePermissionTelemetry {
  const surface = getSurface(input.surfaceId);
  const eventName =
    input.outcome === "permission_granted" ? surface.telemetry.permissionGranted
      : input.outcome === "role_surface_mismatch" ? surface.telemetry.roleSurfaceMismatch
        : input.outcome === "stale_role_route_redirected" ? surface.telemetry.staleRoleRouteRedirected
          : surface.telemetry.permissionDenied;
  const permissionRule = surface.permissions[input.permission];
  return {
    eventName,
    params: {
      surfaceId: input.surfaceId,
      featureId: surface.featureId,
      role: input.role,
      permission: input.permission,
      outcome: input.outcome,
      safeFingerprint: normalizeFingerprint(input.reason, input.outcome),
      sourceTruth: permissionRule.sourceTruth,
    },
  };
}

export function resolveDeniedState(input: RolePermissionDecisionInput & { permission?: RolePermissionId }): RolePermissionResolvedDeniedState {
  const permission = input.permission ?? "view_surface";
  const surface = getSurface(input.surfaceId);
  return {
    ...surface.deniedState,
    surfaceId: input.surfaceId,
    featureId: surface.featureId,
    role: input.role,
    permission,
    safeFingerprint: normalizeFingerprint(input.reason, "permission_denied"),
    telemetry: buildPermissionTelemetry({
      ...input,
      permission,
      outcome: "permission_denied",
    }),
  };
}

export function explainPermissionMismatch(input: RolePermissionDecisionInput): string {
  const surface = getSurface(input.surfaceId);
  if (surface.surfaceId.startsWith("admin") || surface.surfaceId === "user_management") {
    return `${input.surfaceId} requires an admin account; ${input.role} should be redirected or shown a denied state.`;
  }
  if (surface.surfaceId.startsWith("creator") || surface.roles.creator.canView && !surface.roles.user.canView) {
    return `${input.surfaceId} requires a creator account; ${input.role} should see Creator access required copy.`;
  }
  if (surface.roles.guest.visibility === "redirect" && input.role === "guest") {
    return `${input.surfaceId} requires sign-in before controls are shown.`;
  }
  return `${input.role} has no matching permission for ${input.surfaceId}.`;
}

export function classifyRolePermissionDirtyFile(path: string): RolePermissionDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/role-permission-parity.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/role-permission-parity.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-role-permission-parity.ts") return "validator_artifact_expected";
  if (/^agent\/context\//u.test(normalized) || /^agent\/index\//u.test(normalized)) return "unrelated_agent_context_file_to_ignore";
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized)) return "stale_generated_artifact_to_regenerate";
  if (/^docs\/agent-truth\/.+\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/.+\.ts$/u.test(normalized) || normalized === "scripts/repo-inventory.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/role-permission-parity.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/parity\/role-permission-(contract|resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/lib\/parity\/surface-state-(contract|resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry/surface-telemetry-registry.ts") return "real_source_change_needs_review";
  if (
    normalized === "package.json"
    || normalized === "package-lock.json"
  ) return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (
    normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/feature-registration-gate.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (
    normalized === "agent/state/settings-connection-parity.generated.json"
    || normalized === "agent/state/settings-route-alias-cleanup.generated.json"
  ) return "stale_generated_artifact_to_regenerate";
  if (/role.*permission|permission.*role/u.test(normalized)) return "stale_role_permission_logic_to_remove";
  return "unsafe_unknown";
}

function classifyStaleRolePermissionLogic() {
  return [
    {
      path: "src/context/AuthContext.tsx",
      classification: "active_canonical",
      reason: "Auth provider owns Firebase identity and profile hydration; Phase 4 reads role only and does not change provider logic.",
    },
    {
      path: "src/lib/user-utils.ts",
      classification: "active_canonical",
      reason: "User profile normalization remains the canonical role source for user, creator, and admin profile roles.",
    },
    {
      path: "src/lib/chat.ts",
      classification: "in_flight_classified_only",
      reason: "Chat role internals remain untouched; parity only classifies chat as user/creator visible and admin hidden.",
    },
  ];
}

function roleParityFindings(registry: readonly RolePermissionSurfaceRegistration[]) {
  const routeMismatchFindings: string[] = [];
  const deniedStateCoverageFindings: string[] = [];
  const leakedControlFindings: string[] = [];
  const missingRoleMappingFindings: string[] = [];

  for (const surface of registry) {
    for (const role of ROLE_PERMISSION_ROLES) {
      if (!surface.roles[role]) missingRoleMappingFindings.push(`${surface.surfaceId} missing ${role}.`);
    }
    if (!surface.deniedState.copy.title || !surface.deniedState.cta.label) {
      deniedStateCoverageFindings.push(`${surface.surfaceId} denied state incomplete.`);
    }
    if ((surface.surfaceId.startsWith("admin") || surface.surfaceId === "user_management")
      && (surface.roles.guest.canView || surface.roles.user.canView || surface.roles.creator.canView)) {
      leakedControlFindings.push(`${surface.surfaceId} leaks admin access outside admin role.`);
    }
    if (surface.surfaceId === "creator_settings" && surface.roles.user.canView) {
      routeMismatchFindings.push("Creator Settings is visible to a plain user.");
    }
    if (surface.surfaceId === "account_settings" && !surface.roles.user.canView) {
      routeMismatchFindings.push("Account Settings no longer visible to user role.");
    }
  }

  return { routeMismatchFindings, deniedStateCoverageFindings, leakedControlFindings, missingRoleMappingFindings };
}

export function buildRolePermissionParityReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  registry?: readonly RolePermissionSurfaceRegistration[];
} = {}): RolePermissionParityReport {
  const registry = [...(input.registry ?? ROLE_PERMISSION_REGISTRY)];
  const debugLane = {
    label: "Role parity" as const,
    ...roleParityFindings(registry),
  };
  const dirtyFiles = [...(input.dirtyFiles ?? [])].map((path) => ({
    path,
    classification: classifyRolePermissionDirtyFile(path),
  }));
  const validationFailures = [
    ...validateRolePermissionRegistry(registry),
    ...dirtyFiles
      .filter((file) => file.classification === "unsafe_unknown")
      .map((file) => `${file.path} is unclassified for role permission parity.`),
    ...debugLane.routeMismatchFindings,
    ...debugLane.deniedStateCoverageFindings,
    ...debugLane.leakedControlFindings,
    ...debugLane.missingRoleMappingFindings,
  ];
  const accountSettings = registry.find((surface) => surface.surfaceId === "account_settings");
  const creatorSettings = registry.find((surface) => surface.surfaceId === "creator_settings");

  return {
    reportKey: "role-permission-parity",
    version: ROLE_PERMISSION_PARITY_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    authProviderLogicChanged: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    navChanged: false,
    majorSurfacesRegistered: registry.length,
    roles: [...ROLE_PERMISSION_ROLES],
    permissions: [...ROLE_PERMISSION_IDS],
    surfaces: registry,
    debugLane,
    accountCreatorSettingsSplit: {
      accountSettingsUserVisible: accountSettings?.roles.user.canView === true,
      creatorSettingsPlainUserDenied: creatorSettings?.roles.user.canView === false,
      creatorSettingsCreatorVisible: creatorSettings?.roles.creator.canView === true,
    },
    telemetryEvents: registry.map((surface) => surface.telemetry),
    scoreDimensionBeforeAfter: {
      before: "Role permissions were enforced through route-local checks, feature branches, and scattered settings/admin assumptions.",
      after: "User, creator, admin, guest, and system roles now share one permission map with denied states, telemetry, and debug evidence.",
      dimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"],
    },
    dirtyFiles,
    staleRolePermissionLogicClassification: classifyStaleRolePermissionLogic(),
    validationFailures,
  };
}
