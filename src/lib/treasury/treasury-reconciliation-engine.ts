import {
  calculateCreatorRevenueSummary,
  type CreatorRevenueEntry,
} from "@/lib/math/creator-revenue-entitlement-math";
import {
  type GumdropLedgerBalanceBySource,
  type GumdropLedgerSourceBucket,
  calculateLedgerBalanceBySource,
  calculateRefundReversal,
  classifyGumdropSource,
  validateDisplayedBalance,
} from "@/lib/math/gumdrop-ledger-math";

export type TreasuryReconciliationStatus = "matched" | "mismatch" | "pending_review" | "exception";
export type TreasuryConfidence = "exact" | "linked" | "inferred" | "pending" | "reversed" | "unknown_legacy";
export type TreasuryExceptionClass =
  | "none"
  | "provider_receipt_missing"
  | "wallet_display_mismatch"
  | "source_of_funds_violation"
  | "unknown_legacy_money"
  | "refund_source_mismatch"
  | "unverified_revenue";

export type TreasuryReconciliationResult = {
  status: TreasuryReconciliationStatus;
  confidence: TreasuryConfidence;
  displayExact: boolean;
  exceptionClass: TreasuryExceptionClass;
  findings: string[];
};

function result(input: TreasuryReconciliationResult) {
  return input;
}

export function reconcileProviderReceiptsToLedger(input: {
  providerArtifactAttached: boolean;
  operatorConfirmed?: boolean;
  ledgerReceiptCents: number | null;
  providerReceiptCents: number | null;
}) {
  if (!input.providerArtifactAttached) {
    return result({
      status: input.operatorConfirmed ? "pending_review" : "exception",
      confidence: input.operatorConfirmed ? "inferred" : "unknown_legacy",
      displayExact: false,
      exceptionClass: input.operatorConfirmed ? "unverified_revenue" : "provider_receipt_missing",
      findings: ["Provider/order artifact is required before receipt can be exact."],
    });
  }
  if (input.ledgerReceiptCents !== input.providerReceiptCents) {
    return result({
      status: "exception",
      confidence: "linked",
      displayExact: false,
      exceptionClass: "provider_receipt_missing",
      findings: ["Provider receipt and ledger receipt do not match."],
    });
  }
  return result({
    status: "matched",
    confidence: "exact",
    displayExact: true,
    exceptionClass: "none",
    findings: ["Provider receipt matches ledger receipt."],
  });
}

export function reconcileWalletDisplayToLedger(input: {
  displayedTotalGd: number;
  ledgerBuckets: Omit<GumdropLedgerBalanceBySource, "totalGd">;
}) {
  const ledgerBalance: GumdropLedgerBalanceBySource = {
    ...input.ledgerBuckets,
    totalGd: Object.values(input.ledgerBuckets).reduce((sum, value) => sum + value, 0),
  };
  const parity = validateDisplayedBalance({ displayedTotalGd: input.displayedTotalGd, ledgerBalance });
  if (!parity.valid) {
    return result({
      status: "exception",
      confidence: "linked",
      displayExact: false,
      exceptionClass: "wallet_display_mismatch",
      findings: [`Wallet display delta is ${parity.deltaGd} GD.`],
    });
  }
  return result({
    status: "matched",
    confidence: "linked",
    displayExact: true,
    exceptionClass: "none",
    findings: ["Wallet display matches ledger bucket total."],
  });
}

export function reconcileGumdropSources(input: Parameters<typeof classifyGumdropSource>[0]) {
  const classification = classifyGumdropSource(input);
  const isLegacyUnknown = classification.sourceBucket === "legacy_unknown";
  return {
    ...result({
      status: isLegacyUnknown ? "exception" : "matched",
      confidence: isLegacyUnknown ? "unknown_legacy" : classification.confidence === "exact" ? "exact" : "linked",
      displayExact: !isLegacyUnknown,
      exceptionClass: isLegacyUnknown ? "unknown_legacy_money" : "none",
      findings: [classification.reason],
    }),
    sourceBucket: classification.sourceBucket,
    sourceBuckets: classification.sourceBuckets,
    paidOnlyEligible: classification.paidOnlyEligible,
  };
}

