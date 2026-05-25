import { describe, expect, it } from "vitest";

import {
  CANONICAL_SERVER_PURCHASE_EVENT_NAME,
  buildServerPurchaseTelemetryEvent,
} from "@/lib/commerce/commerce-parity-contract";

describe("server purchase telemetry emission", () => {
  it("builds an idempotent canonical server purchase event after verified capture", () => {
    const event = buildServerPurchaseTelemetryEvent({
      userId: "fan_1",
      transactionId: "txn_1",
      orderId: "paypal_order_1",
      captureId: "paypal_capture_1",
      grossRevenueCents: 500,
      grossRevenueUsd: 5,
      deliveredGumDrops: 550,
      paidGumDrops: 500,
      bonusGumDrops: 50,
      bundleKey: "starter",
      route: "/api/paypal/capture",
      sourceComponent: "paypal_capture_route",
    });

    expect(event.eventName).toBe(CANONICAL_SERVER_PURCHASE_EVENT_NAME);
    expect(event.params).toMatchObject({
      event_id: "server_purchase_verified:txn_1:paypal_order_1",
      idempotency_key: "server_purchase_verified:txn_1:paypal_order_1",
      transaction_id: "txn_1",
      purchase_id: "txn_1",
      sourceTruth: "canonical",
      source_truth: "canonical",
      source_component: "paypal_capture_route",
      purchase_source: "server_paypal_capture",
      gross_revenue_cents: 500,
      grossRevenueCents: 500,
      delivered_gumdrops: 550,
      paid_gumdrops: 500,
      bonus_gumdrops: 50,
    });
    expect(event.params.provider_order_ref).toBe("pay...r_1");
    expect(event.params.provider_capture_ref).toBe("pay...e_1");
  });

  it("does not allow a purchase telemetry event without transaction linkage", () => {
    expect(() => buildServerPurchaseTelemetryEvent({
      userId: "fan_1",
      transactionId: "",
      orderId: "paypal_order_1",
      grossRevenueCents: 500,
      grossRevenueUsd: 5,
      deliveredGumDrops: 550,
      paidGumDrops: 500,
      bonusGumDrops: 50,
      route: "/api/paypal/capture",
      sourceComponent: "paypal_capture_route",
    })).toThrow(/transactionId/u);
  });
});
