export const CANONICAL_METRIC_FACT_NAMES = [
  "purchase_verified",
  "gumdrops_purchased",
  "drop_unlocked",
  "entitlement_granted",
  "watch_session_verified",
  "daily_checkin_verified",
  "notification_read",
  "support_ticket_created",
  "creator_followed",
  "booking_created",
  "fan_pass_started",
] as const;

export type CanonicalMetricFactName = typeof CANONICAL_METRIC_FACT_NAMES[number];

export type MetricFactTruthSource = "server" | "canonical" | "materialized" | "legacy";

export type CanonicalMetricFact = {
  metricName: CanonicalMetricFactName;
  eventId: string;
  actorUserId: string;
  targetUserId: string;
  targetCreatorId: string;
  targetDropId: string;
  targetFileId: string;
  transactionId: string;
  sourceTruth: MetricFactTruthSource;
  sourceReliability: number;
  value: number;
  timestampMs: number;
  provenance:
    | "server_transaction"
    | "server_entitlement"
    | "watch_session_rollup"
    | "identified_event_fact"
    | "materialized_rollup"
    | "legacy";
};

