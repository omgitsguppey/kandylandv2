export type WatchTimeEstimateConfidenceCap = 25 | 40 | 60;

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
  };
}

function normalizeMs(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.round(numeric);
}

export function estimateMissingWatchTime(input: {
  viewerOpenMs?: unknown;
  medianKnownWatchMsForMediaType?: unknown;
  viewedFileCount?: unknown;
  pageDurationMs?: unknown;
  watchSessionEventCount?: unknown;
  partialMediaTicks?: boolean;
}): WatchTimeDiagnosticEstimate | null {
  const viewerOpenMs = normalizeMs(input.viewerOpenMs);
  const medianKnownWatchMsForMediaType = normalizeMs(input.medianKnownWatchMsForMediaType);
  const viewedFileCount = Math.max(0, Math.round(Number(input.viewedFileCount) || 0));
  const pageDurationMs = normalizeMs(input.pageDurationMs);
  const watchSessionEventCount = Math.max(0, Math.round(Number(input.watchSessionEventCount) || 0));
  const partialMediaTicks = input.partialMediaTicks === true;

  const candidates = [
    viewerOpenMs,
    medianKnownWatchMsForMediaType > 0 && viewedFileCount > 0
      ? medianKnownWatchMsForMediaType * viewedFileCount
      : 0,
    pageDurationMs > 0
      ? Math.round(pageDurationMs * 0.6)
      : 0,
  ].filter((value) => value > 0);

  if (candidates.length === 0) {
    return null;
  }

  const estimatedWatchMs = Math.min(...candidates);
  const confidenceCapPercent: WatchTimeEstimateConfidenceCap = watchSessionEventCount <= 0
    ? 25
    : partialMediaTicks
      ? 60
      : 40;

  return {
    estimatedWatchMs,
    confidencePercent: confidenceCapPercent,
    confidenceCapPercent,
    source: "diagnostic_estimate",
    reason: watchSessionEventCount <= 0
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
    },
  };
}
