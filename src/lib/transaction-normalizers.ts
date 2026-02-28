import { z } from "zod";
import { Transaction } from "@/types/db";

type TimestampLike = {
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
};

const transactionTypeSchema = z.enum(["purchase_currency", "unlock_content", "admin_adjustment", "daily_reward"]);

const transactionRecordSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().finite().default(0),
  type: z.string().min(1),
  relatedDropId: z.string().optional(),
  description: z.string().default(""),
  timestamp: z.unknown().optional(),
  cost: z.number().finite().nonnegative().optional(),
  currency: z.string().optional(),
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
    relatedDropId: parsed.relatedDropId,
    description: parsed.description || parsed.type,
    timestamp: normalizeTimestamp(parsed.timestamp),
    cost: parsed.cost,
    currency: parsed.currency,
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
