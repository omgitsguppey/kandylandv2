import { z } from "zod";
import { Drop } from "@/types/db";

type TimestampLike = { toMillis: () => number };

function isTimestampLike(value: unknown): value is TimestampLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  // Check for fully instantiated Timestamp
  if (typeof candidate.toMillis === "function") {
    try {
      const result = candidate.toMillis();
      return typeof result === "number" && Number.isFinite(result);
    } catch {
      return false;
    }
  }

  // Check for raw REST API format {_seconds, _nanoseconds} or {seconds, nanoseconds}
  if (
    (typeof candidate._seconds === "number" && typeof candidate._nanoseconds === "number") ||
    (typeof candidate.seconds === "number" && typeof candidate.nanoseconds === "number")
  ) {
    return true;
  }

  return false;
}

const rotationSchema = z.object({
  enabled: z.boolean(),
  intervalDays: z.number().min(0),
  maxRotations: z.number().optional(),
  rotationCount: z.number().min(0),
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
  validUntil: z.number().finite().nullable().optional(),
  status: z.enum(["active", "expired", "scheduled"]).default("scheduled"),
  totalUnlocks: z.number().int().nonnegative().default(0),
  totalClicks: z.number().int().nonnegative().optional(),
  createdAt: z.number().finite().nullable().optional(),
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
    .nullable()
    .optional(),
  rotationConfig: rotationSchema.nullable().optional(),
  mediaCounts: z.object({ images: z.number().int().nonnegative(), videos: z.number().int().nonnegative() }).optional(),
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
  validUntil: timestampSchema.nullable().optional(),
  status: z.enum(["active", "expired", "scheduled"]).optional(),
  totalUnlocks: z.number().optional(),
  totalClicks: z.number().optional(),
  createdAt: timestampSchema.nullable().optional(),
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
    .nullable()
    .optional(),
  rotationConfig: rotationSchema.nullable().optional(),
  mediaCounts: z.object({ images: z.number().int().nonnegative(), videos: z.number().int().nonnegative() }).optional(),
});

function toMillis(value: z.infer<typeof timestampSchema>): number {
  if (typeof value === "number") {
    return value;
  }

  const candidate = value as Record<string, any>;
  if (typeof candidate.toMillis === "function") {
    return candidate.toMillis();
  }

  if (typeof candidate._seconds === "number") {
    return candidate._seconds * 1000;
  }

  if (typeof candidate.seconds === "number") {
    return candidate.seconds * 1000;
  }

  return 0; // Fallback
}

export function normalizeDropRecord(raw: unknown, id: string): Drop {
  const parsed = dropRecordSchema.parse({ ...(raw as Record<string, unknown>), id });
  return dropSchema.parse({
    ...parsed,
    validFrom: toMillis(parsed.validFrom),
    validUntil: parsed.validUntil != null ? toMillis(parsed.validUntil) : null,
    createdAt: parsed.createdAt != null ? toMillis(parsed.createdAt) : null,
  }) as Drop;
}
