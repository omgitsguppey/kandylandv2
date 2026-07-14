export const BEHAVIORAL_TIMELINE_CONTRACT_VERSION = "behavioral_timeline_v1";

export type BehavioralTimelineActorType = "guest" | "user" | "creator" | "admin" | "system";
export type BehavioralTimelineSurface = "user" | "creator" | "admin" | "server" | "unknown";
export type BehavioralTimelineSourceTruth =
  | "client"
  | "server"
  | "canonical"
  | "materialized"
  | "legacy"
  | "ga4_optional";
export type BehavioralConsentState = "granted" | "denied" | "partial" | "not_required" | "unknown";

export type BehavioralTimelineFactTarget = {
  userId?: string;
  creatorId?: string;
  dropId?: string;
  fileId?: string;
  transactionId?: string;
  notificationId?: string;
  taskId?: string;
  threadId?: string;
};

export type BehavioralTimelineFact = {
  factId: string;
  idempotencyKey?: string;
  actorType: BehavioralTimelineActorType;
  actorUserId?: string;
  anonymousVisitorId?: string;
  sessionId?: string;
  identityLinkId?: string;
  normalizedAction: string;
  eventName: string;
  timestampMs: number;
  route: string;
  sourceComponent: string;
  surface: BehavioralTimelineSurface;
  target: BehavioralTimelineFactTarget;
  sourceTruth: BehavioralTimelineSourceTruth;
  sourceReliability: number;
  consentState: BehavioralConsentState;
  includeInGlobalEvents?: boolean;
  includeInPersonMetrics?: boolean;
  adminExcludedCount?: number;
  systemExcludedCount?: number;
  metricEligible: boolean;
  metricExclusionReason?: string;
  confidenceInputs: {
    schemaComplete: boolean;
    hasActor: boolean;
    hasTargetWhenRequired: boolean;
    hasSession: boolean;
    hasServerTruth: boolean;
  };
};

export const BEHAVIORAL_TIMELINE_COLLECTION = "behavioral_timeline_facts";
