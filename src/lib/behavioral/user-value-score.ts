import { logNorm, recencyDecay } from "@/lib/behavioral/user-engagement-score";
import { computeValueScoreFromSignals } from "@/lib/behavioral/behavioral-math-calibration";

export type UserValueTier = "observer" | "warm" | "buyer" | "repeat_buyer" | "VIP";

export type UserValueReasonCode =
  | "total_spend"
  | "purchase_count"
  | "purchase_recency"
  | "post_purchase_usage"
  | "free_to_paid_signal";

export type UserValueScoreInput = {
  totalSpendUsd: number;
  purchaseCount: number;
  paidGdPurchased: number;
  bonusGdDelivered: number;
  rewardGdEarned: number;
  freeGdEarned30d: number;
  unwrapsAfterPurchase: number;
  daysSinceLastPurchase: number | null;
};

export type UserValueActivityDay = {
  timestampMs: number;
  grossRevenueUsd?: number;
  purchaseCount?: number;
  paidGdPurchased?: number;
  bonusGdDelivered?: number;
  rewardGdEarned?: number;
  unwrappedCount?: number;
};

export type UserValueReason = {
  code: UserValueReasonCode;
  label: string;
  contribution: number;
  value: number;
  summary: string;
};

export type UserValueScoreBreakdown = {
  spendComponent: number;
  purchaseCountComponent: number;
  recencyComponent: number;
  postPurchaseUsageComponent: number;
  freeConversionComponent: number;
};

export type UserValueScoreResult = {
  totalSpendUsd: number;
  purchaseCount: number;
  paidGdPurchased: number;
  bonusGdDelivered: number;
  rewardGdEarned: number;
  unwrapsAfterPurchase: number;
  daysSinceLastPurchase: number | null;
  repeatPurchaseLikelihood: number;
  freeToPaidSignal: number;
  valueScore: number;
  valueTier: UserValueTier;
  verdict: string;
  reasons: UserValueReason[];
  topReasons: UserValueReason[];
  breakdown: UserValueScoreBreakdown;
  inputs: UserValueScoreInput;
};

