export type WatchTimeEstimateConfidenceCap = 25 | 40 | 60;
export type WatchTimeEstimateMediaType = "image" | "video" | "unknown";
export type WatchTimeEstimateSourceReliability = "none" | "legacy" | "partial_ticks" | "bounded_intervals";

export interface WatchTimeDiagnosticEstimate {
  estimatedWatchMs: number;
  confidencePercent: number;
  confidenceCapPercent: WatchTimeEstimateConfidenceCap;
  source: "diagnostic_estimate";
  reason: string;
  basis: {
    viewerOpenMs: number;
    medianKnownWatchMsForMediaType: number;
    viewedFileCount: number;
    pageDurationMs: number;
    watchSessionEventCount: number;
    partialMediaTicks: boolean;
    mediaType: WatchTimeEstimateMediaType;
    visibleMs: number;
    activeMs: number;
    playingMs: number;
    progressPercent: number;
    manualAdvanceAfterMs: number;
    completedFileCount: number;
    sourceReliability: WatchTimeEstimateSourceReliability;
  };
}

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

function normalizeMediaType(value: unknown): WatchTimeEstimateMediaType {
  return value === "image" || value === "video" ? value : "unknown";
}

function estimateObservedMediaMs(input: {
  mediaType: WatchTimeEstimateMediaType;
  visibleMs: number;
  activeMs: number;
  playingMs: number;
  manualAdvanceAfterMs: number;
}) {
  if (input.mediaType === "video") {
    return Math.min(
      input.playingMs || input.visibleMs || 0,
      input.visibleMs || input.playingMs || 0,
    );
  }

  if (input.mediaType === "image") {
    return Math.max(
      Math.min(
        input.activeMs || input.visibleMs || 0,
        input.visibleMs || input.activeMs || 0,
      ),
      input.manualAdvanceAfterMs,
    );
  }

  return Math.max(
    Math.min(
      input.activeMs || input.visibleMs || 0,
      input.visibleMs || input.activeMs || 0,
    ),
    Math.min(
      input.playingMs || input.visibleMs || 0,
      input.visibleMs || input.playingMs || 0,
    ),
    input.manualAdvanceAfterMs,
  );
}

function resolveSourceReliability(input: {
  observedMediaMs: number;
  progressPercent: number;
  manualAdvanceAfterMs: number;
  completedFileCount: number;
  partialMediaTicks: boolean;
  watchSessionEventCount: number;
}): WatchTimeEstimateSourceReliability {
  if (
    input.observedMediaMs > 0
    || input.progressPercent > 0
    || input.manualAdvanceAfterMs > 0
    || input.completedFileCount > 0
  ) {
    return "bounded_intervals";
  }
  if (input.partialMediaTicks || input.watchSessionEventCount > 0) {
    return "partial_ticks";
  }
  return "legacy";
}

