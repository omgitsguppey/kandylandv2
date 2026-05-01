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
      },
    });
  });

  it("runs a materializer and returns refresh metadata on POST", async () => {
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

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.refreshStatus).toBe("completed");
    expect(payload.snapshot.truthState).toBe("unavailable");
    expect(payload.snapshot.unavailableReason).toContain("Commerce Snapshot requires payment/internal parity");
    expect(payload.metadata).toMatchObject({
      moduleKey: "commerce_snapshot",
      rangeKey: "30d",
    });
  });

  it("prevents duplicate refresh storms and returns existing metadata", async () => {
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

    expect(response.status).toBe(200);
    expect(payload.refreshStatus).toBe("duplicate_prevented");
    expect(payload.duplicateRefreshPrevented).toBe(true);
    expect(payload.snapshot.moduleKey).toBe("event_mix");
    expect(mockState.runSnapshotRefreshWithDedupe).not.toHaveBeenCalled();
  });

  it("returns stale snapshot metadata when manual refresh fails", async () => {
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

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload.success).toBe(false);
    expect(payload.refreshStatus).toBe("failed");
    expect(payload.snapshot.moduleKey).toBe("commerce_snapshot");
    expect(payload.error).toBe("source timeout");
  });
});