function clampUnit(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function roundContribution(value: number) {
  return Math.round(value * 1000) / 1000;
}

function dayAgeMs(nowMs: number, timestampMs: number) {
  return Math.max(0, nowMs - Math.max(0, timestampMs));
}

function roundUsd(value: number) {
  return Math.round((Math.max(0, value) + Number.EPSILON) * 100) / 100;
}

function getTier(score: number): UserValueTier {
  if (score >= 80) return "VIP";
  if (score >= 60) return "repeat_buyer";
  if (score >= 40) return "buyer";
  if (score >= 20) return "warm";
  return "observer";
}

function getVerdict(tier: UserValueTier) {
  switch (tier) {
    case "VIP":
      return "VIP";
    case "repeat_buyer":
      return "Repeat buyer";
    case "buyer":
      return "Buyer";
    case "warm":
      return "Warm";
    default:
      return "Observer";
  }
}

export function buildUserValueScoreInputFromActivityDays(input: {
  days: UserValueActivityDay[];
  nowMs: number;
}): UserValueScoreInput {
  const last30dMs = 30 * 24 * 60 * 60 * 1000;
  const sortedDays = [...input.days].sort((left, right) => left.timestampMs - right.timestampMs);

  let totalSpendUsd = 0;
  let purchaseCount = 0;
  let paidGdPurchased = 0;
  let bonusGdDelivered = 0;
  let rewardGdEarned = 0;
  let freeGdEarned30d = 0;
  let unwrapsAfterPurchase = 0;
  let lastPurchaseTimestampMs = 0;
  let purchaseSeen = false;

  sortedDays.forEach((day) => {
    const grossRevenueUsd = Math.max(0, Number.isFinite(day.grossRevenueUsd) ? day.grossRevenueUsd || 0 : 0);
    const dayPurchaseCount = Math.max(0, Math.round(day.purchaseCount || 0));
    const dayPaidGdPurchased = Math.max(0, Math.round(day.paidGdPurchased || 0));
    const dayBonusGdDelivered = Math.max(0, Math.round(day.bonusGdDelivered || 0));
    const dayRewardGdEarned = Math.max(0, Math.round(day.rewardGdEarned || 0));
    const dayUnwrappedCount = Math.max(0, Math.round(day.unwrappedCount || 0));
    const ageMs = dayAgeMs(input.nowMs, day.timestampMs);

    totalSpendUsd += grossRevenueUsd;
    purchaseCount += dayPurchaseCount;
    paidGdPurchased += dayPaidGdPurchased;
    bonusGdDelivered += dayBonusGdDelivered;
    rewardGdEarned += dayRewardGdEarned;

    if (ageMs <= last30dMs) {
      freeGdEarned30d += dayRewardGdEarned;
    }

    if (dayPurchaseCount > 0 || grossRevenueUsd > 0) {
      purchaseSeen = true;
      lastPurchaseTimestampMs = Math.max(lastPurchaseTimestampMs, day.timestampMs);
    }

    if (purchaseSeen) {
      unwrapsAfterPurchase += dayUnwrappedCount;
    }
  });

  return {
    totalSpendUsd: roundUsd(totalSpendUsd),
    purchaseCount,
    paidGdPurchased,
    bonusGdDelivered,
    rewardGdEarned,
    freeGdEarned30d,
    unwrapsAfterPurchase,
    daysSinceLastPurchase: lastPurchaseTimestampMs > 0
      ? Math.max(0, Math.floor((input.nowMs - lastPurchaseTimestampMs) / (24 * 60 * 60 * 1000)))
      : null,
  };
}

export function computeUserValueScore(input: UserValueScoreInput): UserValueScoreResult {
  const normalizedInput: UserValueScoreInput = {
    totalSpendUsd: roundUsd(Number.isFinite(input.totalSpendUsd) ? input.totalSpendUsd : 0),
    purchaseCount: Math.max(0, Math.round(input.purchaseCount || 0)),
    paidGdPurchased: Math.max(0, Math.round(input.paidGdPurchased || 0)),
    bonusGdDelivered: Math.max(0, Math.round(input.bonusGdDelivered || 0)),
    rewardGdEarned: Math.max(0, Math.round(input.rewardGdEarned || 0)),
    freeGdEarned30d: Math.max(0, Math.round(input.freeGdEarned30d || 0)),
    unwrapsAfterPurchase: Math.max(0, Math.round(input.unwrapsAfterPurchase || 0)),
    daysSinceLastPurchase: typeof input.daysSinceLastPurchase === "number" && Number.isFinite(input.daysSinceLastPurchase)
      ? Math.max(0, Math.round(input.daysSinceLastPurchase))
      : null,
  };

  const hasNoPurchase = normalizedInput.purchaseCount === 0 || normalizedInput.totalSpendUsd <= 0;
  const effectiveDaysSinceLastPurchase = hasNoPurchase
    ? 365
    : normalizedInput.daysSinceLastPurchase ?? 365;

  const breakdown: UserValueScoreBreakdown = {
    spendComponent: logNorm(normalizedInput.totalSpendUsd, 500),
    purchaseCountComponent: logNorm(normalizedInput.purchaseCount, 20),
    recencyComponent: hasNoPurchase ? 0 : recencyDecay(effectiveDaysSinceLastPurchase, 30),
    postPurchaseUsageComponent: logNorm(normalizedInput.unwrapsAfterPurchase, 50),
    freeConversionComponent: clampUnit(Math.min(1, normalizedInput.freeGdEarned30d / 500) * (hasNoPurchase ? 1 : 0.4)),
  };

  const valueScore = computeValueScoreFromSignals({
    verifiedSpendSignal: breakdown.spendComponent,
    purchaseCountSignal: breakdown.purchaseCountComponent,
    purchaseRecencySignal: breakdown.recencyComponent,
    postPurchaseUsageSignal: breakdown.postPurchaseUsageComponent,
    freeToPaidIntentSignal: breakdown.freeConversionComponent,
  });

  const repeatPurchaseLikelihood = Math.round(100 * clampUnit(
    (0.45 * breakdown.purchaseCountComponent) +
    (0.25 * breakdown.recencyComponent) +
    (0.20 * breakdown.postPurchaseUsageComponent) +
    (0.10 * breakdown.freeConversionComponent)
  )) / 100;
  const freeToPaidSignal = Math.round(breakdown.freeConversionComponent * 100) / 100;
  const valueTier = getTier(valueScore);

  const reasons: UserValueReason[] = [
    {
      code: "total_spend" as const,
      label: "Total spend",
      contribution: roundContribution(0.45 * breakdown.spendComponent),
      value: normalizedInput.totalSpendUsd,
      summary: `$${normalizedInput.totalSpendUsd.toFixed(2)} gross spend from completed GumDrops purchases.`,
    },
    {
      code: "purchase_count" as const,
      label: "Purchase count",
      contribution: roundContribution(0.25 * breakdown.purchaseCountComponent),
      value: normalizedInput.purchaseCount,
      summary: `${normalizedInput.purchaseCount} completed purchase${normalizedInput.purchaseCount === 1 ? "" : "s"} on record.`,
    },
    {
      code: "purchase_recency" as const,
      label: "Purchase recency",
      contribution: roundContribution(0.12 * breakdown.recencyComponent),
      value: normalizedInput.daysSinceLastPurchase ?? 999,
      summary: normalizedInput.daysSinceLastPurchase === null
        ? "No completed purchase recorded yet."
        : `${normalizedInput.daysSinceLastPurchase} day${normalizedInput.daysSinceLastPurchase === 1 ? "" : "s"} since the last purchase.`,
    },
    {
      code: "post_purchase_usage" as const,
      label: "Post-purchase usage",
      contribution: roundContribution(0.10 * breakdown.postPurchaseUsageComponent),
      value: normalizedInput.unwrapsAfterPurchase,
      summary: `${normalizedInput.unwrapsAfterPurchase} unwrap${normalizedInput.unwrapsAfterPurchase === 1 ? "" : "s"} after at least one purchase.`,
    },
    {
      code: "free_to_paid_signal" as const,
      label: "Free-to-paid signal",
      contribution: roundContribution(0.08 * breakdown.freeConversionComponent),
      value: normalizedInput.freeGdEarned30d,
      summary: `${normalizedInput.freeGdEarned30d} reward GD earned in the last 30 days as conversion signal only.`,
    },
  ].sort((left, right) => right.contribution - left.contribution || right.value - left.value || left.label.localeCompare(right.label));

  return {
    totalSpendUsd: normalizedInput.totalSpendUsd,
    purchaseCount: normalizedInput.purchaseCount,
    paidGdPurchased: normalizedInput.paidGdPurchased,
    bonusGdDelivered: normalizedInput.bonusGdDelivered,
    rewardGdEarned: normalizedInput.rewardGdEarned,
    unwrapsAfterPurchase: normalizedInput.unwrapsAfterPurchase,
    daysSinceLastPurchase: normalizedInput.daysSinceLastPurchase,
    repeatPurchaseLikelihood,
    freeToPaidSignal,
    valueScore,
    valueTier,
    verdict: getVerdict(valueTier),
    reasons,
    topReasons: reasons.slice(0, 3),
    breakdown,
    inputs: normalizedInput,
  };
}
