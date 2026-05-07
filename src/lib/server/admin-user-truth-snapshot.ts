import type { AdminUserMetricsSnapshotMetadata } from "@/lib/admin-user-metrics-contract";
import {
  mapMetricsSnapshotSourceTruth,
  type AdminUserTruthIssue,
  type AdminUserTruthSnapshot,
} from "@/lib/admin-user-truth-contract";
import {
  buildAdminUserMetricsSnapshot,
  readAdminUserMetricsSnapshot,
} from "@/lib/server/admin-user-metrics-snapshot";

function mapSeverity(message: string): AdminUserTruthIssue["severity"] {
  const normalized = message.toLowerCase();
  if (normalized.includes("missing") || normalized.includes("failed") || normalized.includes("unavailable")) {
    return "fail";
  }
  if (normalized.includes("stale") || normalized.includes("fallback") || normalized.includes("degraded")) {
    return "warn";
  }
  return "info";
}

function mapFreshnessState(
  state: AdminUserMetricsSnapshotMetadata["snapshot"]["freshnessState"],
  sourceTruthBreakdown: AdminUserTruthSnapshot["sourceTruthBreakdown"],
): AdminUserTruthSnapshot["sourceFreshness"] {
  if (state === "unavailable") return "unavailable";
  if (state === "stale") return "stale";
  if (state === "degraded") return sourceTruthBreakdown.watchTime === "legacy_fallback" ? "legacy_fallback" : "degraded";
  return state;
}

export function toAdminUserTruthSnapshot(
  metadata: AdminUserMetricsSnapshotMetadata,
): AdminUserTruthSnapshot {
  const snapshot = metadata.snapshot;
  const sourceTruthBreakdown = mapMetricsSnapshotSourceTruth(snapshot);
  const sourceTruth = sourceTruthBreakdown.users === "legacy_fallback"
    || sourceTruthBreakdown.watchTime === "legacy_fallback"
    || sourceTruthBreakdown.purchases === "legacy_fallback"
    ? "legacy_fallback"
    : "canonical";

  return {
    totalUsers: snapshot.totalUsers,
    activeUsers: snapshot.activeUsers,
    returnedLast7Days: snapshot.sevenDayReturners,
    onboardedUsers: snapshot.onboardedUsers,
    verifiedUsers: snapshot.verifiedUsers,
    pushEnabledUsers: snapshot.pushEnabledUsers,
    trackedUnwraps: snapshot.trackedUnwraps,
    verifiedPurchases: snapshot.trackedPurchases,
    totalRevenueUsd: snapshot.totalRevenueUsd,
    validWatchTimeMs: snapshot.watchTimeMs,
    sourceFreshness: mapFreshnessState(snapshot.freshnessState, sourceTruthBreakdown),
    generatedAt: snapshot.generatedAt,
    sourceTruthBreakdown,
    issues: metadata.issues.map((message, index) => ({
      code: `admin_user_truth_issue_${index + 1}`,
      severity: mapSeverity(message),
      message,
    })),
    sourceTruth,
    confidenceScore: metadata.confidenceScore,
    sourceLabel: metadata.sourceLabel,
    legacySource: snapshot.source,
  };
}

export function buildAdminUserTruthSnapshot(
  input: Parameters<typeof buildAdminUserMetricsSnapshot>[0],
): AdminUserTruthSnapshot {
  return toAdminUserTruthSnapshot(buildAdminUserMetricsSnapshot(input));
}

export async function readAdminUserTruthSnapshot(
  input: Parameters<typeof readAdminUserMetricsSnapshot>[0],
): Promise<AdminUserTruthSnapshot> {
  return toAdminUserTruthSnapshot(await readAdminUserMetricsSnapshot(input));
}