export function reconcileCreatorRevenueToEntitlements(entries: readonly CreatorRevenueEntry[]) {
  return calculateCreatorRevenueSummary(entries);
}

export function reconcileTaskRewardsToLedger(input: { amountGd: number; sourceTruth?: string | null }) {
  return reconcileGumdropSources({
    transactionType: "daily_reward",
    rewardSource: "task",
    amountGd: input.amountGd,
    sourceTruth: input.sourceTruth,
  });
}

export function reconcileRefundsAndReversals(input: {
  originalSourceBucket: Exclude<GumdropLedgerSourceBucket, "refund_reversal">;
  amountGd: number;
}) {
  const reversal = calculateRefundReversal(input);
  const balance = calculateLedgerBalanceBySource([reversal]);
  return {
    ...result({
      status: "matched",
      confidence: "linked",
      displayExact: true,
      exceptionClass: "none",
      findings: [`Refund reverses original source bucket ${input.originalSourceBucket}.`],
    }),
    reversedSourceBucket: reversal.sourceBucket,
    ledgerBalanceAfterReversal: balance,
  };
}

export function classifyTreasuryException(input: {
  sourceBucket?: string;
  displayExact?: boolean;
  walletDisplayMismatch?: boolean;
  providerArtifactAttached?: boolean;
  sourceOfFundsViolation?: boolean;
}) {
  if (input.walletDisplayMismatch) return "wallet_display_mismatch" as const;
  if (input.sourceOfFundsViolation) return "source_of_funds_violation" as const;
  if (input.sourceBucket === "legacy_unknown" && input.displayExact === true) return "unknown_legacy_money" as const;
  if (input.providerArtifactAttached === false) return "provider_receipt_missing" as const;
  return "none" as const;
}

export function buildTreasuryAuditFinding(input: TreasuryReconciliationResult & { findingId: string; bureau: string }) {
  return {
    findingId: input.findingId,
    bureau: input.bureau,
    status: input.status,
    confidence: input.confidence,
    displayExact: input.displayExact,
    exceptionClass: input.exceptionClass,
    findings: input.findings,
    privacy: "redacted_finance" as const,
  };
}

export function explainTreasuryReconciliation(input: TreasuryReconciliationResult) {
  return [
    `status=${input.status}`,
    `confidence=${input.confidence}`,
    `displayExact=${input.displayExact}`,
    `exception=${input.exceptionClass}`,
    ...input.findings,
  ].join("; ");
}

export function validateTreasuryReconciliationEngine() {
  const failures: string[] = [];
  if (reconcileProviderReceiptsToLedger({
    providerArtifactAttached: false,
    operatorConfirmed: true,
    ledgerReceiptCents: 100,
    providerReceiptCents: null,
  }).displayExact) {
    failures.push("Operator-confirmed payment without provider artifact displayed exact.");
  }
  if (reconcileGumdropSources({ transactionType: "legacy_credit", amountGd: 1 }).displayExact) {
    failures.push("Unknown legacy money displayed exact.");
  }
  if (reconcileTaskRewardsToLedger({ amountGd: 1 }).paidOnlyEligible) {
    failures.push("Task reward became paid-only eligible.");
  }
  return failures;
}

export function buildTreasuryReconciliationEngineReport(generatedAtUtc = new Date().toISOString()) {
  return {
    reportKey: "treasury-reconciliation-engine",
    generatedAtUtc,
    status: validateTreasuryReconciliationEngine().length === 0 ? "pass" : "fail",
    exports: [
      "reconcileProviderReceiptsToLedger",
      "reconcileWalletDisplayToLedger",
      "reconcileGumdropSources",
      "reconcileCreatorRevenueToEntitlements",
      "reconcileTaskRewardsToLedger",
      "reconcileRefundsAndReversals",
      "classifyTreasuryException",
      "buildTreasuryAuditFinding",
      "explainTreasuryReconciliation",
    ],
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    validationFailures: validateTreasuryReconciliationEngine(),
  };
}
