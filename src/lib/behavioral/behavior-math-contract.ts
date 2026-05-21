export type BehaviorTrackingState = "enabled" | "disabled" | "unknown";
export type BehaviorConsentMode =
  | "unknown"
  | "necessary_only"
  | "minimal_analytics"
  | "full_analytics"
  | "full_behavioral";

export type BehaviorIdentityState =
  | "guest_only"
  | "user_only"
  | "guest_linked_to_user"
  | "unknown_legacy";

export type BehaviorEventType =
  | "page_view"
  | "profile_view"
  | "drop_open"
  | "click"
  | "hover"
  | "scroll"
  | "visibility"
  | "watch"
  | "follow"
  | "creator_interaction"
  | "purchase_intent"
  | "purchase_truth"
  | "identity"
  | "unknown";

export type BehaviorMetricConfidence = "exact" | "probable" | "weak" | "unknown";

export type BehaviorMetricName =
  | "pageViews"
  | "profileViews"
  | "dropOpens"
  | "clicks"
  | "scrollDepth"
  | "activeTimeMs"
  | "watchTimeMs"
  | "followerActions"
  | "purchaseIntent"
  | "purchaseTruthEvents"
  | "creatorInteractions";

export type BehaviorRawEventInput = {
  eventId?: string;
  eventName: string;
  eventType?: BehaviorEventType | string;
  timestampMs: number;
  sessionId?: string;
  anonymousVisitorId?: string;
  userId?: string;
  identityState: BehaviorIdentityState;
  trackingState: BehaviorTrackingState;
  consentMode?: BehaviorConsentMode;
  durationMs?: number;
  watchTimeMs?: number;
  watchScoreSource?: "watch_session_rollup" | "page_duration" | "visibility_duration" | "legacy_unknown" | string;
  scrollDepth?: number;
  targetCreatorId?: string;
  targetDropId?: string;
  sourceRoute?: string;
  dedupeKey?: string;
};

export type BehaviorIdentityLinkInput = {
  guestId: string;
  userId: string;
  sessionId?: string;
  identityLinkId?: string;
};

export type BehaviorMetricValue = {
  value: number;
  confidence: BehaviorMetricConfidence;
  evidence: string[];
};

export type BehaviorMetricSet = Record<BehaviorMetricName, BehaviorMetricValue>;

export type BehaviorAggregation = {
  id: string;
  metrics: BehaviorMetricSet;
  eventIds: string[];
  sourceSessions: string[];
  linkedGuestIds: string[];
  confidence: BehaviorMetricConfidence;
};

export type BehaviorEventEligibility = {
  eligible: boolean;
  reason:
    | "eligible"
    | "tracking_disabled"
    | "legacy_unknown"
    | "duplicate"
    | "consent_blocks_person_level_behavior"
    | "identity_only"
    | "watch_time_page_time_rejected";
};

export type BehaviorDedupeRule = {
  key: string;
  eventId: string;
  reason: "event_id" | "semantic_identity_session_time";
};

export type BehaviorMathInput = {
  events: BehaviorRawEventInput[];
  identityLinks?: BehaviorIdentityLinkInput[];
};

export type BehaviorMathSummary = {
  rawEvents: number;
  eligibleEvents: number;
  disabledEventsExcluded: number;
  legacyUnknownExcluded: number;
  duplicateEventsDeduped: number;
  consentBlockedBehaviorEvents: number;
  watchTimeFromPageTimeExcluded: number;
  linkedGuestEventsAttributedToUsers: number;
};

export type BehaviorMathDebugOutput = {
  behaviorMathHealth: "verified_local_contract";
  disabledTrackingHandling: "excluded_from_behavior_metrics";
  legacyRecoveryReadiness: "dry_run_only_from_2026_03_01";
  perUserConfidence: Record<string, BehaviorMetricConfidence>;
  watchTimeTruth: "watch_session_rollups_only_not_page_time";
};

export type BehaviorMathReport = {
  summary: BehaviorMathSummary;
  perSession: Record<string, BehaviorAggregation>;
  perGuest: Record<string, BehaviorAggregation>;
  perUser: Record<string, BehaviorAggregation>;
  linkedGuestToUser: Record<string, string>;
  legacyUnknown: BehaviorRawEventInput[];
  disabledExcluded: BehaviorRawEventInput[];
  dedupeRules: BehaviorDedupeRule[];
  eligibility: Record<string, BehaviorEventEligibility>;
  samplingRules: string[];
  summarizationRules: string[];
  debugOutput: BehaviorMathDebugOutput;
};
