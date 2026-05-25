export type UnlockRollupMismatchReason =
  | "none"
  | "incompatible_units"
  | "date_window_mismatch"
  | "duplicate_rollups"
  | "legacy_rollups_included"
  | "missing_server_unlock_telemetry"
  | "transaction_missing"
  | "rollup_overcount"
  | "unknown";

export type UnlockComparableUnitsStatus =
  | "comparable_unlock_count"
  | "rollup_docs_not_unlock_count"
  | "incompatible_units";

export interface UnlockRollupReconciliationInput {
  selectedRange: string;
  transactionCount: number;
  rollupUnlockCount: number;
  rollupDocumentCount: number;
  telemetryEventCount: number;
  completedTransactionIds: string[];
  rollupSourceIds: string[];
  duplicateRollupIds: string[];
  legacyRollupIds: string[];
  startDayKey?: string | null;
  endDayKey?: string | null;
  rollupStartDayKey?: string | null;
  rollupEndDayKey?: string | null;
}

export interface UnlockRollupReconciliation {
  selectedRange: string;
  state: "pass" | "review" | "fail";
  transactionCount: number;
  rollupUnlockCount: number;
  telemetryEventCount: number;
  completedTransactionIds: string[];
  rollupSourceIds: string[];
  duplicateRollupIds: string[];
  legacyRollupIds: string[];
  mismatchReason: UnlockRollupMismatchReason;
  comparableUnitsStatus: UnlockComparableUnitsStatus;
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

export function reconcileUnlockRollups(input: UnlockRollupReconciliationInput): UnlockRollupReconciliation {
  const transactionCount = Math.max(0, Math.round(input.transactionCount));
  const rollupUnlockCount = Math.max(0, Math.round(input.rollupUnlockCount));
  const telemetryEventCount = Math.max(0, Math.round(input.telemetryEventCount));
  const countDelta = Math.abs(transactionCount - rollupUnlockCount);
  const completedTransactionIds = unique(input.completedTransactionIds);
  const rollupSourceIds = unique(input.rollupSourceIds);
  const duplicateRollupIds = unique(input.duplicateRollupIds);
  const legacyRollupIds = unique(input.legacyRollupIds);
  const dateWindowStatus = input.startDayKey && input.endDayKey && input.rollupStartDayKey && input.rollupEndDayKey
    ? input.startDayKey === input.rollupStartDayKey && input.endDayKey === input.rollupEndDayKey ? "aligned" : "mismatch"
    : "unknown";
  const comparableUnitsStatus: UnlockComparableUnitsStatus = input.rollupDocumentCount !== rollupUnlockCount && rollupUnlockCount === transactionCount
    ? "rollup_docs_not_unlock_count"
    : Number.isFinite(rollupUnlockCount)
      ? "comparable_unlock_count"
      : "incompatible_units";

  let mismatchReason: UnlockRollupMismatchReason = "none";
  if (comparableUnitsStatus === "incompatible_units") mismatchReason = "incompatible_units";
  else if (dateWindowStatus === "mismatch") mismatchReason = "date_window_mismatch";
  else if (duplicateRollupIds.length > 0) mismatchReason = "duplicate_rollups";
  else if (legacyRollupIds.length > 0) mismatchReason = "legacy_rollups_included";
  else if (transactionCount > 0 && telemetryEventCount === 0 && countDelta > 0) mismatchReason = "missing_server_unlock_telemetry";
  else if (rollupUnlockCount > transactionCount) mismatchReason = "rollup_overcount";
  else if (transactionCount > rollupUnlockCount) mismatchReason = "transaction_missing";

  const state: UnlockRollupReconciliation["state"] =
    mismatchReason === "none" ? "pass" : mismatchReason === "rollup_overcount" && countDelta <= 2 ? "review" : "fail";
  const reference = Math.max(transactionCount, rollupUnlockCount, 1);
  const confidence = state === "pass"
    ? 100
    : clampPct(100 - ((countDelta / reference) * 100) - (mismatchReason === "missing_server_unlock_telemetry" ? 20 : 0));
  const nextAction = mismatchReason === "missing_server_unlock_telemetry"
    ? "Wire canonical server unlock telemetry after successful drops/unlock; do not backfill production in this batch."
    : mismatchReason === "date_window_mismatch"
      ? "Align unlock transaction and rollup date windows before comparing access counts."
      : mismatchReason === "duplicate_rollups"
        ? "Inspect duplicate unlock rollup source ids and repair the materializer dedupe key."
        : mismatchReason === "none"
          ? "No action required."
          : "Inspect unlock rollup source ids against unlock transaction ids and classify legacy or overcounted records.";
  const unitLabel = comparableUnitsStatus === "rollup_docs_not_unlock_count"
    ? `${input.rollupDocumentCount.toLocaleString()} rollup document(s) represented ${rollupUnlockCount.toLocaleString()} unlock(s)`
    : `${rollupUnlockCount.toLocaleString()} rollup unlock(s)`;

  return {
    selectedRange: input.selectedRange,
    state,
    transactionCount,
    rollupUnlockCount,
    telemetryEventCount,
    completedTransactionIds,
    rollupSourceIds,
    duplicateRollupIds,
    legacyRollupIds,
    mismatchReason,
    comparableUnitsStatus,
    dateWindowStatus,
    countDelta,
    confidence,
    nextAction,
    technicalEvidence: `${transactionCount.toLocaleString()} unlock transaction(s) vs ${unitLabel}. Telemetry events: ${telemetryEventCount.toLocaleString()}. Mismatch reason: ${mismatchReason}.`,
  };
}
