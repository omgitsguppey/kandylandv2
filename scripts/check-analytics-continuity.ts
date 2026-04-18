import { summarizeAnalyticsTruth } from "@/lib/admin-analytics-truth";
import { classifyGumdropTransaction } from "@/lib/gumdrop-ledger";
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

  const [
    watchSessionsSnapshot,
    watchAssetsSnapshot,
    eventStatsSnapshot,
    dailyRollupsSnapshot,
    pageRollupsSnapshot,
    dropDailySnapshot,
    commerceDailySnapshot,
    guestBatchesSnapshot,
    taskRollupSnapshot,
    commerceSummarySnapshot,
    transactionsSnapshot,
  ] = await Promise.all([
    adminDb.collection("analytics_watch_sessions").where("lastSeenAtMs", ">=", sinceMs).get(),
    adminDb.collection("analytics_watch_assets").where("lastSeenAtMs", ">=", sinceMs).get(),
    adminDb.collection("analytics_event_stats").get(),
    adminDb.collection("analytics_rollups_daily").get(),
    adminDb.collection("analytics_page_daily").get(),
    adminDb.collection("analytics_drop_daily").get(),
    adminDb.collection("analytics_commerce_daily").get(),
    adminDb.collection("analytics_guest_batches").where("receivedAtMs", ">=", sinceMs).get(),
    adminDb.collection("analytics_task_rollup").get(),
    adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
    adminDb.collection("transactions").where("timestampMs", ">=", sinceMs).get(),
  ]);

  const captureHealth = buildWatchCaptureHealthSummary({
    watchSessionDocs: watchSessionsSnapshot.docs,
    watchAssetDocs: watchAssetsSnapshot.docs,
  });
  const truthState = summarizeAnalyticsTruth({
    sources: [
      {
        key: "analytics_event_stats",
        label: "Event stats",
        count: eventStatsSnapshot.docs.length,
        lastSeenAt: readLatestSnapshotTimestamp(eventStatsSnapshot.docs, ["lastSeenAt", "updatedAt"]),
      },
      {
        key: "analytics_rollups_daily",
        label: "Daily analytics rollups",
        count: dailyRollupsSnapshot.docs.length,
        lastSeenAt: readLatestSnapshotTimestamp(dailyRollupsSnapshot.docs, ["lastEventAt", "updatedAt"]),
        legacyHistoricalSupport: true,
      },
      {
        key: "analytics_page_daily",
        label: "Page daily rollups",
        count: pageRollupsSnapshot.docs.length,
        lastSeenAt: readLatestSnapshotTimestamp(pageRollupsSnapshot.docs, ["lastEventAt", "updatedAt"]),
        required: false,
        legacyHistoricalSupport: true,
      },
      {
        key: "analytics_drop_daily",
        label: "Drop daily rollups",
        count: dropDailySnapshot.docs.length,
        lastSeenAt: readLatestSnapshotTimestamp(dropDailySnapshot.docs, ["lastEventAt", "updatedAt"]),
        legacyHistoricalSupport: true,
      },
      {
        key: "analytics_commerce_daily",
        label: "Commerce daily rollups",
        count: commerceDailySnapshot.docs.length,
        lastSeenAt: readLatestSnapshotTimestamp(commerceDailySnapshot.docs, ["lastTransactionAt", "updatedAt"]),
        legacyHistoricalSupport: true,
      },
      {
        key: "analytics_guest_batches",
        label: "Guest batches",
        count: guestBatchesSnapshot.docs.length,
        lastSeenAt: readLatestSnapshotTimestamp(guestBatchesSnapshot.docs, ["receivedAtMs", "createdAt", "updatedAt"]),
        required: false,
        legacyHistoricalSupport: true,
      },
      {
        key: "analytics_task_rollup",
        label: "Task rollups",
        count: taskRollupSnapshot.docs.length,
        lastSeenAt: readLatestSnapshotTimestamp(taskRollupSnapshot.docs, ["lastEventAt", "updatedAt"]),
      },
      {
        key: "analytics_commerce_rollup",
        label: "Commerce summary rollup",
        count: commerceSummarySnapshot.exists ? 1 : 0,
        lastSeenAt: commerceSummarySnapshot.exists
          ? Math.max(
              readDocumentNumber(commerceSummarySnapshot, "lastTransactionAt"),
              readDocumentTimestamp(commerceSummarySnapshot, "updatedAt"),
            )
          : 0,
      },
    ],
  });
  const creatorParity = transactionsSnapshot.docs.reduce((summary, doc) => {
    const raw = doc.data() as Record<string, unknown>;
    const classified = classifyGumdropTransaction({
      type: typeof raw.type === "string" ? raw.type : "",
      amount: typeof raw.amount === "number" ? raw.amount : Number(raw.amount || 0),
      status: raw.status,
      rewardSource: typeof raw.rewardSource === "string" ? raw.rewardSource : "",
      purchasedAmountSpent:
        typeof raw.purchasedAmountSpent === "number"
          ? raw.purchasedAmountSpent
          : Number(raw.purchasedAmountSpent || 0),
      rewardAmountSpent:
        typeof raw.rewardAmountSpent === "number"
          ? raw.rewardAmountSpent
          : Number(raw.rewardAmountSpent || 0),
      paidGumDrops:
        typeof raw.paidGumDrops === "number"
          ? raw.paidGumDrops
          : Number(raw.paidGumDrops || 0),
      bonusGumDrops:
        typeof raw.bonusGumDrops === "number"
          ? raw.bonusGumDrops
          : Number(raw.bonusGumDrops || 0),
    });

    summary.creatorSpendTransactions += classified.creatorSpendTransactionCount;
    summary.creatorSpendParityMismatchCount += classified.creatorSpendParityMismatchCount;
    summary.creatorRestrictedSpendViolationCount += classified.creatorRestrictedSpendViolationCount;
    return summary;
  }, {
    creatorSpendTransactions: 0,
    creatorSpendParityMismatchCount: 0,
    creatorRestrictedSpendViolationCount: 0,
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
  assert(
    truthState.staleRequiredCount === 0,
    `Analytics continuity failed: required analytics sources are stale or missing (${truthState.sources.filter((source) => source.required && source.status !== "healthy").map((source) => source.key).join(", ")}).`,
  );
  const legacyCoverageWarnings = truthState.sources.filter(
    (source) => source.legacyHistoricalSupport && source.status !== "healthy",
  );
  if (legacyCoverageWarnings.length > 0) {
    console.warn(
      `Analytics continuity warning: legacy-history support sources are stale or partial (${legacyCoverageWarnings.map((source) => source.key).join(", ")}).`,
    );
  }
  assert(
    creatorParity.creatorSpendParityMismatchCount === 0,
    `Analytics continuity failed: ${creatorParity.creatorSpendParityMismatchCount} creator spend transaction(s) have amount/source parity mismatches in the last 7 days.`,
  );
  assert(
    creatorParity.creatorRestrictedSpendViolationCount === 0,
    `Analytics continuity failed: ${creatorParity.creatorRestrictedSpendViolationCount} creator spend transaction(s) spent restricted creator balance from reward sources in the last 7 days.`,
  );
}

function readDocumentNumber(
  doc: FirebaseFirestore.DocumentSnapshot,
  key: string,
) {
  const data = (doc.data() as Record<string, unknown> | undefined) ?? {};
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readDocumentTimestamp(
  doc: FirebaseFirestore.DocumentSnapshot,
  key: string,
) {
  const data = (doc.data() as Record<string, unknown> | undefined) ?? {};
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    try {
      return Number((value as { toMillis: () => number }).toMillis()) || 0;
    } catch {
      return 0;
    }
  }

  return 0;
}

function readLatestSnapshotTimestamp(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  keys: string[],
) {
  return docs.reduce((latest, doc) => {
    const data = doc.data() as Record<string, unknown>;
    const next = keys.reduce((current, key) => {
      if (current > 0) {
        return current;
      }

      const value = data[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (
        value &&
        typeof value === "object" &&
        "toMillis" in value &&
        typeof (value as { toMillis?: unknown }).toMillis === "function"
      ) {
        try {
          return Number((value as { toMillis: () => number }).toMillis()) || 0;
        } catch {
          return 0;
        }
      }

      return 0;
    }, 0);
    return Math.max(latest, next);
  }, 0);
}

if (require.main === module) {
  checkAnalyticsContinuity()
    .then(() => console.log("Analytics continuity check passed."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
