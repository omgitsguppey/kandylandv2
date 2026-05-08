import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  readProjection: vi.fn(),
  update: vi.fn(),
  doc: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  AggregateField: {
    sum: vi.fn((field: string) => ({ kind: "sum", field })),
  },
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/admin-creator-projection", () => ({
  buildAdminCreatorProjectionReadOnlyResponse: () => NextResponse.json({
    success: false,
    error: "Creator dashboard is read-only while viewing as a creator.",
    code: "admin_projection_read_only",
  }, { status: 403 }),
  readAdminCreatorProjectionContext: (...args: unknown[]) => mockState.readProjection(...args),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  STANDARD: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: mockState.doc,
    })),
  },
}));

vi.mock("@/lib/creator-experiences", () => ({
  isCreatorOrAdminRole: (role: unknown) => role === "creator" || role === "admin",
}));

vi.mock("@/lib/server/creator-experiences", () => ({
  buildCreatorUpdateMerge: (update: Record<string, unknown>) => update,
  sanitizeCreatorRestrictionsUpdate: (update: Record<string, unknown>) => update,
  sanitizeCreatorSettingsUpdate: (update: Record<string, unknown>) => update,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/identity/actor-markers", () => ({
  actorMarkerToTelemetryPayload: vi.fn(() => ({})),
  assertKnownActor: vi.fn((value: unknown) => value),
  buildActorMarker: vi.fn((value: unknown) => value),
}));

const route = await import("@/app/api/creator/settings/route");
const { PUT } = route;

describe("creator settings route", () => {
  beforeEach(() => {
    mockState.guardApiRequest.mockReset();
    mockState.handleApiError.mockReset();
    mockState.readProjection.mockReset();
    mockState.update.mockReset();
    mockState.doc.mockReset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "creator_1",
      email: "creator@example.com",
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.readProjection.mockReturnValue(null);
    mockState.doc.mockImplementation((id: string) => ({
      get: vi.fn(async () => ({
        exists: true,
        data: () => ({
          role: "creator",
          creatorSettings: { broadcastsEnabled: true },
          creatorRestrictions: {},
        }),
      })),
      update: mockState.update,
      id,
    }));
  });

  it("updates the creator's own settings through the canonical route", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/creator/settings", {
      method: "PUT",
      body: JSON.stringify({
        creatorSettings: { broadcastsEnabled: false },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.doc).toHaveBeenCalledWith("creator_1");
    expect(mockState.update).toHaveBeenCalled();
  });

  it("blocks admin projection writes on creator settings", async () => {
    mockState.readProjection.mockReturnValue({
      active: true,
      targetCreatorId: "creator_1",
      actorAdminUid: "admin_1",
      startedAt: Date.now(),
      projectionMode: "read_only_creator_projection",
      sourceTruth: "server_validated_projection",
    });

    const request = new NextRequest("http://localhost/api/creator/settings", {
      method: "PUT",
      body: JSON.stringify({
        creatorSettings: { broadcastsEnabled: false },
      }),
      headers: {
        "Content-Type": "application/json",
        "x-admin-view-as-user-id": "creator_1",
        "x-admin-view-as-actor-uid": "admin_1",
        "x-admin-view-as-started-at": String(Date.now()),
        "x-admin-view-as-role": "creator",
      },
    });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("admin_projection_read_only");
    expect(mockState.update).not.toHaveBeenCalled();
  });
});
