import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUnavailableAdminMetricSnapshot } from "@/lib/analytics/admin-metric-snapshot";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  getLatestVerifiedSnapshot: vi.fn(),
  getSnapshotDebugMetadata: vi.fn(),
  markSnapshotRefreshStarted: vi.fn(),
  markSnapshotRefreshCompleted: vi.fn(),
  markSnapshotRefreshFailed: vi.fn(),
  runSnapshotRefreshWithDedupe: vi.fn(),
  reset() {
    this.guardApiRequest.mockReset();
    this.handleApiError.mockReset();
    this.getLatestVerifiedSnapshot.mockReset();
    this.getSnapshotDebugMetadata.mockReset();
    this.markSnapshotRefreshStarted.mockReset();
    this.markSnapshotRefreshCompleted.mockReset();
    this.markSnapshotRefreshFailed.mockReset();
    this.runSnapshotRefreshWithDedupe.mockReset();
  },
}));

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
    });
    mockState.runSnapshotRefreshWithDedupe.mockImplementation(async (input: { refresh: () => Promise<unknown> }) => ({
      snapshot: await input.refresh(),
      duplicateRefreshPrevented: false,
    }));
    mockState.markSnapshotRefreshCompleted.mockImplementation(async (_moduleKey: string, _rangeKey: string, snapshot: unknown) => ({
      ...(snapshot as Record<string, unknown>),
      refreshStatus: "completed",
      refreshCompletedAt: "2026-04-30T12:00:01.000Z",
    }));
  });

  it("returns latest verified snapshot metadata on GET", async () => {
    const snapshot = createUnavailableAdminMetricSnapshot({
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
      reason: "No verified snapshot exists.",
    });
    mockState.getLatestVerifiedSnapshot.mockResolvedValue(snapshot);

    const response = await GET(new NextRequest("http://localhost/api/admin/analytics/refresh?moduleKey=commerce_snapshot&rangeKey=30d"));
    const payload = await response.json();

    expect(response.status).toBe(200);
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
});
