import type { IdentifiedMetricFamily, IdentifiedMetricParityFact } from "@/lib/behavioral/event-fact-normalizer";

type ActiveUserPatchInput = {
  uid: string;
  timestampMs: number;
  eventName: string;
  pagePath: string;
  username: string;
  semanticScopeLabel: string;
  componentName: string;
  eventModules: string;
  source: string;
  parityFact: IdentifiedMetricParityFact;
};

function isMeaningfulAction(fact: IdentifiedMetricParityFact) {
  if (!fact.metricEligible) {
    return false;
  }

  return fact.metricFamily !== "notification" && fact.metricFamily !== "admin";
}

function metricFamilyTimestampField(metricFamily: IdentifiedMetricFamily | "") {
  switch (metricFamily) {
    case "commerce":
      return "lastCommerceActionAt";
    case "content":
      return "lastContentActionAt";
    case "watch":
      return "lastWatchActionAt";
    case "support":
      return "lastSupportActionAt";
    default:
      return "";
  }
}

export function buildIdentifiedActiveUserPatch(input: ActiveUserPatchInput) {
  const patch: Record<string, unknown> = {
    uid: input.uid,
    username: input.username,
    lastSeenAt: input.timestampMs,
    lastSeenEventName: input.eventName,
    lastEventName: input.eventName,
    lastPagePath: input.pagePath,
    lastSemanticScopeLabel: input.semanticScopeLabel,
    lastComponentName: input.componentName,
    lastEventModules: input.eventModules,
    source: input.source,
    updatedAt: Date.now(),
  };

  if (isMeaningfulAction(input.parityFact)) {
    patch.lastMeaningfulActionAt = input.timestampMs;
    patch.lastMeaningfulActionName = input.parityFact.normalizedAction || input.eventName;
  }

  const familyTimestampField = metricFamilyTimestampField(input.parityFact.metricFamily);
  if (familyTimestampField) {
    patch[familyTimestampField] = input.timestampMs;
  }

  if (!input.parityFact.metricEligible && input.parityFact.metricExclusionReason) {
    patch.metricExclusionReason = input.parityFact.metricExclusionReason;
  }

  return patch;
}
