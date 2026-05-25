export interface PurchaseJourneyNormalizationInput {
  purchaseTelemetryEventCount: number;
  completedTransactionCount: number;
  walletOpenCount: number;
  checkoutStartCount: number;
  uniquePurchaseKeys: string[];
}

export interface PurchaseJourneyNormalization {
  state: "pass" | "review" | "fail";
  purchaseJourneyStepCount: number;
  attributionGap: "none" | "missing_wallet_or_checkout_pre_events" | "missing_purchase_telemetry";
  revenueTruthSource: "ledger_provider";
  funnelTruthSource: "canonical_server_purchase_telemetry";
  doubleCountRisk: boolean;
  nextAction: string;
}

export function classifyPurchaseJourneyNormalization(input: PurchaseJourneyNormalizationInput): PurchaseJourneyNormalization {
  const uniquePurchaseCount = new Set(input.uniquePurchaseKeys.filter(Boolean)).size;
  const purchaseTelemetryEventCount = Math.max(0, Math.round(input.purchaseTelemetryEventCount));
  const completedTransactionCount = Math.max(0, Math.round(input.completedTransactionCount));
  const purchaseJourneyStepCount = Math.min(purchaseTelemetryEventCount, Math.max(uniquePurchaseCount, completedTransactionCount));
  const doubleCountRisk = purchaseTelemetryEventCount > Math.max(uniquePurchaseCount, completedTransactionCount);
  const missingPurchaseTelemetry = completedTransactionCount > 0 && purchaseTelemetryEventCount === 0;
  const missingPreEvents = input.walletOpenCount <= 0 || input.checkoutStartCount <= 0;

  return {
    state: doubleCountRisk || missingPurchaseTelemetry ? "fail" : missingPreEvents ? "pass" : "pass",
    purchaseJourneyStepCount,
    attributionGap: missingPurchaseTelemetry
      ? "missing_purchase_telemetry"
      : missingPreEvents
        ? "missing_wallet_or_checkout_pre_events"
        : "none",
    revenueTruthSource: "ledger_provider",
    funnelTruthSource: "canonical_server_purchase_telemetry",
    doubleCountRisk,
    nextAction: doubleCountRisk
      ? "Repair purchase event dedupe before using purchase journey metrics."
      : missingPurchaseTelemetry
        ? "Wire canonical server purchase telemetry after verified PayPal capture."
        : missingPreEvents
          ? "Keep purchase counted and classify missing wallet or checkout pre-events as attribution gaps."
          : "No action required.",
  };
}
