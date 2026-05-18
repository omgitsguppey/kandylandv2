import type { BehavioralConsentState } from "@/lib/behavioral/behavioral-timeline-contract";

export const ANALYTICS_IDENTITY_LINK_CONTRACT_VERSION = "analytics_identity_link_v1";
export const ANALYTICS_IDENTITY_LINK_COLLECTION = "analytics_identity_links";

export type AnalyticsIdentityLinkRecord = {
  identityLinkId: string;
  anonymousVisitorId: string;
  sessionId: string;
  userId: string;
  linkedAt: string;
  method: "login" | "signup" | "session_restore" | "admin_link" | "import" | "unknown";
  eligiblePastSessionIds: string[];
  consentState: BehavioralConsentState;
  mergeAllowed: boolean;
  confidence: number;
  authTransitionId?: string;
  identityState?: "guest_linked_to_user";
  sourceTruth?: "guest_user_identity_transfer" | "canonical";
};
