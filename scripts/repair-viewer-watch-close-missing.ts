import { config as loadEnv } from "dotenv";

import { FieldValue } from "firebase-admin/firestore";

import { deriveViewerWatchCaptureState } from "@/lib/viewer-watch-session";
import * as runtimeAdminModule from "./runtime-admin";

loadEnv({ path: ".env.local" });
loadEnv();

const runtimeAdmin = ((runtimeAdminModule as { default?: { getRuntimeAdminDb: () => unknown } }).default
  ?? (runtimeAdminModule as unknown as { getRuntimeAdminDb: () => unknown })) as { getRuntimeAdminDb: () => any };
const db = runtimeAdmin.getRuntimeAdminDb();
const REPAIR_CLOSE_REASON = "flush_close_recovered";
const LOOKBACK_DAYS = 7;

type RepairCandidate = {
  id: string;
  userId?: string;
  dropId?: string;
  lastSeenAtMs: number;
  sessionStartedAtMs: number;
  flushAttemptCount: number;
  flushSuccessCount: number;
  flushFailureCount: number;
  replayRecoveredCount: number;
  gapCount: number;
  isClosed: boolean;
  closeReason: string;
};

type WatchSessionDoc = FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function main() {
  const sinceMs = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const snapshot = await db.collection("analytics_watch_sessions").where("lastSeenAtMs", ">=", sinceMs).get();

  const candidates: RepairCandidate[] = snapshot.docs
    .map((doc: WatchSessionDoc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        userId: asString(data.userId) || undefined,
        dropId: asString(data.dropId) || undefined,
        lastSeenAtMs: asNumber(data.lastSeenAtMs),
        sessionStartedAtMs: asNumber(data.sessionStartedAtMs),
        flushAttemptCount: asNumber(data.flushAttemptCount),
        flushSuccessCount: asNumber(data.flushSuccessCount),
        flushFailureCount: asNumber(data.flushFailureCount),
        replayRecoveredCount: asNumber(data.replayRecoveredCount),
        gapCount: asNumber(data.gapCount),
        isClosed: data.isClosed === true,
        closeReason: asString(data.closeReason),
      };
    })
    .filter((doc: RepairCandidate) => doc.flushFailureCount > 0 && doc.flushSuccessCount > 0 && doc.sessionStartedAtMs > 0)
    .filter((doc: RepairCandidate) => !doc.isClosed && !doc.closeReason);

  if (candidates.length === 0) {
    console.log("No close-missing watch sessions found for repair.");
    return;
  }

  console.log(`Repairing ${candidates.length} close-missing watch session(s).`);

  const writer = db.bulkWriter();
  let repairedCount = 0;

  for (const candidate of candidates) {
    const ref = db.collection("analytics_watch_sessions").doc(candidate.id);
    const nextCaptureState = deriveViewerWatchCaptureState({
      replayRecoveredCount: candidate.replayRecoveredCount,
      gapCount: candidate.gapCount,
      flushFailureCount: candidate.flushFailureCount,
      isClosed: true,
      closeReason: REPAIR_CLOSE_REASON,
    });

    writer.update(ref, {
      isClosed: true,
      closeReason: REPAIR_CLOSE_REASON,
      closedAtMs: candidate.lastSeenAtMs,
      captureQuality: nextCaptureState.captureQuality,
      captureCloseMissing: nextCaptureState.closeMissing,
      captureFlushDegraded: nextCaptureState.flushDegraded,
      captureReplayRecovered: nextCaptureState.replayRecovered,
      captureGapDetected: nextCaptureState.gapDetected,
      updatedAt: FieldValue.serverTimestamp(),
    });

    repairedCount += 1;
    console.log(JSON.stringify({
      id: candidate.id,
      userId: candidate.userId,
      dropId: candidate.dropId,
      lastSeenAtMs: candidate.lastSeenAtMs,
      flushAttemptCount: candidate.flushAttemptCount,
      flushSuccessCount: candidate.flushSuccessCount,
      flushFailureCount: candidate.flushFailureCount,
      replayRecoveredCount: candidate.replayRecoveredCount,
      appliedCloseReason: REPAIR_CLOSE_REASON,
      captureQuality: nextCaptureState.captureQuality,
      source: "analytics_watch_sessions",
    }));
  }

  await writer.close();
  console.log(`Repaired ${repairedCount} session(s).`);
}

main().catch((error) => {
  console.error("Viewer watch close-missing repair failed", error);
  process.exitCode = 1;
});
