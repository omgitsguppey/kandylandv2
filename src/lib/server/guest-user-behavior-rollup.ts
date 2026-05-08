import "server-only";

import type { BehavioralTimelineFact, BehavioralTimelineSourceTruth } from "@/lib/behavioral/behavioral-timeline-contract";
import { computeBehavioralConfidenceV2 } from "@/lib/behavioral/behavioral-confidence-v2";
import type {
  BehavioralSourceBreakdown,
  GuestUserBehaviorProfile,
  GuestUserBehaviorRollup,
} from "@/lib/behavioral/guest-user-behavior-contract";

function blankSourceBreakdown(): BehavioralSourceBreakdown {
  return {
    client: 0,
    server: 0,
    canonical: 0,
    materialized: 0,
    legacy: 0,
    ga4_optional: 0,
  };
}

function newProfile(): GuestUserBehaviorProfile {
  return {
    actionCount: 0,
    meaningfulActionCount: 0,
    firstSeenAt: 0,
    lastSeenAt: 0,
    lastMeaningfulActionAt: 0,
    topRoutes: [],
    topDrops: [],
    topCreators: [],
    previewCount: 0,
    unlockCount: 0,
    validWatchTimeMs: 0,
    purchaseCount: 0,
    revenueUsd: 0,
    supportCount: 0,
    notificationReadCount: 0,
    confidence: 0,
    confidenceLabel: "insufficient",
    dataAvailabilityReason: "insufficient_sample",
    sourceBreakdown: blankSourceBreakdown(),
    privacyState: "unknown",
    issues: [],
  };
}

function topN(map: Map<string, number>, limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function sourceReliabilityFromTruth(sourceTruth: BehavioralTimelineSourceTruth) {
  if (sourceTruth === "canonical") return 1;
  if (sourceTruth === "server") return 0.95;
  if (sourceTruth === "materialized") return 0.9;
  if (sourceTruth === "client") return 0.7;
  if (sourceTruth === "ga4_optional") return 0.35;
  return 0.3;
}

function buildProfileFromFacts(
  facts: BehavioralTimelineFact[],
  mode: "guest_only" | "user_only" | "identity_linked",
): GuestUserBehaviorProfile {
  const profile = newProfile();
  if (facts.length === 0) {
    profile.dataAvailabilityReason = "insufficient_sample";
    profile.issues.push("insufficient_sample");
    return profile;
  }

  const routeCounts = new Map<string, number>();
  const dropCounts = new Map<string, number>();
  const creatorCounts = new Map<string, number>();
  let sourceReliabilityMax = 0;
  let hasServerOrCanonical = false;
  let legacyOnly = true;
  let privacyLimited = false;

  for (const fact of facts) {
    profile.actionCount += 1;
    if (fact.metricEligible) {
      profile.meaningfulActionCount += 1;
      profile.lastMeaningfulActionAt = Math.max(profile.lastMeaningfulActionAt, fact.timestampMs || 0);
    }
    profile.firstSeenAt = profile.firstSeenAt === 0 ? fact.timestampMs : Math.min(profile.firstSeenAt, fact.timestampMs);
    profile.lastSeenAt = Math.max(profile.lastSeenAt, fact.timestampMs);
    routeCounts.set(fact.route || "/", (routeCounts.get(fact.route || "/") || 0) + 1);
    if (fact.target.dropId) {
      dropCounts.set(fact.target.dropId, (dropCounts.get(fact.target.dropId) || 0) + 1);
    }
    if (fact.target.creatorId) {
      creatorCounts.set(fact.target.creatorId, (creatorCounts.get(fact.target.creatorId) || 0) + 1);
    }

    profile.sourceBreakdown[fact.sourceTruth] = (profile.sourceBreakdown[fact.sourceTruth] || 0) + 1;
    sourceReliabilityMax = Math.max(sourceReliabilityMax, fact.sourceReliability || sourceReliabilityFromTruth(fact.sourceTruth));
    if (fact.sourceTruth === "server" || fact.sourceTruth === "canonical") {
      hasServerOrCanonical = true;
    }
    if (fact.sourceTruth !== "legacy") {
      legacyOnly = false;
    }
    if (!fact.metricEligible && fact.metricExclusionReason?.includes("privacy")) {
      privacyLimited = true;
    }

    if (fact.normalizedAction.includes("preview")) profile.previewCount += 1;
    if (fact.normalizedAction.includes("unlock")) profile.unlockCount += 1;
    if (fact.normalizedAction.includes("purchase")) profile.purchaseCount += 1;
    if (fact.normalizedAction.includes("support")) profile.supportCount += 1;
    if (fact.normalizedAction.includes("notification_read")) profile.notificationReadCount += 1;
  }

  profile.topRoutes = topN(routeCounts);
  profile.topDrops = topN(dropCounts);
  profile.topCreators = topN(creatorCounts);

  const lineage = mode === "user_only" ? "identified_user" : mode === "identity_linked" ? "linked_guest_user" : legacyOnly ? "legacy_only" : "guest_only";
  const confidenceResult = computeBehavioralConfidenceV2({
    sourceReliabilityMax,
    lineage,
    sampleCount: profile.meaningfulActionCount || profile.actionCount,
    ageMs: Math.max(0, Date.now() - profile.lastSeenAt),
    maxFreshnessMs: 1000 * 60 * 60 * 24 * 7,
    requiredFieldsPresent: facts.filter((fact) => Boolean(fact.sessionId && fact.route && fact.eventName)).length,
    requiredFieldsTotal: Math.max(1, facts.length * 3),
    outcomeValidation: profile.purchaseCount > 0 || profile.unlockCount > 0 ? "validated" : profile.previewCount > 0 ? "interaction_only" : "none",
    hasServerOrCanonicalTruth: hasServerOrCanonical,
  });

  profile.confidence = confidenceResult.confidence;
  profile.confidenceLabel = confidenceResult.label;
  profile.privacyState = privacyLimited ? "privacy_limited" : "granted";
  profile.dataAvailabilityReason = privacyLimited
    ? "privacy_limited"
    : profile.meaningfulActionCount < 3
      ? "insufficient_sample"
      : "full_signal";
  if (legacyOnly) {
    profile.issues.push("legacy_fallback_used");
  }
  if (profile.meaningfulActionCount < 3) {
    profile.issues.push("insufficient_sample");
  }
  if (!hasServerOrCanonical) {
    if (profile.purchaseCount > 0) profile.issues.push("server_purchase_truth_missing");
    if (profile.unlockCount > 0) profile.issues.push("server_unlock_truth_missing");
  }
  return profile;
}

export function buildGuestUserBehaviorRollup(input: {
  guestFacts: BehavioralTimelineFact[];
  userFacts: BehavioralTimelineFact[];
  identityLinkedFacts: BehavioralTimelineFact[];
}): GuestUserBehaviorRollup {
  return {
    guestBehaviorProfile: buildProfileFromFacts(input.guestFacts, "guest_only"),
    userBehaviorProfile: buildProfileFromFacts(input.userFacts, "user_only"),
    identityLinkedJourneyProfile: buildProfileFromFacts(input.identityLinkedFacts, "identity_linked"),
  };
}
