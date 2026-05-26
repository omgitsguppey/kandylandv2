export const CANONICAL_SERVER_UNLOCK_EVENT_NAME = "drop_unlocked" as const;

export const CANONICAL_SERVER_UNLOCK_ALIASES = [
  CANONICAL_SERVER_UNLOCK_EVENT_NAME,
  "drop_unwrapped",
  "unlock_drop_success",
  "entitlement_granted",
] as const;

export type UnlockTelemetryBlocker =
  | "none"
  | "missing_server_unlock_telemetry"
  | "missing_transaction_link"
  | "non_idempotent_event"
  | "double_count_risk";

export interface ServerUnlockTelemetryInput {
  userId: string;
  dropId: string;
  transactionId: string;
  entitlementId: string;
  gumdropsSpent: number;
  purchasedAmountSpent: number;
  rewardAmountSpent: number;
  entitlementState: "granted" | "already_unlocked" | "subscription_included";
  creatorId?: string | null;
  route: string;
  sourceComponent: string;
}

export interface ServerUnlockTelemetryEvent {
  eventName: typeof CANONICAL_SERVER_UNLOCK_EVENT_NAME;
  userId: string;
  eventId: string;
  idempotencyKey: string;
  params: Record<string, string | number | boolean>;
}

function requireString(value: string, field: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error(`${field} is required for canonical server unlock telemetry.`);
  }
  return cleaned;
}

function sanitizeIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 96);
}

export function buildServerUnlockTelemetryEvent(input: ServerUnlockTelemetryInput): ServerUnlockTelemetryEvent {
  const userId = requireString(input.userId, "userId");
  const dropId = requireString(input.dropId, "dropId");
  const transactionId = requireString(input.transactionId || input.entitlementId, "transactionId");
  const entitlementId = requireString(input.entitlementId, "entitlementId");
  const eventId = `${CANONICAL_SERVER_UNLOCK_EVENT_NAME}:${sanitizeIdPart(transactionId)}:${sanitizeIdPart(dropId)}`;
  const gumdropsSpent = Math.max(0, Math.round(input.gumdropsSpent));
  const purchasedAmountSpent = Math.max(0, Math.round(input.purchasedAmountSpent));
  const rewardAmountSpent = Math.max(0, Math.round(input.rewardAmountSpent));

  return {
    eventName: CANONICAL_SERVER_UNLOCK_EVENT_NAME,
    userId,
    eventId,
    idempotencyKey: eventId,
    params: {
      event_id: eventId,
      eventId,
      idempotency_key: eventId,
      idempotencyKey: eventId,
      user_id: userId,
      userId,
      drop_id: dropId,
      dropId,
      transaction_id: transactionId,
      transactionId,
      entitlement_id: entitlementId,
      entitlementId,
      gumdrops_spent: gumdropsSpent,
      gumdropsSpent,
      unlock_cost: gumdropsSpent,
      price_gd: gumdropsSpent,
      purchased_amount_spent: purchasedAmountSpent,
      purchasedAmountSpent,
      paid_gd_used: purchasedAmountSpent,
      reward_amount_spent: rewardAmountSpent,
      rewardAmountSpent,
      reward_gd_used: rewardAmountSpent,
      entitlement_state: input.entitlementState,
      entitlementState: input.entitlementState,
      unlock_source: input.entitlementState === "subscription_included" ? "creator_subscription" : "gumdrops",
      sourceTruth: "server_unlock_route",
      source_truth: "server_unlock_route",
      source_component: input.sourceComponent,
      route: input.route,
      verifiedServerSide: true,
      verified_server_side: true,
      ...(input.creatorId ? { creator_id: input.creatorId, target_creator_id: input.creatorId } : {}),
    },
  };
}

export function classifyUnlockTelemetryCoverage(input: {
  unlockTransactionCount: number;
  telemetryEventCount: number;
}) {
  const expectedUnlockEvents = Math.max(0, Math.round(input.unlockTransactionCount));
  const unlockTelemetryEvents = Math.max(0, Math.round(input.telemetryEventCount));
  const missingUnlockTelemetryCount = Math.max(expectedUnlockEvents - unlockTelemetryEvents, 0);
  const coveragePct = expectedUnlockEvents > 0
    ? Number(((unlockTelemetryEvents / expectedUnlockEvents) * 100).toFixed(2))
    : 100;
  const blocker: UnlockTelemetryBlocker = missingUnlockTelemetryCount > 0 ? "missing_server_unlock_telemetry" : "none";

  return {
    expectedUnlockEvents,
    unlockTelemetryEvents,
    missingUnlockTelemetryCount,
    coveragePct,
    state: expectedUnlockEvents <= 0 ? "review" as const : blocker === "none" ? "pass" as const : "fail" as const,
    passAllowed: expectedUnlockEvents > 0 && blocker === "none",
    blocker,
    nextAction: blocker === "missing_server_unlock_telemetry"
      ? "Wire canonical server unlock telemetry after successful drops/unlock before promoting unlock funnel parity."
      : "No action required.",
  };
}
