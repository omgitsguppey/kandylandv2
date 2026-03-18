import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { buildAnalyticsTimeKeys } from "./analytics-event-utils";
import { adminDb } from "./firebase-admin";

const PIPELINE_HEALTH_TTL_MS = 1000 * 60 * 60 * 24 * 180;

function normalizeRouteKey(routeName: string) {
  return routeName.replaceAll(/[^a-z0-9]+/gi, "_").replaceAll(/^_+|_+$/g, "").slice(0, 80) || "unknown_route";
}

export async function recordAnalyticsPipelineFailure(input: {
  routeName: string;
  errorMessage: string;
  timestamp?: number;
}) {
  if (!adminDb) {
    return;
  }

  const timestamp = input.timestamp ?? Date.now();
  const timeKeys = buildAnalyticsTimeKeys(timestamp);
  const docRef = adminDb.collection("analytics_pipeline_daily").doc(timeKeys.dayKey);
  const routeKey = normalizeRouteKey(input.routeName);

  try {
    await docRef.set({
      dayKey: timeKeys.dayKey,
      hourKey: timeKeys.hourKey,
      lastFailureAtMs: timestamp,
      lastRouteName: input.routeName,
      lastErrorMessage: input.errorMessage.slice(0, 240),
      failureCount: FieldValue.increment(1),
      [`routeCounts.${routeKey}`]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(timestamp + PIPELINE_HEALTH_TTL_MS),
    }, { merge: true });
  } catch (error) {
    console.warn("Analytics pipeline health write failed:", error);
  }
}
