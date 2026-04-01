import { Drop } from "@/types/db";

export type SupportedAspectRatio = "1:1" | "16:9" | "9:16";

const SUPPORTED_RATIOS: Record<SupportedAspectRatio, number> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

// Simple LRU cache to avoid repetitive RegExp and string processing in render loops
const dimensionsCache = new Map<string, { width: number; height: number } | null>();
function parseDimensions(dimensions: string): { width: number; height: number } | null {
  if (dimensionsCache.has(dimensions)) {
    return dimensionsCache.get(dimensions) || null;
  }

  const match = dimensions.trim().match(/^(\d+)\s*[xX:]\s*(\d+)$/);
  if (!match) {
    if (dimensionsCache.size > 1000) dimensionsCache.clear();
    dimensionsCache.set(dimensions, null);
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    if (dimensionsCache.size > 1000) dimensionsCache.clear();
    dimensionsCache.set(dimensions, null);
    return null;
  }

  const result = { width, height };
  if (dimensionsCache.size > 1000) dimensionsCache.clear();
  dimensionsCache.set(dimensions, result);
  return result;
}

export function getSupportedDropAspectRatio(drop: Drop): SupportedAspectRatio {
  const metadataDimensions = drop.fileMetadata?.dimensions;
  if (typeof metadataDimensions !== "string") {
    return "1:1";
  }

  const parsed = parseDimensions(metadataDimensions);
  if (!parsed) {
    return "1:1";
  }

  const actualRatio = parsed.width / parsed.height;

  let closest: SupportedAspectRatio = "1:1";
  let smallestDelta = Number.POSITIVE_INFINITY;

  (Object.entries(SUPPORTED_RATIOS) as Array<[SupportedAspectRatio, number]>).forEach(([ratioLabel, ratioValue]) => {
    const delta = Math.abs(actualRatio - ratioValue);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = ratioLabel;
    }
  });

  return closest;
}

export function getAspectRatioCssValue(aspectRatio: SupportedAspectRatio): string {
  return aspectRatio.replace(":", " / ");
}

const urlKindCache = new Map<string, "image" | "video">();
function classifyUrlKind(url: string, fallbackMimeType?: string): "image" | "video" {
  const cacheKey = `${url}|${fallbackMimeType || ""}`;
  if (urlKindCache.has(cacheKey)) {
    return urlKindCache.get(cacheKey)!;
  }

  const processUrl = (): "image" | "video" => {
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
  };

  const result = processUrl();
  if (urlKindCache.size > 1000) urlKindCache.clear();
  urlKindCache.set(cacheKey, result);
  return result;
}

export function getDropAssetCount(drop: Pick<Drop, "contentUrl" | "contentUrls" | "mediaCounts">): number {
  if (Array.isArray(drop.contentUrls) && drop.contentUrls.length > 0) {
    return drop.contentUrls.length;
  }

  if (drop.contentUrl) {
    return 1;
  }

  const imageCount = drop.mediaCounts?.images ?? 0;
  const videoCount = drop.mediaCounts?.videos ?? 0;
  return Math.max(0, imageCount + videoCount);
}

export function getDropMediaSummary(drop: Drop): { imageCount: number; videoCount: number } {
  // 1. Prefer explicitly saved counts
  const mediaCounts = drop.mediaCounts;
  if (mediaCounts && Number.isFinite(mediaCounts.images) && Number.isFinite(mediaCounts.videos)) {
    return {
      imageCount: Math.max(0, Math.floor(mediaCounts.images)),
      videoCount: Math.max(0, Math.floor(mediaCounts.videos)),
    };
  }

  // 2. Fallback: Parse `contentUrls` array directly for legacy drops missing explicit metrics.
  // Must strip `?alt=media&token=...` Firebase storage parameters before Regex matching.
  const urlsToCheck = drop.contentUrls && drop.contentUrls.length > 0
    ? drop.contentUrls
    : (drop.contentUrl ? [drop.contentUrl] : []);

  if (urlsToCheck.length > 0) {
    let imageCount = 0;
    let videoCount = 0;

    urlsToCheck.forEach(url => {
      if (!url) return;
      const kind = classifyUrlKind(url, drop.fileMetadata?.type);
      if (kind === "video") {
        videoCount++;
      } else {
        imageCount++;
      }
    });

    return { imageCount, videoCount };
  }

  // 3. Absolute Fallback: Single file MIME type guessing
  const type = drop.fileMetadata?.type ?? "";
  if (type.startsWith("video/")) {
    return { imageCount: 0, videoCount: 1 };
  }

  return { imageCount: 1, videoCount: 0 };
}
