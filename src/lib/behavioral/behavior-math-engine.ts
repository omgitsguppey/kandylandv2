import type {
  BehaviorAggregation,
  BehaviorDedupeRule,
  BehaviorEventEligibility,
  BehaviorMathInput,
  BehaviorMathReport,
  BehaviorMetricConfidence,
  BehaviorMetricName,
  BehaviorMetricSet,
  BehaviorMetricValue,
  BehaviorRawEventInput,
} from "@/lib/behavioral/behavior-math-contract";

const METRIC_NAMES: BehaviorMetricName[] = [
  "pageViews",
  "profileViews",
  "dropOpens",
  "clicks",
  "scrollDepth",
  "activeTimeMs",
  "watchTimeMs",
  "followerActions",
  "purchaseIntent",
  "purchaseTruthEvents",
  "creatorInteractions",
];

const PURCHASE_INTENT_EVENTS = new Set([
  "begin_checkout",
  "checkout_started",
  "wallet_opened",
  "wallet_package_selected",
  "drop_unwrap_attempted",
  "creator_fan_pass_started",
  "fan_pass_started",
  "booking_started",
  "custom_request_started",
]);

const PURCHASE_TRUTH_EVENTS = new Set([
  "gumdrops_purchased",
  "purchase_completed",
  "drop_unlocked",
  "creator_subscription_started",
  "creator_custom_request_created",
  "creator_call_booking_created",
]);

const CREATOR_INTERACTION_EVENTS = new Set([
  "creator_profile_viewed",
  "creator_profile_link_clicked",
  "creator_search_selected",
  "creator_rail_impression",
  "creator_followed",
  "creator_unfollowed",
  "creator_not_interested",
  "creator_muted",
]);

function emptyMetric(): BehaviorMetricValue {
  return {
    value: 0,
    confidence: "unknown",
    evidence: [],
  };
}

function emptyMetrics(): BehaviorMetricSet {
  return Object.fromEntries(METRIC_NAMES.map((metric) => [metric, emptyMetric()])) as BehaviorMetricSet;
}

function createAggregation(id: string): BehaviorAggregation {
  return {
    id,
    metrics: emptyMetrics(),
    eventIds: [],
    sourceSessions: [],
    linkedGuestIds: [],
    confidence: "unknown",
  };
}

function eventKey(event: BehaviorRawEventInput, index: number) {
  return event.eventId || event.dedupeKey || `${event.eventName}:${event.sessionId ?? ""}:${event.userId ?? ""}:${event.anonymousVisitorId ?? ""}:${event.timestampMs}:${index}`;
}

function semanticDedupeKey(event: BehaviorRawEventInput) {
  return event.dedupeKey || `${event.eventId ?? event.eventName}:${event.sessionId ?? ""}:${event.timestampMs}`;
}

function normalizeEventName(event: BehaviorRawEventInput) {
  return event.eventName.toLowerCase();
}

function classifyMetric(event: BehaviorRawEventInput): BehaviorMetricName | null {
  const eventName = normalizeEventName(event);
  const eventType = `${event.eventType ?? ""}`.toLowerCase();

  if (eventType === "page_view" || eventName.includes("page_view")) return "pageViews";
  if (eventType === "profile_view" || eventName.includes("creator_profile")) return "profileViews";
  if (eventType === "drop_open" || eventName.includes("drop_preview_opened") || eventName.includes("drop_open")) return "dropOpens";
  if (eventType === "purchase_intent" || PURCHASE_INTENT_EVENTS.has(eventName)) return "purchaseIntent";
  if (eventType === "purchase_truth" || PURCHASE_TRUTH_EVENTS.has(eventName)) return "purchaseTruthEvents";
  if (eventType === "click" || eventName.includes("clicked") || eventName.includes("checkout")) return "clicks";
  if (eventType === "scroll") return "scrollDepth";
  if (eventType === "follow" || eventName.includes("followed") || eventName.includes("unfollowed")) return "followerActions";
  if (eventType === "creator_interaction" || CREATOR_INTERACTION_EVENTS.has(eventName)) return "creatorInteractions";
  if (eventType === "watch" || eventName.includes("watch_session") || eventName.includes("runtime_watch")) return "watchTimeMs";
  if (eventType === "visibility" || eventName.includes("page_engaged")) return "activeTimeMs";

  return null;
}

function metricConfidence(event: BehaviorRawEventInput, metric: BehaviorMetricName): BehaviorMetricConfidence {
  if (event.identityState === "unknown_legacy") return "unknown";
  if (metric === "watchTimeMs") {
    return event.watchScoreSource === "watch_session_rollup" ? "exact" : "unknown";
  }
  if (event.userId) return "exact";
  if (event.identityState === "guest_linked_to_user") return "probable";
  if (event.anonymousVisitorId) return "probable";
  return "weak";
}

function confidenceRank(confidence: BehaviorMetricConfidence) {
  return confidence === "exact" ? 3 : confidence === "probable" ? 2 : confidence === "weak" ? 1 : 0;
}

