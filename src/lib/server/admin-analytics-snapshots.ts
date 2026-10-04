import "server-only";

import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import {
  type AdminMetricSnapshot,
  type AdminMetricSnapshotRange,
  buildAdminMetricSnapshotDocId,
  createUnavailableAdminMetricSnapshot,
  isAdminMetricSnapshotRange,
  normalizeAdminMetricSnapshotRefreshFields,
  resolveAdminMetricRefreshCacheDisplayState,
  resolveAdminMetricSnapshotSourceMode,
  shouldPreventSnapshotRefreshStorm,
  validateAdminMetricSnapshot,
} from "@/lib/analytics/admin-metric-snapshot";
import { ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
import { adminDb } from "@/lib/server/firebase-admin";

const REFRESH_LOCK_TTL_MS = 2 * 60 * 1000;
export type SnapshotRefreshLease = { token: string; version: number };
const inFlightRefreshes = new Map<string, { promise: Promise<AdminMetricSnapshot>; leaseToken: string | null }>();

function ownsRefreshLease(data: FirebaseFirestore.DocumentData | undefined, lease?: SnapshotRefreshLease) {
  return Boolean(lease && data?.refreshStatus === "refreshing"
    && data.refreshLeaseToken === lease.token && data.refreshLeaseVersion === lease.version);
}

function collectionRef() {
  return adminDb.collection(ANALYTICS_OPERATIONAL_COLLECTIONS.adminMetricSnapshots);
}

function snapshotKey(moduleKey: string, rangeKey: AdminMetricSnapshotRange) {
  return buildAdminMetricSnapshotDocId(moduleKey, rangeKey);
}

function toSnapshot(data: FirebaseFirestore.DocumentData | undefined): AdminMetricSnapshot | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const hasSnapshotBody = data.values && typeof data.values === "object" && !Array.isArray(data.values)
    && Object.values(data.values).every((metric) => metric && typeof metric === "object")
    && Array.isArray(data.parity) && Array.isArray(data.warnings) && typeof data.generatedAt === "string";
  if (!hasSnapshotBody) {
    const unavailable = createUnavailableAdminMetricSnapshot({
      moduleKey: typeof data.moduleKey === "string" ? data.moduleKey : "unknown",
      rangeKey: isAdminMetricSnapshotRange(data.rangeKey) ? data.rangeKey : "24h",
      reason: "No verified display snapshot exists for this refresh reservation.",
      generatedAt: "",
    });
    return normalizeAdminMetricSnapshotRefreshFields({
      ...unavailable, ...data,
      values: {}, generatedAt: "", lastVerifiedAt: null, expiresAt: null,
      confidence: 0, truthState: "unavailable", sourceMode: "unavailable", sourceVersion: "unverified",
      warnings: unavailable.warnings, parity: unavailable.parity,
      unavailableReason: unavailable.unavailableReason,
    } as AdminMetricSnapshot);
  }
  return normalizeAdminMetricSnapshotRefreshFields(data as AdminMetricSnapshot);
}

export async function getAdminMetricSnapshot(moduleKey: string, rangeKey: AdminMetricSnapshotRange) {
  const doc = await collectionRef().doc(snapshotKey(moduleKey, rangeKey)).get();
  return toSnapshot(doc.data());
}

export async function getLatestVerifiedSnapshot(
  moduleKey: string,
  rangeKey: AdminMetricSnapshotRange,
  sourceSnapshot?: AdminMetricSnapshot | null,
) {
  const snapshot = sourceSnapshot === undefined
    ? await getAdminMetricSnapshot(moduleKey, rangeKey)
    : sourceSnapshot;
  if (!snapshot || !snapshot.values || !snapshot.lastVerifiedAt || snapshot.moduleKey !== moduleKey || snapshot.rangeKey !== rangeKey
    || snapshot.truthState === "unavailable" || snapshot.truthState === "failed" || validateAdminMetricSnapshot(snapshot).length > 0) {
    return null;
  }

  return normalizeAdminMetricSnapshotRefreshFields({
    ...snapshot,
    sourceMode: resolveAdminMetricSnapshotSourceMode(snapshot),
  } satisfies AdminMetricSnapshot);
}

