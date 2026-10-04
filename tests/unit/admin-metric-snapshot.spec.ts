import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADMIN_METRIC_SNAPSHOT_SOURCE_MODES,
  buildAdminMetricSnapshotDocId,
  createSnapshotValue,
  createUnavailableAdminMetricSnapshot,
  getAdminMetricDisplaySnapshot,
  resolveAdminMetricRefreshCacheDisplayState,
  resolveAdminMetricSnapshotSourceMode,
  shouldPreventSnapshotRefreshStorm,
  validateAdminMetricSnapshot,
  type AdminMetricSnapshot,
} from "@/lib/analytics/admin-metric-snapshot";
import {
  ADMIN_ANALYTICS_MATERIALIZER_REGISTRY,
  ADMIN_ANALYTICS_SNAPSHOT_MODULE_KEYS,
  materializeAdminAnalyticsSnapshot,
} from "@/lib/server/admin-analytics-materializers";

import { ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";

const persistedState = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  transactionTail: Promise.resolve(),
  documentReads: [] as string[],
  transactionReads: [] as string[],
  afterTransactionCommit: null as ((result: unknown) => void) | null,
  nextReadError: null as Error | null,
  afterDocumentRead: null as ((key: string) => void) | null,
}));

const routeState = vi.hoisted(() => ({ guardApiRequest: vi.fn(), handleApiError: vi.fn(), promotedAudience: false, materialize: vi.fn() }));
vi.mock("@/lib/server/admin-analytics-materializers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-analytics-materializers")>();
  return {
    ...actual,
    getAdminAnalyticsMaterializer: (moduleKey: string) => {
      const entry = actual.getAdminAnalyticsMaterializer(moduleKey);
      return entry && routeState.promotedAudience && moduleKey === "audience_snapshot"
        ? { ...entry, currentImplementationStatus: "ready", defaultAdminAnalyticsCoverage: "ready", canRunDefaultRefresh: true }
        : entry;
    },
    materializeAdminAnalyticsSnapshot: (input: Parameters<typeof actual.materializeAdminAnalyticsSnapshot>[0]) =>
      routeState.promotedAudience && input.moduleKey === "audience_snapshot" ? routeState.materialize(input) : actual.materializeAdminAnalyticsSnapshot(input),
  };
});
vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: routeState.guardApiRequest }));
vi.mock("@/lib/server/auth", () => ({ handleApiError: routeState.handleApiError }));
vi.mock("@/lib/server/rate-limit", () => ({ ADMIN_ANALYTICS: {} }));
vi.mock("@/lib/server/route-runtime-health", () => ({ withRouteRuntimeHealth: (_key: string, handler: unknown) => handler }));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: (collection: string) => ({
      orderBy: () => ({ limit: (limit: number) => ({ get: async () => ({
        docs: Array.from(persistedState.documents.entries()).filter(([key]) => key.startsWith(`${collection}/`)).slice(0, limit).map(([key, value]) => ({ id: key.split("/").at(-1), data: () => structuredClone(value) })),
      }) }) }),
      doc: (id: string) => {
        const key = `${collection}/${id}`;
        return {
          key,
          get: async () => {
            persistedState.documentReads.push(key);
            if (persistedState.nextReadError) {
              const error = persistedState.nextReadError;
              persistedState.nextReadError = null;
              throw error;
            }
            // Firestore DocumentSnapshot retains the revision returned by get().
            const value = structuredClone(persistedState.documents.get(key));
            persistedState.afterDocumentRead?.(key);
            return { data: () => structuredClone(value) };
          },
          set: async (value: Record<string, unknown>, options?: { merge?: boolean }) => {
            const previous = options?.merge ? persistedState.documents.get(key) ?? {} : {};
            persistedState.documents.set(key, structuredClone({ ...previous, ...value }));
          },
        };
      },
    }),
    runTransaction: (callback: (transaction: unknown) => Promise<unknown>) => {
      const result = persistedState.transactionTail.then(async () => {
        const writes: Array<{ key: string; value: Record<string, unknown>; merge: boolean }> = [];
        const transaction = {
          get: async (ref: { key: string }) => {
            persistedState.transactionReads.push(ref.key);
            return { data: () => structuredClone(persistedState.documents.get(ref.key)) };
          },
          set: (ref: { key: string }, value: Record<string, unknown>, options?: { merge?: boolean }) => {
            writes.push({ key: ref.key, value, merge: options?.merge === true });
          },
        };
        const value = await callback(transaction);
        for (const write of writes) {
          const previous = write.merge ? persistedState.documents.get(write.key) ?? {} : {};
          persistedState.documents.set(write.key, structuredClone({ ...previous, ...write.value }));
        }
        persistedState.afterTransactionCommit?.(value);
        return value;
      });
      persistedState.transactionTail = result.then(() => undefined, () => undefined);
      return result;
    },
  },
}));

