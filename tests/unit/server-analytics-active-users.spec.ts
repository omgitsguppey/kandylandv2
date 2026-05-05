import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const writes: Array<{ collection: string; id: string; data: Record<string, unknown>; options?: unknown }> = [];

  return {
    writes,
    adminDb: {
      collection(name: string) {
        return {
          doc(id: string) {
            return {
              async get() {
                return {
                  exists: name === "users",
                  data: () => ({ analyticsConsent: true }),
                };
              },
              async set(data: Record<string, unknown>, options?: unknown) {
                writes.push({ collection: name, id, data, options });
              },
            };
          },
        };
      },
    },
    reset() {
      writes.length = 0;
      delete process.env.GA_MEASUREMENT_ID;
      delete process.env.GA_API_SECRET;
    },
  };
});

vi.mock("firebase-admin", () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: () => "serverTimestamp",
    },
  },
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: vi.fn(),
}));

vi.mock("@/lib/server/privacy-consent", () => ({
  profileAllowsIdentifiedAnalytics: () => true,
}));

vi.mock("@/lib/server/analytics-event-utils", () => ({
  buildAnalyticsTimeKeys: () => ({
    dayKey: "20260429",
    hourKey: "2026042908",
    minuteKey: "202604290830",
  }),
  resolveTrackedTelemetryEvent: (eventName: string) => ({
    canonicalEventName: eventName,
    option: {
      category: "navigation",
      modules: ["navigation"],
      sources: ["backend"],
    },
    metadataParams: {
      event_index_version: "test",
    },
    isKnownEvent: true,
  }),
}));

vi.mock("@/lib/analytics-semantics", () => ({
  buildAnalyticsSemanticParams: () => ({
    semantic_scope_label: "Home",
  }),
}));

import { trackServerEvent } from "@/lib/server/analytics";

describe("trackServerEvent active user mirror", () => {
  beforeEach(() => {
    mockState.reset();
  });

  it("mirrors identified server telemetry into analytics_active_users", async () => {
    await trackServerEvent("home_page_viewed", {
      page_path: "/",
      component_name: "Hero",
      username: "fan",
    }, "fan_1");

    const activeUserWrite = mockState.writes.find((write) => write.collection === "analytics_active_users");
    expect(activeUserWrite).toMatchObject({
      id: "fan_1",
      options: { merge: true },
      data: {
        uid: "fan_1",
        username: "fan",
        lastEventName: "home_page_viewed",
        lastPagePath: "/",
        lastSemanticScopeLabel: "Home",
        lastComponentName: "Hero",
        lastEventModules: "navigation",
        source: "identified_server_event",
      },
    });
  });

  it("does not create an active user mirror for server-only telemetry", async () => {
    await trackServerEvent("home_page_viewed", {
      page_path: "/",
    });

    expect(mockState.writes.some((write) => write.collection === "analytics_active_users")).toBe(false);
  });

  it("does not create an active user mirror for admin projection telemetry", async () => {
    await trackServerEvent("admin_projection_write_blocked", {
      page_path: "/api/paypal/capture",
      actor_admin_id: "admin_1",
      target_user_id: "creator_1",
      target_creator_id: "creator_1",
      performed_as: "admin_view_as_creator",
      projection_mode: "read_only_creator_projection",
      source_truth: "local_projection",
    }, "admin_1");

    const eventWrite = mockState.writes.find((write) => write.collection === "analytics_event_facts");
    expect(eventWrite?.data).toMatchObject({
      userId: "admin_1",
      analyticsUserId: "",
      actorType: "admin",
      actorAdminId: "admin_1",
      actorUserId: "",
      actorCreatorId: "",
      targetUserId: "creator_1",
      targetCreatorId: "creator_1",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_creator_projection",
      includeInUserBehavior: false,
    });
    expect(mockState.writes.some((write) => write.collection === "analytics_active_users")).toBe(false);
  });
});
