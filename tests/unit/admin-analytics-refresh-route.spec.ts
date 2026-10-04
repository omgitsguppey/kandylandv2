import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSnapshotValue, createUnavailableAdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";

const mockState = vi.hoisted(() => ({
  promotedAudience: false,
  materialize: vi.fn(),
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  getAdminMetricSnapshot: vi.fn(),
  getLatestVerifiedSnapshot: vi.fn(),
  getSnapshotDebugMetadata: vi.fn(),
  markSnapshotRefreshStarted: vi.fn(),
  markSnapshotRefreshCompleted: vi.fn(),
  markSnapshotRefreshFailed: vi.fn(),
  runSnapshotRefreshWithDedupe: vi.fn(),
  reset() {
    this.promotedAudience = false;
    this.materialize.mockReset();
    this.guardApiRequest.mockReset();
    this.handleApiError.mockReset();
    this.getAdminMetricSnapshot.mockReset();
    this.getLatestVerifiedSnapshot.mockReset();
    this.getSnapshotDebugMetadata.mockReset();
    this.markSnapshotRefreshStarted.mockReset();
    this.markSnapshotRefreshCompleted.mockReset();
    this.markSnapshotRefreshFailed.mockReset();
    this.runSnapshotRefreshWithDedupe.mockReset();
  },
}));

vi.mock("@/lib/server/admin-analytics-materializers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-analytics-materializers")>();
  return {
    ...actual,
    getAdminAnalyticsMaterializer: (moduleKey: string) => {
      const entry = actual.getAdminAnalyticsMaterializer(moduleKey);
      return entry && mockState.promotedAudience && moduleKey === "audience_snapshot"
        ? { ...entry, currentImplementationStatus: "ready", defaultAdminAnalyticsCoverage: "ready", canRunDefaultRefresh: true }
        : entry;
    },
    materializeAdminAnalyticsSnapshot: (input: Parameters<typeof actual.materializeAdminAnalyticsSnapshot>[0]) =>
      mockState.promotedAudience && input.moduleKey === "audience_snapshot" ? mockState.materialize(input) : actual.materializeAdminAnalyticsSnapshot(input),
  };
});

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN_ANALYTICS: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/admin-analytics-snapshots", () => ({
  getAdminMetricSnapshot: mockState.getAdminMetricSnapshot,
  getLatestVerifiedSnapshot: mockState.getLatestVerifiedSnapshot,
  getSnapshotDebugMetadata: mockState.getSnapshotDebugMetadata,
  markSnapshotRefreshStarted: mockState.markSnapshotRefreshStarted,
  markSnapshotRefreshCompleted: mockState.markSnapshotRefreshCompleted,
  markSnapshotRefreshFailed: mockState.markSnapshotRefreshFailed,
  runSnapshotRefreshWithDedupe: mockState.runSnapshotRefreshWithDedupe,
}));

import { GET, POST } from "@/app/api/admin/analytics/refresh/route";