import {
  clearAdminMetricSnapshotRefreshLocksForTests,
  getAdminMetricSnapshot,
  getLatestVerifiedSnapshot,
  getSnapshotDebugMetadata,
  listAdminMetricSnapshotDebugMetadata,
  markSnapshotRefreshCompleted,
  markSnapshotRefreshFailed,
  markSnapshotRefreshStarted,
  runSnapshotRefreshWithDedupe,
  writeVerifiedSnapshot,
} from "@/lib/server/admin-analytics-snapshots";
import { GET, POST } from "@/app/api/admin/analytics/refresh/route";

function verifiedSnapshot(views: number): AdminMetricSnapshot {
  return {
    ...createUnavailableAdminMetricSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", reason: "seed" }),
    truthState: "verified",
    sourceMode: "verified_cache",
    lastVerifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    values: { views: createSnapshotValue({ value: views, available: true, source: "bounded_test_source", sourceMode: "verified_cache" }) },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("admin metric snapshot contract", () => {
  it("includes every required source mode", () => {
    expect(ADMIN_METRIC_SNAPSHOT_SOURCE_MODES).toEqual([
      "live",
      "verified_cache",
      "stale_cache",
      "intraday",
      "estimated",
      "fallback",
      "unavailable",
      "mixed",
    ]);
  });

  it("creates unavailable snapshots without fake zeros", () => {
    const snapshot = createUnavailableAdminMetricSnapshot({
      moduleKey: "commerce_snapshot",
      rangeKey: "7d",
      reason: "Commerce source parity is not verified.",
    });

    expect(snapshot.truthState).toBe("unavailable");
    expect(snapshot.sourceMode).toBe("unavailable");
    expect(snapshot.cacheKey).toBe("admin_analytics:commerce_snapshot:7d");
    expect(snapshot.refreshVersion).toBe(0);
    expect(snapshot.values.module.value).toBeNull();
    expect(snapshot.values.module.fakeZeroPrevented).toBe(true);
    expect(validateAdminMetricSnapshot(snapshot)).toEqual([]);
  });

  it("rejects unavailable metric zeros", () => {
    const snapshot = createUnavailableAdminMetricSnapshot({
      moduleKey: "audience_snapshot",
      rangeKey: "24h",
      reason: "Audience snapshot source is unavailable.",
    });
    const invalid: AdminMetricSnapshot = {
      ...snapshot,
      values: {
        activeUsers: createSnapshotValue({
          value: 0,
          available: false,
          source: "missing_source",
          sourceMode: "unavailable",
          fakeZeroPrevented: false,
        }),
      },
    };

    expect(validateAdminMetricSnapshot(invalid)).toEqual([
      "Metric activeUsers renders a zero while unavailable.",
    ]);
  });

  it("resolves verified cache to stale cache after expiry", () => {
    const snapshot: AdminMetricSnapshot = {
      ...createUnavailableAdminMetricSnapshot({
        moduleKey: "platform_pulse",
        rangeKey: "24h",
        reason: "seed",
      }),
      truthState: "verified",
      sourceMode: "verified_cache",
      confidence: 0.9,
      lastVerifiedAt: "2026-04-30T12:00:00.000Z",
      expiresAt: "2026-04-30T12:05:00.000Z",
    };

    expect(resolveAdminMetricSnapshotSourceMode(snapshot, Date.parse("2026-04-30T12:04:00.000Z"))).toBe("verified_cache");
    expect(resolveAdminMetricSnapshotSourceMode(snapshot, Date.parse("2026-04-30T12:06:00.000Z"))).toBe("stale_cache");
    expect(getAdminMetricDisplaySnapshot(snapshot)).not.toBeNull();
    expect(resolveAdminMetricRefreshCacheDisplayState({
      ...snapshot,
      sourceMode: "stale_cache",
    })).toBe("stale_but_verified");
  });

  it("does not treat time-limit expiry as display invalidation", () => {
    const snapshot: AdminMetricSnapshot = {
      ...createUnavailableAdminMetricSnapshot({
        moduleKey: "live_pulse",
        rangeKey: "24h",
        reason: "seed",
      }),
      truthState: "verified",
      sourceMode: "verified_cache",
      confidence: 0.85,
      lastVerifiedAt: "2026-04-30T12:00:00.000Z",
      expiresAt: "2026-04-30T12:05:00.000Z",
      values: {
        activeUsers: createSnapshotValue({
          value: 8,
          available: true,
          source: "verified_snapshot",
          sourceMode: "verified_cache",
        }),
      },
    };

    expect(resolveAdminMetricSnapshotSourceMode(snapshot, Date.parse("2026-04-30T12:30:00.000Z"))).toBe("stale_cache");
    expect(getAdminMetricDisplaySnapshot(snapshot)?.values.activeUsers.value).toBe(8);
  });

  it("prevents duplicate refresh storms while a refresh lock is fresh", () => {
    expect(shouldPreventSnapshotRefreshStorm({
      refreshStatus: "refreshing",
      refreshStartedAt: "2026-04-30T12:00:00.000Z",
      nowMs: Date.parse("2026-04-30T12:01:00.000Z"),
      lockTtlMs: 120_000,
    })).toBe(true);

    expect(shouldPreventSnapshotRefreshStorm({
      refreshStatus: "refreshing",
      refreshStartedAt: "2026-04-30T12:00:00.000Z",
      nowMs: Date.parse("2026-04-30T12:03:00.000Z"),
      lockTtlMs: 120_000,
    })).toBe(false);
  });

  it("registers every required Admin Analytics snapshot materializer", async () => {
    expect(ADMIN_ANALYTICS_MATERIALIZER_REGISTRY.map((entry) => entry.moduleKey)).toEqual(
      [...ADMIN_ANALYTICS_SNAPSHOT_MODULE_KEYS],
    );

    for (const entry of ADMIN_ANALYTICS_MATERIALIZER_REGISTRY) {
      expect(entry.supportedRanges.length).toBeGreaterThan(0);
      expect(entry.canonicalSources.length).toBeGreaterThan(0);
      expect(entry.parityChecksRequired.length).toBeGreaterThan(0);
      expect(entry.currentImplementationStatus).not.toBe("placeholder_unavailable");
      expect(entry.defaultAdminAnalyticsCoverage).toBe(entry.currentImplementationStatus);
    }

    expect(ADMIN_ANALYTICS_MATERIALIZER_REGISTRY.filter((entry) => entry.currentImplementationStatus === "manual_refresh_only").length).toBeGreaterThan(0);
    expect(ADMIN_ANALYTICS_MATERIALIZER_REGISTRY.filter((entry) => entry.currentImplementationStatus === "debug_drilldown_only").length).toBeGreaterThan(0);

    const snapshot = await materializeAdminAnalyticsSnapshot({
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      force: false,
      requestedBy: "admin_1",
    });

    expect(snapshot.truthState).toBe("unavailable");
    expect(snapshot.unavailableReason).toContain("Commerce Snapshot requires payment/internal parity");
    expect(snapshot.sourceBreakdown.materializerStatus).toBe("manual_refresh_only");
    expect(snapshot.parity[0].fakeZeroPrevented).toBe(true);
  });
});

describe("persisted Admin snapshot refresh ownership", () => {
  beforeEach(() => {
    persistedState.documents.clear();
    persistedState.transactionTail = Promise.resolve();
    clearAdminMetricSnapshotRefreshLocksForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
  });
  afterEach(() => { clearAdminMetricSnapshotRefreshLocksForTests(); vi.useRealTimers(); });

  it("allows only one owner under concurrent forced requests and preserves existing display values", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    const attempts = await Promise.all([
      markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h", force: true }),
      markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h", force: true }),
    ]);
    expect(attempts.filter((attempt) => attempt.duplicateRefreshPrevented)).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.lease !== null)).toHaveLength(1);
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.values.views.value).toBe(7);
  });

  it("publishes only the owned completion and retains its source evidence after independent reload", async () => {
    const started = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    const result = await markSnapshotRefreshCompleted("audience_snapshot", "24h", verifiedSnapshot(9), started.lease!);
    expect(result.applied).toBe(true);
    clearAdminMetricSnapshotRefreshLocksForTests();
    const reloaded = await getLatestVerifiedSnapshot("audience_snapshot", "24h");
    expect(reloaded?.values.views.value).toBe(9);
    expect(reloaded?.lastVerifiedAt).toBe("2026-10-02T12:00:00.000Z");
    expect(reloaded?.refreshStatus).toBe("completed");
    expect((await getAdminMetricSnapshot("audience_snapshot", "24h"))?.refreshVersion).toBe(1);
  });

  it("rejects an expired owner's late success and failure after a new owner acquires the same document", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    const first = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    vi.setSystemTime(new Date("2026-10-02T12:02:01.000Z"));
    const second = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    expect(second.lease?.token).not.toBe(first.lease?.token);
    expect(second.lease?.version).toBe((first.lease?.version ?? 0) + 1);
    expect((await markSnapshotRefreshCompleted("audience_snapshot", "24h", verifiedSnapshot(99), first.lease!)).applied).toBe(false);
    expect((await markSnapshotRefreshFailed("audience_snapshot", "24h", new Error("old failure"), first.lease!)).applied).toBe(false);
    expect((await getAdminMetricSnapshot("audience_snapshot", "24h"))?.refreshStatus).toBe("refreshing");
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.values.views.value).toBe(7);
    expect((await markSnapshotRefreshCompleted("audience_snapshot", "24h", verifiedSnapshot(11), second.lease!)).applied).toBe(true);
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.values.views.value).toBe(11);
  });

  it("does not publish a late expired completion before any successor acquires", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    const first = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    vi.setSystemTime(new Date("2026-10-02T12:02:01.000Z"));
    expect((await markSnapshotRefreshCompleted("audience_snapshot", "24h", verifiedSnapshot(99), first.lease!)).applied).toBe(false);
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.values.views.value).toBe(7);
    expect((await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" })).duplicateRefreshPrevented).toBe(false);
  });

  it("settles an owned failure without clearing verified data and permits a later manual recovery", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    const first = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    expect((await markSnapshotRefreshFailed("audience_snapshot", "24h", new Error("source failed"), first.lease!)).applied).toBe(true);
    expect((await getAdminMetricSnapshot("audience_snapshot", "24h"))?.refreshStatus).toBe("failed");
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.values.views.value).toBe(7);
    const recovered = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    await markSnapshotRefreshCompleted("audience_snapshot", "24h", verifiedSnapshot(9), recovered.lease!);
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.values.views.value).toBe(9);
  });

  it("refuses invalid, wrong-range and unavailable results before publishing", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    const started = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    const unavailable = createUnavailableAdminMetricSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", reason: "missing" });
    await expect(markSnapshotRefreshCompleted("audience_snapshot", "24h", unavailable, started.lease!)).rejects.toThrow();
    await expect(markSnapshotRefreshCompleted("audience_snapshot", "24h", { ...verifiedSnapshot(9), rangeKey: "7d" }, started.lease!)).rejects.toThrow();
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.values.views.value).toBe(7);
  });

  it("coalesces forced in-process work for the same lease", async () => {
    const pending = deferred<AdminMetricSnapshot>();
    const refresh = vi.fn(() => pending.promise);
    const lease = { token: "lease-a", version: 1 };
    const one = runSnapshotRefreshWithDedupe({ moduleKey: "audience_snapshot", rangeKey: "24h", lease, refresh });
    const two = runSnapshotRefreshWithDedupe({ moduleKey: "audience_snapshot", rangeKey: "24h", lease, refresh, force: true });
    expect(refresh).toHaveBeenCalledOnce();
    pending.resolve(verifiedSnapshot(8));
    const results = await Promise.all([one, two]);
    expect(results[0].snapshot.values.views.value).toBe(8);
    expect(results[1].duplicateRefreshPrevented).toBe(true);
  });

  it("does not remove a successor's in-flight work when an expired worker finally settles", async () => {
    const first = deferred<AdminMetricSnapshot>();
    const second = deferred<AdminMetricSnapshot>();
    const refreshA = vi.fn(() => first.promise);
    const refreshB = vi.fn(() => second.promise);
    const a = runSnapshotRefreshWithDedupe({ moduleKey: "audience_snapshot", rangeKey: "24h", lease: { token: "lease-a", version: 1 }, refresh: refreshA });
    const b = runSnapshotRefreshWithDedupe({ moduleKey: "audience_snapshot", rangeKey: "24h", lease: { token: "lease-b", version: 2 }, refresh: refreshB });
    first.resolve(verifiedSnapshot(8));
    await a;
    const again = runSnapshotRefreshWithDedupe({ moduleKey: "audience_snapshot", rangeKey: "24h", lease: { token: "lease-b", version: 2 }, refresh: refreshB, force: true });
    expect(refreshB).toHaveBeenCalledOnce();
    second.resolve(verifiedSnapshot(11));
    expect((await b).snapshot.values.views.value).toBe(11);
    expect((await again).duplicateRefreshPrevented).toBe(true);
  });

  it("exposes first-start and first-failure metadata without manufacturing a display snapshot", async () => {
    const started = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    expect(await getLatestVerifiedSnapshot("audience_snapshot", "24h")).toBeNull();
    const initial = await getSnapshotDebugMetadata("audience_snapshot", "24h");
    expect(initial).toMatchObject({ exists: true, refreshStatus: "refreshing", truthState: "unavailable", sourceMode: "unavailable", lastVerifiedAt: null, values: {}, fakeWaitingPrevented: false, fakeZeroPrevented: true, displayAllowedBecause: null });
    expect(initial.generatedAt).not.toBe(new Date().toISOString());
    await markSnapshotRefreshFailed("audience_snapshot", "24h", new Error("first source failed"), started.lease!);
    expect(await getLatestVerifiedSnapshot("audience_snapshot", "24h")).toBeNull();
    const failed = await getSnapshotDebugMetadata("audience_snapshot", "24h");
    expect(failed).toMatchObject({ refreshStatus: "failed", truthState: "unavailable", sourceMode: "unavailable", lastVerifiedAt: null, values: {}, displayAllowedBecause: null });
    expect(failed.displayBlockedBecause).toBeTruthy();
    const listed = await listAdminMetricSnapshotDebugMetadata({ limit: 2 });
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ refreshStatus: "failed", truthState: "unavailable", sourceMode: "unavailable", lastVerifiedAt: null, displayAllowedBecause: null, fakeWaitingPrevented: false, fakeZeroPrevented: true });
  });
});


