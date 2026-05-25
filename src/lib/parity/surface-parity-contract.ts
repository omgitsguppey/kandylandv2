import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export const SURFACE_PARITY_DOCTRINE_VERSION = "2026.05.surface-parity.1";

export const MAJOR_SURFACE_PARITY_IDS = [
  "public_homepage",
  "auth",
  "user_dashboard",
  "wallet_purchase_modal",
  "drops_library",
  "creator_dashboard",
  "creator_settings",
  "creator_drop_manager",
  "creator_profile_timeline",
  "chat",
  "daily_tasks_checkin",
  "notifications_pwa_prompt",
  "account_settings",
  "admin_dashboard",
  "admin_debug",
  "user_management",
  "support_policies",
] as const;

export const SURFACE_PARITY_REQUIRED_STATES = [
  "loading",
  "empty",
  "ready",
  "degraded",
  "error",
  "permission_denied",
  "not_configured",
] as const;

export const SURFACE_PARITY_ROLES = ["guest", "user", "creator", "admin"] as const;

export type SurfaceParityId = (typeof MAJOR_SURFACE_PARITY_IDS)[number];
export type SurfaceParityState = (typeof SURFACE_PARITY_REQUIRED_STATES)[number];
export type SurfaceParityRole = (typeof SURFACE_PARITY_ROLES)[number];

export type SurfaceRoleVisibility =
  | "visible"
  | "hidden"
  | "redirect"
  | "readonly"
  | "admin_only"
  | "creator_only";

export type SurfaceMobileDensityStatus =
  | "mobile_ready"
  | "compact_required"
  | "desktop_operational"
  | "external_native"
  | "not_applicable";

export type SurfaceRolePermissionStatus =
  | "guest_allowed"
  | "auth_required"
  | "creator_only"
  | "admin_only"
  | "mixed_role_clear"
  | "clear";

export type SurfaceOldLogicStatus =
  | "active_canonical"
  | "superseded_removed"
  | "still_required"
  | "in_flight_leave_alone";

export interface SurfaceParityScoreImpact {
  before: string;
  after: string;
  dimensions: PublicBetaHealthDimension[];
}

export interface SurfaceParityContract {
  surfaceId: SurfaceParityId;
  surfaceOwner: string;
  roleVisibility: Record<SurfaceParityRole, SurfaceRoleVisibility>;
  canonicalRoute: string;
  routeAliases: string[];
  featureId: string;
  featureRegistrationStatus: "registered" | "classified_system_internal" | "explicit_exception";
  dataSources: string[];
  backendRoutesOrActions: string[];
  requiredStates: SurfaceParityState[];
  telemetryEvents: string[];
  debugLane: string;
  scoreDimensionImpact: SurfaceParityScoreImpact;
  mobileDensityStatus: SurfaceMobileDensityStatus;
  rolePermissionStatus: SurfaceRolePermissionStatus;
  oldLogicStatus: SurfaceOldLogicStatus;
  parityNotes: string[];
}

export interface SupersededParityValidator {
  id: string;
  packageScript: string;
  status: "supporting_evidence" | "superseded_removed" | "still_required";
  authority: "surface_parity_doctrine" | "feature_registration_gate" | "surface_specific_validator";
  reason: string;
}

export type SurfaceParityDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_parity_logic_to_remove"
  | "stale_surface_doctrine_to_remove"
  | "duplicate_parity_validator_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "unsafe_unknown";

export interface SurfaceParityDirtyFile {
  path: string;
  classification: SurfaceParityDirtyClassification;
}

export interface SurfaceParityDoctrineReport {
  reportKey: "surface-parity-doctrine";
  doctrineVersion: typeof SURFACE_PARITY_DOCTRINE_VERSION;
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  majorSurfacesRegistered: number;
  majorSurfaceIds: SurfaceParityId[];
  surfaces: SurfaceParityContract[];
  duplicateParityValidatorsRetired: string[];
  activeSupportingParityValidators: string[];
  supersededParityValidators: SupersededParityValidator[];
  dirtyFiles: SurfaceParityDirtyFile[];
  scoreDimensionBeforeAfter: Record<SurfaceParityId, SurfaceParityScoreImpact>;
  validationFailures: string[];
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function missingRoles(surface: SurfaceParityContract) {
  return SURFACE_PARITY_ROLES.filter((role) => !surface.roleVisibility[role]);
}

function statesMatch(surface: SurfaceParityContract) {
  return surface.requiredStates.length === SURFACE_PARITY_REQUIRED_STATES.length
    && SURFACE_PARITY_REQUIRED_STATES.every((state) => surface.requiredStates.includes(state));
}

export function validateSurfaceParityRegistry(
  registry: readonly SurfaceParityContract[],
  supersededValidators: readonly SupersededParityValidator[] = [],
) {
  const failures: string[] = [];
  const ids = new Set<SurfaceParityId>();

  for (const requiredId of MAJOR_SURFACE_PARITY_IDS) {
    if (!registry.some((surface) => surface.surfaceId === requiredId)) {
      failures.push(`${requiredId} lacks surface parity registry entry.`);
    }
  }

  for (const surface of registry) {
    if (ids.has(surface.surfaceId)) failures.push(`${surface.surfaceId} is duplicated.`);
    ids.add(surface.surfaceId);

    if (!surface.surfaceOwner) failures.push(`${surface.surfaceId} lacks surface owner.`);
    if (!surface.canonicalRoute) failures.push(`${surface.surfaceId} lacks canonical route.`);
    if (!surface.featureId) failures.push(`${surface.surfaceId} lacks feature id.`);
    if (missingRoles(surface).length > 0) failures.push(`${surface.surfaceId} lacks role visibility for ${missingRoles(surface).join(", ")}.`);
    if (Object.values(surface.roleVisibility).some((value) => !value || value === "hidden" && surface.rolePermissionStatus === "clear")) {
      failures.push(`${surface.surfaceId} has ambiguous role visibility.`);
    }
    if (!statesMatch(surface)) failures.push(`${surface.surfaceId} lacks full loading/empty/ready/degraded/error/permission/not_configured state contract.`);
    if (surface.dataSources.length === 0) failures.push(`${surface.surfaceId} lacks data source contract.`);
    if (surface.backendRoutesOrActions.length === 0) failures.push(`${surface.surfaceId} lacks backend route/action contract.`);
    if (surface.telemetryEvents.length === 0) failures.push(`${surface.surfaceId} lacks telemetry events.`);
    if (!surface.debugLane) failures.push(`${surface.surfaceId} lacks debug lane.`);
    if (!surface.scoreDimensionImpact.before || !surface.scoreDimensionImpact.after || surface.scoreDimensionImpact.dimensions.length === 0) {
      failures.push(`${surface.surfaceId} lacks score dimension before/after impact.`);
    }
    if (!surface.mobileDensityStatus) failures.push(`${surface.surfaceId} lacks mobile density status.`);
    if (!surface.rolePermissionStatus) failures.push(`${surface.surfaceId} lacks role permission status.`);
    if (!surface.oldLogicStatus) failures.push(`${surface.surfaceId} lacks old logic status.`);
  }

  const activeDuplicateAuthority = supersededValidators.filter((validator) =>
    validator.authority !== "surface_parity_doctrine"
    && validator.status !== "still_required"
  );
  for (const validator of activeDuplicateAuthority) {
    failures.push(`${validator.packageScript} remains active without surface parity doctrine authority.`);
  }

  return unique(failures);
}
