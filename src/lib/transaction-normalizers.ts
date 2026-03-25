import { z } from "zod";
import { Transaction } from "@/types/db";
import { getTransactionRevenueCents as readTransactionRevenueCents, normalizeLedgerStatus } from "@/lib/gumdrop-ledger";

type TimestampLike = {
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
};

const transactionTypeSchema = z.enum([
  "purchase_currency",
  "unlock_content",
  "admin_adjustment",
  "daily_reward",
  "referral_bonus",
  "onboarding_reward",
  "creator_message_text",
  "creator_message_image",
  "creator_message_video",
  "creator_subscription",
  "creator_subscription_renewal",
  "creator_custom_request",
  "creator_booking_phone",
  "creator_booking_video",
]);

export const CREATOR_SPEND_TRANSACTION_TYPES = [
  "creator_message_text",
  "creator_message_image",
  "creator_message_video",
  "creator_subscription",
  "creator_subscription_renewal",
  "creator_custom_request",
  "creator_booking_phone",
  "creator_booking_video",
] as const satisfies Transaction["type"][];

const creatorSpendTransactionTypeSet = new Set<string>(CREATOR_SPEND_TRANSACTION_TYPES);

const transactionRecordSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().finite().default(0),
  type: z.string().min(1),
  rewardSource: z.enum(["check_in", "task", "onboarding"]).optional(),
  relatedDropId: z.string().optional(),
  creatorId: z.string().optional(),
  description: z.string().default(""),
  timestamp: z.unknown().optional(),
  timestampMs: z.number().finite().nonnegative().optional(),
  balanceBefore: z.number().finite().optional(),
  balanceAfter: z.number().finite().optional(),
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
  verifiedServerSide: z.boolean().optional(),
  purchasedAmountSpent: z.number().finite().nonnegative().optional(),
  rewardAmountSpent: z.number().finite().nonnegative().optional(),
  ledgerSource: z.enum(["purchased", "reward", "mixed"]).optional(),
  creatorRevenueShareGd: z.number().finite().nonnegative().optional(),
  creatorRevenueShareUsd: z.number().finite().nonnegative().optional(),
  creatorAccrualId: z.string().optional(),
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

  if (rawType === "onboarding_reward") {
    return "onboarding_reward";
  }

  if (
    rawType === "purchase_currency"
    || rawType === "unlock_content"
    || rawType === "admin_adjustment"
    || creatorSpendTransactionTypeSet.has(rawType)
  ) {
    return rawType as z.infer<typeof transactionTypeSchema>;
  }

  return "admin_adjustment";
}

export function isCreatorSpendTransactionType(type: unknown): type is typeof CREATOR_SPEND_TRANSACTION_TYPES[number] {
  return typeof type === "string" && creatorSpendTransactionTypeSet.has(type);
}

export function getTransactionDisplayLabel(
  transaction: Pick<Transaction, "type" | "description" | "rewardSource">,
) {
  if (transaction.description && transaction.description.trim().length > 0) {
    return transaction.description.trim();
  }

  switch (transaction.type) {
    case "unlock_content":
      return "Unwrapped KandyDrop";
    case "purchase_currency":
      return "Gum Drops added";
    case "admin_adjustment":
      return "Balance updated";
    case "daily_reward":
      if (transaction.rewardSource === "check_in") {
        return "Daily check-in reward collected";
      }
      if (transaction.rewardSource === "task") {
        return "Daily task reward collected";
      }
      return "Daily reward collected";
    case "referral_bonus":
      return "Referral bonus earned";
    case "onboarding_reward":
      return "Onboarding reward collected";
    case "creator_message_text":
      return "Paid creator text sent";
    case "creator_message_image":
      return "Paid creator image sent";
    case "creator_message_video":
      return "Paid creator video sent";
    case "creator_subscription":
      return "Creator subscription started";
    case "creator_subscription_renewal":
      return "Creator subscription renewed";
    case "creator_custom_request":
      return "Creator custom request placed";
    case "creator_booking_phone":
      return "Creator phone booking placed";
    case "creator_booking_video":
      return "Creator video booking placed";
    default:
      return "Recent activity";
  }
}

export function getTransactionBadgeLabel(
  transaction: Pick<Transaction, "type" | "rewardSource">,
) {
  switch (transaction.type) {
    case "admin_adjustment":
      return "Admin";
    case "unlock_content":
      return "Unlock";
    case "purchase_currency":
      return "Purchase";
    case "daily_reward":
      return transaction.rewardSource === "check_in"
        ? "Check-in"
        : transaction.rewardSource === "task"
          ? "Task reward"
          : "Reward";
    case "referral_bonus":
      return "Referral";
    case "onboarding_reward":
      return "Onboarding";
    case "creator_message_text":
      return "Chat";
    case "creator_message_image":
      return "Image chat";
    case "creator_message_video":
      return "Video chat";
    case "creator_subscription":
      return "Subscription";
    case "creator_subscription_renewal":
      return "Renewal";
    case "creator_custom_request":
      return "Request";
    case "creator_booking_phone":
      return "Phone booking";
    case "creator_booking_video":
      return "Video booking";
    default:
      return transaction.type;
  }
}

export function normalizeTransactionRecord(raw: unknown, id: string): Transaction {
  const parsed = transactionRecordSchema.parse(raw);
  const type = normalizeType(parsed.type);
  return {
    id,
    userId: parsed.userId,
    amount: parsed.amount,
    type,
    rewardSource: parsed.rewardSource,
    relatedDropId: parsed.relatedDropId,
    creatorId: parsed.creatorId,
    description: getTransactionDisplayLabel({
      type,
      description: parsed.description,
      rewardSource: parsed.rewardSource,
    }),
    timestamp: normalizeTimestamp(parsed.timestamp),
    timestampMs: parsed.timestampMs,
    balanceBefore: parsed.balanceBefore,
    balanceAfter: parsed.balanceAfter,
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
    status: normalizeLedgerStatus(parsed.status),
    verifiedServerSide: parsed.verifiedServerSide,
    purchasedAmountSpent: parsed.purchasedAmountSpent,
    rewardAmountSpent: parsed.rewardAmountSpent,
    ledgerSource: parsed.ledgerSource,
    creatorRevenueShareGd: parsed.creatorRevenueShareGd,
    creatorRevenueShareUsd: parsed.creatorRevenueShareUsd,
    creatorAccrualId: parsed.creatorAccrualId,
  };
}

export function getTransactionRevenueCents(tx: Transaction): number {
  return readTransactionRevenueCents(tx);
}
