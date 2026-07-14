import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const targetSet = vi.fn(async () => undefined);
  const historySet = vi.fn(async () => undefined);
  const targetGet = vi.fn(async () => ({
    exists: true,
    data: () => ({
      uid: "creator_1",
      role: "creator",
      displayName: "Zaylani",
      username: "zaylani",
      isSyntheticCreator: true,
      syntheticCreatorType: "internal_character",
    }),
  }));

  return {
    targetSet,
    historySet,
    targetGet,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    trackServerEvent: vi.fn(async () => undefined),
    adminDb: {
      collection(name: string) {
        if (name === "users") {
          return {
            doc() {
              return {
                get: targetGet,
                set: targetSet,
              };
            },
          };
        }

        return {
          doc() {
            return {
              collection() {
                return {
                  doc() {
                    return {
                      set: historySet,
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
    reset() {
      targetSet.mockClear();
      historySet.mockClear();
      targetGet.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.trackServerEvent.mockClear();
    },
  };
});

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/creator-onboarding", () => ({
  CREATOR_ONBOARDING_COLLECTION: "creator_onboarding",
  CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION: "history",
  buildCreatorOnboardingHistoryEntry: (input: {
    eventType: string;
    actor: { id: string; role: string; label: string; marker?: unknown };
    timestamp: number;
    summary: string;
    detail?: string;
    metadata?: Record<string, unknown>;
  }) => ({
    eventType: input.eventType,
    actorId: input.actor.id,
    actorRole: input.actor.role,
    actorLabel: input.actor.label,
    actorMarker: input.actor.marker,
    timestamp: input.timestamp,
    summary: input.summary,
    detail: input.detail,
    metadata: input.metadata,
  }),
  isCreatorOwnerEmail: (email?: string) => email === "owner@example.com",
}));

import { POST } from "@/app/api/admin/view-as-creator/route";

describe("POST /api/admin/view-as-creator", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "admin@example.com",
      isAdmin: true,
    });
    mockState.handleApiError.mockImplementation((error: unknown) => {
      throw error;
    });
  });

  it("starts view-as creator with admin actor and target creator audit", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/view-as-creator", {
      method: "POST",
      body: JSON.stringify({
        action: "start",
        targetUserId: "creator_1",
        reason: "Roster QA",
        returnHref: "/admin/roster?focus=creator_1",
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.debug).toMatchObject({
      activeViewAsUserId: "creator_1",
      activeViewAsRole: "creator",
      syntheticCreatorMarkerPresent: true,
      destructiveActionsBlockedInViewAs: true,
    });
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_view_as_creator_started", expect.objectContaining({
      actorType: "admin",
      actorAdminId: "admin_1",
      targetUserId: "creator_1",
      targetCreatorId: "creator_1",
      performedAs: "admin_view_as_creator",
      includeInUserBehavior: false,
      sourceTruth: "local_projection",
    }), "admin_1");
    expect(mockState.historySet).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "admin_view_as_started",
    }), { merge: true });
  });

  it("records blocked purchase action in view-as mode", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/view-as-creator", {
      method: "POST",
      body: JSON.stringify({
        action: "blocked",
        targetUserId: "creator_1",
        reason: "Payment actions are blocked while viewing as a creator.",
        route: "/api/paypal/capture",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_projection_write_blocked", expect.objectContaining({
      actorAdminId: "admin_1",
      targetUserId: "creator_1",
      targetCreatorId: "creator_1",
      performedAs: "admin_view_as_creator",
      includeInUserBehavior: false,
      sourceTruth: "local_projection",
    }), "admin_1");
    expect(mockState.historySet).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "admin_view_as_action_blocked",
    }), { merge: true });
  });

  it("rejects oversized view-as input before reading or writing creator state", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/view-as-creator", {
      method: "POST",
      body: JSON.stringify({
        action: "start",
        targetUserId: "creator_1",
        reason: "Roster QA",
        padding: "x".repeat(64_000),
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
      retryable: false,
    });
    expect(mockState.targetGet).not.toHaveBeenCalled();
    expect(mockState.targetSet).not.toHaveBeenCalled();
    expect(mockState.historySet).not.toHaveBeenCalled();
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
  });
});
