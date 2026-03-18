import { z } from "zod";
import { Transaction } from "@/types/db";

type TimestampLike = {
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
};

const transactionTypeSchema = z.enum(["purchase_currency", "unlock_content", "admin_adjustment", "daily_reward", "referral_bonus"]);

const transactionRecordSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().finite().default(0),
  type: z.string().min(1),
  rewardSource: z.enum(["check_in", "task"]).optional(),
  relatedDropId: z.string().optional(),
  description: z.string().default(""),
  timestamp: z.unknown().optional(),
  cost: z.number().finite().nonnegative().optional(),
  grossRevenueUsd: z.number().finite().nonnegative().optional(),
  grossRevenueCents: z.number().finite().nonnegative().optional(),
  paypalFeeUsd: z.number().finite().nonnegative().optional(),
  paypalFeeCents: z.number().finite().nonnegative().optional(),
  netRevenueUsd: z.number().finite().nonnegative().optional(),
  netRevenueCents: z.number().finite().nonnegative().optional(),
  deliveredGumDrops: z.number().finite().nonnegative().optional(),
  paidGumDrops: z.number().finite().nonnegative().optional(),
  bonusGumDrops: z.number().finite().nonnegative().optional(),
  retailValueUsd: z.number().finite().nonnegative().optional(),
  retailValueCents: z.number().finite().nonnegative().optional(),
  bonusValueUsd: z.number().finite().nonnegative().optional(),
  bonusValueCents: z.number().finite().nonnegative().optional(),
  adjustedProfitUsd: z.number().finite().nonnegative().optional(),
  adjustedProfitCents: z.number().finite().nonnegative().optional(),
  discountUsd: z.number().finite().nonnegative().optional(),
  discountCents: z.number().finite().nonnegative().optional(),
  effectiveUsdPer100Gd: z.number().finite().nonnegative().optional(),
  effectiveCentsPer100Gd: z.number().finite().nonnegative().optional(),
  effectiveYieldRatio: z.number().finite().nonnegative().optional(),
  bundleLabel: z.string().optional(),
  bundleKey: z.string().optional(),
  bundleTier: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum(["completed", "failed", "pending"]).optional(),
});

function normalizeTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as TimestampLike;

    if (typeof candidate.toMillis === "function") {
      const ms = candidate.toMillis();
      if (Number.isFinite(ms)) {
        return ms;
      }
    }

    if (typeof candidate._seconds === "number") {
      return candidate._seconds * 1000;
    }

    if (typeof candidate.seconds === "number") {
      return candidate.seconds * 1000;
    }
  }

  return 0;
}

function normalizeType(rawType: string): z.infer<typeof transactionTypeSchema> {
  if (rawType === "purchase") {
    return "purchase_currency";
  }

  if (rawType === "daily_reward") {
    return "daily_reward";
  }

  if (rawType === "referral_bonus") {
    return "referral_bonus";
  }

  if (rawType === "purchase_currency" || rawType === "unlock_content" || rawType === "admin_adjustment") {
    return rawType;
  }

  return "admin_adjustment";
}

export function normalizeTransactionRecord(raw: unknown, id: string): Transaction {
  const parsed = transactionRecordSchema.parse(raw);
  return {
    id,
    userId: parsed.userId,
    amount: parsed.amount,
    type: normalizeType(parsed.type),
    rewardSource: parsed.rewardSource,
    relatedDropId: parsed.relatedDropId,
    description: parsed.description || parsed.type,
    timestamp: normalizeTimestamp(parsed.timestamp),
    cost: parsed.cost,
    grossRevenueUsd: parsed.grossRevenueUsd,
    grossRevenueCents: parsed.grossRevenueCents,
    paypalFeeUsd: parsed.paypalFeeUsd,
    paypalFeeCents: parsed.paypalFeeCents,
    netRevenueUsd: parsed.netRevenueUsd,
    netRevenueCents: parsed.netRevenueCents,
    deliveredGumDrops: parsed.deliveredGumDrops,
    paidGumDrops: parsed.paidGumDrops,
    bonusGumDrops: parsed.bonusGumDrops,
    retailValueUsd: parsed.retailValueUsd,
    retailValueCents: parsed.retailValueCents,
    bonusValueUsd: parsed.bonusValueUsd,
    bonusValueCents: parsed.bonusValueCents,
    adjustedProfitUsd: parsed.adjustedProfitUsd,
    adjustedProfitCents: parsed.adjustedProfitCents,
    discountUsd: parsed.discountUsd,
    discountCents: parsed.discountCents,
    effectiveUsdPer100Gd: parsed.effectiveUsdPer100Gd,
    effectiveCentsPer100Gd: parsed.effectiveCentsPer100Gd,
    effectiveYieldRatio: parsed.effectiveYieldRatio,
    bundleLabel: parsed.bundleLabel,
    bundleKey: parsed.bundleKey,
    bundleTier: parsed.bundleTier,
    currency: parsed.currency,
    status: parsed.status as "completed" | "failed" | "pending" | undefined,
  };
}

export function getTransactionRevenueCents(tx: Transaction): number {
  if (tx.type !== "purchase_currency") {
    return 0;
  }

  if (Number.isFinite(tx.cost) && tx.cost !== undefined) {
    return Math.round(tx.cost * 100);
  }

  return 0;
}
