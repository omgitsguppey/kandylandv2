export const GUMDROP_LEDGER_MATH_VERSION = "2026.05.gumdrop-ledger-math.1";

export type GumdropLedgerSourceBucket =
  | "paid_gd"
  | "paid_bonus_gd"
  | "reward_gd"
  | "task_reward_gd"
  | "admin_grant_gd"
  | "adjustment_gd"
  | "refund_reversal"
  | "legacy_unknown";

export type GumdropLedgerConfidence = "exact" | "linked" | "inferred" | "weak" | "unknown";
export type GumdropLedgerDirection = "credit" | "spend" | "adjustment" | "reversal";
export type GumdropSpendPolicy = "paid_only" | "any_source";

export type GumdropSourceClassification = {
  sourceBucket: GumdropLedgerSourceBucket;
  sourceBuckets: GumdropLedgerSourceBucket[];
  paidGd: number;
  paidBonusGd: number;
  rewardGd: number;
  taskRewardGd: number;
  adminGrantGd: number;
  adjustmentGd: number;
  refundReversalGd: number;
  legacyUnknownGd: number;
  confidence: GumdropLedgerConfidence;
  userVisibleLabel: "paid GD" | "reward GD" | "bonus GD" | "unknown GD";
  paidOnlyEligible: boolean;
  reason: string;
};

export type GumdropLedgerEntry = {
  sourceBucket: GumdropLedgerSourceBucket;
  amountGd: number;
  direction: GumdropLedgerDirection;
  status?: "active" | "pending" | "failed" | "reversed" | null;
};

export type GumdropLedgerBalanceBySource = {
  paidGd: number;
  paidBonusGd: number;
  rewardGd: number;
  taskRewardGd: number;
  adminGrantGd: number;
  adjustmentGd: number;
  refundReversalGd: number;
  legacyUnknownGd: number;
  totalGd: number;
};