function mergeConfidence(a: BehaviorMetricConfidence, b: BehaviorMetricConfidence): BehaviorMetricConfidence {
  return confidenceRank(b) > confidenceRank(a) ? b : a;
}

function addMetric(
  aggregation: BehaviorAggregation,
  metric: BehaviorMetricName,
  amount: number,
  confidence: BehaviorMetricConfidence,
  evidence: string,
) {
  const target = aggregation.metrics[metric];
  target.value += amount;
  target.confidence = mergeConfidence(target.confidence, confidence);
  if (!target.evidence.includes(evidence)) {
    target.evidence.push(evidence);
  }
  aggregation.confidence = mergeConfidence(aggregation.confidence, confidence);
}

function addEventToAggregation(aggregation: BehaviorAggregation, event: BehaviorRawEventInput, key: string) {
  if (!aggregation.eventIds.includes(key)) {
    aggregation.eventIds.push(key);
  }
  if (event.sessionId && !aggregation.sourceSessions.includes(event.sessionId)) {
    aggregation.sourceSessions.push(event.sessionId);
  }
  if (event.anonymousVisitorId && event.identityState === "guest_linked_to_user" && !aggregation.linkedGuestIds.includes(event.anonymousVisitorId)) {
    aggregation.linkedGuestIds.push(event.anonymousVisitorId);
  }
}

function getOrCreate(record: Record<string, BehaviorAggregation>, id: string) {
  record[id] ??= createAggregation(id);
  return record[id];
}

function metricAmount(event: BehaviorRawEventInput, metric: BehaviorMetricName) {
  if (metric === "scrollDepth") {
    return Math.max(0, Math.min(100, Number(event.scrollDepth ?? 0)));
  }
  if (metric === "activeTimeMs") {
    return Math.max(0, Number(event.durationMs ?? 0));
  }
  if (metric === "watchTimeMs") {
    return Math.max(0, Number(event.watchTimeMs ?? 0));
  }
  return 1;
}

function secondaryMetrics(event: BehaviorRawEventInput, primaryMetric: BehaviorMetricName): BehaviorMetricName[] {
  const eventType = `${event.eventType ?? ""}`.toLowerCase();
  const eventName = normalizeEventName(event);
  const metrics: BehaviorMetricName[] = [];

  if (primaryMetric === "purchaseIntent" && (eventType === "click" || eventName.includes("checkout"))) {
    metrics.push("clicks");
  }
  if (primaryMetric === "profileViews" && CREATOR_INTERACTION_EVENTS.has(eventName)) {
    metrics.push("creatorInteractions");
  }
  if (primaryMetric === "followerActions") {
    metrics.push("creatorInteractions");
  }

  return metrics;
}

function shouldRejectPageTimeAsWatch(event: BehaviorRawEventInput) {
  const eventType = `${event.eventType ?? ""}`.toLowerCase();
  const eventName = normalizeEventName(event);
  return (eventType === "visibility" || eventName.includes("page_engaged"))
    && Number(event.durationMs ?? 0) > 0;
}

function shouldBlockPersonLevelBehaviorForConsent(event: BehaviorRawEventInput, metric: BehaviorMetricName) {
  if (!event.consentMode || event.consentMode === "full_behavioral") {
    return false;
  }

  if (metric === "pageViews" && !event.userId) {
    return false;
  }

  return metric !== "purchaseTruthEvents";
}

export function getBehaviorMetricConfidence(metric: BehaviorMetricValue): BehaviorMetricConfidence {
  return metric.confidence;
}

