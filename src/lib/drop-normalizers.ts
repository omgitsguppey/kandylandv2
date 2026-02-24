import { z } from "zod";
import { Drop } from "@/types/db";

type TimestampLike = { toMillis: () => number };

function isTimestampLike(value: unknown): value is TimestampLike {
  if (typeof value !== "object" || value === null || !("toMillis" in value)) {
    return false;
  }

  const candidate = value as { toMillis?: unknown };
  if (typeof candidate.toMillis !== "function") {
    return false;
  }

  try {
    const result = candidate.toMillis();
    return typeof result === "number" && Number.isFinite(result);
  } catch {
    return false;
  }
}

const rotationSchema = z.object({
  enabled: z.boolean(),
  intervalDays: z.number().int().nonnegative(),
  durationDays: z.number().int().nonnegative(),
  maxRotations: z.number().int().nonnegative().optional(),
  rotationCount: z.number().int().nonnegative(),
});

const timestampSchema = z.union([
  z.number().finite(),
  z.custom<TimestampLike>(isTimestampLike, "Expected Firestore timestamp-like object"),
]);

const dropSchema = z.object({
  id: z.string().min(1),
  creatorId: z.string().optional(),
  title: z.string().default("Untitled Drop"),
  description: z.string().default(""),
  imageUrl: z.string().default(""),
  contentUrl: z.string().default(""),
  unlockCost: z.number().nonnegative().default(0),
  validFrom: z.number().finite(),
  validUntil: z.number().finite().optional(),
  status: z.enum(["active", "expired", "scheduled"]).default("scheduled"),
  totalUnlocks: z.number().int().nonnegative().default(0),
  totalClicks: z.number().int().nonnegative().optional(),
  createdAt: z.number().finite().optional(),
  type: z.enum(["content", "promo", "external"]).optional(),
  ctaText: z.string().optional(),
  actionUrl: z.string().optional(),
  accentColor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  fileMetadata: z
    .object({
      size: z.number().nonnegative(),
      type: z.string(),
      dimensions: z.string().optional(),
    })
    .optional(),
  rotationConfig: rotationSchema.optional(),
});

const dropRecordSchema = z.object({
  id: z.string().min(1),
  creatorId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  contentUrl: z.string().optional(),
  unlockCost: z.number().optional(),
  validFrom: timestampSchema,
  validUntil: timestampSchema.optional(),
  status: z.enum(["active", "expired", "scheduled"]).optional(),
  totalUnlocks: z.number().optional(),
  totalClicks: z.number().optional(),
  createdAt: timestampSchema.optional(),
  type: z.enum(["content", "promo", "external"]).optional(),
  ctaText: z.string().optional(),
  actionUrl: z.string().optional(),
  accentColor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  fileMetadata: z
    .object({
      size: z.number(),
      type: z.string(),
      dimensions: z.string().optional(),
    })
    .optional(),
  rotationConfig: rotationSchema.optional(),
});

function toMillis(value: z.infer<typeof timestampSchema>): number {
  if (typeof value === "number") {
    return value;
  }

  return value.toMillis();
}

export function normalizeDropRecord(raw: unknown, id: string): Drop {
  const parsed = dropRecordSchema.parse({ ...(raw as Record<string, unknown>), id });
  return dropSchema.parse({
    ...parsed,
    validFrom: toMillis(parsed.validFrom),
    validUntil: parsed.validUntil !== undefined ? toMillis(parsed.validUntil) : undefined,
    createdAt: parsed.createdAt !== undefined ? toMillis(parsed.createdAt) : undefined,
  }) as Drop;
}
