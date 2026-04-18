import {
  deriveViewerWatchCaptureState,
  VIEWER_WATCH_CAPTURE_TRANSPORTS,
} from "@/lib/viewer-watch-session";

import { average, toNumber, toStringValue } from "./admin-analytics-shared";

type WatchCaptureTransport = (typeof VIEWER_WATCH_CAPTURE_TRANSPORTS)[number];

export interface WatchCaptureTransportCount {
  transport: WatchCaptureTransport;
  count: number;
}

export interface WatchCaptureHealthSummary {
  sessionCount: number;
  fullCaptureCount: number;
  degradedSessionCount: number;
  replayRecoveredCount: number;
  gapDetectedCount: number;
  flushDegradedCount: number;
  closeMissingCount: number;
  degradedRate: number;
  averageGapMs: number;
  averageHiddenSeconds: number;
  averageWaitSeconds: number;
  averageSeekCount: number;
  averagePlaybackRate: number;
  mutedSessionCount: number;
  transportBreakdown: WatchCaptureTransportCount[];
  lastSeenAtMs: number;
  warnings: string[];
}

function normalizeTransport(value: unknown): WatchCaptureTransport {
  const candidate = toStringValue(value) as WatchCaptureTransport;
  return VIEWER_WATCH_CAPTURE_TRANSPORTS.includes(candidate) ? candidate : "unknown";
}

export function buildWatchCaptureHealthSummary(input: {
  watchSessionDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  watchAssetDocs: FirebaseFirestore.QueryDocumentSnapshot[];
}): WatchCaptureHealthSummary {
  const transportCounts = new Map<WatchCaptureTransport, number>();
  const hiddenSeconds: number[] = [];
  const gapMsValues: number[] = [];
  const waitSecondsBySession = new Map<string, number>();
  const seekCountBySession = new Map<string, number>();
  const playbackRateBySession = new Map<string, number>();
  const mutedSessionKeys = new Set<string>();

  let sessionCount = 0;
  let fullCaptureCount = 0;
  let degradedSessionCount = 0;
  let replayRecoveredCount = 0;
  let gapDetectedCount = 0;
  let flushDegradedCount = 0;
  let closeMissingCount = 0;
  let lastSeenAtMs = 0;

  input.watchSessionDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const captureState = deriveViewerWatchCaptureState({
      replayRecovered: data.replayRecovered === true,
      replayRecoveredCount: toNumber(data.replayRecoveredCount),
      gapCount: toNumber(data.gapCount),
      flushFailureCount: toNumber(data.flushFailureCount),
      isClosed: data.isClosed === true,
      closeReason: toStringValue(data.closeReason),
    });

    sessionCount += 1;
    if (captureState.degraded) {
      degradedSessionCount += 1;
    } else {
      fullCaptureCount += 1;
    }
    if (captureState.replayRecovered) {
      replayRecoveredCount += 1;
    }
    if (captureState.gapDetected) {
      gapDetectedCount += 1;
    }
    if (captureState.flushDegraded) {
      flushDegradedCount += 1;
    }
    if (captureState.closeMissing) {
      closeMissingCount += 1;
    }

    const transport = normalizeTransport(data.captureTransport);
    transportCounts.set(transport, (transportCounts.get(transport) || 0) + 1);

    const hiddenDuration = toNumber(data.hiddenDurationSeconds);
    if (hiddenDuration > 0) {
      hiddenSeconds.push(hiddenDuration);
    }

    const gapMs = toNumber(data.maxGapMs);
    if (gapMs > 0) {
      gapMsValues.push(gapMs);
    }

    lastSeenAtMs = Math.max(lastSeenAtMs, toNumber(data.lastSeenAtMs));
  });

  input.watchAssetDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const watchSessionId = toStringValue(data.watchSessionId) || doc.id;
    waitSecondsBySession.set(
      watchSessionId,
      (waitSecondsBySession.get(watchSessionId) || 0) + toNumber(data.waitingDurationSeconds),
    );
    seekCountBySession.set(
      watchSessionId,
      (seekCountBySession.get(watchSessionId) || 0) + toNumber(data.seekCount),
    );

    const playbackRate = toNumber(data.playbackRateAverage);
    if (playbackRate > 0) {
      const current = playbackRateBySession.get(watchSessionId) || 0;
      playbackRateBySession.set(watchSessionId, current > 0 ? Number(((current + playbackRate) / 2).toFixed(2)) : playbackRate);
    }

    if (toNumber(data.mutedSampleCount) > 0) {
      mutedSessionKeys.add(watchSessionId);
    }
  });

  const warnings: string[] = [];
  if (sessionCount === 0) {
    warnings.push("No canonical watch sessions matched the selected range.");
  }
  if (closeMissingCount > 0) {
    warnings.push(`${closeMissingCount} session(s) degraded with close-missing capture state.`);
  }
  if (flushDegradedCount > 0) {
    warnings.push(`${flushDegradedCount} session(s) reported flush-degraded sync.`);
  }

  return {
    sessionCount,
    fullCaptureCount,
    degradedSessionCount,
    replayRecoveredCount,
    gapDetectedCount,
    flushDegradedCount,
    closeMissingCount,
    degradedRate: sessionCount > 0 ? Number((degradedSessionCount / sessionCount).toFixed(4)) : 0,
    averageGapMs: Math.round(average(gapMsValues)),
    averageHiddenSeconds: Number(average(hiddenSeconds).toFixed(2)),
    averageWaitSeconds: Number(average(Array.from(waitSecondsBySession.values())).toFixed(2)),
    averageSeekCount: Number(average(Array.from(seekCountBySession.values())).toFixed(2)),
    averagePlaybackRate: Number(average(Array.from(playbackRateBySession.values())).toFixed(2)),
    mutedSessionCount: mutedSessionKeys.size,
    transportBreakdown: VIEWER_WATCH_CAPTURE_TRANSPORTS.map((transport) => ({
      transport,
      count: transportCounts.get(transport) || 0,
    })),
    lastSeenAtMs,
    warnings,
  };
}
