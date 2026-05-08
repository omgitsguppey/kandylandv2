import type { BehavioralConsentState, BehavioralTimelineSourceTruth } from "@/lib/behavioral/behavioral-timeline-contract";
import type { BehavioralConfidenceLabel } from "@/lib/behavioral/behavioral-confidence-v2";

export type BehavioralRollupIssueCode =
  | "ga_not_connected_optional"
  | "guest_lineage_missing"
  | "identity_link_privacy_limited"
  | "insufficient_sample"
  | "legacy_fallback_used"
  | "watch_session_missing"
  | "server_purchase_truth_missing"
  | "server_unlock_truth_missing";

export type BehavioralSourceBreakdown = Record<BehavioralTimelineSourceTruth, number>;

export type GuestUserBehaviorProfile = {
  actionCount: number;
  meaningfulActionCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  lastMeaningfulActionAt: number;
  topRoutes: string[];
  topDrops: string[];
  topCreators: string[];
  previewCount: number;
  unlockCount: number;
  validWatchTimeMs: number;
  purchaseCount: number;
  revenueUsd: number;
  supportCount: number;
  notificationReadCount: number;
  confidence: number;
  confidenceLabel: BehavioralConfidenceLabel;
  dataAvailabilityReason: string;
  sourceBreakdown: BehavioralSourceBreakdown;
  privacyState: BehavioralConsentState | "privacy_limited";
  issues: BehavioralRollupIssueCode[];
};

export type GuestUserBehaviorRollup = {
  guestBehaviorProfile: GuestUserBehaviorProfile;
  userBehaviorProfile: GuestUserBehaviorProfile;
  identityLinkedJourneyProfile: GuestUserBehaviorProfile;
};