export async function writeVerifiedSnapshot(snapshot: AdminMetricSnapshot) {
  const issues = validateAdminMetricSnapshot(snapshot);
  if (issues.length > 0) {
    throw new Error(`Cannot write invalid admin analytics snapshot: ${issues.join("; ")}`);
  }
  if (snapshot.truthState === "verified" && !snapshot.lastVerifiedAt) {
    throw new Error("Cannot write verified admin analytics snapshot without lastVerifiedAt.");
  }

  await collectionRef()
    .doc(snapshotKey(snapshot.moduleKey, snapshot.rangeKey))
    .set({
      ...snapshot,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

  return snapshot;
}

export async function markSnapshotRefreshStarted(input: {
  moduleKey: string;
  rangeKey: AdminMetricSnapshotRange;
  force?: boolean;
}) {
  const key = snapshotKey(input.moduleKey, input.rangeKey);
  const refreshStartedAt = new Date().toISOString();
  const token = randomUUID();
  const ref = collectionRef().doc(key);
  return adminDb.runTransaction(async (transaction) => {
    const document = await transaction.get(ref);
    const data = document.data();
    const existing = toSnapshot(data);
    if (shouldPreventSnapshotRefreshStorm({
      refreshStatus: data?.refreshStatus,
      refreshStartedAt: data?.refreshStartedAt,
      lockTtlMs: REFRESH_LOCK_TTL_MS,
    })) {
      return { refreshStatus: "duplicate_prevented" as const, duplicateRefreshPrevented: true, snapshot: existing, lease: null };
    }
    const previousVersion = Number.isSafeInteger(data?.refreshLeaseVersion) ? data!.refreshLeaseVersion as number : 0;
    const lease: SnapshotRefreshLease = { token, version: previousVersion + 1 };
    transaction.set(ref, {
      moduleKey: input.moduleKey, rangeKey: input.rangeKey,
      refreshStatus: "refreshing", lastRefreshRequestedAt: refreshStartedAt,
      lastRefreshStartedAt: refreshStartedAt, refreshStartedAt,
      refreshCompletedAt: null, refreshError: null, duplicateRefreshPrevented: false,
      refreshLeaseToken: lease.token, refreshLeaseVersion: lease.version,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { refreshStatus: "refreshing" as const, duplicateRefreshPrevented: false, refreshStartedAt, snapshot: existing, lease };
  });
}

export async function markSnapshotRefreshCompleted(
  moduleKey: string,
  rangeKey: AdminMetricSnapshotRange,
  result: AdminMetricSnapshot,
  lease?: SnapshotRefreshLease,
) {
  const issues = validateAdminMetricSnapshot(result);
  if (issues.length > 0 || result.moduleKey !== moduleKey || result.rangeKey !== rangeKey
    || !result.lastVerifiedAt || result.truthState === "unavailable" || result.truthState === "failed") {
    throw new Error("snapshot_refresh_invalid_display_evidence");
  }
  const refreshCompletedAt = new Date().toISOString();
  const ref = collectionRef().doc(snapshotKey(moduleKey, rangeKey));
  return adminDb.runTransaction(async (transaction) => {
    const document = await transaction.get(ref);
    const data = document.data();
    const existing = toSnapshot(data);
    if (!ownsRefreshLease(data, lease) || !shouldPreventSnapshotRefreshStorm({
      refreshStatus: data?.refreshStatus, refreshStartedAt: data?.refreshStartedAt, lockTtlMs: REFRESH_LOCK_TTL_MS,
    })) return { applied: false as const, snapshot: existing };
    const snapshot = normalizeAdminMetricSnapshotRefreshFields({
      ...result,
      moduleKey,
      rangeKey,
      refreshStatus: "completed",
      refreshCompletedAt,
      lastRefreshRequestedAt: result.lastRefreshRequestedAt ?? existing?.lastRefreshRequestedAt ?? existing?.lastRefreshStartedAt ?? null,
      lastRefreshStartedAt: result.lastRefreshStartedAt ?? result.refreshStartedAt ?? existing?.lastRefreshStartedAt ?? existing?.refreshStartedAt ?? null,
      lastRefreshCompletedAt: refreshCompletedAt,
      lastRefreshFailedAt: null,
      refreshError: null,
      duplicateRefreshPrevented: false,
      refreshVersion: (existing?.refreshVersion ?? result.refreshVersion ?? 0) + 1,
      sourceVersion: result.sourceVersion ?? result.lastVerifiedAt ?? result.generatedAt,
    } satisfies AdminMetricSnapshot);

    transaction.set(ref, {
      ...snapshot,
      refreshLeaseToken: null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { applied: true as const, snapshot };
  });
}

export async function markSnapshotRefreshFailed(
  moduleKey: string,
  rangeKey: AdminMetricSnapshotRange,
  error: unknown,
  lease?: SnapshotRefreshLease,
) {
  const message = error instanceof Error ? error.message : String(error);
  const refreshFailedAt = new Date().toISOString();
  const ref = collectionRef().doc(snapshotKey(moduleKey, rangeKey));
  return adminDb.runTransaction(async (transaction) => {
    const document = await transaction.get(ref);
    if (!ownsRefreshLease(document.data(), lease)) {
      return { applied: false, moduleKey, rangeKey, refreshStatus: "duplicate_prevented" as const, refreshFailedAt, refreshError: "snapshot_refresh_lease_lost" };
    }
    transaction.set(ref, {
      moduleKey,
      rangeKey,
      refreshStatus: "failed",
      refreshFailedAt,
      lastRefreshFailedAt: refreshFailedAt,
      refreshError: message,
      duplicateRefreshPrevented: false,
      refreshLeaseToken: null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      applied: true,
      moduleKey,
      rangeKey,
      refreshStatus: "failed" as const,
      refreshFailedAt,
      refreshError: message,
    };
  });
}

export async function getSnapshotDebugMetadata(
  moduleKey: string,
  rangeKey: AdminMetricSnapshotRange,
  sourceSnapshot?: AdminMetricSnapshot | null,
) {
  const snapshot = sourceSnapshot === undefined
    ? await getAdminMetricSnapshot(moduleKey, rangeKey)
    : sourceSnapshot;
  if (!snapshot) {
    return {
      moduleKey,
      rangeKey,
      exists: false,
      sourceMode: "unavailable",
      truthState: "unavailable",
      refreshStatus: "unavailable",
      duplicateRefreshPrevented: false,
      unavailableReason: "No verified admin analytics snapshot exists for this module/range.",
    };
  }

  return {
    moduleKey,
    rangeKey,
    exists: true,
    sourceMode: resolveAdminMetricSnapshotSourceMode(snapshot),
    cacheKey: snapshot.cacheKey,
    surfaceKey: snapshot.surfaceKey,
    truthState: snapshot.truthState,
    refreshCacheState: resolveAdminMetricRefreshCacheDisplayState(snapshot),
    lastVerifiedAt: snapshot.lastVerifiedAt,
    generatedAt: snapshot.generatedAt,
    refreshStatus: snapshot.refreshStatus,
    lastRefreshRequestedAt: snapshot.lastRefreshRequestedAt,
    lastRefreshStartedAt: snapshot.lastRefreshStartedAt,
    lastRefreshCompletedAt: snapshot.lastRefreshCompletedAt,
    lastRefreshFailedAt: snapshot.lastRefreshFailedAt ?? null,
    refreshStartedAt: snapshot.refreshStartedAt,
    refreshCompletedAt: snapshot.refreshCompletedAt,
    refreshVersion: snapshot.refreshVersion,
    sourceVersion: snapshot.sourceVersion,
    invalidationReason: snapshot.invalidationReason ?? null,
    duplicateRefreshPrevented: snapshot.duplicateRefreshPrevented,
    values: snapshot.values,
    formulas: snapshot.formulas,
    sourceBreakdown: snapshot.sourceBreakdown,
    warnings: snapshot.warnings,
    parity: snapshot.parity,
    legacyIncluded: snapshot.legacyIncluded,
    confidence: snapshot.confidence,
    staleReason: snapshot.staleReason ?? null,
    unavailableReason: snapshot.unavailableReason ?? null,
    displaySource: snapshot.lastVerifiedAt ? resolveAdminMetricSnapshotSourceMode(snapshot) : "unavailable",
    displayAllowedBecause: snapshot.lastVerifiedAt
      ? "last_verified_snapshot_exists"
      : null,
    displayBlockedBecause: snapshot.lastVerifiedAt
      ? null
      : snapshot.invalidationReason ?? snapshot.unavailableReason ?? "no_verified_snapshot",
    refreshDedupeHit: snapshot.duplicateRefreshPrevented,
    staleButVerified: resolveAdminMetricRefreshCacheDisplayState(snapshot) === "stale_but_verified",
    estimatedGuestTraffic: snapshot.estimatedFlags?.guestTrafficEstimated === true,
    anonymousBatchStatus: snapshot.sourceBreakdown?.anonymousBatchStatus ?? null,
    blocksOnRealtime: false,
    blocksOnRefresh: false,
    blocksOnTimeExpiry: false,
    fakeWaitingPrevented: Boolean(snapshot.lastVerifiedAt),
    fakeZeroPrevented: !snapshot.lastVerifiedAt || Object.values(snapshot.values).some((metric) => metric.fakeZeroPrevented === true),
    routerRefreshUsed: false,
    revalidationUsed: false,
    parityWarnings: snapshot.parity.filter((entry) => entry.status === "warn" || entry.status === "fail"),
    estimatedFlags: snapshot.estimatedFlags,
    legacyFlags: snapshot.legacyFlags,
    debugPath: snapshot.debugPath,
  };
}

export async function listAdminMetricSnapshotDebugMetadata(input: { limit?: number } = {}) {
  const snapshot = await collectionRef()
    .orderBy("generatedAt", "desc")
    .limit(input.limit ?? 80)
    .get();

  return snapshot.docs.map((doc) => {
    const data = toSnapshot(doc.data());
    return {
      id: doc.id,
      moduleKey: data?.moduleKey ?? "unknown",
      rangeKey: data?.rangeKey ?? "24h",
      cacheKey: data?.cacheKey ?? null,
      surfaceKey: data?.surfaceKey ?? "admin_analytics",
      sourceMode: data ? resolveAdminMetricSnapshotSourceMode(data) : "unavailable",
      truthState: data?.truthState ?? "unavailable",
      refreshCacheState: data ? resolveAdminMetricRefreshCacheDisplayState(data) : "unavailable",
      lastVerifiedAt: data?.lastVerifiedAt ?? null,
      generatedAt: data?.generatedAt ?? null,
      refreshStatus: data?.refreshStatus ?? "unavailable",
      lastRefreshRequestedAt: data?.lastRefreshRequestedAt ?? null,
      lastRefreshStartedAt: data?.lastRefreshStartedAt ?? null,
      lastRefreshCompletedAt: data?.lastRefreshCompletedAt ?? null,
      lastRefreshFailedAt: data?.lastRefreshFailedAt ?? null,
      refreshVersion: data?.refreshVersion ?? 0,
      sourceVersion: data?.sourceVersion ?? null,
      invalidationReason: data?.invalidationReason ?? null,
      refreshStartedAt: data?.refreshStartedAt ?? null,
      refreshCompletedAt: data?.refreshCompletedAt ?? null,
      duplicateRefreshPrevented: data?.duplicateRefreshPrevented ?? false,
      refreshDedupeHit: data?.duplicateRefreshPrevented ?? false,
      confidence: data?.confidence ?? 0,
      warningCount: data?.warnings?.length ?? 0,
      parityCount: data?.parity?.length ?? 0,
      legacyIncluded: data?.legacyIncluded ?? false,
      staleReason: data?.staleReason ?? null,
      unavailableReason: data?.unavailableReason ?? null,
      displaySource: data?.lastVerifiedAt ? resolveAdminMetricSnapshotSourceMode(data) : "unavailable",
      displayAllowedBecause: data?.lastVerifiedAt ? "last_verified_snapshot_exists" : null,
      displayBlockedBecause: data?.lastVerifiedAt ? null : data?.invalidationReason ?? data?.unavailableReason ?? "no_verified_snapshot",
      staleButVerified: data ? resolveAdminMetricRefreshCacheDisplayState(data) === "stale_but_verified" : false,
      estimatedGuestTraffic: data?.estimatedFlags?.guestTrafficEstimated === true,
      anonymousBatchStatus: data?.sourceBreakdown?.anonymousBatchStatus ?? null,
      blocksOnRealtime: false,
      blocksOnRefresh: false,
      blocksOnTimeExpiry: false,
      fakeWaitingPrevented: Boolean(data?.lastVerifiedAt),
      fakeZeroPrevented: data ? !data.lastVerifiedAt || Object.values(data.values).some((metric) => metric.fakeZeroPrevented === true) : true,
      routerRefreshUsed: false,
      revalidationUsed: false,
      parityWarnings: data?.parity?.filter((entry) => entry.status === "warn" || entry.status === "fail") ?? [],
      estimatedFlags: data?.estimatedFlags ?? {},
      legacyFlags: data?.legacyFlags ?? {},
      debugPath: data?.debugPath ?? null,
    };
  });
}

export async function runSnapshotRefreshWithDedupe(input: {
  moduleKey: string;
  rangeKey: AdminMetricSnapshotRange;
  force?: boolean;
  lease?: SnapshotRefreshLease;
  refresh: () => Promise<AdminMetricSnapshot>;
}) {
  const key = snapshotKey(input.moduleKey, input.rangeKey);
  const existing = inFlightRefreshes.get(key);
  const leaseToken = input.lease?.token ?? null;
  if (existing && existing.leaseToken === leaseToken) {
    const snapshot = await existing.promise;
    return {
      snapshot,
      duplicateRefreshPrevented: true,
    };
  }

  const entry = { promise: null as unknown as Promise<AdminMetricSnapshot>, leaseToken };
  entry.promise = input.refresh()
    .finally(() => {
      if (inFlightRefreshes.get(key) === entry) inFlightRefreshes.delete(key);
    });

  inFlightRefreshes.set(key, entry);
  const snapshot = await entry.promise;

  return {
    snapshot,
    duplicateRefreshPrevented: false,
  };
}

export function clearAdminMetricSnapshotRefreshLocksForTests() {
  inFlightRefreshes.clear();
}
