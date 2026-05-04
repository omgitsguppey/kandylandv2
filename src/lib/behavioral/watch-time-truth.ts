export type LiteralWatchMediaType = "image" | "video" | "unknown";

export const IMAGE_WATCH_THRESHOLDS_MS = {
  skim: 1_000,
  viewed: 5_000,
  engaged: 10_000,
  completed: 15_000,
  manualAdvanceCompleted: 8_000,
} as const;

export const VIDEO_WATCH_THRESHOLDS = {
  viewedMs: 10_000,
  viewedProgressPercent: 20,
  engagedProgressPercent: 50,
  completedProgressPercent: 90,
} as const;

function normalizeMs(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.round(numeric);
}

function normalizeProgressPercent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, numeric));
}

export function inferLiteralWatchMediaType(input: string | null | undefined): LiteralWatchMediaType {
  const normalized = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (normalized === "video" || normalized === "audio") {
    return "video";
  }

  if (normalized === "image" || normalized === "pdf") {
    return "image";
  }

  return "unknown";
}

export function computeLiteralValidWatchMs(input: {
  mediaType: LiteralWatchMediaType;
  visibleMs?: unknown;
  activeMs?: unknown;
  playingMs?: unknown;
}) {
  const visibleMs = normalizeMs(input.visibleMs);
  const activeMs = normalizeMs(input.activeMs);
  const playingMs = normalizeMs(input.playingMs);

  if (input.mediaType === "video") {
    return Math.min(playingMs || 0, visibleMs || playingMs || 0) || playingMs;
  }

  if (input.mediaType === "image") {
    return Math.min(activeMs || 0, visibleMs || activeMs || 0) || activeMs;
  }

  return Math.max(
    Math.min(activeMs || 0, visibleMs || activeMs || 0) || activeMs,
    Math.min(playingMs || 0, visibleMs || playingMs || 0) || playingMs,
  );
}

export function isImageManualAdvanceCompletionEligible(validWatchMs: unknown) {
  return normalizeMs(validWatchMs) >= IMAGE_WATCH_THRESHOLDS_MS.manualAdvanceCompleted;
}

export function isImageCompletionEligible(input: {
  validWatchMs?: unknown;
  manualAdvanceAfterMs?: unknown;
  completed?: boolean;
}) {
  const validWatchMs = normalizeMs(input.validWatchMs);
  const manualAdvanceAfterMs = normalizeMs(input.manualAdvanceAfterMs);

  return Boolean(input.completed)
    || validWatchMs >= IMAGE_WATCH_THRESHOLDS_MS.completed
    || manualAdvanceAfterMs >= IMAGE_WATCH_THRESHOLDS_MS.manualAdvanceCompleted;
}

export function isVideoCompletionEligible(input: {
  progressPercent?: unknown;
  completed?: boolean;
}) {
  return Boolean(input.completed)
    || normalizeProgressPercent(input.progressPercent) >= VIDEO_WATCH_THRESHOLDS.completedProgressPercent;
}

export function normalizeLiteralWatchProgressPercent(value: unknown) {
  return normalizeProgressPercent(value);
}
