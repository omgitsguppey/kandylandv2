import type { BehavioralConsentState } from "@/lib/behavioral/behavioral-timeline-contract";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";

export const ANALYTICS_IDENTITY_LINK_CONTRACT_VERSION = "analytics_identity_link_v1";
export const ANALYTICS_IDENTITY_LINK_COLLECTION = "analytics_identity_links";
// This version describes the existing ID algorithm; changing the label must not
// change stored IDs. buildGuestUserIdentityLinkId uses 32-bit FNV-1a over
// guestId|sessionId|userId and encodes the unsigned result in base 36.
export const ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION = "fnv1a32_guest_session_user_base36_v1";
export const ANALYTICS_IDENTITY_LINEAGE_LEGACY_OWNER_VERSION = "sha256_guest_subject_v1";

export type AnalyticsIdentityLineageOwnerState =
  | "current"
  | "owner_version_missing"
  | "legacy_owner_version"
  | "unsupported_owner_version";

export type AnalyticsIdentityLineageOwnerSummaryState =
  | "missing"
  | AnalyticsIdentityLineageOwnerState
  | "mixed_rejected";

export function classifyAnalyticsIdentityLineageOwnerVersion(
  value: unknown,
): AnalyticsIdentityLineageOwnerState {
  if (typeof value !== "string" || !value.trim()) return "owner_version_missing";
  if (value.trim() === ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION) return "current";
  if (value.trim() === ANALYTICS_IDENTITY_LINEAGE_LEGACY_OWNER_VERSION) return "legacy_owner_version";
  return "unsupported_owner_version";
}

export function summarizeAnalyticsIdentityLineageOwnerVersions(values: readonly unknown[]) {
  const states = values.map(classifyAnalyticsIdentityLineageOwnerVersion);
  const currentCount = states.filter((state) => state === "current").length;
  const rejectedCount = states.length - currentCount;
  const rejectedStates = Array.from(new Set(
    states.filter((state): state is Exclude<AnalyticsIdentityLineageOwnerState, "current"> => state !== "current"),
  ));
  const state: AnalyticsIdentityLineageOwnerSummaryState = states.length === 0
    ? "missing"
    : rejectedCount === 0
      ? "current"
      : currentCount > 0 || rejectedStates.length > 1
        ? "mixed_rejected"
        : rejectedStates[0];

  return { state, currentCount, rejectedCount, rejectedStates };
}

export type AnalyticsIdentityLinkRecord = {
  identityLinkId: string;
  ownerKeyVersion: typeof ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION;
  anonymousVisitorId: string;
  sessionId: string;
  userId: string;
  linkedAt: string;
  method: "login" | "signup" | "session_restore" | "admin_link" | "import" | "unknown";
  eligiblePastSessionIds: string[];
  consentState: BehavioralConsentState;
  consentMode?: ConsentMode;
  mergeAllowed: boolean;
  personLevelBehaviorAllowed?: boolean;
  confidence: number;
  linkageConfidenceSource?:
    | "full_behavioral_consent"
    | "identity_link_allowed_behavior_blocked"
    | "blocked_by_consent_mode";
  authTransitionId?: string;
  identityState?: "guest_linked_to_user";
  sourceTruth?: "guest_user_identity_transfer" | "canonical";
};
