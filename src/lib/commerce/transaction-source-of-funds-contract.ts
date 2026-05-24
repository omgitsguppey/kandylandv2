import { isCreatorSpendTransactionType } from "@/lib/transaction-normalizers";

export type TransactionSourceClass =
  | "purchased_base"
  | "purchased_bonus"
  | "purchased_mixed"
  | "reward_check_in"
  | "reward_onboarding"
  | "reward_task"
  | "reward_feedback"
  | "reward_referral"
  | "admin_adjustment_positive"
  | "admin_adjustment_negative"
  | "unlock_reward_spend"
  | "unlock_purchased_spend"
  | "unlock_mixed_spend"
  | "creator_paid_spend"
  | "creator_reward_violation"
  | "legacy_unknown"
  | "unknown_missing_metadata";

export type TransactionSourceConfidence =
  | "exact"
  | "inferred_from_type"
  | "inferred_from_balance_split"
  | "legacy_unknown"
  | "unknown";

export type TransactionSourceTruth =
  | "server_split"
  | "server_type"
  | "balance_split"
  | "legacy_missing_split"
  | "missing_required_metadata";

export type TransactionSourceOfFundsInput = {
  transactionId?: string;
  id?: string;
  userId?: string;
  amount?: number;
  type?: string;
  status?: string;
  rewardSource?: string;
  ledgerSource?: string;
  description?: string;
  purchasedAmountSpent?: number;
  rewardAmountSpent?: number;
  purchasedAmountCredited?: number;
  rewardAmountCredited?: number;
  paidGumDrops?: number;
  bonusGumDrops?: number;
  deliveredGumDrops?: number;
  sourceTruth?: string;
  timestamp?: number;
  timestampMs?: number;
  nowMs?: number;
};

export type TransactionSourceOfFundsClassification = {
  transactionId: string;
  userIdRedacted: string;
  amount: number;
  type: string;
  status: string;
  sourceClass: TransactionSourceClass;
  sourceConfidence: TransactionSourceConfidence;
  purchasedAmountSpent: number;
  rewardAmountSpent: number;
  purchasedAmountCredited: number;
  rewardAmountCredited: number;
  sourceTruth: TransactionSourceTruth;
  displayLabel: string;
  debugReason: string;
  nextAction: string;
};

const UNLOCK_METADATA_REQUIRED_AFTER_MS = Date.parse("2026-05-15T00:00:00.000Z");

