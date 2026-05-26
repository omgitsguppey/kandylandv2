import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import type {
  CanonicalEventEnvelope,
  EventEnvelopeSource,
  EventPrivacyClass,
} from "@/lib/analytics/event-envelope-contract";
import type { SqlDatabaseExportRow, SqlDatabaseJourneyExport, SqlDatabaseSummary } from "@/lib/analytics/sql-database-parity-contract";
import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import type { UserJourneyEvent } from "@/lib/behavioral/user-journey-contract";
import type { BodySystemId } from "@/lib/product-integrity/product-body-system-contract";

export const CENTRAL_NORMALIZER_CONTRACT_VERSION = "2026.05.central-normalizer.1";

export const PRODUCT_SIGNAL_KINDS = [
  "RawProductSignal",
  "SurfaceStateSignal",
  "UserActionSignal",
  "BackendRouteSignal",
  "LifecycleSignal",
  "ErrorSignal",
  "PermissionSignal",
  "TransactionSignal",
  "MediaSignal",
  "AuthSignal",
  "NotificationSignal",
  "ChatSignal",
  "TaskSignal",
  "CreatorMonetizationSignal",
] as const;

export type ProductSignalKind = (typeof PRODUCT_SIGNAL_KINDS)[number];

export const CENTRAL_NORMALIZER_OUTPUT_KEYS = [
  "canonicalEventEnvelope",
  "normalizedEventFact",
  "globalMetricFact",
  "userMetricFact",
  "journeyEvent",
  "debugSignal",
  "scoreSignal",
  "exportFact",
  "costSignal",
] as const;

export type CentralNormalizerOutputKey = (typeof CENTRAL_NORMALIZER_OUTPUT_KEYS)[number];

export type CentralNormalizerConfidence = "exact" | "linked" | "inferred" | "weak" | "unknown";

export type CentralNormalizerSourceTruth =
  | "client"
  | "server"
  | "canonical"
  | "materialized"
  | "legacy"
  | "local_projection"
  | "unknown";

export type CentralNormalizerCostClass =
  | "hot_path_summary"
  | "batched_materializer"
  | "admin_debug_summary"
  | "export_batch"
  | "provider_api_blocked"
  | "unknown";

export type CentralNormalizerIdentityState =
  | "guest"
  | "signed_in"
  | "creator"
  | "admin"
  | "system"
  | "legacy_unknown"
  | string;

export interface CentralSignalWho {
  userId?: string | null;
  guestId?: string | null;
  sessionId?: string | null;
  linkId?: string | null;
  actorKind?: string | null;
}

export interface CentralSignalWhat {
  objectType?: string | null;
  objectId?: string | null;
  dropId?: string | null;
  creatorId?: string | null;
  fileId?: string | null;
  transactionId?: string | null;
  metricId?: string | null;
  state?: string | null;
  valueUsd?: number | null;
  gumDropsAmount?: number | null;
}

export interface CentralSignalWhen {
  occurredAtUtc?: string | null;
  timestampMs?: number | null;
}

export interface CentralSignalWhere {
  surface?: string | null;
  route?: string | null;
  sourceComponent?: string | null;
}

export interface CentralSignalHow {
  action?: string | null;
  method?: string | null;
  source?: EventEnvelopeSource | CentralNormalizerSourceTruth | string | null;
  reasonCode?: string | null;
}

export interface CentralSignalHowLong {
  durationMs?: number | null;
  activeMs?: number | null;
  passiveMs?: number | null;
  idleMs?: number | null;
  hiddenMs?: number | null;
}

export interface RawProductSignal {
  signalId?: string | null;
  signalKind: ProductSignalKind;
  eventName: string;
  eventVersion?: number | null;
  featureId?: string | null;
  surface?: string | null;
  bodySystem?: BodySystemId | null;
  who?: CentralSignalWho | null;
  what?: CentralSignalWhat | null;
  when?: CentralSignalWhen | null;
  where?: CentralSignalWhere | null;
  how?: CentralSignalHow | null;
  howLong?: CentralSignalHowLong | null;
  identityState?: CentralNormalizerIdentityState | null;
  confidence?: CentralNormalizerConfidence | null;
  sourceTruth?: CentralNormalizerSourceTruth | string | null;
  dedupeKey?: string | null;
  privacyClass?: EventPrivacyClass | null;
  costClass?: CentralNormalizerCostClass | null;
  debugVisibility?: string | null;
  scoreImpact?: PublicBetaHealthDimension[] | string[] | null;
  metadata?: Record<string, unknown> | null;
}

export type SurfaceStateSignal = RawProductSignal & { signalKind: "SurfaceStateSignal" };
export type UserActionSignal = RawProductSignal & { signalKind: "UserActionSignal" };
export type BackendRouteSignal = RawProductSignal & { signalKind: "BackendRouteSignal" };
export type LifecycleSignal = RawProductSignal & { signalKind: "LifecycleSignal" };
export type ErrorSignal = RawProductSignal & { signalKind: "ErrorSignal" };
export type PermissionSignal = RawProductSignal & { signalKind: "PermissionSignal" };
export type TransactionSignal = RawProductSignal & { signalKind: "TransactionSignal" };
export type MediaSignal = RawProductSignal & { signalKind: "MediaSignal" };
export type AuthSignal = RawProductSignal & { signalKind: "AuthSignal" };
export type NotificationSignal = RawProductSignal & { signalKind: "NotificationSignal" };
export type ChatSignal = RawProductSignal & { signalKind: "ChatSignal" };
export type TaskSignal = RawProductSignal & { signalKind: "TaskSignal" };
export type CreatorMonetizationSignal = RawProductSignal & { signalKind: "CreatorMonetizationSignal" };

