import type {
  TelemetryConsentRequirement,
  TelemetryIdentityRequirement,
} from "@/lib/telemetry-catalog";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export type FeatureRegistrationId =
  | "wallet"
  | "user_dashboard"
  | "drops"
  | "library"
  | "creator_dashboard"
  | "creator_settings"
  | "creator_drop_manager"
  | "creator_profile"
  | "creator_timeline"
  | "broadcasts"
  | "fan_pass"
  | "admin_debug"
  | "analytics_telemetry"
  | "cookie_consent_privacy"
  | "behavior_tracking"
  | "runtime_smoke_substitutes"
  | "daily_checkin"
  | "notifications"
  | "auth_identity"
  | "support"
  | "security"
  | "search_discovery";

export type FeatureRouteClassification = "feature" | "system_internal";

export type FeatureRolloutStatus =
  | "complete"
  | "source_ready"
  | "runtime_unverified"
  | "operator_final_check"
  | "blocked";

export type FeatureLegacyOrphanRecoveryStatus =
  | "not_required"
  | "covered_by_legacy_recovery"
  | "orphan_registry_tracked"
  | "needs_recovery_plan";

export interface FeatureRouteRegistration {
  path: string;
  classification: FeatureRouteClassification;
  owner: string;
  reason: string;
}

export interface FeatureMetricRegistration {
  metricId: string;
  producer: string;
  consumer: string;
  sourcePath: string;
}

export interface FeatureDebugVisibility {
  debugVisible: boolean;
  owner: string;
  surfaces: string[];
}

export interface FeatureRegistration {
  featureId: FeatureRegistrationId;
  owner: string;
  routes: FeatureRouteRegistration[];
  uiSurfaces: string[];
  telemetryEvents: string[];
  consentModeRequirements: TelemetryConsentRequirement[];
  identityRequirements: TelemetryIdentityRequirement[];
  materializerLanes: string[];
  adminDebugVisibility: FeatureDebugVisibility;
  scoreDimensionsAffected: PublicBetaHealthDimension[];
  userCreatorAdminParityRequirements: string[];
  rolloutStatus: FeatureRolloutStatus;
  legacyOrphanRecoveryStatus: FeatureLegacyOrphanRecoveryStatus;
  uiMetrics: FeatureMetricRegistration[];
}

export interface FeatureRegistrationRouteCoverage {
  totalRoutes: number;
  mappedRoutes: string[];
  systemInternalRoutes: string[];
  unmappedRoutes: string[];
}

export interface FeatureRegistrationTelemetryCoverage {
  totalEvents: number;
  mappedEvents: string[];
  unmappedEvents: string[];
}

export interface FeatureRegistrationMetricCoverage {
  totalMetrics: number;
  producerLinkedMetrics: string[];
  orphanMetrics: string[];
}

export interface FeatureRegistrationGateReport {
  reportKey: "feature-registration-gate";
  registryVersion: string;
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  features: FeatureRegistration[];
  routeCoverage: FeatureRegistrationRouteCoverage;
  telemetryCoverage: FeatureRegistrationTelemetryCoverage;
  metricCoverage: FeatureRegistrationMetricCoverage;
  systemInternalRoutes: string[];
  validationFailures: string[];
}