export function buildBehaviorMathReport(input: BehaviorMathInput): BehaviorMathReport {
  const linkedGuestToUser = Object.fromEntries((input.identityLinks ?? []).map((link) => [link.guestId, link.userId]));
  const perSession: Record<string, BehaviorAggregation> = {};
  const perGuest: Record<string, BehaviorAggregation> = {};
  const perUser: Record<string, BehaviorAggregation> = {};
  const legacyUnknown: BehaviorRawEventInput[] = [];
  const disabledExcluded: BehaviorRawEventInput[] = [];
  const dedupeRules: BehaviorDedupeRule[] = [];
  const eligibility: Record<string, BehaviorEventEligibility> = {};
  const seen = new Set<string>();

  let eligibleEvents = 0;
  let disabledEventsExcluded = 0;
  let legacyUnknownExcluded = 0;
  let duplicateEventsDeduped = 0;
  let consentBlockedBehaviorEvents = 0;
  let watchTimeFromPageTimeExcluded = 0;
  let linkedGuestEventsAttributedToUsers = 0;

  input.events.forEach((event, index) => {
    const key = eventKey(event, index);
    const eligibilityKey = eligibility[key] ? `${key}#${index}` : key;
    const semanticKey = semanticDedupeKey(event);

    if (seen.has(semanticKey)) {
      duplicateEventsDeduped += 1;
      dedupeRules.push({
        key: semanticKey,
        eventId: key,
        reason: event.eventId ? "event_id" : "semantic_identity_session_time",
      });
      eligibility[eligibilityKey] = { eligible: false, reason: "duplicate" };
      return;
    }
    seen.add(semanticKey);

    if (event.trackingState === "disabled") {
      disabledEventsExcluded += 1;
      disabledExcluded.push(event);
      eligibility[eligibilityKey] = { eligible: false, reason: "tracking_disabled" };
      return;
    }

    if (event.identityState === "unknown_legacy" || event.trackingState === "unknown") {
      legacyUnknownExcluded += 1;
      legacyUnknown.push(event);
      eligibility[eligibilityKey] = { eligible: false, reason: "legacy_unknown" };
      return;
    }

    if (shouldRejectPageTimeAsWatch(event)) {
      watchTimeFromPageTimeExcluded += 1;
    }

    const metric = classifyMetric(event);
    if (!metric) {
      eligibility[eligibilityKey] = { eligible: false, reason: "identity_only" };
      return;
    }

    if (shouldBlockPersonLevelBehaviorForConsent(event, metric)) {
      consentBlockedBehaviorEvents += 1;
      eligibility[eligibilityKey] = { eligible: false, reason: "consent_blocks_person_level_behavior" };
      return;
    }

    if (metric === "watchTimeMs" && event.watchScoreSource !== "watch_session_rollup") {
      watchTimeFromPageTimeExcluded += 1;
      eligibility[eligibilityKey] = { eligible: false, reason: "watch_time_page_time_rejected" };
      return;
    }

    const amount = metricAmount(event, metric);
    const confidence = metricConfidence(event, metric);
    const evidence = event.sourceRoute || event.eventName;
    eligibleEvents += 1;
    eligibility[eligibilityKey] = { eligible: true, reason: "eligible" };

    if (event.sessionId) {
      const session = getOrCreate(perSession, event.sessionId);
      addEventToAggregation(session, event, key);
      addMetric(session, metric, amount, confidence, evidence);
      for (const secondaryMetric of secondaryMetrics(event, metric)) {
        addMetric(session, secondaryMetric, metricAmount(event, secondaryMetric), confidence, evidence);
      }
    }

    const linkedUserId = event.anonymousVisitorId ? linkedGuestToUser[event.anonymousVisitorId] : "";
    const userId = event.userId || linkedUserId || "";
    if (userId) {
      const user = getOrCreate(perUser, userId);
      addEventToAggregation(user, event, key);
      if (linkedUserId && event.anonymousVisitorId && !user.linkedGuestIds.includes(event.anonymousVisitorId)) {
        user.linkedGuestIds.push(event.anonymousVisitorId);
      }
      addMetric(user, metric, amount, confidence, evidence);
      for (const secondaryMetric of secondaryMetrics(event, metric)) {
        addMetric(user, secondaryMetric, metricAmount(event, secondaryMetric), confidence, evidence);
      }
      if (linkedUserId && !event.userId) {
        linkedGuestEventsAttributedToUsers += 1;
      }
      return;
    }

    if (event.anonymousVisitorId) {
      const guest = getOrCreate(perGuest, event.anonymousVisitorId);
      addEventToAggregation(guest, event, key);
      addMetric(guest, metric, amount, confidence, evidence);
      for (const secondaryMetric of secondaryMetrics(event, metric)) {
        addMetric(guest, secondaryMetric, metricAmount(event, secondaryMetric), confidence, evidence);
      }
    }
  });

  return {
    summary: {
      rawEvents: input.events.length,
      eligibleEvents,
      disabledEventsExcluded,
      legacyUnknownExcluded,
      duplicateEventsDeduped,
      consentBlockedBehaviorEvents,
      watchTimeFromPageTimeExcluded,
      linkedGuestEventsAttributedToUsers,
    },
    perSession,
    perGuest,
    perUser,
    linkedGuestToUser,
    legacyUnknown,
    disabledExcluded,
    dedupeRules,
    eligibility,
    samplingRules: [
      "raw passive events may be sampled before persistence, but persisted summarized metrics remain source-labelled",
      "disabled tracking suppresses behavior metrics and cannot be summarized into user behavior",
    ],
    summarizationRules: [
      "aggregate by session first, then guest or user identity",
      "linked guest events are attributed once to the resolved user",
      "watch time comes only from watch_session_rollup evidence",
      "purchase intent is behavioral; purchase truth remains server-owned and separate",
    ],
    debugOutput: {
      behaviorMathHealth: "verified_local_contract",
      disabledTrackingHandling: "excluded_from_behavior_metrics",
      legacyRecoveryReadiness: "dry_run_only_from_2026_03_01",
      perUserConfidence: Object.fromEntries(Object.entries(perUser).map(([id, aggregation]) => [id, aggregation.confidence])),
      watchTimeTruth: "watch_session_rollups_only_not_page_time",
    },
  };
}
