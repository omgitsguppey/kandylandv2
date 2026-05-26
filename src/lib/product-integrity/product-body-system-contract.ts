import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export const BODY_SYSTEM_IDS = [
  "identity_auth",
  "onboarding_signup",
  "wallet_commerce",
  "gumdrop_economy",
  "drops_unwrap_watch",
  "creator_profile_discovery",
  "creator_monetization",
  "fan_pass_entitlements",
  "chat_messaging",
  "daily_tasks_rewards",
  "notifications_pwa",
  "account_settings_support",
  "media_storage_access",
  "admin_debug_ops",
  "telemetry_behavioral_intelligence",
  "cost_runtime_infrastructure",
] as const;

export type BodySystemId = (typeof BODY_SYSTEM_IDS)[number];

export const PRODUCT_LIMB_KINDS = [
  "feature",
  "surface",
  "route",
  "api_route",
  "telemetry_event",
  "materializer",
  "metric",
  "journey_step",
  "debug_lane",
  "score_gate",
  "validator",
  "artifact",
] as const;

export type LimbKind = (typeof PRODUCT_LIMB_KINDS)[number];

export const PRODUCT_LIMB_STATUSES = [
  "connected",
  "orphaned",
  "duplicated",
  "stale",
  "in_flight",
  "deprecated",
  "unsafe_unknown",
] as const;

export type LimbStatus = (typeof PRODUCT_LIMB_STATUSES)[number];

export interface ProductLimbDebugVisibility {
  lane: string;
  defaultVisible: "issues_only" | "catalog_drilldown";
  source: string;
}

export interface ProductLimb {
  limbId: string;
  kind: LimbKind;
  label: string;
  status: LimbStatus;
  primaryBodySystem: BodySystemId;
  secondaryBodySystems: BodySystemId[];
  owner: string;
  sourceFiles: string[];
  validators: string[];
  scoreImpact: PublicBetaHealthDimension[];
  debugVisibility: ProductLimbDebugVisibility;
  nextAction: string;
  metadata?: Record<string, string | number | boolean | string[]>;
}

export type ProductBodyMapDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_body_map_logic_to_remove"
  | "stale_feature_inventory_to_remove"
  | "duplicate_feature_registry_logic_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "unsafe_unknown";

export interface ProductBodyMapDirtyFile {
  path: string;
  classification: ProductBodyMapDirtyClassification;
}

export interface ProductBodyMapOpenPullRequest {
  number: number;
  title: string;
  url: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
  classification: string;
}

export interface ProductBodyMapDebugLane {
  label: "Product body map";
  systemsCovered: number;
  totalLimbs: number;
  connectedCount: number;
  disconnectedCount: number;
  orphanedCount: number;
  duplicatedCount: number;
  staleCount: number;
  inFlightCount: number;
  deprecatedCount: number;
  unsafeUnknownCount: number;
  defaultView: "disconnected_only";
  rawCatalogDefaultOpen: false;
  sourceOfTruth: "src/lib/product-integrity/product-body-map.ts";
}

export interface ProductBodyMapReport {
  reportKey: "product-body-map";
  contractVersion: string;
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  bodySystemsCovered: number;
  bodySystems: BodySystemId[];
  totalLimbs: number;
  majorFeaturesMapped: number;
  majorSurfacesMapped: number;
  telemetryEventsMapped: number;
  metricsMapped: number;
  routesMapped: number;
  materializersMapped: number;
  disconnectedByStatus: Record<LimbStatus, number>;
  disconnectedLimbs: ProductLimb[];
  limbs: ProductLimb[];
  dirtyFiles: ProductBodyMapDirtyFile[];
  openPullRequests: ProductBodyMapOpenPullRequest[];
  debugLane: ProductBodyMapDebugLane;
  scoreDimensionImpact: Record<BodySystemId, PublicBetaHealthDimension[]>;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
}

export function isBodySystemId(value: string): value is BodySystemId {
  return (BODY_SYSTEM_IDS as readonly string[]).includes(value);
}

export function isProductLimbStatus(value: string): value is LimbStatus {
  return (PRODUCT_LIMB_STATUSES as readonly string[]).includes(value);
}
