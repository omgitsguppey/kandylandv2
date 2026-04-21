import { config as loadEnv } from "dotenv";

import { deriveViewerWatchCaptureState } from "@/lib/viewer-watch-session";
import * as runtimeAdminModule from "./runtime-admin";

loadEnv({ path: ".env.local" });
loadEnv();

const runtimeAdmin = ((runtimeAdminModule as { default?: { getRuntimeAdminDb: () => unknown } }).default
  ?? (runtimeAdminModule as unknown as { getRuntimeAdminDb: () => unknown })) as { getRuntimeAdminDb: () => any };
const db = runtimeAdmin.getRuntimeAdminDb();
const LOOKBACK_DAYS = 7;
const SAMPLE_LIMIT = 50;

type CaptureBucket = "full" | "replayed" | "gap_detected" | "flush_degraded" | "close_missing";
type DebugWatchCaptureRow = {
  id: string;
  userId: string;
  dropId: string;
  isClosed: boolean;
  closeReason: string;
  captureQuality: CaptureBucket;
  replayRecoveredCount: number;
  gapCount: number;
  maxGapMs: number;
  flushAttemptCount: number;
  flushSuccessCount: number;
  flushFailureCount: number;
  totalWatchSeconds: number;
  totalVisibleSeconds: number;
  lastSeenAtMs: number;
  degraded: boolean;
};

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function main() {
  const sinceMs = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const snapshot = await db.collection("analytics_watch_sessions").where("lastSeenAtMs", ">=", sinceMs).get();
  const rows: DebugWatchCaptureRow[] = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data() as Record<string, unknown>;
    const capture = deriveViewerWatchCaptureState({
      replayRecovered: data.replayRecovered === true,
      replayRecoveredCount: asNumber(data.replayRecoveredCount),
      gapCount: asNumber(data.gapCount),
      flushFailureCount: asNumber(data.flushFailureCount),
      isClosed: data.isClosed === true,
      closeReason: asString(data.closeReason) || null,
    });

    return {
      id: doc.id,
      userId: asString(data.userId),
      dropId: asString(data.dropId),
      isClosed: data.isClosed === true,
      closeReason: asString(data.closeReason),
      captureQuality: capture.captureQuality as CaptureBucket,
      replayRecoveredCount: asNumber(data.replayRecoveredCount),
      gapCount: asNumber(data.gapCount),
      maxGapMs: asNumber(data.maxGapMs),
      flushAttemptCount: asNumber(data.flushAttemptCount),
      flushSuccessCount: asNumber(data.flushSuccessCount),
      flushFailureCount: asNumber(data.flushFailureCount),
      totalWatchSeconds: asNumber(data.totalWatchSeconds),
      totalVisibleSeconds: asNumber(data.totalVisibleSeconds),
      lastSeenAtMs: asNumber(data.lastSeenAtMs),
      degraded: capture.degraded,
    };
  });

  const counts = rows.reduce((acc: Record<CaptureBucket | "total", number>, row: DebugWatchCaptureRow) => {
    acc.total += 1;
    acc[row.captureQuality] += 1;
    return acc;
  }, {
    total: 0,
    full: 0,
    replayed: 0,
    gap_detected: 0,
    flush_degraded: 0,
    close_missing: 0,
  });

  const degraded = rows
    .filter((row: DebugWatchCaptureRow) => row.degraded || row.captureQuality !== "full")
    .sort((left: DebugWatchCaptureRow, right: DebugWatchCaptureRow) =>
      right.gapCount - left.gapCount
      || right.flushFailureCount - left.flushFailureCount
      || right.replayRecoveredCount - left.replayRecoveredCount
      || right.lastSeenAtMs - left.lastSeenAtMs,
    )
    .slice(0, SAMPLE_LIMIT);

  console.log(JSON.stringify({
    lookbackDays: LOOKBACK_DAYS,
    totalSessions: counts.total,
    healthDegradedCount: rows.filter((row) => row.degraded).length,
    healthDegradedRate: counts.total > 0 ? Number((rows.filter((row) => row.degraded).length / counts.total).toFixed(4)) : 0,
    counts,
    samples: degraded,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
