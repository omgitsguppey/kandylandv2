import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type { SurfaceParityId } from "./surface-parity-contract";

export const ROLE_PERMISSION_PARITY_VERSION = "2026.05.role-permission.1";

export const ROLE_PERMISSION_ROLES = ["guest", "user", "creator", "admin", "system"] as const;

export const ROLE_PERMISSION_IDS = [
  "view_surface",
  "use_action",
  "mutate_settings",
  "submit_drop",
  "approve_drop",
  "view_admin_truth",
  "view_creator_metrics",
  "view_user_wallet",
  "send_chat",
  "manage_support",
  "receive_notification",
] as const;

export type RolePermissionRole = (typeof ROLE_PERMISSION_ROLES)[number];
export type RolePermissionId = (typeof ROLE_PERMISSION_IDS)[number];

export type RolePermissionVisibility =
  | "allowed"
  | "denied"
  | "redirect"
  | "readonly"
  | "service_only";

export type RolePermissionTelemetryOutcome =
  | "permission_granted"
  | "permission_denied"
  | "role_surface_mismatch"
  | "stale_role_route_redirected";

export type RolePermissionSourceTruth =
  | "auth_profile_role"
  | "surface_parity_registry"
  | "server_auth_guard"
  | "service_job";

export interface RolePermissionCta {
  label: string;
  action:
    | "none"
    | "sign_in"
    | "go_back"
    | "open_dashboard"
    | "open_creator_dashboard"
    | "contact_support";
}

export interface RolePermissionDeniedState {
  copy: {
    title: string;
    body: string;
  };
  cta: RolePermissionCta;
  debugSeverity: "info" | "review" | "warning" | "blocking";
  sourceTruth: RolePermissionSourceTruth;
}

export interface RolePermissionRoleRule {
  role: RolePermissionRole;
  visibility: RolePermissionVisibility;
  canView: boolean;
  reason: string;
  sourceTruth: RolePermissionSourceTruth;
}

export interface RolePermissionRule {
  permission: RolePermissionId;
  allowedRoles: RolePermissionRole[];
  deniedStateReason: string;
  sourceTruth: RolePermissionSourceTruth;
}

export interface RolePermissionTelemetryContract {
  permissionGranted: string;
  permissionDenied: string;
  roleSurfaceMismatch: string;
  staleRoleRouteRedirected: string;
}

export interface RolePermissionSurfaceRegistration {
  surfaceId: SurfaceParityId;
  surfaceOwner: string;
  featureId: string;
  canonicalRoute: string;
  roles: Record<RolePermissionRole, RolePermissionRoleRule>;
  permissions: Record<RolePermissionId, RolePermissionRule>;
  deniedState: RolePermissionDeniedState;
  telemetry: RolePermissionTelemetryContract;
  debugLane: "Role parity";
  scoreDimensionImpact: {
    before: string;
    after: string;
    dimensions: PublicBetaHealthDimension[];
  };
  oldLogicStatus: "active_canonical" | "classified_only" | "protected_runtime" | "unsafe_unknown";
}

export interface RolePermissionDecisionInput {
  role: RolePermissionRole;
  surfaceId: SurfaceParityId;
  permission?: RolePermissionId;
  reason?: string | null;
}

export interface RolePermissionDecision {
  allowed: boolean;
  visibility: RolePermissionVisibility;
  surfaceId: SurfaceParityId;
  role: RolePermissionRole;
  permission: RolePermissionId;
  reason: string;
  sourceTruth: RolePermissionSourceTruth;
}

export interface RolePermissionTelemetry {
  eventName: string;
  params: {
    surfaceId: SurfaceParityId;
    featureId: string;
    role: RolePermissionRole;
    permission: RolePermissionId;
    outcome: RolePermissionTelemetryOutcome;
    safeFingerprint: string;
    sourceTruth: RolePermissionSourceTruth;
  };
}

export interface RolePermissionResolvedDeniedState extends RolePermissionDeniedState {
  surfaceId: SurfaceParityId;
  featureId: string;
  role: RolePermissionRole;
  permission: RolePermissionId;
  safeFingerprint: string;
  telemetry: RolePermissionTelemetry;
}

export type RolePermissionDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_role_permission_logic_to_remove"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "unsafe_unknown";