const SOURCE_LABELS: Record<TransactionSourceClass, string> = {
  purchased_base: "Paid GumDrops",
  purchased_bonus: "Paid bonus GumDrops",
  purchased_mixed: "Paid bundle GumDrops",
  reward_check_in: "Reward check-in",
  reward_onboarding: "Reward onboarding",
  reward_task: "Reward task",
  reward_feedback: "Reward feedback",
  reward_referral: "Reward referral",
  admin_adjustment_positive: "Admin reward adjustment",
  admin_adjustment_negative: "Admin debit adjustment",
  unlock_reward_spend: "Reward unlock spend",
  unlock_purchased_spend: "Paid unlock spend",
  unlock_mixed_spend: "Mixed unlock spend",
  creator_paid_spend: "Creator paid spend",
  creator_reward_violation: "Creator reward violation",
  legacy_unknown: "Legacy unknown",
  unknown_missing_metadata: "Unknown missing metadata",
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function redactTransactionUserId(value: unknown) {
  const text = cleanText(value, "unknown");
  if (text === "unknown") return text;
  if (text.length <= 8) return text;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function timestampMs(input: TransactionSourceOfFundsInput) {
  return Math.max(0, toNumber(input.timestampMs), toNumber(input.timestamp));
}

function isRecentEnoughToRequireUnlockSplit(input: TransactionSourceOfFundsInput) {
  const ts = timestampMs(input);
  if (ts <= 0) return cleanText(input.sourceTruth).length > 0;
  return ts >= UNLOCK_METADATA_REQUIRED_AFTER_MS || (toNumber(input.nowMs) > 0 && toNumber(input.nowMs) - ts <= 7 * 24 * 60 * 60 * 1000);
}

function buildClassification(
  input: TransactionSourceOfFundsInput,
  sourceClass: TransactionSourceClass,
  sourceConfidence: TransactionSourceConfidence,
  sourceTruth: TransactionSourceTruth,
  debugReason: string,
  nextAction: string,
): TransactionSourceOfFundsClassification {
  const paidCredit = Math.max(0, toNumber(input.purchasedAmountCredited));
  const rewardCredit = Math.max(0, toNumber(input.rewardAmountCredited));
  return {
    transactionId: cleanText(input.transactionId ?? input.id, "unknown_transaction"),
    userIdRedacted: redactTransactionUserId(input.userId),
    amount: toNumber(input.amount),
    type: cleanText(input.type, "unknown"),
    status: cleanText(input.status, "completed"),
    sourceClass,
    sourceConfidence,
    purchasedAmountSpent: Math.max(0, toNumber(input.purchasedAmountSpent)),
    rewardAmountSpent: Math.max(0, toNumber(input.rewardAmountSpent)),
    purchasedAmountCredited: paidCredit,
    rewardAmountCredited: rewardCredit,
    sourceTruth,
    displayLabel: SOURCE_LABELS[sourceClass],
    debugReason,
    nextAction,
  };
}

export function classifyTransactionSourceOfFunds(input: TransactionSourceOfFundsInput): TransactionSourceOfFundsClassification {
  const type = cleanText(input.type);
  const rewardSource = cleanText(input.rewardSource);
  const ledgerSource = cleanText(input.ledgerSource);
  const description = cleanText(input.description).toLowerCase();
  const purchasedSpent = Math.max(0, toNumber(input.purchasedAmountSpent));
  const rewardSpent = Math.max(0, toNumber(input.rewardAmountSpent));
  const hasSpendSplit = purchasedSpent > 0 || rewardSpent > 0 || typeof input.purchasedAmountSpent === "number" || typeof input.rewardAmountSpent === "number";

  if (type === "daily_reward") {
    if (rewardSource === "check_in") {
      return buildClassification(input, "reward_check_in", "exact", "server_type", "daily_reward rewardSource=check_in", "Preserve reward-only check-in ledger metadata.");
    }
    if (rewardSource === "task") {
      return buildClassification(input, "reward_task", "exact", "server_type", "daily_reward rewardSource=task", "Preserve reward-only daily task ledger metadata.");
    }
    if (rewardSource === "bug_report" || description.includes("feedback")) {
      return buildClassification(input, "reward_feedback", "inferred_from_type", "server_type", "daily_reward feedback marker", "Keep feedback rewards separate from paid source-of-funds.");
    }
    return buildClassification(input, "reward_task", "inferred_from_type", "server_type", "daily_reward without specific rewardSource", "Add rewardSource when writing new reward transactions.");
  }

  if (type === "onboarding_reward") {
    return buildClassification(input, "reward_onboarding", "exact", "server_type", "onboarding_reward transaction type", "Preserve onboarding rewards as reward GD.");
  }

  if (type === "referral_bonus") {
    return buildClassification(input, "reward_referral", "exact", "server_type", "referral_bonus transaction type", "Preserve referral bonuses as reward GD.");
  }

  if (type === "purchase_currency") {
    const paidBase = Math.max(0, toNumber(input.paidGumDrops));
    const paidBonus = Math.max(0, toNumber(input.bonusGumDrops));
    if (paidBase > 0 && paidBonus > 0) {
      return buildClassification(input, "purchased_mixed", "exact", "server_split", "purchase split has paid base and paid bonus", "Keep paid base and paid bonus credited to purchased balance.");
    }
    if (paidBonus > 0) {
      return buildClassification(input, "purchased_bonus", "exact", "server_split", "purchase split has paid bonus GumDrops", "Keep paid package bonus as paid-source GumDrops.");
    }
    return buildClassification(input, "purchased_base", paidBase > 0 ? "exact" : "inferred_from_type", paidBase > 0 ? "server_split" : "server_type", "purchase_currency transaction", "Keep purchase credits in purchased balance.");
  }

  if (type === "admin_adjustment") {
    return buildClassification(
      input,
      toNumber(input.amount) < 0 ? "admin_adjustment_negative" : "admin_adjustment_positive",
      "inferred_from_type",
      "server_type",
      "admin_adjustment transaction type",
      "Keep admin adjustments audited as non-paid source-of-funds.",
    );
  }

  if (type === "unlock_content") {
    if (hasSpendSplit) {
      const sourceClass = purchasedSpent > 0 && rewardSpent > 0
        ? "unlock_mixed_spend"
        : purchasedSpent > 0
          ? "unlock_purchased_spend"
          : "unlock_reward_spend";
      return buildClassification(input, sourceClass, "exact", "server_split", "unlock_content has purchased/reward spend split", "No action: new unlock writes explicit source-of-funds split.");
    }
    if (ledgerSource === "purchased") {
      return buildClassification(input, "unlock_purchased_spend", "inferred_from_balance_split", "balance_split", "unlock_content inferred from ledgerSource=purchased", "Prefer purchasedAmountSpent/rewardAmountSpent on new unlock writes.");
    }
    if (ledgerSource === "reward") {
      return buildClassification(input, "unlock_reward_spend", "inferred_from_balance_split", "balance_split", "unlock_content inferred from ledgerSource=reward", "Prefer purchasedAmountSpent/rewardAmountSpent on new unlock writes.");
    }
    if (ledgerSource === "mixed") {
      return buildClassification(input, "unlock_mixed_spend", "inferred_from_balance_split", "balance_split", "unlock_content inferred from ledgerSource=mixed", "Prefer purchasedAmountSpent/rewardAmountSpent on new unlock writes.");
    }
    return isRecentEnoughToRequireUnlockSplit(input)
      ? buildClassification(input, "unknown_missing_metadata", "unknown", "missing_required_metadata", "recent unlock_content lacks spend split", "Investigate writer path; new unlock transactions must include purchased/reward spend split.")
      : buildClassification(input, "legacy_unknown", "legacy_unknown", "legacy_missing_split", "legacy unlock_content lacks spend split", "Do not backfill production in this batch; keep legacy unknown visible.");
  }

  if (isCreatorSpendTransactionType(type)) {
    if (rewardSpent > 0) {
      return buildClassification(input, "creator_reward_violation", "exact", "server_split", "creator spend has rewardAmountSpent > 0", "Investigate paid-only creator spend violation before treating as healthy.");
    }
    return buildClassification(input, "creator_paid_spend", hasSpendSplit ? "exact" : "inferred_from_type", hasSpendSplit ? "server_split" : "server_type", "creator spend transaction type", "Preserve purchased-only creator experience policy.");
  }

  if (ledgerSource === "purchased") {
    return buildClassification(input, "purchased_base", "inferred_from_balance_split", "balance_split", "ledgerSource=purchased", "Prefer explicit source class on new commerce transactions.");
  }
  if (ledgerSource === "reward") {
    return buildClassification(input, "reward_task", "inferred_from_balance_split", "balance_split", "ledgerSource=reward", "Prefer explicit reward source on new reward transactions.");
  }

  return buildClassification(input, "unknown_missing_metadata", "unknown", "missing_required_metadata", "transaction lacks source-of-funds metadata", "Classify writer path before presenting source as healthy.");
}

export function transactionSourceDisplayLabel(sourceClass: TransactionSourceClass) {
  return SOURCE_LABELS[sourceClass];
}
