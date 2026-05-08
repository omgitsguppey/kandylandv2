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
    runtimeFacts: "analytics_event_facts",
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

vi.mock("@/lib/server/behavioral-timeline-writer", () => ({
  writeBehavioralTimelineFacts: vi.fn(async (facts: unknown[]) => ({
    written: Array.isArray(facts) ? facts.length : 0,
    skipped: 0,
    reason: "",
  })),
}));

vi.mock("@/lib/server/analytics-identity-linking", () => ({
  upsertAnalyticsIdentityLink: vi.fn(async () => ({
    identityLinkId: "identity_link_test",
    created: true,
  })),
}));

vi.mock("@/lib/server/user-index-materializer", () => ({
  materializeUserTrackingIndexes: vi.fn(async () => ({
    dryRun: false,
    usersProcessed: 1,
    guestsProcessed: 0,
    factsProcessed: 1,
    issueCodes: [],
  })),
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
        eventName: "notification_marked_read",
        eventParams: {
          page_path: "/dashboard",
          session_id: "session_123",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));
    expect(mockState.batch.commit).toHaveBeenCalledTimes(1);

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_alias");
    expect(eventWrite?.data).toMatchObject({
      eventName: "notification_read",
      rawEventName: "notification_marked_read",
      eventCategory: "notifications",
      metricFamily: "notification",
      metricEligible: true,
      actorUserId: "user_123",
      actorCreatorId: "",
      targetCreatorId: "",
      eventModules: ["notifications"],
      trackingOrigin: "identified_api_ingest",
      params: expect.objectContaining({
        legacy_event_name: "notification_marked_read",
        event_category: "notifications",
        event_modules: "notifications",
        tracking_origin: "identified_api_ingest",
      }),
    });

    const activeUserWrite = mockState.writes.find((write) => write.path === "analytics_active_users/user_123");
    expect(activeUserWrite?.data).toMatchObject({
      lastEventName: "notification_read",
      lastSeenEventName: "notification_read",
      lastPagePath: "/dashboard",
      lastEventModules: "notifications",
    });
    expect(activeUserWrite?.data).not.toHaveProperty("lastMeaningfulActionAt");
  });

  it("keeps notification_opened as a diagnostic instead of a scored read action", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_notification_opened",
        eventTimestampMs: 1767225600000,
        eventName: "notification_opened",
        eventParams: {
          page_path: "/dashboard",
          session_id: "session_123",
          notification_id: "note_1",
          source_component: "notification_bell",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_notification_opened");
    expect(eventWrite?.data).toMatchObject({
      eventName: "notification_opened",
      normalizedActionName: "notification_opened",
      metricFamily: "notification",
      metricEligible: false,
      metricExclusionReason: "notification_diagnostic_only",
    });

    const activeUserWrite = mockState.writes.find((write) => write.path === "analytics_active_users/user_123");
    expect(activeUserWrite?.data).not.toHaveProperty("lastMeaningfulActionAt");
  });

  it("keeps creator targets separate from the user actor lane", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_follow",
        eventTimestampMs: 1767225600000,
        eventName: "creator_followed",
        eventParams: {
          page_path: "/creators/kandy",
          session_id: "session_123",
          creator_id: "creator_456",
          source_component: "creator_profile_header",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_follow");
    expect(eventWrite?.data).toMatchObject({
      actorType: "user",
      actorLane: "user",
      actorUserId: "user_123",
      actorCreatorId: "",
      targetCreatorId: "creator_456",
      metricEligible: true,
      metricFamily: "creator",
      normalizedActionName: "creator_followed",
    });

    const activeUserWrite = mockState.writes.find((write) => write.path === "analytics_active_users/user_123");
    expect(activeUserWrite?.data).toMatchObject({
      lastMeaningfulActionName: "creator_followed",
      lastMeaningfulActionAt: 1767225600000,
    });
  });

  it("maps fan pass starts to a user actor with a creator target", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_fan_pass",
        eventTimestampMs: 1767225600000,
        eventName: "creator_fan_pass_started",
        eventParams: {
          page_path: "/creators/kandy",
          session_id: "session_123",
          creator_id: "creator_456",
          transaction_id: "txn_123",
          source_component: "creator_experiences_panel",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_fan_pass");
    expect(eventWrite?.data).toMatchObject({
      actorType: "user",
      actorUserId: "user_123",
      actorCreatorId: "",
      targetCreatorId: "creator_456",
      transactionId: "txn_123",
      metricEligible: true,
      normalizedActionName: "fan_pass_started",
    });
  });

  it("keeps client purchase completion telemetry as supporting context, not canonical truth", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_purchase_support",
        eventTimestampMs: 1767225600000,
        eventName: "gumdrops_purchase_completed",
        eventParams: {
          page_path: "/wallet",
          session_id: "session_123",
          order_id: "order_123",
          transaction_id: "txn_support_123",
          sourceTruth: "client_supporting",
          package_price: 5,
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_purchase_support");
    expect(eventWrite?.data).toMatchObject({
      eventName: "gumdrops_purchase_completed",
      transactionId: "txn_support_123",
      sourceTruth: "client",
      normalizedActionName: "gumdrops_purchased",
      metricEligible: true,
    });
  });

  it("canonicalizes daily check-in aliases onto the shared claimed action", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_daily_alias",
        eventTimestampMs: 1767225600000,
        eventName: "daily_reward_claimed",
        eventParams: {
          page_path: "/dashboard",
          session_id: "session_123",
          task_id: "check_in_today",
          reward_gd: 25,
          day_key: "2026-05-04",
          sourceTruth: "client_supporting",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_daily_alias");
    expect(eventWrite?.data).toMatchObject({
      eventName: "daily_checkin_claimed",
      normalizedActionName: "daily_checkin_claimed",
      metricFamily: "task",
      sourceTruth: "client",
      metricEligible: true,
      params: expect.objectContaining({
        legacy_event_name: "daily_reward_claimed",
        task_id: "check_in_today",
        reward_gd: 25,
        day_key: "2026-05-04",
      }),
    });
  });

  it("canonicalizes support ticket aliases onto the shared support creation fact", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_support_ticket_alias",
        eventTimestampMs: 1767225600000,
        eventName: "support_ticket_submitted",
        eventParams: {
          page_path: "/dashboard/support",
          session_id: "session_123",
          thread_id: "thread_123",
          ticket_id: "thread_123",
          category: "technical",
          source_component: "support_threads_route",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_support_ticket_alias");
    expect(eventWrite?.data).toMatchObject({
      eventName: "support_ticket_created",
      normalizedActionName: "support_ticket_created",
      metricFamily: "support",
      metricEligible: true,
      actionThreadId: "thread_123",
      sourceTruth: "server",
      params: expect.objectContaining({
        legacy_event_name: "support_ticket_submitted",
        thread_id: "thread_123",
        ticket_id: "thread_123",
        category: "technical",
      }),
    });
  });

  it("canonicalizes bug report aliases onto the shared bug report fact", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_bug_report_alias",
        eventTimestampMs: 1767225600000,
        eventName: "feedback_submitted",
        eventParams: {
          page_path: "/dashboard/support",
          session_id: "session_123",
          feedback_id: "feedback_123",
          category: "action_failed",
          severity: "high",
          component_name: "SupportInbox",
          source_component: "tasks_feedback_route",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_bug_report_alias");
    expect(eventWrite?.data).toMatchObject({
      eventName: "bug_report_submitted",
      normalizedActionName: "bug_report_submitted",
      metricFamily: "support",
      metricEligible: true,
      sourceTruth: "server",
      params: expect.objectContaining({
        legacy_event_name: "feedback_submitted",
        feedback_id: "feedback_123",
        category: "action_failed",
        severity: "high",
      }),
    });
  });

  it("keeps task_completed canonical with task and reward payload fields", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_task_completed",
        eventTimestampMs: 1767225600000,
        eventName: "task_completed",
        eventParams: {
          page_path: "/dashboard",
          session_id: "session_123",
          task_id: "feedback_task",
          reward_gd: 100,
          day_key: "2026-05-04",
          sourceTruth: "canonical",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_task_completed");
    expect(eventWrite?.data).toMatchObject({
      eventName: "task_completed",
      normalizedActionName: "task_completed",
      metricFamily: "task",
      sourceTruth: "canonical",
      metricEligible: true,
      actionTaskId: "feedback_task",
      params: expect.objectContaining({
        task_id: "feedback_task",
        reward_gd: 100,
        day_key: "2026-05-04",
      }),
    });
  });

  it("keeps purchase_verified canonical when the server emits the purchase fact", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_purchase_verified",
        eventTimestampMs: 1767225600000,
        eventName: "purchase_verified",
        eventParams: {
          page_path: "/wallet",
          session_id: "session_123",
          order_id: "order_123",
          transaction_id: "txn_server_123",
          sourceTruth: "canonical",
          purchase_source: "paypal_capture",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_purchase_verified");
    expect(eventWrite?.data).toMatchObject({
      eventName: "server_purchase_verified",
      transactionId: "txn_server_123",
      sourceTruth: "canonical",
      normalizedActionName: "gumdrops_purchased",
      metricEligible: true,
    });
  });

  it("treats server drop unlock facts as server truth", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_drop_unwrapped",
        eventTimestampMs: 1767225600000,
        eventName: "drop_unwrapped",
        eventParams: {
          page_path: "/drops/drop_123/preview",
          session_id: "session_123",
          drop_id: "drop_123",
          transaction_id: "txn_unlock_123",
          entitlement_id: "drop-entitlement:user_123:drop_123",
          sourceTruth: "server",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_drop_unwrapped");
    expect(eventWrite?.data).toMatchObject({
      eventName: "drop_unwrapped",
      dropId: "drop_123",
      transactionId: "txn_unlock_123",
      sourceTruth: "server",
      normalizedActionName: "drop_unlocked",
      metricEligible: true,
    });
  });

  it("keeps legacy client unlock success telemetry out of the server-truth lane", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_unlock_support",
        eventTimestampMs: 1767225600000,
        eventName: "unlock_drop_success",
        eventParams: {
          page_path: "/drops/drop_123/preview",
          session_id: "session_123",
          drop_id: "drop_123",
          transaction_id: "txn_unlock_support_123",
          sourceTruth: "client_supporting",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_unlock_support");
    expect(eventWrite?.data).toMatchObject({
      eventName: "unlock_drop_success",
      transactionId: "txn_unlock_support_123",
      sourceTruth: "client",
      normalizedActionName: "drop_unlocked",
      metricEligible: true,
    });
  });

  it("excludes admin projection events from user behavior metrics", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_projection",
        eventTimestampMs: 1767225600000,
        eventName: "admin_view_as_creator_started",
        eventParams: {
          page_path: "/admin/users",
          session_id: "session_123",
          actor_admin_id: "admin_123",
          target_creator_id: "creator_789",
          performed_as: "admin_view_as_creator",
          projection_mode: "read_only_creator_projection",
          source_truth: "local_projection",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_projection");
    expect(eventWrite?.data).toMatchObject({
      actorType: "admin",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_creator_projection",
      analyticsUserId: "",
      includeInUserBehavior: false,
      metricEligible: false,
      metricExclusionReason: "admin_projection",
      actorAdminId: "admin_123",
      actorUserId: "",
      actorCreatorId: "",
      targetCreatorId: "creator_789",
      sourceTruth: "local_projection",
    });

    const activeUserWrite = mockState.writes.find((write) => write.path === "analytics_active_users/user_123");
    expect(activeUserWrite).toBeUndefined();
  });

  it("canonicalizes blocked projection writes and excludes them from active user metrics", async () => {
    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_projection_blocked",
        eventTimestampMs: 1767225600000,
        eventName: "admin_view_as_creator_action_blocked",
        eventParams: {
          page_path: "/api/paypal/capture",
          session_id: "session_123",
          actor_admin_id: "admin_123",
          target_user_id: "creator_789",
          target_creator_id: "creator_789",
          performed_as: "admin_view_as_creator",
          projection_mode: "read_only_creator_projection",
          source_truth: "local_projection",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 1, skippedUnsupported: 0 }));

    const eventWrite = mockState.writes.find((write) => write.path === "analytics_event_facts/evt_projection_blocked");
    expect(eventWrite?.data).toMatchObject({
      eventName: "admin_projection_write_blocked",
      rawEventName: "admin_view_as_creator_action_blocked",
      actorType: "admin",
      analyticsUserId: "",
      includeInUserBehavior: false,
      metricEligible: false,
      metricExclusionReason: "admin_projection",
      actorAdminId: "admin_123",
      actorUserId: "",
      actorCreatorId: "",
      targetUserId: "creator_789",
      targetCreatorId: "creator_789",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_creator_projection",
      sourceTruth: "local_projection",
      params: expect.objectContaining({
        legacy_event_name: "admin_view_as_creator_action_blocked",
      }),
    });

    expect(mockState.writes.some((write) => write.path === "analytics_active_users/user_123")).toBe(false);
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

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 0, skippedUnsupported: 1 }));
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

    expect(payload).toEqual(expect.objectContaining({ success: true, processed: 0, skippedUnsupported: 1 }));
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
