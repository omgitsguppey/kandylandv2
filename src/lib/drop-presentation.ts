import { Drop } from "@/types/db";

export type SupportedAspectRatio = "1:1" | "16:9" | "9:16";

const SUPPORTED_RATIOS: Record<SupportedAspectRatio, number> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

function parseDimensions(dimensions: string): { width: number; height: number } | null {
  const match = dimensions.trim().match(/^(\d+)\s*[xX:]\s*(\d+)$/);
  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
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

export function getDropCardWidthClass(aspectRatio: SupportedAspectRatio): string {
  switch (aspectRatio) {
    case "16:9":
      return "w-[340px] md:w-[420px]";
    case "9:16":
      return "w-[180px] md:w-[220px]";
    default:
      return "w-[240px] md:w-[300px]";
  }
}

export function getDropMediaSummary(drop: Drop): { imageCount: number; videoCount: number } {
  const mediaCounts = drop.mediaCounts;
  if (mediaCounts && Number.isFinite(mediaCounts.images) && Number.isFinite(mediaCounts.videos)) {
    return {
      imageCount: Math.max(0, Math.floor(mediaCounts.images)),
      videoCount: Math.max(0, Math.floor(mediaCounts.videos)),
    };
  }

  const type = drop.fileMetadata?.type ?? "";
  if (type.startsWith("video/")) {
    return { imageCount: 0, videoCount: 1 };
  }

  return { imageCount: 1, videoCount: 0 };
}