function normalizeGd(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function positiveGd(value: unknown) {
  return Math.max(0, normalizeGd(value));
}

function emptyBalance(): GumdropLedgerBalanceBySource {
  return {
    paidGd: 0,
    paidBonusGd: 0,
    rewardGd: 0,
    taskRewardGd: 0,
    adminGrantGd: 0,
    adjustmentGd: 0,
    refundReversalGd: 0,
    legacyUnknownGd: 0,
    totalGd: 0,
  };
}

function balanceKey(sourceBucket: GumdropLedgerSourceBucket): keyof Omit<GumdropLedgerBalanceBySource, "totalGd"> {
  switch (sourceBucket) {
    case "paid_gd":
      return "paidGd";
    case "paid_bonus_gd":
      return "paidBonusGd";
    case "reward_gd":
      return "rewardGd";
    case "task_reward_gd":
      return "taskRewardGd";
    case "admin_grant_gd":
      return "adminGrantGd";
    case "adjustment_gd":
      return "adjustmentGd";
    case "refund_reversal":
      return "refundReversalGd";
    case "legacy_unknown":
      return "legacyUnknownGd";
  }
}

function buildClassification(input: Partial<GumdropSourceClassification> & Pick<GumdropSourceClassification, "sourceBucket" | "reason">): GumdropSourceClassification {
  const sourceBuckets = input.sourceBuckets ?? [input.sourceBucket];
  const paidGd = positiveGd(input.paidGd);
  const paidBonusGd = positiveGd(input.paidBonusGd);
  const rewardGd = positiveGd(input.rewardGd);
  const taskRewardGd = positiveGd(input.taskRewardGd);
  const adminGrantGd = positiveGd(input.adminGrantGd);
  const adjustmentGd = normalizeGd(input.adjustmentGd);
  const refundReversalGd = positiveGd(input.refundReversalGd);
  const legacyUnknownGd = positiveGd(input.legacyUnknownGd);
  return {
    sourceBucket: input.sourceBucket,
    sourceBuckets,
    paidGd,
    paidBonusGd,
    rewardGd,
    taskRewardGd,
    adminGrantGd,
    adjustmentGd,
    refundReversalGd,
    legacyUnknownGd,
    confidence: input.confidence ?? "unknown",
    userVisibleLabel: input.userVisibleLabel ?? "unknown GD",
    paidOnlyEligible: input.paidOnlyEligible ?? (paidGd + paidBonusGd > 0),
    reason: input.reason,
  };
}

export function classifyGumdropSource(input: {
  transactionType?: string | null;
  sourceOfFunds?: string | null;
  rewardSource?: string | null;
  adjustmentSource?: string | null;
  amountGd?: number | null;
  paidGumDrops?: number | null;
  bonusGumDrops?: number | null;
  tiedToPaidPurchase?: boolean | null;
  sourceTruth?: string | null;
  legacyLabel?: string | null;
  originalSourceBucket?: GumdropLedgerSourceBucket | null;
}) {
  const transactionType = String(input.transactionType ?? "").toLowerCase();
  const sourceOfFunds = String(input.sourceOfFunds ?? "").toLowerCase();
  const rewardSource = String(input.rewardSource ?? "").toLowerCase();
  const legacyLabel = String(input.legacyLabel ?? "").toLowerCase();
  const amountGd = positiveGd(input.amountGd);
  const paidGd = positiveGd(input.paidGumDrops);
  const paidBonusGd = positiveGd(input.bonusGumDrops);
  const sourceTruth = String(input.sourceTruth ?? "").toLowerCase();
  const hasExactServerTruth = /server|paypal|purchase|ledger/u.test(sourceTruth);

  if (transactionType === "purchase_currency" || sourceOfFunds === "paid_gd") {
    const inferredPaidGd = paidGd || Math.max(0, amountGd - paidBonusGd);
    const inferredBonusGd = paidBonusGd;
    return buildClassification({
      sourceBucket: "paid_gd",
      sourceBuckets: inferredBonusGd > 0 ? ["paid_gd", "paid_bonus_gd"] : ["paid_gd"],
      paidGd: inferredPaidGd,
      paidBonusGd: inferredBonusGd,
      confidence: hasExactServerTruth ? "exact" : "linked",
      userVisibleLabel: "paid GD",
      paidOnlyEligible: true,
      reason: inferredBonusGd > 0
        ? "paid bundle base and bonus are paid-source ledger credits"
        : "paid purchase base is paid-source ledger credit",
    });
  }

  if (input.originalSourceBucket && transactionType.includes("refund")) {
    return buildClassification({
      sourceBucket: "refund_reversal",
      sourceBuckets: ["refund_reversal", input.originalSourceBucket],
      refundReversalGd: amountGd,
      confidence: "linked",
      paidOnlyEligible: false,
      reason: `refund reverses original source bucket ${input.originalSourceBucket}`,
    });
  }

  if (transactionType === "daily_reward" && rewardSource === "task") {
    return buildClassification({
      sourceBucket: "task_reward_gd",
      taskRewardGd: amountGd,
      confidence: hasExactServerTruth ? "exact" : "linked",
      userVisibleLabel: "reward GD",
      paidOnlyEligible: false,
      reason: "task rewards are reward-source GumDrops",
    });
  }

  if (transactionType === "admin_adjustment" && amountGd > 0) {
    return buildClassification({
      sourceBucket: "admin_grant_gd",
      adminGrantGd: amountGd,
      confidence: input.adjustmentSource ? "linked" : "inferred",
      userVisibleLabel: "reward GD",
      paidOnlyEligible: false,
      reason: "admin grants are explicit non-paid source credits",
    });
  }

  if (transactionType === "admin_adjustment") {
    return buildClassification({
      sourceBucket: "adjustment_gd",
      adjustmentGd: normalizeGd(input.amountGd),
      confidence: input.adjustmentSource ? "linked" : "inferred",
      userVisibleLabel: "reward GD",
      paidOnlyEligible: false,
      reason: "admin adjustments are explicit ledger adjustments and never default paid",
    });
  }

  if (transactionType === "daily_reward" || transactionType === "onboarding_reward" || transactionType === "referral_bonus" || sourceOfFunds === "reward_gd") {
    return buildClassification({
      sourceBucket: "reward_gd",
      rewardGd: amountGd,
      confidence: hasExactServerTruth ? "exact" : "linked",
      userVisibleLabel: "reward GD",
      paidOnlyEligible: false,
      reason: "non-purchase rewards are reward-source GumDrops",
    });
  }

  if (legacyLabel.includes("free")) {
    return buildClassification({
      sourceBucket: "reward_gd",
      rewardGd: amountGd,
      confidence: "inferred",
      userVisibleLabel: "reward GD",
      paidOnlyEligible: false,
      reason: "legacy free GD maps to reward_gd unless deterministic paid source exists",
    });
  }

  if (legacyLabel.includes("bonus") && input.tiedToPaidPurchase === true) {
    return buildClassification({
      sourceBucket: "paid_bonus_gd",
      sourceBuckets: ["paid_bonus_gd"],
      paidBonusGd: amountGd,
      confidence: "linked",
      userVisibleLabel: "bonus GD",
      paidOnlyEligible: true,
      reason: "legacy bonus tied to a paid purchase package is paid bonus GD",
    });
  }

  return buildClassification({
    sourceBucket: "legacy_unknown",
    legacyUnknownGd: amountGd,
    confidence: "unknown",
    paidOnlyEligible: false,
    reason: "unknown legacy source cannot fund paid-only experiences",
  });
}

export function calculateLedgerBalanceBySource(input: readonly GumdropLedgerEntry[]) {
  const balance = emptyBalance();
  for (const entry of input) {
    if (entry.status === "pending" || entry.status === "failed") continue;
    const amount = Math.abs(normalizeGd(entry.amountGd));
    const signedAmount = entry.direction === "credit"
      ? amount
      : entry.direction === "adjustment"
        ? normalizeGd(entry.amountGd)
        : -amount;
    const key = balanceKey(entry.sourceBucket);
    balance[key] += signedAmount;
  }
  balance.totalGd = balance.paidGd
    + balance.paidBonusGd
    + balance.rewardGd
    + balance.taskRewardGd
    + balance.adminGrantGd
    + balance.adjustmentGd
    + balance.refundReversalGd
    + balance.legacyUnknownGd;
  return balance;
}

export function calculateSpendEligibility(input: {
  balanceBySource: GumdropLedgerBalanceBySource;
  amountGd: number;
  spendPolicy: GumdropSpendPolicy;
}) {
  const required = positiveGd(input.amountGd);
  const paidAvailable = Math.max(0, input.balanceBySource.paidGd) + Math.max(0, input.balanceBySource.paidBonusGd);
  if (input.spendPolicy === "paid_only" && paidAvailable < required) {
    return {
      eligible: false as const,
      reason: "insufficient_paid_source_gd" as const,
      paidGdSpent: Math.min(input.balanceBySource.paidGd, required),
      paidBonusGdSpent: Math.max(0, Math.min(input.balanceBySource.paidBonusGd, required - Math.max(0, input.balanceBySource.paidGd))),
      rewardGdSpent: 0,
      taskRewardGdSpent: 0,
      adminGrantGdSpent: 0,
      legacyUnknownSpent: 0,
    };
  }

  if (input.spendPolicy === "paid_only") {
    const paidGdSpent = Math.min(Math.max(0, input.balanceBySource.paidGd), required);
    const paidBonusGdSpent = Math.max(0, required - paidGdSpent);
    return {
      eligible: true as const,
      reason: "paid_source_available" as const,
      paidGdSpent,
      paidBonusGdSpent,
      rewardGdSpent: 0,
      taskRewardGdSpent: 0,
      adminGrantGdSpent: 0,
      legacyUnknownSpent: 0,
    };
  }

  const spendOrder = [
    ["rewardGd", "rewardGdSpent"],
    ["taskRewardGd", "taskRewardGdSpent"],
    ["adminGrantGd", "adminGrantGdSpent"],
    ["paidGd", "paidGdSpent"],
    ["paidBonusGd", "paidBonusGdSpent"],
  ] as const;
  let remaining = required;
  const spendPlan = {
    paidGdSpent: 0,
    paidBonusGdSpent: 0,
    rewardGdSpent: 0,
    taskRewardGdSpent: 0,
    adminGrantGdSpent: 0,
    legacyUnknownSpent: 0,
  };
  for (const [balanceField, spendField] of spendOrder) {
    const spent = Math.min(Math.max(0, input.balanceBySource[balanceField]), remaining);
    spendPlan[spendField] = spent;
    remaining -= spent;
  }
  return {
    eligible: remaining === 0,
    reason: remaining === 0 ? "source_eligible" as const : "insufficient_total_gd" as const,
    ...spendPlan,
  };
}

export function calculateRefundReversal(input: {
  originalSourceBucket: Exclude<GumdropLedgerSourceBucket, "refund_reversal">;
  amountGd: number;
}): GumdropLedgerEntry {
  return {
    sourceBucket: input.originalSourceBucket,
    amountGd: positiveGd(input.amountGd),
    direction: "reversal",
    status: "active",
  };
}

export function validateDisplayedBalance(input: {
  displayedTotalGd: number;
  ledgerBalance: GumdropLedgerBalanceBySource;
}) {
  const displayedTotalGd = positiveGd(input.displayedTotalGd);
  if (displayedTotalGd !== input.ledgerBalance.totalGd) {
    return {
      valid: false as const,
      reason: "displayed_wallet_total_mismatch" as const,
      displayedTotalGd,
      ledgerTotalGd: input.ledgerBalance.totalGd,
      deltaGd: displayedTotalGd - input.ledgerBalance.totalGd,
    };
  }
  return {
    valid: true as const,
    reason: "displayed_wallet_total_matches_source_ledger" as const,
    displayedTotalGd,
    ledgerTotalGd: input.ledgerBalance.totalGd,
    deltaGd: 0,
  };
}

export function explainGumdropMath(input: Pick<GumdropSourceClassification, "sourceBucket" | "confidence" | "reason" | "paidOnlyEligible">) {
  return [
    `source=${input.sourceBucket}`,
    `confidence=${input.confidence}`,
    `paidOnlyEligible=${input.paidOnlyEligible}`,
    input.reason,
  ].join("; ");
}
