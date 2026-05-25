export type CommerceRollupMismatchReason =
  | "none"
  | "date_window_mismatch"
  | "duplicate_rollups"
  | "legacy_rollup_included"
  | "operator_confirmed_included"
  | "transaction_missing"
  | "telemetry_missing"
  | "source_mismatch"
  | "unknown";

export type CommerceComparableUnitsStatus =
  | "comparable_purchase_count"
  | "rollup_docs_not_purchase_count"
  | "incompatible_units";

export interface CommerceRollupReconciliationInput {
  selectedRange: string;
  transactionCount: number;
  rollupPurchaseCount: number;
  rollupDocumentCount: number;
  telemetryEventCount: number;
  completedTransactionIds: string[];
  rollupSourceIds: string[];
  duplicateRollupIds: string[];
  legacyRollupIds: string[];
  operatorConfirmedOnlyIds: string[];
  startDayKey?: string | null;
  endDayKey?: string | null;
  rollupStartDayKey?: string | null;
  rollupEndDayKey?: string | null;
}

export interface CommerceRollupReconciliation {
  selectedRange: string;
  state: "pass" | "review" | "fail";
  transactionCount: number;
  rollupPurchaseCount: number;
  telemetryEventCount: number;
  completedTransactionIds: string[];
  rollupSourceIds: string[];
  duplicateRollupIds: string[];
  legacyRollupIds: string[];
  operatorConfirmedOnlyIds: string[];
  missingTransactionIds: string[];
  missingTelemetryIds: string[];
  mismatchReason: CommerceRollupMismatchReason;
  comparableUnitsStatus: CommerceComparableUnitsStatus;
  dateWindowStatus: "aligned" | "mismatch" | "unknown";
  countDelta: number;
  confidence: number;
  nextAction: string;
  technicalEvidence: string;
}

function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function reconcileCommerceRollups(input: CommerceRollupReconciliationInput): CommerceRollupReconciliation {
  const transactionCount = Math.max(0, Math.round(input.transactionCount));
  const rollupPurchaseCount = Math.max(0, Math.round(input.rollupPurchaseCount));
  const telemetryEventCount = Math.max(0, Math.round(input.telemetryEventCount));
  const countDelta = Math.abs(transactionCount - rollupPurchaseCount);
  const completedTransactionIds = unique(input.completedTransactionIds);
  const rollupSourceIds = unique(input.rollupSourceIds);
  const duplicateRollupIds = unique(input.duplicateRollupIds);
  const legacyRollupIds = unique(input.legacyRollupIds);
  const operatorConfirmedOnlyIds = unique(input.operatorConfirmedOnlyIds);
  const dateWindowStatus = input.startDayKey && input.endDayKey && input.rollupStartDayKey && input.rollupEndDayKey
    ? input.startDayKey === input.rollupStartDayKey && input.endDayKey === input.rollupEndDayKey ? "aligned" : "mismatch"
    : "unknown";
  const comparableUnitsStatus: CommerceComparableUnitsStatus = input.rollupDocumentCount !== rollupPurchaseCount && rollupPurchaseCount === transactionCount
    ? "rollup_docs_not_purchase_count"
    : Number.isFinite(rollupPurchaseCount)
      ? "comparable_purchase_count"
      : "incompatible_units";
  const missingTelemetryIds = telemetryEventCount < transactionCount
    ? completedTransactionIds.slice(0, transactionCount - telemetryEventCount)
    : [];
  const missingTransactionIds = rollupPurchaseCount > transactionCount
    ? rollupSourceIds.slice(0, rollupPurchaseCount - transactionCount)
    : [];

  let mismatchReason: CommerceRollupMismatchReason = "none";
  if (dateWindowStatus === "mismatch") mismatchReason = "date_window_mismatch";
  else if (duplicateRollupIds.length > 0) mismatchReason = "duplicate_rollups";
  else if (legacyRollupIds.length > 0) mismatchReason = "legacy_rollup_included";
  else if (operatorConfirmedOnlyIds.length > 0) mismatchReason = "operator_confirmed_included";
  else if (missingTelemetryIds.length > 0 && countDelta > 0) mismatchReason = "telemetry_missing";
  else if (missingTransactionIds.length > 0) mismatchReason = "transaction_missing";
  else if (countDelta > 0) mismatchReason = "source_mismatch";

  const state: CommerceRollupReconciliation["state"] =
    mismatchReason === "none" ? "pass" : mismatchReason === "source_mismatch" && countDelta <= 1 ? "review" : "fail";
  const reference = Math.max(transactionCount, rollupPurchaseCount, 1);
  const confidence = state === "pass"
    ? 100
    : clampPct(100 - ((countDelta / reference) * 100) - (missingTelemetryIds.length > 0 ? 20 : 0));
  const nextAction = mismatchReason === "telemetry_missing"
    ? "Wire canonical server purchase telemetry after verified PayPal capture; do not backfill production in this batch."
    : mismatchReason === "date_window_mismatch"
      ? "Align transaction and commerce rollup date windows before comparing purchase counts."
      : mismatchReason === "duplicate_rollups"
        ? "Inspect duplicate commerce rollup source ids and repair the materializer dedupe key."
        : mismatchReason === "none"
          ? "No action required."
          : "Inspect commerce rollup source ids against completed transaction ids and classify legacy/operator-only records.";
  const unitLabel = comparableUnitsStatus === "rollup_docs_not_purchase_count"
    ? `${input.rollupDocumentCount.toLocaleString()} rollup document(s) represented ${rollupPurchaseCount.toLocaleString()} purchase(s)`
    : `${rollupPurchaseCount.toLocaleString()} rollup purchase(s)`;

  return {
    selectedRange: input.selectedRange,
    state,
    transactionCount,
    rollupPurchaseCount,
    telemetryEventCount,
    completedTransactionIds,
    rollupSourceIds,
    duplicateRollupIds,
    legacyRollupIds,
    operatorConfirmedOnlyIds,
    missingTransactionIds,
    missingTelemetryIds,
    mismatchReason,
    comparableUnitsStatus,
    dateWindowStatus,
    countDelta,
    confidence,
    nextAction,
    technicalEvidence: `${transactionCount.toLocaleString()} completed purchase transaction(s) vs ${unitLabel}. Telemetry events: ${telemetryEventCount.toLocaleString()}. Mismatch reason: ${mismatchReason}.`,
  };
}
