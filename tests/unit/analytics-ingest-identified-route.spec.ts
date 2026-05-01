import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const writes: Array<{ path: string; data: Record<string, unknown>; options?: unknown }> = [];
  const batch = {
    set: vi.fn((ref: { path: string }, data: Record<string, unknown>, options?: unknown) => {
      writes.push({ path: ref.path, data, options });
    }),
    commit: vi.fn(async () => undefined),
  };

  return {
    writes,
    batch,
    guardApiRequest: vi.fn(async () => ({ uid: "user_123" })),
    recordRouteWarning: vi.fn(),
    recordServerDiagnostic: vi.fn(async () => undefined),
    reset() {
      writes.length = 0;
      batch.set.mockClear();
      batch.commit.mockClear();
      this.guardApiRequest.mockClear();
      this.recordRouteWarning.mockClear();
      this.recordServerDiagnostic.mockClear();
      this.guardApiRequest.mockResolvedValue({ uid: "user_123" });
      this.recordServerDiagnostic.mockResolvedValue(undefined);
    },
  };
});

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    batch: () => mockState.batch,
    collection(name: string) {
      return {
        doc(id: string) {
          return { path: `${name}/${id}` };
        },
      };
    },
  },
}));

vi.mock("@/lib/server/auth", () => {
  class AuthError extends Error {}
  return {
    AuthError,
    handleApiError: vi.fn(() => new Response(JSON.stringify({ error: "handled" }), { status: 500 })),
  };
});

vi.mock("@/lib/server/rate-limit", () => {
  class RateLimitError extends Error {}
  return {
    ANALYTICS_WRITE: {},
    RateLimitError,
  };
});

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: mockState.recordRouteWarning,
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
  recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/analytics-governance", () => ({
  ANALYTICS_CANONICAL_COLLECTIONS: {
    identifiedEventFacts: "analytics_event_facts",
  },
  ANALYTICS_OPERATIONAL_COLLECTIONS: {
    activeUsers: "analytics_active_users",
  },
  ANALYTICS_ROUTE_POLICIES: {
    identifiedIngest: {},
  },
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_name: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/analytics/ingest-identified/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/analytics/ingest-identified", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/ingest-identified", () => {
  beforeEach(() => {
    mockState.reset();
  });

  it("canonicalizes compatibility aliases before writing analytics facts", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_alias",
        eventTimestampMs: 1767225600000,
        eventName: "notification_read",
        eventParams: {
          page_path: "/dashboard",
          session_id: "session_123",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual({ success: true, processed: 1, skippedUnsupported: 0 });
    expect(mockState.batch.commit).toHaveBeenCalledTimes(1);

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_alias");
    expect(eventWrite?.data).toMatchObject({
      eventName: "notification_marked_read",
      eventCategory: "notifications",
      eventModules: ["notifications"],
      trackingOrigin: "identified_api_ingest",
      params: expect.objectContaining({
        legacy_event_name: "notification_read",
        event_category: "notifications",
        event_modules: "notifications",
        tracking_origin: "identified_api_ingest",
      }),
    });

    const activeUserWrite = mockState.writes.find((write) => write.path === "analytics_active_users/user_123");
    expect(activeUserWrite?.data).toMatchObject({
      lastEventName: "notification_marked_read",
      lastPagePath: "/dashboard",
      lastEventModules: "notifications",
    });
  });

  it("skips unsupported telemetry before it can create orphaned event facts", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_orphan",
        eventTimestampMs: 1767225600000,
        eventName: "orphan_probe_event",
        eventParams: {
          page_path: "/dashboard",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual({ success: true, processed: 0, skippedUnsupported: 1 });
    expect(mockState.batch.set).not.toHaveBeenCalled();
    expect(mockState.batch.commit).not.toHaveBeenCalled();
    expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
      "Analytics.IngestIdentified",
      "Unsupported identified telemetry events skipped before analytics fact write",
      undefined,
      expect.objectContaining({
        channel: "analytics",
        detail: expect.objectContaining({
          skippedUnsupported: 1,
          eventNames: ["orphan_probe_event"],
        }),
      }),
    );
  });

  it("keeps legacy admin UI errors in diagnostics instead of analytics facts", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_admin_ui_error",
        eventTimestampMs: 1767225600000,
        eventName: "admin_ui_error",
        eventParams: {
          message: "boom",
          filename: "admin.js",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual({ success: true, processed: 0, skippedUnsupported: 1 });
    expect(mockState.batch.set).not.toHaveBeenCalled();
    expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      channel: "ai",
      severity: "error",
      message: "Admin UI Error: boom",
      detail: expect.objectContaining({
        telemetryCleanup: "skipped_uncataloged_diagnostic_event",
      }),
    }));
  });
});
