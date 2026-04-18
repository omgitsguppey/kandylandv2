import { buildWatchCaptureHealthSummary } from "@/lib/server/admin-analytics-capture-health";
import { getRuntimeAdminDb } from "./runtime-admin";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function checkAnalyticsContinuity() {
  const adminDb = getRuntimeAdminDb();
  const sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const [watchSessionsSnapshot, watchAssetsSnapshot] = await Promise.all([
    adminDb.collection("analytics_watch_sessions").where("lastSeenAtMs", ">=", sinceMs).get(),
    adminDb.collection("analytics_watch_assets").where("lastSeenAtMs", ">=", sinceMs).get(),
  ]);

  const captureHealth = buildWatchCaptureHealthSummary({
    watchSessionDocs: watchSessionsSnapshot.docs,
    watchAssetDocs: watchAssetsSnapshot.docs,
  });

  assert(
    captureHealth.closeMissingCount === 0,
    `Analytics continuity failed: ${captureHealth.closeMissingCount} watch session(s) ended in close-missing state during the last 7 days.`,
  );
  assert(
    captureHealth.flushDegradedCount === 0,
    `Analytics continuity failed: ${captureHealth.flushDegradedCount} watch session(s) reported flush-degraded capture during the last 7 days.`,
  );
  assert(
    captureHealth.sessionCount === 0 || captureHealth.degradedRate <= 0.25,
    `Analytics continuity failed: degraded watch capture rate ${Math.round(captureHealth.degradedRate * 100)}% exceeded the 25% budget.`,
  );
}

if (require.main === module) {
  checkAnalyticsContinuity()
    .then(() => console.log("Analytics continuity check passed."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