describe("Admin snapshot GET persisted revision", () => {
  beforeEach(() => {
    persistedState.documents.clear();
    persistedState.transactionTail = Promise.resolve();
    persistedState.documentReads = [];
    persistedState.nextReadError = null;
    persistedState.afterDocumentRead = null;
    routeState.guardApiRequest.mockReset().mockResolvedValue({ uid: "admin_1", isAdmin: true });
    // Auth, diagnostics and request admission are isolated seams; the route,
    // stored snapshot decoder and both source projections are real.
    routeState.handleApiError.mockReset().mockImplementation((error: Error & { status?: number }) =>
      NextResponse.json({ success: false, error: error.message }, { status: error.status ?? 500 }));
    clearAdminMetricSnapshotRefreshLocksForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
  });
  afterEach(() => { clearAdminMetricSnapshotRefreshLocksForTests(); vi.useRealTimers(); });

  const request = (query = "moduleKey=audience_snapshot&rangeKey=24h") =>
    new NextRequest(`http://localhost/api/admin/analytics/refresh?${query}`);

  it("returns a verified value and its source details with one primary document read", async () => {
    await writeVerifiedSnapshot({ ...verifiedSnapshot(7), sourceVersion: "revision-a" });
    const response = await GET(request());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(payload).toMatchObject({ success: true, moduleKey: "audience_snapshot", rangeKey: "24h",
      snapshot: { sourceVersion: "revision-a", values: { views: { value: 7 } } },
      metadata: { exists: true, sourceVersion: "revision-a", values: { views: { value: 7 } } },
      materializer: { moduleKey: "audience_snapshot" } });
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("keeps values and metadata on the read revision when storage changes between projections", async () => {
    await writeVerifiedSnapshot({ ...verifiedSnapshot(7), sourceVersion: "revision-a" });
    persistedState.afterDocumentRead = (key) => {
      persistedState.afterDocumentRead = null;
      persistedState.documents.set(key, { ...verifiedSnapshot(11), sourceVersion: "revision-b" });
    };
    const first = await (await GET(request())).json();
    expect(first.snapshot.sourceVersion).toBe("revision-a");
    expect(first.metadata.sourceVersion).toBe("revision-a");
    expect(first.metadata.values.views.value).toBe(7);
    expect(persistedState.documentReads).toHaveLength(1);
    persistedState.documentReads = [];
    const next = await (await GET(request())).json();
    expect(next.snapshot.sourceVersion).toBe("revision-b");
    expect(next.metadata.sourceVersion).toBe("revision-b");
    expect(next.snapshot.values.views.value).toBe(11);
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("does not reread an absent document or manufacture a metric zero", async () => {
    const payload = await (await GET(request())).json();
    expect(payload.snapshot).toBeNull();
    expect(payload.metadata).toMatchObject({ exists: false, sourceMode: "unavailable", truthState: "unavailable" });
    expect(payload.metadata).not.toHaveProperty("values");
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("retains first-reservation and first-failure metadata without promoting a display snapshot", async () => {
    const started = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    const initial = await (await GET(request())).json();
    expect(initial.snapshot).toBeNull();
    expect(initial.metadata).toMatchObject({ exists: true, refreshStatus: "refreshing", truthState: "unavailable", lastVerifiedAt: null, values: {}, displayAllowedBecause: null });
    expect(persistedState.documentReads).toHaveLength(1);
    await markSnapshotRefreshFailed("audience_snapshot", "24h", new Error("first source failed"), started.lease!);
    persistedState.documentReads = [];
    const failed = await (await GET(request())).json();
    expect(failed.snapshot).toBeNull();
    expect(failed.metadata).toMatchObject({ refreshStatus: "failed", truthState: "unavailable", lastVerifiedAt: null, values: {}, displayAllowedBecause: null });
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("retains verified stale values and the same stale source state", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    vi.setSystemTime(new Date("2026-10-02T12:06:00.000Z"));
    const existingMetadata = await getSnapshotDebugMetadata("audience_snapshot", "24h");
    persistedState.documentReads = [];
    const payload = await (await GET(request())).json();
    expect(payload.snapshot).toMatchObject({ sourceMode: "stale_cache", values: { views: { value: 7 } } });
    expect(payload.metadata.sourceMode).toBe("stale_cache");
    expect(payload.metadata).toEqual(existingMetadata);
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("stops a failed read without a second attempt and recovers on the next request", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    persistedState.nextReadError = new Error("primary source unavailable");
    const failed = await GET(request());
    expect(failed.status).toBe(500);
    expect(await failed.json()).not.toHaveProperty("snapshot");
    expect(persistedState.documentReads).toHaveLength(1);
    persistedState.documentReads = [];
    const recovered = await GET(request());
    expect(recovered.status).toBe(200);
    expect((await recovered.json()).snapshot.values.views.value).toBe(7);
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("performs no stored read when request admission denies the caller", async () => {
    routeState.guardApiRequest.mockRejectedValue(Object.assign(new Error("Admin permission required"), { status: 403 }));
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(persistedState.documentReads).toHaveLength(0);
    expect(persistedState.documents.size).toBe(0);
  });

  it("performs no stored read for unsupported module or range", async () => {
    expect((await GET(request("moduleKey=unknown&rangeKey=24h"))).status).toBe(400);
    expect((await GET(request("moduleKey=audience_snapshot&rangeKey=unsupported"))).status).toBe(400);
    expect(persistedState.documentReads).toHaveLength(0);
  });

  it("preserves explicit absence instead of reading a newly available stored record", async () => {
    await writeVerifiedSnapshot(verifiedSnapshot(7));
    expect(await getLatestVerifiedSnapshot("audience_snapshot", "24h", null)).toBeNull();
    expect(await getSnapshotDebugMetadata("audience_snapshot", "24h", null)).toMatchObject({ exists: false, truthState: "unavailable" });
    expect(persistedState.documentReads).toHaveLength(0);
  });

  it("preserves fresh standalone two-argument callers without a cross-request cache", async () => {
    await writeVerifiedSnapshot({ ...verifiedSnapshot(7), sourceVersion: "revision-a" });
    expect((await getLatestVerifiedSnapshot("audience_snapshot", "24h"))?.sourceVersion).toBe("revision-a");
    await writeVerifiedSnapshot({ ...verifiedSnapshot(11), sourceVersion: "revision-b" });
    expect(await getSnapshotDebugMetadata("audience_snapshot", "24h")).toMatchObject({ sourceVersion: "revision-b", values: { views: { value: 11 } } });
    expect(persistedState.documentReads).toHaveLength(2);
  });

  it("does not bypass verified-display validation when a caller supplies a decoded record", async () => {
    const supplied = verifiedSnapshot(7);
    expect(await getLatestVerifiedSnapshot("audience_snapshot", "7d", supplied)).toBeNull();
    expect(await getLatestVerifiedSnapshot("commerce_snapshot", "24h", supplied)).toBeNull();
    const malformed = structuredClone(supplied);
    Reflect.set(malformed, "schemaVersion", "invalid");
    expect(await getLatestVerifiedSnapshot("audience_snapshot", "24h", malformed)).toBeNull();
    expect(await getLatestVerifiedSnapshot("audience_snapshot", "24h", createUnavailableAdminMetricSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", reason: "not verified" }))).toBeNull();
    expect(persistedState.documentReads).toHaveLength(0);
  });
});

describe("Admin snapshot POST persisted revision", () => {
  beforeEach(() => {
    persistedState.documents.clear();
    persistedState.transactionTail = Promise.resolve();
    persistedState.documentReads = [];
    persistedState.transactionReads = [];
    persistedState.nextReadError = null;
    persistedState.afterDocumentRead = null;
    persistedState.afterTransactionCommit = null;
    routeState.promotedAudience = true;
    routeState.materialize.mockReset();
    routeState.guardApiRequest.mockReset().mockResolvedValue({ uid: "admin_1", isAdmin: true });
    routeState.handleApiError.mockReset().mockImplementation((error: Error & { status?: number }) =>
      NextResponse.json({ success: false, error: error.message }, { status: error.status ?? 500 }));
    clearAdminMetricSnapshotRefreshLocksForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
  });
  afterEach(() => {
    persistedState.afterTransactionCommit = null;
    persistedState.afterDocumentRead = null;
    routeState.promotedAudience = false;
    clearAdminMetricSnapshotRefreshLocksForTests();
    vi.useRealTimers();
  });
  const key = `${ANALYTICS_OPERATIONAL_COLLECTIONS.adminMetricSnapshots}/${buildAdminMetricSnapshotDocId("audience_snapshot", "24h")}`;
  const postRequest = () => new NextRequest("http://localhost/api/admin/analytics/refresh", {
    method: "POST", body: JSON.stringify({ moduleKey: "audience_snapshot", rangeKey: "24h", force: true }),
    headers: { "content-type": "application/json" },
  });
  const revision = (views: number, sourceVersion: string): AdminMetricSnapshot => ({ ...verifiedSnapshot(views), sourceVersion });
  const reopen = () => GET(new NextRequest("http://localhost/api/admin/analytics/refresh?moduleKey=audience_snapshot&rangeKey=24h"));

  it("keeps duplicate response metadata on the captured raw transaction revision with no extra get", async () => {
    await writeVerifiedSnapshot(revision(7, "captured-a"));
    await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    const captured = await getAdminMetricSnapshot("audience_snapshot", "24h");
    const expectedMetadata = await getSnapshotDebugMetadata("audience_snapshot", "24h", captured);
    persistedState.documentReads = [];
    persistedState.transactionReads = [];
    persistedState.afterTransactionCommit = () => {
      persistedState.afterTransactionCommit = null;
      persistedState.documents.set(key, { ...revision(11, "newer-b"), refreshStatus: "completed" });
    };
    const response = await POST(postRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload).toMatchObject({ success: true, refreshStatus: "duplicate_prevented", snapshot: { sourceVersion: "captured-a", values: { views: { value: 7 } } } });
    expect(payload.metadata).toEqual(expectedMetadata);
    expect(persistedState.transactionReads).toHaveLength(1);
    expect(persistedState.documentReads).toHaveLength(0);
    expect(routeState.materialize).not.toHaveBeenCalled();
    expect(persistedState.documents.get(key)?.sourceVersion).toBe("newer-b");
    expect((await (await reopen()).json()).snapshot.sourceVersion).toBe("newer-b");
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("retains captured unavailable reservation semantics instead of promoting a later verified record", async () => {
    await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h" });
    const captured = await getAdminMetricSnapshot("audience_snapshot", "24h");
    const expectedMetadata = await getSnapshotDebugMetadata("audience_snapshot", "24h", captured);
    persistedState.documentReads = [];
    persistedState.afterTransactionCommit = () => {
      persistedState.afterTransactionCommit = null;
      persistedState.documents.set(key, revision(11, "newly-verified"));
    };
    const payload = await (await POST(postRequest())).json();
    expect(payload.snapshot).toMatchObject({ truthState: "unavailable", lastVerifiedAt: null, generatedAt: "", values: {} });
    expect(payload.snapshot).not.toBeNull();
    expect(payload.metadata).toEqual(expectedMetadata);
    expect(payload.metadata).toMatchObject({ exists: true, truthState: "unavailable", displayAllowedBecause: null });
    expect(persistedState.documentReads).toHaveLength(0);
    expect(routeState.materialize).not.toHaveBeenCalled();
    const next = await (await reopen()).json();
    expect(next.snapshot.sourceVersion).toBe("newly-verified");
    expect(next.metadata.sourceVersion).toBe("newly-verified");
  });

  it("returns completed transaction values and metadata together even when a later writer replaces storage", async () => {
    routeState.materialize.mockResolvedValue(revision(9, "owned-completion"));
    persistedState.afterTransactionCommit = (result) => {
      if (!(result && typeof result === "object" && Reflect.get(result, "applied") === true)) return;
      persistedState.afterTransactionCommit = null;
      persistedState.documents.set(key, revision(15, "later-completion"));
    };
    const response = await POST(postRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true, refreshStatus: "completed",
      snapshot: { sourceVersion: "owned-completion", refreshVersion: 1, values: { views: { value: 9 } } },
      metadata: { sourceVersion: "owned-completion", refreshVersion: 1, values: { views: { value: 9 } } } });
    expect(payload.metadata).toEqual(await getSnapshotDebugMetadata("audience_snapshot", "24h", payload.snapshot));
    expect(routeState.materialize).toHaveBeenCalledOnce();
    expect(routeState.materialize).toHaveBeenCalledWith(expect.objectContaining({ requestedBy: "admin_1", force: true }));
    expect(persistedState.transactionReads).toHaveLength(2);
    expect(persistedState.documentReads).toHaveLength(0);
    expect(persistedState.documents.get(key)?.sourceVersion).toBe("later-completion");
    const next = await (await reopen()).json();
    expect(next.snapshot.sourceVersion).toBe("later-completion");
    expect(next.metadata.sourceVersion).toBe("later-completion");
  });

  it("does not downgrade a committed completion because an unnecessary later document get would fail", async () => {
    routeState.materialize.mockResolvedValue(revision(9, "committed"));
    persistedState.nextReadError = new Error("unused freshness lookup failed");
    const response = await POST(postRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, refreshStatus: "completed", snapshot: { sourceVersion: "committed" }, metadata: { sourceVersion: "committed" } });
    expect(persistedState.documentReads).toHaveLength(0);
    expect(persistedState.transactionReads).toHaveLength(2);
    expect(persistedState.documents.get(key)?.refreshStatus).toBe("completed");
    persistedState.nextReadError = null;
    clearAdminMetricSnapshotRefreshLocksForTests();
    expect((await (await reopen()).json()).snapshot.sourceVersion).toBe("committed");
    expect(routeState.materialize).toHaveBeenCalledOnce();
  });

  it("uses one current verified read after lease loss and never mixes its revision with a later metadata read", async () => {
    await writeVerifiedSnapshot(revision(7, "original"));
    routeState.materialize.mockImplementation(async () => {
      vi.setSystemTime(new Date("2026-10-02T12:02:01.000Z"));
      const successor = await markSnapshotRefreshStarted({ moduleKey: "audience_snapshot", rangeKey: "24h", force: true });
      await markSnapshotRefreshCompleted("audience_snapshot", "24h", revision(11, "successor"), successor.lease!);
      return revision(99, "expired-worker");
    });
    persistedState.afterTransactionCommit = (result) => {
      if (!(result && typeof result === "object" && Reflect.get(result, "applied") === false)) return;
      persistedState.afterTransactionCommit = null;
      persistedState.documents.set(key, revision(13, "current-read"));
      persistedState.afterDocumentRead = (readKey) => {
        persistedState.afterDocumentRead = null;
        persistedState.documents.set(readKey, revision(17, "following-read"));
      };
    };
    const response = await POST(postRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: false, code: "snapshot_refresh_lease_lost", refreshStatus: "failed",
      snapshot: { sourceVersion: "current-read", values: { views: { value: 13 } } },
      metadata: { sourceVersion: "current-read", values: { views: { value: 13 } } } });
    expect(persistedState.transactionReads).toHaveLength(4);
    expect(persistedState.documentReads).toHaveLength(1);
    expect(routeState.materialize).toHaveBeenCalledOnce();
    expect(persistedState.documents.get(key)?.sourceVersion).toBe("following-read");
    expect(persistedState.documents.get(key)?.refreshStatus).not.toBe("failed");
    expect((await (await reopen()).json()).snapshot.sourceVersion).toBe("following-read");
  });

  it("keeps the retained verified source and its failure metadata on one read revision without automatic retry", async () => {
    await writeVerifiedSnapshot(revision(7, "retained-source"));
    routeState.materialize.mockRejectedValue(new Error("bounded source failed"));
    persistedState.afterDocumentRead = (readKey) => {
      persistedState.afterDocumentRead = null;
      persistedState.documents.set(readKey, revision(11, "newer-source"));
    };
    const response = await POST(postRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: false, refreshStatus: "failed", error: "bounded source failed",
      snapshot: { sourceVersion: "retained-source", refreshStatus: "failed", values: { views: { value: 7 } } },
      metadata: { sourceVersion: "retained-source", refreshStatus: "failed", values: { views: { value: 7 } } } });
    expect(persistedState.documentReads).toHaveLength(1);
    expect(persistedState.transactionReads).toHaveLength(2);
    expect(routeState.materialize).toHaveBeenCalledOnce();
    const next = await (await reopen()).json();
    expect(next.snapshot.sourceVersion).toBe("newer-source");
    expect(next.metadata.sourceVersion).toBe("newer-source");
  });

  it("keeps a first failure unavailable and permits a later manual refresh and reopened verified read", async () => {
    routeState.materialize.mockRejectedValueOnce(new Error("first source failed"));
    const first = await POST(postRequest());
    expect(first.status).toBe(500);
    const failed = await first.json();
    expect(failed).toMatchObject({ success: false, refreshStatus: "failed", snapshot: null,
      metadata: { exists: true, truthState: "unavailable", lastVerifiedAt: null, values: {}, displayAllowedBecause: null } });
    expect(persistedState.documentReads).toHaveLength(1);
    expect(routeState.materialize).toHaveBeenCalledOnce();
    persistedState.documentReads = [];
    routeState.materialize.mockResolvedValueOnce(revision(9, "manual-recovery"));
    const recovered = await (await POST(postRequest())).json();
    expect(recovered).toMatchObject({ success: true, snapshot: { sourceVersion: "manual-recovery" }, metadata: { sourceVersion: "manual-recovery" } });
    expect(routeState.materialize).toHaveBeenCalledTimes(2);
    expect(persistedState.documentReads).toHaveLength(0);
    clearAdminMetricSnapshotRefreshLocksForTests();
    const reopened = await (await reopen()).json();
    expect(reopened.snapshot.sourceVersion).toBe("manual-recovery");
    expect(reopened.metadata.sourceVersion).toBe("manual-recovery");
    expect(persistedState.documentReads).toHaveLength(1);
  });

  it("stops a failed current-source read after one attempt and recovers on a new admitted request", async () => {
    await writeVerifiedSnapshot(revision(7, "retained"));
    routeState.materialize.mockRejectedValueOnce(new Error("bounded source failed"));
    persistedState.nextReadError = new Error("primary source unavailable");
    const failed = await POST(postRequest());
    expect(failed.status).toBe(500);
    expect(await failed.json()).toMatchObject({ success: false, error: "primary source unavailable" });
    expect(persistedState.documentReads).toHaveLength(1);
    expect(persistedState.transactionReads).toHaveLength(2);
    expect(routeState.materialize).toHaveBeenCalledOnce();
    expect(persistedState.documents.get(key)?.refreshStatus).toBe("failed");
    expect((persistedState.documents.get(key)?.values as { views: { value: number } }).views.value).toBe(7);
    persistedState.documentReads = [];
    routeState.materialize.mockResolvedValueOnce(revision(9, "recovered"));
    expect(await (await POST(postRequest())).json()).toMatchObject({ success: true, snapshot: { sourceVersion: "recovered" }, metadata: { sourceVersion: "recovered" } });
    expect(routeState.materialize).toHaveBeenCalledTimes(2);
    expect(persistedState.documentReads).toHaveLength(0);
  });
});
