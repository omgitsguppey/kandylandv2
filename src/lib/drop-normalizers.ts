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
  autoQueueOnExpire: z.boolean().default(false),
  status: z.enum(["active", "expired", "scheduled"]).default("scheduled"),
  approvalStatus: z.enum(["approved", "pending_review", "rejected"]).optional(),
  approvalReviewedAt: z.number().finite().nullable().optional(),
  approvalReviewedBy: z.string().optional(),
  approvalNote: z.string().nullable().optional(),
  submittedByCreatorId: z.string().optional(),
  submittedByUserId: z.string().optional(),
  reviewStatus: z.enum(["pending_admin_approval", "needs_changes", "approved", "rejected"]).optional(),
  reviewedByAdminId: z.string().optional(),
  reviewedAt: z.number().finite().nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  createdByRole: z.enum(["admin", "creator"]).optional(),
  sourceTruth: z.string().optional(),
  publicDiscovery: z.boolean().optional(),
  rotationEligibility: z.boolean().optional(),
  requiresActiveSubscription: z.boolean().optional(),
  totalUnlocks: z.number().int().nonnegative().default(0),
  totalViews: z.number().int().nonnegative().optional(),
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
  coverFileName: z.string().optional(),
  contentFileNames: z.array(z.string()).optional(),
  mediaCounts: z.object({ images: z.number().int().nonnegative(), videos: z.number().int().nonnegative() }).optional(),
  contentUrls: z.array(z.string()).optional(),
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
  autoQueueOnExpire: z.boolean().optional(),
  status: z.enum(["active", "expired", "scheduled"]).optional(),
  approvalStatus: z.enum(["approved", "pending_review", "rejected"]).optional(),
  approvalReviewedAt: timestampSchema.nullable().optional(),
  approvalReviewedBy: z.string().optional(),
  approvalNote: z.string().nullable().optional(),
  submittedByCreatorId: z.string().optional(),
  submittedByUserId: z.string().optional(),
  reviewStatus: z.enum(["pending_admin_approval", "needs_changes", "approved", "rejected"]).optional(),
  reviewedByAdminId: z.string().optional(),
  reviewedAt: timestampSchema.nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  createdByRole: z.enum(["admin", "creator"]).optional(),
  sourceTruth: z.string().optional(),
  publicDiscovery: z.boolean().optional(),
  rotationEligibility: z.boolean().optional(),
  requiresActiveSubscription: z.boolean().optional(),
  totalUnlocks: z.number().optional(),
  totalViews: z.number().optional(),
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
  coverFileName: z.string().optional(),
  contentFileNames: z.array(z.string()).optional(),
  mediaCounts: z.object({ images: z.number().int().nonnegative(), videos: z.number().int().nonnegative() }).optional(),
  contentUrls: z.array(z.string()).optional(),
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

function classifyLegacyUrl(url: string, fallbackMimeType?: string): "image" | "video" {
  const normalizedFallback = fallbackMimeType?.toLowerCase() || "";

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.match(/\.(mp4|m4v|mov|webm|ogg|ogv)$/)) return "video";
    if (pathname.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|avif)$/)) return "image";
  } catch {
    const lowerUrl = url.split("?")[0].toLowerCase();
    if (lowerUrl.match(/\.(mp4|m4v|mov|webm|ogg|ogv)$/)) return "video";
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|avif)$/)) return "image";
  }

  return normalizedFallback.startsWith("video/") ? "video" : "image";
}

export function normalizeDropRecord(raw: unknown, id: string): Drop {
  const data = raw as Record<string, unknown>;
  const parsed = dropRecordSchema.parse({ ...data, id });
  const normalizedContentUrls = parsed.contentUrls?.length
    ? Array.from(new Set(parsed.contentUrls.filter((url) => typeof url === "string" && url.length > 0)))
    : (parsed.contentUrl ? [parsed.contentUrl] : []);

  // Calculate mediaCounts fallback if missing
  let mediaCounts = parsed.mediaCounts;
  if (!mediaCounts) {
    let images = 0;
    let videos = 0;
    const urls = normalizedContentUrls;

    if (urls.length > 0) {
      urls.forEach(url => {
        const kind = classifyLegacyUrl(url, parsed.fileMetadata?.type);
        if (kind === "video") videos++;
        else images++;
      });
    }

    if (images > 0 || videos > 0) {
      mediaCounts = { images, videos };
    }
  }

  return dropSchema.parse({
    ...parsed,
    contentUrl: normalizedContentUrls[0] || parsed.contentUrl || "",
    contentUrls: normalizedContentUrls,
    mediaCounts,
    validFrom: toMillis(parsed.validFrom),
    validUntil: parsed.validUntil != null ? toMillis(parsed.validUntil) : null,
    approvalReviewedAt: parsed.approvalReviewedAt != null ? toMillis(parsed.approvalReviewedAt) : null,
    reviewedAt: parsed.reviewedAt != null ? toMillis(parsed.reviewedAt) : null,
    createdAt: parsed.createdAt != null ? toMillis(parsed.createdAt) : null,
  }) as Drop;
}
