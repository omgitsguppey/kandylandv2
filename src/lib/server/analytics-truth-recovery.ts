import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";

const ANALYTICS_TRUTH_COLLECTIONS = {
  globalMetrics: "analytics_truth_global_metrics",
  dropMetrics: "analytics_truth_drop_metrics",
  userMetrics: "analytics_truth_user_metrics",
  sessionMetrics: "analytics_truth_session_metrics",
  repairs: "analytics_truth_repairs",
  status: "analytics_truth_status",
} as const;

export async function getAnalyticsTruthRecoverySummary() {
  if (!adminDb) {
    return null;
  }

  const [globalSnapshot, statusSnapshot] = await Promise.all([
    adminDb.collection(ANALYTICS_TRUTH_COLLECTIONS.globalMetrics).doc("latest").get(),
    adminDb.collection(ANALYTICS_TRUTH_COLLECTIONS.status).doc("summary").get(),
  ]);

  return {
    global: globalSnapshot.exists ? globalSnapshot.data() as Record<string, unknown> : null,
    status: statusSnapshot.exists ? statusSnapshot.data() as Record<string, unknown> : null,
  };
}

export async function listAnalyticsTruthDrops(limit = 12) {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection(ANALYTICS_TRUTH_COLLECTIONS.dropMetrics)
    .orderBy("sortFinalizedViewCount", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    dropId: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));
}

export async function listAnalyticsTruthUsers(limit = 12) {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection(ANALYTICS_TRUTH_COLLECTIONS.userMetrics)
    .orderBy("sortFinalizedWatchTimeMs", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    userId: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));
}

export async function listAnalyticsTruthRepairs(limit = 20) {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection(ANALYTICS_TRUTH_COLLECTIONS.repairs)
    .orderBy("repairedAtMs", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    repairId: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));
}