export function estimateMissingWatchTime(input: {
  viewerOpenMs?: unknown;
  medianKnownWatchMsForMediaType?: unknown;
  viewedFileCount?: unknown;
  pageDurationMs?: unknown;
  watchSessionEventCount?: unknown;
  partialMediaTicks?: boolean;
  mediaType?: unknown;
  visibleMs?: unknown;
  activeMs?: unknown;
  playingMs?: unknown;
  progressPercent?: unknown;
  manualAdvanceAfterMs?: unknown;
  completedFileCount?: unknown;
}): WatchTimeDiagnosticEstimate | null {
  const viewerOpenMs = normalizeMs(input.viewerOpenMs);
  const medianKnownWatchMsForMediaType = normalizeMs(input.medianKnownWatchMsForMediaType);
  const viewedFileCount = Math.max(0, Math.round(Number(input.viewedFileCount) || 0));
  const pageDurationMs = normalizeMs(input.pageDurationMs);
  const watchSessionEventCount = Math.max(0, Math.round(Number(input.watchSessionEventCount) || 0));
  const partialMediaTicks = input.partialMediaTicks === true;
  const mediaType = normalizeMediaType(input.mediaType);
  const visibleMs = normalizeMs(input.visibleMs);
  const activeMs = normalizeMs(input.activeMs);
  const playingMs = normalizeMs(input.playingMs);
  const progressPercent = normalizeProgressPercent(input.progressPercent);
  const manualAdvanceAfterMs = normalizeMs(input.manualAdvanceAfterMs);
  const completedFileCount = Math.max(0, Math.round(Number(input.completedFileCount) || 0));
  const observedMediaMs = estimateObservedMediaMs({
    mediaType,
    visibleMs,
    activeMs,
    playingMs,
    manualAdvanceAfterMs,
  });
  const progressEstimatedMs = mediaType === "video" && medianKnownWatchMsForMediaType > 0 && progressPercent > 0
    ? Math.round(medianKnownWatchMsForMediaType * Math.min(progressPercent, 95) / 100 * Math.max(1, viewedFileCount || 1))
    : 0;
  const completionEstimatedMs = medianKnownWatchMsForMediaType > 0 && completedFileCount > 0
    ? medianKnownWatchMsForMediaType * completedFileCount
    : 0;
  const sourceReliability = resolveSourceReliability({
    observedMediaMs,
    progressPercent,
    manualAdvanceAfterMs,
    completedFileCount,
    partialMediaTicks,
    watchSessionEventCount,
  });

  const conservativeCandidates = [
    viewerOpenMs,
    medianKnownWatchMsForMediaType > 0 && viewedFileCount > 0
      ? medianKnownWatchMsForMediaType * viewedFileCount
      : 0,
    pageDurationMs > 0
      ? Math.round(pageDurationMs * 0.6)
      : 0,
  ].filter((value) => value > 0);
  const diagnosticCandidates = [
    observedMediaMs,
    progressEstimatedMs,
    completionEstimatedMs,
  ].filter((value) => value > 0);

  if (conservativeCandidates.length === 0 && diagnosticCandidates.length === 0) {
    return null;
  }
  if (
    viewerOpenMs <= 0
    && sourceReliability === "legacy"
    && medianKnownWatchMsForMediaType <= 0
  ) {
    return null;
  }

  const conservativeEstimateMs = conservativeCandidates.length > 0 ? Math.min(...conservativeCandidates) : 0;
  const diagnosticEstimateMs = diagnosticCandidates.length > 0 ? Math.max(...diagnosticCandidates) : 0;
  const upperBounds = [
    viewerOpenMs,
    pageDurationMs > 0 ? Math.round(pageDurationMs * 0.9) : 0,
  ].filter((value) => value > 0);
  const boundedDiagnosticEstimateMs = upperBounds.length > 0
    ? Math.min(diagnosticEstimateMs, Math.min(...upperBounds))
    : diagnosticEstimateMs;
  const estimatedWatchMs = Math.max(conservativeEstimateMs, boundedDiagnosticEstimateMs);
  const confidenceCapPercent: WatchTimeEstimateConfidenceCap = watchSessionEventCount <= 0
    ? 25
    : sourceReliability === "bounded_intervals" || partialMediaTicks
      ? 60
      : 40;

  return {
    estimatedWatchMs,
    confidencePercent: confidenceCapPercent,
    confidenceCapPercent,
    source: "diagnostic_estimate",
    reason: sourceReliability === "bounded_intervals"
      ? "Visible, active, playing, progress, or manual-advance watch signals exist, so this is a bounded diagnostics-only estimate."
      : watchSessionEventCount <= 0
        ? "No watch-session events were captured, so this is a low-confidence diagnostics-only estimate."
        : partialMediaTicks
        ? "Partial watch-session ticks exist, so this is a bounded diagnostics-only estimate."
        : "Viewer session records exist but media ticks are missing, so this is a bounded diagnostics-only estimate.",
    basis: {
      viewerOpenMs,
      medianKnownWatchMsForMediaType,
      viewedFileCount,
      pageDurationMs,
      watchSessionEventCount,
      partialMediaTicks,
      mediaType,
      visibleMs,
      activeMs,
      playingMs,
      progressPercent,
      manualAdvanceAfterMs,
      completedFileCount,
      sourceReliability,
    },
  };
}
