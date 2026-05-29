import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";

export const USER_TRACKING_LIVE_EVIDENCE_VERSION = "2026.05.user-tracking-evidence.1";

export interface UserTrackingLiveEvidenceInput {
  globalMetricsHydrated: number;
  guestMetricsHydrated?: number;
  signedInMetricsHydrated: number;
  linkedPersonMetricsHydrated: number;
  creatorRoleMetricsHydrated?: number;
  identityConfidence: IdentityConfidence;
  missingIdentityLinkCount?: number;
  panelMissingReason?: string | null;
}

export interface UserTrackingLiveEvidence {
  status: "verified" | "collecting" | "actionable_gap";
  clearsUserTrackingGate: boolean;
  globalActivityProof: boolean;
  individualActivityProof: boolean;
  gaps: string[];
  explanation: string;
  scoreImpact: "none" | "evidence_completeness" | "runtime_health";
}

const CONFIDENCE_RANK: Record<IdentityConfidence, number> = {
  unknown: 0,
  weak: 1,
  inferred: 2,
  linked: 3,
  exact: 4,
};

export function resolveUserTrackingLiveEvidence(input: UserTrackingLiveEvidenceInput): UserTrackingLiveEvidence {
  const userScopes = (input.guestMetricsHydrated ?? 0)
    + input.signedInMetricsHydrated
    + input.linkedPersonMetricsHydrated
    + (input.creatorRoleMetricsHydrated ?? 0);
  const globalActivityProof = input.globalMetricsHydrated > 0;
  const strongIdentity = CONFIDENCE_RANK[input.identityConfidence] >= CONFIDENCE_RANK.linked;
  const individualActivityProof = userScopes > 0 && strongIdentity;
  const gaps: string[] = [];
  if (globalActivityProof && userScopes === 0) gaps.push("global_without_user_mapping");
  if ((input.missingIdentityLinkCount ?? 0) > 0) gaps.push("identity_link_missing");
  if (input.panelMissingReason) gaps.push(input.panelMissingReason);

  return {
    status: individualActivityProof ? "verified" : gaps.length > 0 ? "actionable_gap" : "collecting",
    clearsUserTrackingGate: individualActivityProof,
    globalActivityProof,
    individualActivityProof,
    gaps,
    explanation: individualActivityProof
      ? "Exact or linked user metrics prove individual tracking."
      : globalActivityProof
        ? "Global activity does not prove individual user tracking; user scopes need exact or linked hydration."
        : "No bounded individual source window has proven activity or zero yet.",
    scoreImpact: individualActivityProof ? "none" : gaps.length > 0 ? "evidence_completeness" : "runtime_health",
  };
}

export function classifyUserMetricHydrationEvidence(input: UserTrackingLiveEvidenceInput) {
  return resolveUserTrackingLiveEvidence(input).status;
}

export function explainUserTrackingEvidenceGap(input: UserTrackingLiveEvidenceInput) {
  return resolveUserTrackingLiveEvidence(input).explanation;
}
