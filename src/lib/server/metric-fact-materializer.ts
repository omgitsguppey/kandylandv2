import type { BehavioralEventFact, BehavioralNormalizedAction } from "@/lib/behavioral/event-fact-contract";
import type { CanonicalMetricFact } from "@/lib/behavioral/metric-fact-contract";

const ACTION_TO_METRIC: Partial<Record<BehavioralNormalizedAction, CanonicalMetricFact["metricName"]>> = {
  gumdrops_purchased: "gumdrops_purchased",
  drop_unlocked: "drop_unlocked",
  watch_session_completed: "watch_session_verified",
  daily_checkin_claimed: "daily_checkin_verified",
  notification_read: "notification_read",
  support_ticket_created: "support_ticket_created",
  creator_followed: "creator_followed",
  booking_completed: "booking_created",
  fan_pass_started: "fan_pass_started",
};

export function materializeCanonicalMetricFact(
  fact: BehavioralEventFact,
): CanonicalMetricFact | null {
  const metricName = ACTION_TO_METRIC[fact.normalizedAction];
  if (!metricName || fact.metricEligible === false) {
    return null;
  }

  const provenance = fact.sourceTruth === "materialized"
    ? "materialized_rollup"
    : fact.sourceTruth === "legacy"
      ? "legacy"
      : fact.normalizedAction === "gumdrops_purchased"
        ? "server_transaction"
        : fact.normalizedAction === "drop_unlocked"
          ? "server_entitlement"
          : fact.normalizedAction === "watch_session_completed"
            ? "watch_session_rollup"
            : "identified_event_fact";

  return {
    metricName,
    eventId: fact.eventId,
    actorUserId: fact.actorUserId ?? fact.userId ?? "",
    targetUserId: fact.targetUserId ?? "",
    targetCreatorId: fact.targetCreatorId ?? "",
    targetDropId: fact.targetDropId ?? fact.dropId ?? "",
    targetFileId: fact.targetFileId ?? fact.fileId ?? "",
    transactionId: fact.transactionId ?? "",
    sourceTruth: fact.sourceTruth === "client" ? "canonical" : fact.sourceTruth,
    sourceReliability: fact.sourceReliability ?? fact.confidence,
    value: fact.valueUsd ?? fact.gumDropsAmount ?? 1,
    timestampMs: fact.timestampMs,
    provenance,
  };
}