describe("/api/admin/analytics/refresh", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "admin_1", isAdmin: true });
    mockState.handleApiError.mockImplementation((error: unknown) =>
      NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 }),
    );
    mockState.getAdminMetricSnapshot.mockResolvedValue(null);
    mockState.getSnapshotDebugMetadata.mockResolvedValue({
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      sourceMode: "unavailable",
      truthState: "unavailable",
      refreshStatus: "unavailable",
    });
    mockState.markSnapshotRefreshStarted.mockResolvedValue({
      refreshStatus: "refreshing",
      duplicateRefreshPrevented: false,
      refreshStartedAt: "2026-04-30T12:00:00.000Z",
      snapshot: null,
      lease: { token: "owned-test-lease", version: 1 },
    });
    mockState.runSnapshotRefreshWithDedupe.mockImplementation(async (input: { refresh: () => Promise<unknown> }) => ({
      snapshot: await input.refresh(),
      duplicateRefreshPrevented: false,
    }));
    mockState.markSnapshotRefreshCompleted.mockImplementation(async (_moduleKey: string, _rangeKey: string, snapshot: unknown) => ({
      applied: true,
      snapshot: {
        ...(snapshot as Record<string, unknown>),
        refreshStatus: "completed",
        refreshCompletedAt: "2026-04-30T12:00:01.000Z",
      },
    }));
  });

  it("returns latest verified snapshot metadata on GET", async () => {
    const snapshot = createUnavailableAdminMetricSnapshot({
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      reason: "No verified snapshot exists.",
    });
    mockState.getAdminMetricSnapshot.mockResolvedValue(snapshot);
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(snapshot);

    const response = await GET(new NextRequest("http://localhost/api/admin/analytics/refresh?moduleKey=commerce_snapshot&rangeKey=30d"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockState.getAdminMetricSnapshot).toHaveBeenCalledOnce();
    expect(mockState.getLatestVerifiedSnapshot).toHaveBeenCalledWith("commerce_snapshot", "30d", snapshot);
    expect(mockState.getSnapshotDebugMetadata).toHaveBeenCalledWith("commerce_snapshot", "30d", snapshot);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload).toMatchObject({
      success: true,
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      snapshot: { moduleKey: "commerce_snapshot", rangeKey: "30d" },
      metadata: { moduleKey: "commerce_snapshot", rangeKey: "30d" },
      materializer: {
        moduleKey: "commerce_snapshot",
        currentImplementationStatus: "manual_refresh_only",
        canRunDefaultRefresh: false,
      },
    });
  });

  it("refuses to run non-promoted placeholder materializers as completed live coverage", async () => {
    const request = new NextRequest("http://localhost/api/admin/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        moduleKey: "commerce_snapshot",
        rangeKey: "30d",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        auth: "admin",
        requireTrustedOrigin: true,
        routeName: "admin/analytics/refresh",
      }),
    );
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
    expect(mockState.runSnapshotRefreshWithDedupe).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshCompleted).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      success: false,
      code: "materializer_not_promoted",
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      refreshStatus: "unavailable",
      materializer: {
        currentImplementationStatus: "manual_refresh_only",
        canRunDefaultRefresh: false,
      },
    });
    expect(payload.nextAction).toContain("Commerce Snapshot requires payment/internal parity");
  });

  it("returns 413 payload_too_large before parsing an oversized POST body", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/analytics/refresh", {
      method: "POST",
      body: "x".repeat(64_001),
      headers: {
        "content-type": "application/json",
        "content-length": "64001",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
      error: "Request payload is too large.",
    });
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
  });

  it("allows an empty POST body and reads module/range from query params", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/analytics/refresh?moduleKey=commerce_snapshot&rangeKey=30d", {
      method: "POST",
      body: "",
      headers: {
        "content-type": "application/json",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.success).toBe(false);
    expect(payload.moduleKey).toBe("commerce_snapshot");
    expect(payload.rangeKey).toBe("30d");
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
  });

  it("returns 400 invalid_json for malformed JSON", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/analytics/refresh", {
      method: "POST",
      body: "{bad",
      headers: {
        "content-type": "application/json",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      code: "invalid_json",
      error: "Invalid JSON body.",
    });
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
  });

  it("does not enter duplicate-refresh handling for non-promoted modules", async () => {
    const existing = createUnavailableAdminMetricSnapshot({
      moduleKey: "event_mix",
      rangeKey: "7d",
      reason: "Existing refresh is running.",
    });
    mockState.markSnapshotRefreshStarted.mockResolvedValue({
      refreshStatus: "duplicate_prevented",
      duplicateRefreshPrevented: true,
      snapshot: existing,
    });
    mockState.getSnapshotDebugMetadata.mockResolvedValue({
      moduleKey: "event_mix",
      rangeKey: "7d",
      refreshStatus: "duplicate_prevented",
    });

    const request = new NextRequest("http://localhost/api/admin/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        moduleKey: "event_mix",
        rangeKey: "7d",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      success: false,
      code: "materializer_not_promoted",
      moduleKey: "event_mix",
      rangeKey: "7d",
      refreshStatus: "unavailable",
      materializer: {
        currentImplementationStatus: "manual_refresh_only",
        canRunDefaultRefresh: false,
      },
    });
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
    expect(mockState.runSnapshotRefreshWithDedupe).not.toHaveBeenCalled();
  });

  it("does not record failed-refresh metadata for non-promoted modules", async () => {
    const existing = createUnavailableAdminMetricSnapshot({
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      reason: "Existing verified snapshot remains visible.",
    });
    mockState.runSnapshotRefreshWithDedupe.mockRejectedValue(new Error("source timeout"));
    mockState.markSnapshotRefreshFailed.mockResolvedValue({
      refreshStatus: "failed",
      refreshError: "source timeout",
    });
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(existing);

    const request = new NextRequest("http://localhost/api/admin/analytics/refresh", {
      method: "POST",
      body: JSON.stringify({
        moduleKey: "commerce_snapshot",
        rangeKey: "30d",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload.success).toBe(false);
    expect(payload.refreshStatus).toBe("unavailable");
    expect(payload.code).toBe("materializer_not_promoted");
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
    expect(mockState.runSnapshotRefreshWithDedupe).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshFailed).not.toHaveBeenCalled();
  });

  function promotedSnapshot(views: number) {
    return {
      ...createUnavailableAdminMetricSnapshot({ moduleKey: "audience_snapshot", rangeKey: "24h", reason: "seed" }),
      truthState: "verified" as const, sourceMode: "verified_cache" as const,
      lastVerifiedAt: "2026-10-02T12:00:00.000Z",
      values: { views: createSnapshotValue({ value: views, source: "bounded_source", sourceMode: "verified_cache" }) },
    };
  }
  function audienceRequest(force = false) {
    return new NextRequest("http://localhost/api/admin/analytics/refresh", {
      method: "POST", body: JSON.stringify({ moduleKey: "audience_snapshot", rangeKey: "24h", force }),
      headers: { "content-type": "application/json" },
    });
  }

  it("carries the acquired lease through work and completion before returning persisted truth", async () => {
    mockState.promotedAudience = true;
    mockState.materialize.mockResolvedValue(promotedSnapshot(9));
    const response = await POST(audienceRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(mockState.runSnapshotRefreshWithDedupe).toHaveBeenCalledWith(expect.objectContaining({ lease: { token: "owned-test-lease", version: 1 } }));
    expect(mockState.markSnapshotRefreshCompleted).toHaveBeenCalledWith("audience_snapshot", "24h", expect.objectContaining({ values: { views: expect.objectContaining({ value: 9 }) } }), { token: "owned-test-lease", version: 1 });
    expect(payload).toMatchObject({ success: true, refreshStatus: "completed", snapshot: { values: { views: { value: 9 } } } });
  });

  it("does not invoke a promoted writer when a forced request finds an active persisted lease", async () => {
    mockState.promotedAudience = true;
    mockState.markSnapshotRefreshStarted.mockResolvedValue({ duplicateRefreshPrevented: true, snapshot: promotedSnapshot(7), lease: null });
    const response = await POST(audienceRequest(true));
    expect((await response.json()).refreshStatus).toBe("duplicate_prevented");
    expect(mockState.materialize).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshCompleted).not.toHaveBeenCalled();
  });

  it("returns current verified display evidence and failed truth when a late worker loses its lease", async () => {
    mockState.promotedAudience = true;
    mockState.materialize.mockResolvedValue(promotedSnapshot(99));
    mockState.markSnapshotRefreshCompleted.mockResolvedValue({ applied: false, snapshot: promotedSnapshot(11) });
    mockState.getAdminMetricSnapshot.mockResolvedValue(promotedSnapshot(11));
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(promotedSnapshot(11));
    const response = await POST(audienceRequest());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: false, code: "snapshot_refresh_lease_lost", refreshStatus: "failed", snapshot: { values: { views: { value: 11 } } } });
    expect(mockState.markSnapshotRefreshFailed).not.toHaveBeenCalled();
  });

  it("settles source failure through its owned lease while retaining the previous verified snapshot", async () => {
    mockState.promotedAudience = true;
    mockState.materialize.mockRejectedValue(new Error("bounded source failed"));
    mockState.markSnapshotRefreshFailed.mockResolvedValue({ applied: true, refreshError: "bounded source failed" });
    mockState.getAdminMetricSnapshot.mockResolvedValue(promotedSnapshot(7));
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(promotedSnapshot(7));
    const response = await POST(audienceRequest());
    expect(mockState.markSnapshotRefreshFailed).toHaveBeenCalledWith("audience_snapshot", "24h", expect.any(Error), { token: "owned-test-lease", version: 1 });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: false, refreshStatus: "failed", snapshot: { values: { views: { value: 7 } } } });
  });

  it("reuses one newly read record for a duplicate branch whose captured source is explicitly absent", async () => {
    mockState.promotedAudience = true;
    const current = promotedSnapshot(11);
    mockState.markSnapshotRefreshStarted.mockResolvedValue({ duplicateRefreshPrevented: true, snapshot: null, lease: null });
    mockState.getAdminMetricSnapshot.mockResolvedValue(current);
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(current);
    const payload = await (await POST(audienceRequest(true))).json();
    expect(payload).toMatchObject({ success: true, refreshStatus: "duplicate_prevented", snapshot: { values: { views: { value: 11 } } } });
    expect(mockState.getAdminMetricSnapshot).toHaveBeenCalledOnce();
    expect(mockState.getLatestVerifiedSnapshot).toHaveBeenCalledWith("audience_snapshot", "24h", current);
    expect(mockState.getSnapshotDebugMetadata).toHaveBeenCalledWith("audience_snapshot", "24h", current);
    expect(mockState.materialize).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshCompleted).not.toHaveBeenCalled();
  });

  it("preserves null without a second query when the duplicate fallback source is still absent", async () => {
    mockState.promotedAudience = true;
    mockState.markSnapshotRefreshStarted.mockResolvedValue({ duplicateRefreshPrevented: true, snapshot: null, lease: null });
    mockState.getAdminMetricSnapshot.mockResolvedValue(null);
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(null);
    mockState.getSnapshotDebugMetadata.mockResolvedValue({ exists: false, truthState: "unavailable" });
    const response = await POST(audienceRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, refreshStatus: "duplicate_prevented", snapshot: null, metadata: { exists: false, truthState: "unavailable" } });
    expect(mockState.getAdminMetricSnapshot).toHaveBeenCalledOnce();
    expect(mockState.getLatestVerifiedSnapshot).toHaveBeenCalledWith("audience_snapshot", "24h", null);
    expect(mockState.getSnapshotDebugMetadata).toHaveBeenCalledWith("audience_snapshot", "24h", null);
    expect(mockState.materialize).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshFailed).not.toHaveBeenCalled();
  });
  it("keeps a maintenance-readable GET source-only even for a promoted module and force query", async () => {
    mockState.promotedAudience = true;
    const snapshot = promotedSnapshot(12);
    mockState.getAdminMetricSnapshot.mockResolvedValue(snapshot);
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(snapshot);
    mockState.getSnapshotDebugMetadata.mockResolvedValue({exists:true,truthState:"verified",sourceMode:"verified_cache"});
    const request = new NextRequest("http://localhost/api/admin/analytics/refresh?moduleKey=audience_snapshot&rangeKey=24h&force=true");
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({success:true,snapshot:{values:{views:{value:12}}},metadata:{truthState:"verified",sourceMode:"verified_cache"}});
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(request,expect.objectContaining({auth:"admin",scopeToCaller:true,preAuthRouteName:"admin/analytics/refresh/preauth",preAuthRateLimit:expect.anything(),rateLimit:expect.anything()}));
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
    expect(mockState.getAdminMetricSnapshot).toHaveBeenCalledOnce();
    expect(mockState.getLatestVerifiedSnapshot).toHaveBeenCalledWith("audience_snapshot","24h",snapshot);
    expect(mockState.getSnapshotDebugMetadata).toHaveBeenCalledWith("audience_snapshot","24h",snapshot);
    expect(mockState.materialize).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
    expect(mockState.runSnapshotRefreshWithDedupe).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshCompleted).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshFailed).not.toHaveBeenCalled();
  });

  it("preserves an explicit missing snapshot on GET without refresh or a second source query", async () => {
    mockState.promotedAudience = true;
    mockState.getAdminMetricSnapshot.mockResolvedValue(null);
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(null);
    mockState.getSnapshotDebugMetadata.mockResolvedValue({exists:false,truthState:"unavailable",sourceMode:"unavailable"});
    const response = await GET(new NextRequest("http://localhost/api/admin/analytics/refresh?moduleKey=audience_snapshot&rangeKey=24h"));
    expect(await response.json()).toMatchObject({success:true,snapshot:null,metadata:{exists:false,truthState:"unavailable",sourceMode:"unavailable"}});
    expect(mockState.getAdminMetricSnapshot).toHaveBeenCalledOnce();
    expect(mockState.getLatestVerifiedSnapshot).toHaveBeenCalledWith("audience_snapshot","24h",null);
    expect(mockState.getSnapshotDebugMetadata).toHaveBeenCalledWith("audience_snapshot","24h",null);
    expect(mockState.materialize).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
    expect(mockState.runSnapshotRefreshWithDedupe).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshCompleted).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshFailed).not.toHaveBeenCalled();
  });

  it("does not read snapshots or start work after route-owned authorization denies GET", async () => {
    const rejection = new Error("Admin access denied");
    const denial = NextResponse.json({error:"Admin access denied"},{status:403});
    mockState.guardApiRequest.mockRejectedValue(rejection);
    mockState.handleApiError.mockReturnValue(denial);
    const response = await GET(new NextRequest("http://localhost/api/admin/analytics/refresh?moduleKey=audience_snapshot&rangeKey=24h"));
    expect(response).toBe(denial);
    expect(mockState.handleApiError).toHaveBeenCalledWith(rejection,"Admin.Analytics.Refresh.GET");
    expect(mockState.getAdminMetricSnapshot).not.toHaveBeenCalled();
    expect(mockState.getLatestVerifiedSnapshot).not.toHaveBeenCalled();
    expect(mockState.getSnapshotDebugMetadata).not.toHaveBeenCalled();
    expect(mockState.materialize).not.toHaveBeenCalled();
    expect(mockState.markSnapshotRefreshStarted).not.toHaveBeenCalled();
    expect(mockState.runSnapshotRefreshWithDedupe).not.toHaveBeenCalled();
  });

});
