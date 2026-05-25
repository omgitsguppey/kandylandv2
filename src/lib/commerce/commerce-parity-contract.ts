export const CANONICAL_SERVER_PURCHASE_EVENT_NAME = "server_purchase_verified" as const;

export const CANONICAL_SERVER_PURCHASE_ALIASES = [
  CANONICAL_SERVER_PURCHASE_EVENT_NAME,
  "purchase_verified",
  "paypal_capture_completed",
  "purchase_completed",
] as const;

export type CommerceTruthLayer =
  | "provider_confirmation"
  | "transaction_ledger"
  | "server_purchase_telemetry"
  | "commerce_rollup"
  | "purchase_journey";

export type PurchaseTelemetryBlocker =
  | "none"
  | "missing_telemetry"
  | "missing_transaction_link"
  | "non_idempotent_event"
  | "double_count_risk";

export interface ServerPurchaseTelemetryInput {
  userId: string;
  transactionId: string;
  orderId: string;
  captureId?: string | null;
  grossRevenueCents: number;
  grossRevenueUsd: number;
  deliveredGumDrops: number;
  paidGumDrops: number;
  bonusGumDrops: number;
  bundleKey?: string | null;
  route: string;
  sourceComponent: string;
}

export interface ServerPurchaseTelemetryEvent {
  eventName: typeof CANONICAL_SERVER_PURCHASE_EVENT_NAME;
  userId: string;
  eventId: string;
  idempotencyKey: string;
  params: Record<string, string | number | boolean>;
}

function requireString(value: string, field: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error(`${field} is required for canonical server purchase telemetry.`);
  }
  return cleaned;
}

function sanitizeIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 96);
}

export function redactProviderId(value?: string | null) {
  const cleaned = value?.trim() ?? "";
  if (!cleaned) return "";
  if (cleaned.length <= 6) return "***";
  return `${cleaned.slice(0, 3)}...${cleaned.slice(-3)}`;
}

export function buildServerPurchaseTelemetryEvent(input: ServerPurchaseTelemetryInput): ServerPurchaseTelemetryEvent {
  const transactionId = requireString(input.transactionId, "transactionId");
  const orderId = requireString(input.orderId, "orderId");
  const userId = requireString(input.userId, "userId");
  const eventId = `${CANONICAL_SERVER_PURCHASE_EVENT_NAME}:${sanitizeIdPart(transactionId)}:${sanitizeIdPart(orderId)}`;
  const providerOrderRef = redactProviderId(orderId);
  const providerCaptureRef = redactProviderId(input.captureId);

  return {
    eventName: CANONICAL_SERVER_PURCHASE_EVENT_NAME,
    userId,
    eventId,
    idempotencyKey: eventId,
    params: {
      event_id: eventId,
      eventId,
      idempotency_key: eventId,
      idempotencyKey: eventId,
      transaction_id: transactionId,
      transactionId,
      purchase_id: transactionId,
      purchaseId: transactionId,
      order_id: orderId,
      orderId,
      provider_order_ref: providerOrderRef,
      provider_capture_ref: providerCaptureRef,
      gross_revenue_cents: Math.max(0, Math.round(input.grossRevenueCents)),
      grossRevenueCents: Math.max(0, Math.round(input.grossRevenueCents)),
      gross_revenue_usd: Math.max(0, input.grossRevenueUsd),
      grossRevenueUsd: Math.max(0, input.grossRevenueUsd),
      value: Math.max(0, input.grossRevenueUsd),
      value_usd: Math.max(0, input.grossRevenueUsd),
      amount_usd: Math.max(0, input.grossRevenueUsd),
      currency: "USD",
      delivered_gumdrops: Math.max(0, Math.round(input.deliveredGumDrops)),
      deliveredGumDrops: Math.max(0, Math.round(input.deliveredGumDrops)),
      paid_gumdrops: Math.max(0, Math.round(input.paidGumDrops)),
      paidGumDrops: Math.max(0, Math.round(input.paidGumDrops)),
      bonus_gumdrops: Math.max(0, Math.round(input.bonusGumDrops)),
      bonusGumDrops: Math.max(0, Math.round(input.bonusGumDrops)),
      purchase_source: "server_paypal_capture",
      sourceTruth: "canonical",
      source_truth: "canonical",
      route: input.route,
      source_component: input.sourceComponent,
      verifiedServerSide: true,
      verified_server_side: true,
      ...(input.bundleKey ? { bundle_key: input.bundleKey, package_id: input.bundleKey } : {}),
    },
  };
}

export function classifyPurchaseTelemetryCoverage(input: {
  completedTransactionCount: number;
  telemetryEventCount: number;
}) {
  const expectedPurchaseEvents = Math.max(0, Math.round(input.completedTransactionCount));
  const purchaseTelemetryEvents = Math.max(0, Math.round(input.telemetryEventCount));
  const missingPurchaseTelemetryCount = Math.max(expectedPurchaseEvents - purchaseTelemetryEvents, 0);
  const coveragePct = expectedPurchaseEvents > 0
    ? Number(((purchaseTelemetryEvents / expectedPurchaseEvents) * 100).toFixed(2))
    : 100;
  const blocker: PurchaseTelemetryBlocker = missingPurchaseTelemetryCount > 0 ? "missing_telemetry" : "none";

  return {
    expectedPurchaseEvents,
    purchaseTelemetryEvents,
    missingPurchaseTelemetryCount,
    coveragePct,
    state: expectedPurchaseEvents <= 0 ? "review" as const : blocker === "none" ? "pass" as const : "fail" as const,
    passAllowed: expectedPurchaseEvents > 0 && blocker === "none",
    blocker,
    nextAction: blocker === "missing_telemetry"
      ? "Wire canonical server purchase telemetry after verified PayPal capture before promoting purchase funnel parity."
      : "No action required.",
  };
}