export interface RolePermissionParityReport {
  reportKey: "role-permission-parity";
  version: typeof ROLE_PERMISSION_PARITY_VERSION;
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  authProviderLogicChanged: false;
  paymentRuntimeChanged: false;
  gumdropMathChanged: false;
  navChanged: false;
  majorSurfacesRegistered: number;
  roles: RolePermissionRole[];
  permissions: RolePermissionId[];
  surfaces: RolePermissionSurfaceRegistration[];
  debugLane: {
    label: "Role parity";
    routeMismatchFindings: string[];
    deniedStateCoverageFindings: string[];
    leakedControlFindings: string[];
    missingRoleMappingFindings: string[];
  };
  accountCreatorSettingsSplit: {
    accountSettingsUserVisible: boolean;
    creatorSettingsPlainUserDenied: boolean;
    creatorSettingsCreatorVisible: boolean;
  };
  telemetryEvents: RolePermissionTelemetryContract[];
  scoreDimensionBeforeAfter: {
    before: string;
    after: string;
    dimensions: PublicBetaHealthDimension[];
  };
  dirtyFiles: Array<{ path: string; classification: RolePermissionDirtyClassification }>;
  staleRolePermissionLogicClassification: Array<{ path: string; classification: string; reason: string }>;
  validationFailures: string[];
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

export function validateRolePermissionRegistry(registry: readonly RolePermissionSurfaceRegistration[]) {
  const failures: string[] = [];
  const ids = new Set<SurfaceParityId>();

  for (const surface of registry) {
    if (ids.has(surface.surfaceId)) failures.push(`${surface.surfaceId} is duplicated.`);
    ids.add(surface.surfaceId);

    for (const role of ROLE_PERMISSION_ROLES) {
      const rule = surface.roles[role];
      if (!rule) failures.push(`${surface.surfaceId} lacks ${role} role mapping.`);
      if (rule && !rule.reason) failures.push(`${surface.surfaceId}/${role} lacks permission reason.`);
      if (role === "system" && rule?.canView && rule.visibility !== "service_only") {
        failures.push(`${surface.surfaceId}/system must be service_only when it can access a surface.`);
      }
    }

    for (const permission of ROLE_PERMISSION_IDS) {
      const rule = surface.permissions[permission];
      if (!rule) failures.push(`${surface.surfaceId} lacks ${permission} permission mapping.`);
      if (rule && rule.allowedRoles.length === 0 && permission === "view_surface") {
        failures.push(`${surface.surfaceId} cannot deny all view_surface roles.`);
      }
    }

    if (!surface.deniedState.copy.title || !surface.deniedState.copy.body) {
      failures.push(`${surface.surfaceId} denied state lacks human copy.`);
    }
    if (!surface.deniedState.cta.label || surface.deniedState.cta.action === "none") {
      failures.push(`${surface.surfaceId} denied state lacks next action CTA.`);
    }
    if (!surface.telemetry.permissionGranted.endsWith("permission_granted")) {
      failures.push(`${surface.surfaceId} lacks permission_granted telemetry.`);
    }
    if (!surface.telemetry.permissionDenied.endsWith("permission_denied")) {
      failures.push(`${surface.surfaceId} lacks permission_denied telemetry.`);
    }
    if (!surface.telemetry.roleSurfaceMismatch.endsWith("role_surface_mismatch")) {
      failures.push(`${surface.surfaceId} lacks role_surface_mismatch telemetry.`);
    }
    if (!surface.telemetry.staleRoleRouteRedirected.endsWith("stale_role_route_redirected")) {
      failures.push(`${surface.surfaceId} lacks stale_role_route_redirected telemetry.`);
    }
    if (!surface.debugLane) failures.push(`${surface.surfaceId} lacks role parity debug lane.`);
    if (!surface.scoreDimensionImpact.before || !surface.scoreDimensionImpact.after || surface.scoreDimensionImpact.dimensions.length === 0) {
      failures.push(`${surface.surfaceId} lacks score dimension before/after.`);
    }
  }

  const creatorSettings = registry.find((surface) => surface.surfaceId === "creator_settings");
  const accountSettings = registry.find((surface) => surface.surfaceId === "account_settings");
  if (creatorSettings?.roles.user.canView) failures.push("Creator Settings is visible to plain user.");
  if (!creatorSettings?.roles.creator.canView) failures.push("Creator Settings is not visible to creator.");
  if (!accountSettings?.roles.user.canView) failures.push("Account Settings is not visible to user.");
  if (!accountSettings?.roles.creator.canView) failures.push("Account Settings is not visible to creator.");

  const adminLeaks = registry.filter((surface) =>
    surface.surfaceId.startsWith("admin") || surface.surfaceId === "user_management"
  ).flatMap((surface) =>
    (["guest", "user", "creator"] as const)
      .filter((role) => surface.roles[role].canView)
      .map((role) => `${surface.surfaceId} visible to ${role}`),
  );
  failures.push(...adminLeaks);

  return unique(failures);
}
