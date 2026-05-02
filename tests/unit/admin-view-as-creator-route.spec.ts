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
      targetUserId: "creator_1",
      performedAs: "admin_view_as_creator",
    }), "creator_1");
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
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_view_as_creator_action_blocked", expect.objectContaining({
      route: "/api/admin/view-as-creator",
      targetUserId: "creator_1",
      performedAs: "admin_view_as_creator",
    }), "creator_1");
    expect(mockState.historySet).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "admin_view_as_action_blocked",
    }), { merge: true });
  });
});