export type ProductSignal =
  | RawProductSignal
  | SurfaceStateSignal
  | UserActionSignal
  | BackendRouteSignal
  | LifecycleSignal
  | ErrorSignal
  | PermissionSignal
  | TransactionSignal
  | MediaSignal
  | AuthSignal
  | NotificationSignal
  | ChatSignal
  | TaskSignal
  | CreatorMonetizationSignal;

export interface CentralNormalizerRequiredFields {
  who: boolean;
  what: boolean;
  when: boolean;
  where: boolean;
  how: boolean;
  howLong: boolean;
  identityState: boolean;
  confidence: boolean;
  sourceTruth: boolean;
  bodySystem: boolean;
  dedupeKey: boolean;
  privacyClass: boolean;
  costClass: boolean;
  debugVisibility: boolean;
  scoreImpact: boolean;
}

export interface CentralMetricFact {
  metricScope: "global" | "user";
  metricIds: string[];
  bodySystem: BodySystemId;
  sourceEventId: string;
  dedupeKey: string;
  confidence: CentralNormalizerConfidence;
  sourceTruth: CentralNormalizerSourceTruth | string;
}

export interface CentralExportFact {
  exportRowKind: "event_fact";
  row: SqlDatabaseExportRow;
  globalSummary: SqlDatabaseSummary;
  userSummary: SqlDatabaseSummary;
  journeyExport: SqlDatabaseJourneyExport | null;
}

export interface CentralDebugSignal {
  laneId: "central_normalizer";
  label: "Central normalizer";
  status: "normalized" | "failed";
  bodySystem: BodySystemId | "missing";
  eventName: string;
  missingFields: string[];
  normalizationFailures: string[];
  debugVisibility: string;
  scoreImpact: PublicBetaHealthDimension[];
  sourceOfTruth: "src/lib/product-integrity/central-normalizer.ts";
}

export interface CentralScoreSignal {
  canFeedScore: boolean;
  dimensions: PublicBetaHealthDimension[];
  bodySystem: BodySystemId | "missing";
  blockerType: "none" | "normalization_failure" | "missing_identity" | "missing_body_system";
  scoreImpact: PublicBetaHealthDimension[];
}

export interface CentralCostSignal {
  costClass: CentralNormalizerCostClass;
  costGuard: "hot_path_summary" | "batched_summary_first" | "provider_call_blocked" | "unknown";
  providerCallRequired: false;
  nextAction: string;
}

export interface CentralNormalizerOutput {
  status: "normalized" | "failed";
  signalKind: ProductSignalKind;
  eventName: string;
  bodySystem: BodySystemId | "missing";
  requiredFields: CentralNormalizerRequiredFields;
  normalizationFailures: string[];
  canonicalEventEnvelope: CanonicalEventEnvelope;
  normalizedEventFact: BehavioralEventFact | null;
  globalMetricFact: CentralMetricFact | null;
  userMetricFact: CentralMetricFact | null;
  journeyEvent: UserJourneyEvent | null;
  debugSignal: CentralDebugSignal;
  scoreSignal: CentralScoreSignal;
  exportFact: CentralExportFact | null;
  costSignal: CentralCostSignal;
}

export type CentralLegacyPathwayClassification =
  | "central_normalizer_adapter"
  | "legacy_alias_still_required"
  | "exemption_documented"
  | "stale_removed"
  | "unsafe_unknown";

export interface CentralNormalizerLegacyPathway {
  pathwayId: string;
  sourceFile: string;
  classification: CentralLegacyPathwayClassification;
  reason: string;
  nextAction: string;
}

export interface CentralNormalizerDebugLane {
  label: "Central normalizer";
  signalsReceived: number;
  normalizedSuccessfully: number;
  failedNormalization: number;
  missingBodySystem: number;
  missingIdentity: number;
  missingMetricRoute: number;
  missingDebugRoute: number;
  missingExportRoute: number;
  legacyAliasCount: number;
  unsafeUnknownCount: number;
  defaultView: "issues_only";
  rawCatalogDefaultOpen: false;
  sourceOfTruth: "src/lib/product-integrity/central-normalizer.ts";
}

export type CentralNormalizerDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_normalizer_logic_to_remove"
  | "duplicate_normalizer_logic_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "unsafe_unknown";

export interface CentralNormalizerDirtyFile {
  path: string;
  classification: CentralNormalizerDirtyClassification;
}

export interface CentralNormalizerOpenPullRequest {
  number: number;
  title: string;
  url: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
  classification: string;
}

export interface CentralNormalizerSpineReport {
  reportKey: "central-normalizer-spine";
  contractVersion: string;
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  signalKindsCovered: ProductSignalKind[];
  outputChannelsCovered: CentralNormalizerOutputKey[];
  sampleStatus: CentralNormalizerOutput["status"];
  sampleBodySystem: BodySystemId | "missing";
  adaptersConnected: string[];
  legacyPathways: CentralNormalizerLegacyPathway[];
  debugLane: CentralNormalizerDebugLane;
  scoreDimensions: PublicBetaHealthDimension[];
  dirtyFiles: CentralNormalizerDirtyFile[];
  openPullRequests: CentralNormalizerOpenPullRequest[];
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
}
