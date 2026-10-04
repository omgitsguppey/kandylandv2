import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const writes: Array<{ path: string; data: Record<string, unknown>; options?: unknown }> = [];
  const existingPaths = new Set<string>();
  const readPaths: string[] = [];
  const existingDataByPath = new Map<string, Record<string, unknown>>();
  const readErrorsByPath = new Map<string, unknown>();
  const batch = {
    set: vi.fn((ref: { path: string }, data: Record<string, unknown>, options?: unknown) => {
      writes.push({ path: ref.path, data, options });
    }),
    create: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
      writes.push({ path: ref.path, data, options: { create: true } });
    }),
    commit: vi.fn(async () => undefined),
  };

  return {
    writes,
    readPaths,
    existingPaths,
    existingDataByPath,
    readErrorsByPath,
    batch,
    guardApiRequest: vi.fn(async () => ({ uid: "user_123" })),
    recordRouteWarning: vi.fn(),
    recordServerDiagnostic: vi.fn(async () => undefined),
    materializeUserTrackingIndexes: vi.fn(async () => ({
      dryRun: false,
      usersProcessed: 1,
      guestsProcessed: 0,
      factsProcessed: 1,
      issueCodes: [],
    })),
    writeBehavioralTimelineFacts: vi.fn(async (facts: unknown[]) => ({
      written: Array.isArray(facts) ? facts.length : 0,
      skipped: 0,
      reason: "",
    })),
    reset() {
      writes.length = 0;
      readPaths.length = 0;
      existingPaths.clear();
      existingDataByPath.clear();
      readErrorsByPath.clear();
      existingPaths.add("users/user_123");
      existingDataByPath.set("users/user_123", { role: "user" });
      batch.set.mockClear();
      batch.create.mockClear();
      batch.commit.mockClear();
      this.guardApiRequest.mockClear();
      this.recordRouteWarning.mockClear();
      this.recordServerDiagnostic.mockClear();
      this.materializeUserTrackingIndexes.mockClear();
      this.writeBehavioralTimelineFacts.mockClear();
      this.guardApiRequest.mockResolvedValue({ uid: "user_123" });
      this.recordServerDiagnostic.mockResolvedValue(undefined);
      this.materializeUserTrackingIndexes.mockResolvedValue({
        dryRun: false,
        usersProcessed: 1,
        guestsProcessed: 0,
        factsProcessed: 1,
        issueCodes: [],
      });
      this.writeBehavioralTimelineFacts.mockImplementation(async (facts: unknown[]) => ({
        written: Array.isArray(facts) ? facts.length : 0,
        skipped: 0,
        reason: "",
      }));
    },
  };
});

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    batch: () => mockState.batch,
    collection(name: string) {
      return {
        doc(id: string) {
          const path = `${name}/${id}`;
          return {
            path,
            get: vi.fn(async () => { mockState.readPaths.push(path); if (mockState.readErrorsByPath.has(path)) throw mockState.readErrorsByPath.get(path); return ({
              exists: mockState.existingPaths.has(path),
              data: () => mockState.existingDataByPath.get(path),
            }); }),
          };
        },
      };
    },
  },
}));

vi.mock("@/lib/server/auth", async importOriginal => await importOriginal());
vi.mock("@/lib/server/debug-evidence-store", () => ({ recordDebugEvidence: vi.fn(async () => undefined) }));

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
  inferDiagnosticChannel: () => "analytics",
  recordRouteFailure: vi.fn(),
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
  writeBehavioralTimelineProjection: vi.fn(async (input: { facts: unknown[] }) => {
    const timeline = await mockState.writeBehavioralTimelineFacts(input.facts);
    const materializer = await mockState.materializeUserTrackingIndexes();
    return {
      written: timeline.written,
      skipped: timeline.skipped,
      reason: input.facts.length > 0 ? "ok" : "no_facts",
      materializer: {
        mode: "shadow",
        status: "queued",
        requestsBuilt: 1,
        requestsEnqueued: 1,
        requestsCoalesced: 0,
        usersQueued: materializer.usersProcessed > 0 ? 1 : 0,
        guestsQueued: materializer.guestsProcessed,
        issueCodes: materializer.issueCodes,
      },
    };
  }),
}));

vi.mock("@/lib/server/analytics-identity-linking", () => ({
  upsertAnalyticsIdentityLink: vi.fn(async () => ({
    identityLinkId: "identity_link_test",
    created: true,
  })),
}));

vi.mock("@/lib/server/user-index-materializer", () => ({
  materializeUserTrackingIndexes: mockState.materializeUserTrackingIndexes,
}));

import { POST } from "@/app/api/analytics/ingest-identified/route";
import { recordDebugEvidence } from "@/lib/server/debug-evidence-store";
import { upsertAnalyticsIdentityLink } from "@/lib/server/analytics-identity-linking";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/analytics/ingest-identified", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: "kandydrops_analytics_consent=full_behavioral",
    },
  });
}

function buildRawRequest(body: string) {
  return new NextRequest("http://localhost/api/analytics/ingest-identified", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
    },
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
      actorLane: "signed_in_user",
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
      sourceTruth: "client",
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
      sourceTruth: "client",
      params: expect.objectContaining({
        legacy_event_name: "feedback_submitted",
        feedback_id: "feedback_123",
        category: "action_failed",
        severity: "high",
      }),
    });
  });

  it("keeps observed task completion client-sourced with task and reward payload fields", async () => {
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
      sourceTruth: "client",
      metricEligible: true,
      actionTaskId: "feedback_task",
      params: expect.objectContaining({
        task_id: "feedback_task",
        reward_gd: 100,
        day_key: "2026-05-04",
      }),
    });
  });

  it("does not treat a browser purchase_verified declaration as server payment evidence", async () => {
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
      sourceTruth: "client",
      normalizedActionName: "gumdrops_purchased",
      metricEligible: true,
    });
  });

  it("keeps observed payload-reveal context separate from server entitlement truth", async () => {
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
      sourceTruth: "client",
      normalizedActionName: "drop_unwrapped",
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
    mockState.existingDataByPath.set("users/user_123", { role: "admin" });
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
      actorAdminId: "user_123",
      actorUserId: "",
      actorCreatorId: "",
      targetCreatorId: "creator_789",
      sourceTruth: "client",
    });

    const activeUserWrite = mockState.writes.find((write) => write.path === "analytics_active_users/user_123");
    expect(activeUserWrite).toBeUndefined();
  });

  it("canonicalizes blocked projection writes and excludes them from active user metrics", async () => {
    mockState.existingDataByPath.set("users/user_123", { role: "admin" });
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
      actorAdminId: "user_123",
      actorUserId: "",
      actorCreatorId: "",
      targetUserId: "creator_789",
      targetCreatorId: "creator_789",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_creator_projection",
      sourceTruth: "client",
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
    expect(mockState.batch.create).not.toHaveBeenCalled();
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

  it("skips existing event ids without overwriting canonical analytics facts", async () => {
    mockState.existingPaths.add("analytics_event_facts/evt_existing_retry");

    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_existing_retry",
        eventTimestampMs: 1767225600000,
        eventName: "creator_followed",
        eventParams: {
          page_path: "/creators/kandy",
          session_id: "session_123",
          creator_id: "creator_456",
        },
      }],
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({
      success: true,
      processed: 0,
      dedupedExisting: 1,
      skippedUnsupported: 0,
    }));
    expect(mockState.writes.some((write) => write.path === "analytics_event_facts/evt_existing_retry")).toBe(false);
    expect(mockState.batch.create).not.toHaveBeenCalled();
    expect(mockState.batch.commit).not.toHaveBeenCalled();
    expect(mockState.writeBehavioralTimelineFacts).toHaveBeenCalledWith([]);
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
    expect(mockState.batch.create).not.toHaveBeenCalled();
    expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      channel: "ai",
      severity: "error",
      message: "Admin UI Error: boom",
      detail: expect.objectContaining({
        telemetryCleanup: "skipped_uncataloged_diagnostic_event",
      }),
    }));
  });

  it("returns a safe non-retryable client error for malformed JSON", async () => {
    const response = await POST(buildRawRequest("{not-json"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      errorCode: "invalid_analytics_payload",
      retryable: false,
      routeStatus: "active_supported_route",
      compatibilityMode: "identified_ingest_current",
    });
    expect(mockState.batch.commit).not.toHaveBeenCalled();
  });

  it("returns retryable 503 when the atomic timeline/outbox projection fails", async () => {
    mockState.materializeUserTrackingIndexes.mockRejectedValueOnce(new Error("materializer unavailable"));

    const response = await POST(buildRequest({
      events: [{
        eventId: "evt_materializer_failure",
        eventTimestampMs: 1767225600000,
        eventName: "creator_followed",
        eventParams: {
          page_path: "/creators/kandy",
          session_id: "session_123",
          creator_id: "creator_456",
        },
      }],
    }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ success: false, retryable: true });
    expect(mockState.batch.commit).toHaveBeenCalledTimes(1);
    expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      channel: "analytics",
      severity: "warn",
      message: "Identified analytics timeline/outbox projection failed",
    }));

    const eventPath = "analytics_event_facts/evt_materializer_failure";
    const durableEventWrite = mockState.writes.find((write) => write.path === eventPath);
    expect(durableEventWrite?.data).toMatchObject({
      sourceIdentity: { userId: "user_123" },
      behavioralTimelineProjectionFact: {
        factId: "evt_materializer_failure",
        idempotencyKey: "evt_materializer_failure",
        actorUserId: "user_123",
      },
    });
    mockState.existingPaths.add(eventPath);
    mockState.existingDataByPath.set(eventPath, durableEventWrite!.data);

    const retryResponse = await POST(buildRequest({
      events: [{
        eventId: "evt_materializer_failure",
        eventTimestampMs: 1767225600000,
        eventName: "creator_followed",
        eventParams: {
          page_path: "/creators/kandy",
          session_id: "session_123",
          creator_id: "creator_456",
        },
      }],
    }));
    const retryPayload = await retryResponse.json();

    expect(retryResponse.status).toBe(200);
    expect(retryPayload).toMatchObject({
      success: true,
      processed: 0,
      dedupedExisting: 1,
      timelineFactsWritten: 1,
      timelineStatus: "written_with_outbox",
    });
    expect(mockState.batch.commit).toHaveBeenCalledTimes(1);
    expect(mockState.writeBehavioralTimelineFacts).toHaveBeenLastCalledWith([
      expect.objectContaining({
        factId: "evt_materializer_failure",
        actorUserId: "user_123",
      }),
    ]);
  });
});

describe("request consent boundary", () => {
 beforeEach(() => mockState.reset());
 it.each([
  ["necessary only", {cookie:"kandydrops_analytics_consent=necessary_only"}],
  ["GPC overrides full cookie", {cookie:"kandydrops_analytics_consent=full_behavioral", "sec-gpc":"1"}],
 ])("blocks optional behavioral persistence despite full payload consent: %s", async (_label, headers) => {
  const request=new NextRequest("http://localhost/api/analytics/ingest-identified", {method:"POST", headers:{"content-type":"application/json",...headers},body:JSON.stringify({events:[{eventId:"evt_denied_click",eventName:"semantic_target_clicked",eventTimestampMs:1767225600000,eventParams:{page_path:"/drops",target_id:"open-drop",session_id:"sess_test",consent_mode:"full_behavioral",consent_state:"granted"}}]})});
  const response=await POST(request);
  expect(response.status).toBe(200);
  expect(mockState.writes.filter(write=>write.path.startsWith("analytics_event_facts/"))).toEqual([]);
  expect(mockState.writeBehavioralTimelineFacts.mock.calls.flatMap(call=>call[0])).toEqual([]);
 });
 it("keeps explicitly permitted behavioral ingestion", async () => {
  const request=new NextRequest("http://localhost/api/analytics/ingest-identified", {method:"POST",headers:{"content-type":"application/json",cookie:"kandydrops_analytics_consent=full_behavioral"},body:JSON.stringify({events:[{eventId:"evt_permitted_click",eventName:"semantic_target_clicked",eventTimestampMs:1767225600000,eventParams:{page_path:"/drops",target_id:"open-drop",session_id:"sess_test",consent_mode:"full_behavioral",consent_state:"granted"}}]})});
  const response=await POST(request);expect(response.status).toBe(200);
  expect(mockState.writes.filter(write=>write.path==="analytics_event_facts/evt_permitted_click")).toHaveLength(1);
 });
});

describe("event consent narrowing",()=>{
 beforeEach(()=>mockState.reset());
 it.each(["necessary_only","unknown","full_analytics"])("does not promote %s event consent under a full request",async(consent_mode)=>{
  const request=new NextRequest("http://localhost/api/analytics/ingest-identified",{method:"POST",headers:{"content-type":"application/json",cookie:"kandydrops_analytics_consent=full_behavioral"},body:JSON.stringify({events:[{eventId:"evt_earlier_consent",eventName:"semantic_target_clicked",eventParams:{page_path:"/drops",session_id:"sess_test",consent_mode,consent_state:"granted"}}]})});
  await POST(request);expect(mockState.writes).toEqual([]);
 });
 it("keeps required authentication evidence under denied optional consent",async()=>{
  const request=new NextRequest("http://localhost/api/analytics/ingest-identified",{method:"POST",headers:{"content-type":"application/json",cookie:"kandydrops_analytics_consent=necessary_only","sec-gpc":"1"},body:JSON.stringify({events:[{eventId:"evt_required_auth",eventName:"auth_sign_in_success",eventParams:{page_path:"/login",session_id:"sess_test",consent_mode:"full_behavioral",consent_state:"granted"}}]})});
  const response=await POST(request);expect(response.status).toBe(200);
  const record=mockState.writes.find(write=>write.path==="analytics_event_facts/evt_required_auth");
  expect(record).toBeDefined();expect(record?.data.eventEnvelope).toMatchObject({consentMode:"necessary_only"});
  expect(record?.data.behavioralTimelineProjectionFact).toMatchObject({consentState:"denied"});
 });
});


describe("request admission recovery", () => {
 beforeEach(() => mockState.reset());
 function request(cookie: string | null, eventName = "semantic_target_clicked", params: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/analytics/ingest-identified", {method:"POST",headers:{"content-type":"application/json",...(cookie === null ? {} : {cookie: "kandydrops_analytics_consent="+cookie})},body:JSON.stringify({events:[{eventId:"evt_admission",eventName,eventParams:{page_path:"/drops",session_id:"sess_admission",...params}}]})});
 }
 it.each([null,"invalid_mode","denied","minimal_analytics","full_analytics"])("does not trust behavioral body over request %s", async mode => {
  const response=await POST(request(mode,"semantic_target_clicked",{consent_mode:"full_behavioral",consent_state:"granted"}));
  expect(await response.json()).toMatchObject({processed:0,skippedConsent:1});
  expect(mockState.writes).toEqual([]); expect(mockState.readPaths).toEqual([]);
 });
 it.each([null,"",{},42])("does not treat explicit invalid event consent %s as omitted", async mode => {
  await POST(request("full_behavioral","semantic_target_clicked",{consent_mode:mode,consentMode:"full_behavioral"}));
  expect(mockState.writes).toEqual([]); expect(mockState.readPaths).toEqual([]);
 });
 it("allows omitted event mode only through current full request admission", async () => {
  await POST(request("granted"));
  expect(mockState.writes.find(w=>w.path==="analytics_event_facts/evt_admission")?.data.eventEnvelope).toMatchObject({consentMode:"full_behavioral"});
 });
 it("preserves minimal page observation with partial consent", async () => {
  await POST(request("minimal_analytics","semantic_page_viewed",{consent_mode:"full_behavioral"}));
  const saved=mockState.writes.find(w=>w.path==="analytics_event_facts/evt_admission");
  expect(saved?.data.eventEnvelope).toMatchObject({consentMode:"minimal_analytics"});
  expect(saved?.data.behavioralTimelineProjectionFact).toMatchObject({consentState:"partial"});
 });
 it("prevents optional replay after consent withdrawal and permits the next admitted action", async () => {
  await POST(request("full_behavioral"));
  const saved=mockState.writes.find(w=>w.path==="analytics_event_facts/evt_admission")!;
  mockState.reset();mockState.existingPaths.add(saved.path);mockState.existingDataByPath.set(saved.path,saved.data);
  const denied=await POST(request("necessary_only"));
  expect(await denied.json()).toMatchObject({processed:0,skippedConsent:1,dedupedExisting:0});
  expect(mockState.readPaths).toEqual([]);expect(mockState.writeBehavioralTimelineFacts.mock.calls.flatMap(c=>c[0])).toEqual([]);
  const restored=await POST(request("full_behavioral"));
  expect(await restored.json()).toMatchObject({processed:0,dedupedExisting:1,timelineFactsWritten:1});
  expect(mockState.writes).toEqual([]);
 });
 it("does not link a person under minimal consent even with a granted declaration", async () => {
  await POST(request("minimal_analytics","identity_linked",{consent_mode:"full_behavioral",consent_state:"granted",anonymous_visitor_id:"guest_123"}));
  expect(mockState.writes).toEqual([]);expect(mockState.readPaths).toEqual([]);
 });
});

describe("identified server request admission provenance", () => {
  const markerVersion = "runtime_fact_request_consent_v1";
  const marker = (consentMode: string) => ({ version: markerVersion, consentMode });
  const request = (mode: string, eventId = "evt_provenance_page", eventName = "semantic_page_viewed", eventParams: Record<string, unknown> = {}) => new NextRequest("http://localhost/api/analytics/ingest-identified", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `kandydrops_analytics_consent=${mode}` },
    body: JSON.stringify({ requestConsentAdmission: marker("full_behavioral"), events: [{ eventId, eventName, eventTimestampMs: 1_791_000_000_000, eventParams: { session_id: "session_provenance", page_path: "/drops", source_truth: "client", consent_mode: "full_behavioral", consent_state: "granted", requestConsentAdmission: marker("full_behavioral"), request_consent_admission: marker("full_behavioral"), ...eventParams } }] }),
  });

  beforeEach(() => {
    mockState.reset();
    vi.mocked(upsertAnalyticsIdentityLink).mockClear();
  });

  it.each(["minimal_analytics", "full_analytics"])("binds the restrictive %s request to persisted source and timeline rather than a forged client record", async mode => {
    const response = await POST(request(mode));
    expect(await response.json()).toMatchObject({ processed: 1, timelineFactsWritten: 1 });
    const source = mockState.writes.find(write => write.path === "analytics_event_facts/evt_provenance_page")?.data;
    expect(source).toMatchObject({ requestConsentAdmission: marker(mode), consentMode: mode, sourceTruth: "client", behavioralTimelineProjectionFact: { requestConsentAdmission: marker(mode), consentState: "partial", eventName: "semantic_page_viewed" } });
    expect(mockState.writeBehavioralTimelineFacts).toHaveBeenCalledWith([expect.objectContaining({ requestConsentAdmission: marker(mode), consentState: "partial", sourceTruth: "client" })]);
  });

  it("records necessary-only admission for required account evidence while optional analytics remains denied", async () => {
    const response = await POST(request("necessary_only", "evt_provenance_account", "auth_sign_in_success"));
    expect(await response.json()).toMatchObject({ processed: 1 });
    const source = mockState.writes.find(write => write.path === "analytics_event_facts/evt_provenance_account")?.data;
    expect(source).toMatchObject({ requestConsentAdmission: marker("necessary_only"), consentMode: "necessary_only", behavioralTimelineProjectionFact: { requestConsentAdmission: marker("necessary_only"), consentState: "denied" } });
  });

  it("does not write or read optional facts when the body claims a full server record beneath necessary-only request consent", async () => {
    const response = await POST(request("necessary_only", "evt_provenance_click", "semantic_target_clicked"));
    expect(await response.json()).toMatchObject({ processed: 0, skippedConsent: 1 });
    expect(mockState.writes).toEqual([]);
    expect(mockState.readPaths).toEqual([]);
    expect(mockState.writeBehavioralTimelineFacts).toHaveBeenCalledWith([]);
  });

  it.each([undefined, { version: "legacy_import", consentMode: "full_behavioral" }, { version: markerVersion, consentMode: "granted" }])("keeps an old or malformed projection unverified during admitted replay (%j)", async savedAdmission => {
    const eventId = "evt_provenance_replay";
    await POST(request("full_behavioral", eventId));
    const source = structuredClone(mockState.writes.find(write => write.path === `analytics_event_facts/${eventId}`)!.data);
    const projection = source.behavioralTimelineProjectionFact as Record<string, unknown>;
    delete source.requestConsentAdmission;
    delete projection.requestConsentAdmission;
    if (savedAdmission) projection.requestConsentAdmission = savedAdmission;
    const originalSaved = structuredClone(source);
    mockState.existingPaths.add(`analytics_event_facts/${eventId}`);
    mockState.existingDataByPath.set(`analytics_event_facts/${eventId}`, source);
    mockState.writes.length = 0;
    mockState.writeBehavioralTimelineFacts.mockClear();
    const response = await POST(request("full_behavioral", eventId));
    expect(await response.json()).toMatchObject({ processed: 0, dedupedExisting: 1, timelineFactsWritten: 1 });
    expect(mockState.writes).toEqual([]);
    const recovered = mockState.writeBehavioralTimelineFacts.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(recovered).toHaveLength(1);
    expect(recovered[0]).not.toHaveProperty("requestConsentAdmission");
    expect(source).toEqual(originalSaved);
  });

  it.each(["missing_source", "mismatched_source"] as const)("leaves a replay projection unverified when original identified fact admission is %s", async sourceState => {
    const eventId = "evt_provenance_source_agreement";
    await POST(request("minimal_analytics", eventId));
    const source = structuredClone(mockState.writes.find(write => write.path === `analytics_event_facts/${eventId}`)!.data);
    if (sourceState === "missing_source") delete source.requestConsentAdmission;
    else (source.behavioralTimelineProjectionFact as Record<string, unknown>).requestConsentAdmission = marker("full_behavioral");
    const originalSaved = structuredClone(source);
    mockState.existingPaths.add(`analytics_event_facts/${eventId}`);
    mockState.existingDataByPath.set(`analytics_event_facts/${eventId}`, source);
    mockState.writes.length = 0;
    mockState.writeBehavioralTimelineFacts.mockClear();
    const response = await POST(request("full_behavioral", eventId));
    expect(await response.json()).toMatchObject({ processed: 0, dedupedExisting: 1, timelineFactsWritten: 1 });
    expect(mockState.writes).toEqual([]);
    const recovered = mockState.writeBehavioralTimelineFacts.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(recovered).toHaveLength(1);
    expect(recovered[0]).not.toHaveProperty("requestConsentAdmission");
    expect(source).toEqual(originalSaved);
  });

  it("retains the original minimal admission during a later full-request replay", async () => {
    const eventId = "evt_provenance_minimal_replay";
    await POST(request("minimal_analytics", eventId));
    const source = structuredClone(mockState.writes.find(write => write.path === `analytics_event_facts/${eventId}`)!.data);
    mockState.existingPaths.add(`analytics_event_facts/${eventId}`);
    mockState.existingDataByPath.set(`analytics_event_facts/${eventId}`, source);
    mockState.writes.length = 0;
    mockState.writeBehavioralTimelineFacts.mockClear();
    const response = await POST(request("full_behavioral", eventId));
    expect(await response.json()).toMatchObject({ processed: 0, dedupedExisting: 1 });
    expect(mockState.writes).toEqual([]);
    expect(mockState.writeBehavioralTimelineFacts).toHaveBeenCalledWith([expect.objectContaining({ requestConsentAdmission: marker("minimal_analytics"), consentState: "partial" })]);
  });

  it.each([
    ["full_analytics", "partial"],
    ["full_behavioral", "granted"],
  ] as const)("keeps admitted %s identity observations diagnostic without a second association mutation", async (mode, consentState) => {
    const response = await POST(request(mode, `evt_provenance_link_${mode}`, "identity_linked", { anonymous_visitor_id: "subject_link-provenance", user_id: "user_123", consent_state: "granted", source_truth: "canonical", metric_eligible: true }));
    expect(await response.json()).toMatchObject({ processed: 1, identityLinksCreated: 0 });
    expect(upsertAnalyticsIdentityLink).not.toHaveBeenCalled();
    const source = mockState.writes.find(write => write.path === `analytics_event_facts/evt_provenance_link_${mode}`)?.data;
    expect(source).toMatchObject({ sourceTruth: "client", metricEligible: false, requestConsentAdmission: marker(mode), params: { diagnostic_only: true, source_truth: "client", metric_eligible: false }, behavioralTimelineProjectionFact: { sourceTruth: "client", metricEligible: false, requestConsentAdmission: marker(mode), consentState } });
  });

  it("does not create a foreign-user association from an observed identity event", async () => {
    const response = await POST(request("full_behavioral", "evt_provenance_foreign_link", "identity_linked", { anonymous_visitor_id: "subject_foreign-link", user_id: "foreign_body_user", source_truth: "canonical", metric_eligible: true }));
    expect(await response.json()).toMatchObject({ processed: 1, identityLinksCreated: 0 });
    expect(upsertAnalyticsIdentityLink).not.toHaveBeenCalled();
    expect(mockState.writes.every(write => !write.path.startsWith("analytics_identity_links/") && !write.path.startsWith("identity_lineage_indexes/"))).toBe(true);
    const source = mockState.writes.find(write => write.path === "analytics_event_facts/evt_provenance_foreign_link")!.data;
    expect(source).toMatchObject({ actorUserId: "user_123", sourceIdentity: { userId: "user_123" }, sourceTruth: "client", metricEligible: false });
  });

  it("persists an eligible observation and its timeline under the authenticated actor rather than a foreign body user", async () => {
    const response = await POST(request("full_behavioral", "evt_provenance_actor_binding", "semantic_page_viewed", { actor_user_id: "foreign_actor", user_id: "foreign_user", recipient_id: "target_user" }));
    expect(await response.json()).toMatchObject({ processed: 1, timelineFactsWritten: 1 });
    const source = mockState.writes.find(write => write.path === "analytics_event_facts/evt_provenance_actor_binding")!.data;
    expect(source).toMatchObject({ actorUserId: "user_123", targetUserId: "target_user", sourceIdentity: { userId: "user_123" }, includeInUserBehavior: true, behavioralTimelineProjectionFact: { actorUserId: "user_123", target: { userId: "target_user" }, includeInPersonMetrics: true } });
    expect(mockState.writeBehavioralTimelineFacts).toHaveBeenCalledWith([expect.objectContaining({ actorUserId: "user_123", target: { userId: "target_user" }, includeInPersonMetrics: true })]);
  });

  describe("identified consent person scopes", () => {
    it.each(["minimal_analytics", "full_analytics"])("admits %s page observations globally without assigning personal behavior", async mode => {
      const eventId = `evt_person_scope_${mode}`;
      const response = await POST(request(mode, eventId));
      expect(await response.json()).toMatchObject({ processed: 1 });
      const source = mockState.writes.find(write => write.path === `analytics_event_facts/${eventId}`)!.data;
      expect(source.includeInUserBehavior).toBe(false);
      expect(source.includeInGlobalEvents).toBe(true);
      expect(source.behavioralTimelineProjectionFact).toMatchObject({ includeInPersonMetrics: false, includeInGlobalEvents: true, consentState: "partial" });
    });

    it("retains required account integrity after decline without assigning personal behavior", async () => {
      const eventId = "evt_person_scope_decline";
      const response = await POST(request("necessary_only", eventId, "auth_sign_in_success"));
      expect(await response.json()).toMatchObject({ processed: 1 });
      const source = mockState.writes.find(write => write.path === `analytics_event_facts/${eventId}`)!.data;
      expect(source.includeInUserBehavior).toBe(false);
      expect(source.includeInGlobalEvents).toBe(true);
      expect(source.behavioralTimelineProjectionFact).toMatchObject({ includeInPersonMetrics: false, includeInGlobalEvents: true, consentState: "denied" });
    });

    it("retains eligible personal behavior for a full behavioral signed-in observation", async () => {
      const eventId = "evt_person_scope_full";
      const response = await POST(request("full_behavioral", eventId));
      expect(await response.json()).toMatchObject({ processed: 1 });
      const source = mockState.writes.find(write => write.path === `analytics_event_facts/${eventId}`)!.data;
      expect(source.includeInUserBehavior).toBe(true);
      expect(source.includeInGlobalEvents).toBe(true);
      expect(source.behavioralTimelineProjectionFact).toMatchObject({ includeInPersonMetrics: true, includeInGlobalEvents: true, consentState: "granted" });
    });
  });
});


describe("observed identified session measurement admission",()=>{
 const measurement=JSON.stringify({version:"session_measurement_v1",segmentId:"segment_identified_fixture",sequence:1,startedAtMs:1_000,endedAtMs:31_000,activeMs:0,idleMs:30_000,hiddenMs:0,status:"final"});
 beforeEach(()=>mockState.reset());
 const request=(mode:string,eventName="semantic_page_viewed",measurementParams:Record<string,unknown>={})=>new NextRequest("http://localhost/api/analytics/ingest-identified",{method:"POST",headers:{"content-type":"application/json",cookie:"kandydrops_analytics_consent="+mode},body:JSON.stringify({events:[{eventId:"evt_session_measured",eventName,eventTimestampMs:31_000,eventParams:{page_path:"/drops",session_id:"sess_session-measured",consent_mode:"full_behavioral",source_truth:"client_supporting",session_measurement:measurement,active_ms:0,idle_ms:30_000,hidden_ms:0,...measurementParams}}]})});
 it.each(["minimal_analytics","full_analytics"])("keeps admitted page liveness but strips optional measurement from every stored projection under %s",async mode=>{
  const response=await POST(request(mode));expect(response.status).toBe(200);expect(mockState.writes.length).toBeGreaterThan(0);
  for(const {data} of mockState.writes) { const saved = data as { sessionMeasurement?: unknown; behavioralTimelineProjectionFact?: { sessionMeasurement?: unknown }; params?: Record<string, unknown>; eventParams?: Record<string, unknown>; eventEnvelope?: { metadata?: Record<string, unknown> } }; expect(saved.sessionMeasurement).toBeUndefined();expect(saved.behavioralTimelineProjectionFact?.sessionMeasurement).toBeUndefined();expect(saved.params?.session_measurement).toBeUndefined();expect(saved.eventParams?.session_measurement).toBeUndefined();expect(saved.params?.active_ms).toBeUndefined();expect(saved.eventEnvelope?.metadata?.session_measurement).toBeUndefined(); }
 });
 it.each(["minimal_analytics","full_analytics"])("denies optional session event %s before Firestore reads",async mode=>{const response=await POST(request(mode,"session_closed"));expect(response.status).toBe(200);expect(mockState.writes).toHaveLength(0);expect(mockState.readPaths).toHaveLength(0);});
 it.each(["minimal_analytics","full_analytics"].flatMap(mode=>["active_session_ms","activeSessionMs","active_watch_ms","activeWatchMs"].map(alias=>[mode,alias] as const)))("strips a supported active-time alias under %s: %s",async(mode,alias)=>{
  const response=await POST(request(mode,"semantic_page_viewed",{[alias]:1000}));
  expect(response.status).toBe(200);expect(mockState.writes.length).toBeGreaterThan(0);
  for(const {data} of mockState.writes) {
   const saved=data as { behavioralFact?:{activeMs?:number}; params?:Record<string,unknown>; eventParams?:Record<string,unknown>; eventEnvelope?:{metadata?:Record<string,unknown>} };
   expect(saved.behavioralFact?.activeMs).toBeUndefined();
   expect(saved.params?.[alias]).toBeUndefined();
   expect(saved.eventParams?.[alias]).toBeUndefined();
   expect(saved.eventEnvelope?.metadata?.[alias]).toBeUndefined();
  }
 });
 it.each(["active_session_ms","activeSessionMs","active_watch_ms","activeWatchMs"])("retains admitted explicit zero through supported alias %s",async alias=>{
  const response=await POST(request("full_behavioral","semantic_page_viewed",{active_ms:undefined,[alias]:0}));
  expect(response.status).toBe(200);
  const saved=mockState.writes.find(write=>write.path.startsWith("analytics_event_facts/"))?.data as { behavioralFact?:{activeMs?:number}; params?:Record<string,unknown>; eventEnvelope?:{metadata?:Record<string,unknown>} } | undefined;
  expect(saved?.behavioralFact?.activeMs).toBe(0);
  expect(saved?.params?.[alias]).toBe(0);
  expect(saved?.eventEnvelope?.metadata?.[alias]).toBe(0);
 });
 it("preserves client observed zero and trusted full admission in canonical source storage",async()=>{const response=await POST(request("full_behavioral","session_closed"));expect(response.status).toBe(200);const saved=mockState.writes.find(write=>write.path.startsWith("analytics_event_facts/"))?.data as { sessionMeasurement?: unknown; requestConsentAdmission?: { consentMode?: string }; sourceTruth?: string; behavioralTimelineProjectionFact?: { sessionMeasurement?: unknown }; eventEnvelope?: { metadata?: Record<string, unknown> } } | undefined;expect(saved?.sessionMeasurement).toMatchObject({activeMs:0,idleMs:30_000});expect(saved?.behavioralTimelineProjectionFact?.sessionMeasurement).toMatchObject({activeMs:0,idleMs:30_000});expect(saved?.requestConsentAdmission?.consentMode).toBe("full_behavioral");expect(saved?.sourceTruth).toBe("client");expect(saved?.eventEnvelope?.metadata?.session_measurement).toBe(measurement);});
});


describe("identified current profile authority and client provenance", () => {
  beforeEach(() => { mockState.reset(); vi.mocked(recordDebugEvidence).mockClear(); });
  const event = (eventId: string, eventParams: Record<string, unknown> = {}, eventName = "notification_read") => ({
    eventId, eventTimestampMs: 1_791_000_000_000, eventName,
    eventParams: { page_path: "/drops", session_id: "session_authority", actor_kind: "signed_in_user", notification_id: "notification_authority", ...eventParams },
  });
  const source = (eventId: string) => mockState.writes.find(write => write.path === "analytics_event_facts/" + eventId)?.data;
  const profileReads = () => mockState.readPaths.filter(path => path.startsWith("users/"));
  const setRole = (role: unknown) => mockState.existingDataByPath.set("users/user_123", { role });
  const submit = (eventId: string, params: Record<string, unknown> = {}, name?: string) => POST(buildRequest({ events: [event(eventId, params, name)] }));

  it.each([
    { trustedProfileRole: "admin", callerRole: "admin" },
    { roles: ["admin", "owner_admin"], claims: { admin: true, owner: true }, actor_admin_id: "foreign_admin", adminId: "foreign_admin" },
    { actor_kind: "system", actor_type: "system", system_generated: true, source: "system_job" },
    { roles: ["creator"], claims: { creator: true, creatorId: "foreign_creator" }, actor_creator_id: "foreign_creator" },
    { actor_user_id: "foreign_user", user_id: "foreign_user", userId: "foreign_user", analytics_user_id: "foreign_user" },
    { actor_kind: "admin_projection", performed_as: "admin_view_as_creator", projection_mode: "read_only_creator_projection", source_truth: "local_projection" },
  ])("does not grant authority from browser declarations %j", async params => {
    expect((await submit("evt_authority_forged", { ...params, target_creator_id: "target_creator", recipient_id: "target_user" })).status).toBe(200);
    const saved = source("evt_authority_forged");
    expect(saved).toMatchObject({ actorType: "user", actorUserId: "user_123", actorCreatorId: "", actorAdminId: "", sourceTruth: "client", includeInUserBehavior: true,
      identityEnvelope: { actorKind: "signed_in_user", userId: "user_123" }, behavioralFact: { userId: "user_123", sourceTruth: "client" },
      eventEnvelope: { actorKind: "signed_in_user", userRef: { id: "user_123" }, metadata: { actor_user_id: "user_123", source_truth: "client" } },
      behavioralTimelineProjectionFact: { actorType: "user", actorUserId: "user_123", sourceTruth: "client", target: { creatorId: "target_creator", userId: "target_user" }, confidenceInputs: { hasServerTruth: false } },
    });
    expect((saved?.params as Record<string, unknown>).claims).toBeUndefined();
    expect(saved?.params).not.toHaveProperty("trustedProfileRole");
    expect(saved?.params).not.toHaveProperty("callerRole");
    expect(profileReads()).toEqual(["users/user_123"]);
  });

  it("does not infer authority from an Admin route or event name", async () => {
    expect((await submit("evt_authority_admin_name", { page_path: "/admin/analytics" }, "admin_analytics_viewed")).status).toBe(200);
    expect(source("evt_authority_admin_name")).toMatchObject({ actorType: "user", actorUserId: "user_123", actorAdminId: "", actorKind: "signed_in_user", sourceTruth: "client" });
  });

  it.each([undefined, "server", "canonical", "materialized", "legacy", "local_projection", "client"])("keeps HTTP observations client-sourced despite %s", async sourceTruth => {
    expect((await submit("evt_authority_provenance", { source_truth: sourceTruth, sourceTruth })).status).toBe(200);
    expect(source("evt_authority_provenance")).toMatchObject({ sourceTruth: "client", params: { source_truth: "client" }, behavioralFact: { sourceTruth: "client" },
      eventEnvelope: { metadata: { source_truth: "client" } }, behavioralTimelineProjectionFact: { sourceTruth: "client", confidenceInputs: { hasServerTruth: false } } });
  });

  it.each([false, true])("uses current DB Admin role regardless of token Admin=%s", async isAdmin => {
    setRole("admin"); mockState.guardApiRequest.mockResolvedValue({ uid: "user_123", isAdmin } as { uid: string });
    expect((await submit("evt_authority_current_admin", { actor_kind: "guest", anonymous_visitor_id: "guest_before_admin" })).status).toBe(200);
    expect(source("evt_authority_current_admin")).toMatchObject({ actorType: "admin", actorUserId: "", actorAdminId: "user_123", sourceTruth: "client", includeInUserBehavior: false,
      identityEnvelope: { actorKind: "admin", identityState: "admin_authenticated" }, behavioralTimelineProjectionFact: { actorType: "admin", includeInPersonMetrics: false }, eventEnvelope: { actorKind: "admin", includeInUserBehavior: false } });
    expect((source("evt_authority_current_admin")?.behavioralFact as Record<string, unknown>).userId).toBeUndefined();
    expect(mockState.writes.some(write => write.path.startsWith("analytics_active_users/"))).toBe(false);
  });

  it("does not promote a current ordinary profile because its token Admin flag is stale", async () => {
    mockState.guardApiRequest.mockResolvedValue({ uid: "user_123", isAdmin: true } as { uid: string });
    expect((await submit("evt_authority_stale_token")).status).toBe(200);
    expect(source("evt_authority_stale_token")).toMatchObject({ actorType: "user", actorUserId: "user_123", actorAdminId: "", includeInUserBehavior: true });
  });

  it("binds Creator actor ids to the current caller and keeps another Creator as the target", async () => {
    setRole("creator");
    expect((await submit("evt_authority_current_creator", { actor_creator_id: "foreign_creator", creator_id: "target_creator", user_id: "foreign_user" }, "creator_followed")).status).toBe(200);
    expect(source("evt_authority_current_creator")).toMatchObject({ actorType: "creator", actorUserId: "user_123", actorCreatorId: "user_123", targetCreatorId: "target_creator", includeInUserBehavior: true,
      identityEnvelope: { actorKind: "creator_user", userId: "user_123" }, behavioralFact: { userId: "user_123", creatorId: "target_creator" }, behavioralTimelineProjectionFact: { actorType: "creator", actorUserId: "user_123", target: { creatorId: "target_creator" } } });
  });

  it("preserves an explicit guest observation without converting its transport caller into a person", async () => {
    expect((await submit("evt_authority_guest", { actor_kind: "guest", anonymous_visitor_id: "guest_before_auth", user_id: "foreign_user" })).status).toBe(200);
    expect(source("evt_authority_guest")).toMatchObject({ actorType: "guest", actorUserId: "", actorKind: "guest", identityEnvelope: { actorKind: "guest", userId: null, identityConfidence: "weak" }, eventEnvelope: { actorKind: "guest", userRef: null, identityConfidence: "weak" }, behavioralTimelineProjectionFact: { actorType: "guest", anonymousVisitorId: "guest_before_auth" } });
    expect((source("evt_authority_guest")?.behavioralFact as Record<string, unknown>).userId).toBeUndefined();
    expect(source("evt_authority_guest")?.behavioralTimelineProjectionFact).not.toHaveProperty("actorUserId");
  });

  it("preserves caller-bound linked lineage without granting a foreign linked person", async () => {
    expect((await submit("evt_authority_linked", { anonymous_visitor_id: "guest_before_auth", identity_link_id: "link_current", actor_kind: "signed_in_user", linked_person_id: "foreign_person", identity_state: "admin_authenticated", user_id: "foreign_user" })).status).toBe(200);
    expect(source("evt_authority_linked")).toMatchObject({ actorType: "user", actorUserId: "user_123", identityEnvelope: { actorKind: "signed_in_user", userId: "user_123", guestId: "guest_before_auth", linkId: "link_current", identityState: "logged_in_linked_guest" }, behavioralTimelineProjectionFact: { actorUserId: "user_123", identityLinkId: "link_current", anonymousVisitorId: "guest_before_auth" } });
    expect((source("evt_authority_linked")?.behavioralFact as Record<string, unknown>).linkedPersonId).not.toBe("foreign_person");
    expect(upsertAnalyticsIdentityLink).not.toHaveBeenCalled();
  });

  it.each(["identity_link_id", "identityLinkId", "link_id", "linkId"])("keeps canonical linked metadata in agreement through supported alias %s", async alias => {
    expect((await submit("evt_authority_link_alias", { anonymous_visitor_id: "guest_before_auth", [alias]: "link_current" })).status).toBe(200);
    expect(source("evt_authority_link_alias")).toMatchObject({
      identityLinkId: "link_current", identityEnvelope: { linkId: "link_current", identityState: "logged_in_linked_guest" },
      eventEnvelope: { linkId: "link_current", identityState: "logged_in_linked_guest" },
      sourceIdentity: { identityLinkId: "link_current" },
      behavioralTimelineProjectionFact: { identityLinkId: "link_current", actorUserId: "user_123" },
    });
    expect(upsertAnalyticsIdentityLink).not.toHaveBeenCalled();
  });

  it("keeps an actual Admin projection client-sourced and excluded with its Creator target intact", async () => {
    setRole("admin");
    expect((await submit("evt_authority_projection", { actor_admin_id: "foreign_admin", target_creator_id: "target_creator", performed_as: "admin_view_as_creator", projection_mode: "read_only_creator_projection", source_truth: "canonical" }, "admin_view_as_creator_started")).status).toBe(200);
    expect(source("evt_authority_projection")).toMatchObject({ actorType: "admin", actorAdminId: "user_123", actorUserId: "", targetCreatorId: "target_creator", sourceTruth: "client", includeInUserBehavior: false, metricEligible: false, metricExclusionReason: "admin_projection", actorKind: "admin_projection", behavioralTimelineProjectionFact: { includeInPersonMetrics: false, target: { creatorId: "target_creator" } } });
  });

  it.each([undefined, null, "owner_admin", "system", "USER", "", 17])("does not default an invalid current role to ordinary authority %j", async role => {
    setRole(role);
    const response = await submit("evt_authority_unknown");
    expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ success: false, errorKey: "forbidden" });
    expect(mockState.writes).toEqual([]); expect(mockState.writeBehavioralTimelineFacts).not.toHaveBeenCalled();
    expect(recordDebugEvidence).toHaveBeenCalledWith(expect.objectContaining({ technicalDetail: expect.objectContaining({ diagnosticClass: "role_unknown" }) }));
    setRole("user"); expect((await submit("evt_authority_unknown")).status).toBe(200);
    expect(source("evt_authority_unknown")).toMatchObject({ actorUserId: "user_123", actorType: "user" });
    expect(profileReads()).toHaveLength(2);
  });

  it("requires a current profile and permits a fresh request after profile recovery", async () => {
    mockState.existingPaths.delete("users/user_123");
    expect((await submit("evt_authority_missing_profile")).status).toBe(403); expect(mockState.writes).toHaveLength(0);
    expect(recordDebugEvidence).toHaveBeenCalledWith(expect.objectContaining({ technicalDetail: expect.objectContaining({ diagnosticClass: "missing_user" }) }));
    mockState.existingPaths.add("users/user_123"); expect((await submit("evt_authority_missing_profile")).status).toBe(200);
  });

  it.each([7, 16, "permission-denied", "unauthenticated"])("settles a permanent profile lookup failure %s without publishing", async code => {
    mockState.readErrorsByPath.set("users/user_123", { code, message: "private provider credential" });
    const response = await submit("evt_authority_lookup_denied");
    expect(response.status).toBe(403); expect(JSON.stringify(await response.json())).not.toContain("private provider credential");
    expect(mockState.writes).toEqual([]); expect(recordDebugEvidence).toHaveBeenCalledWith(expect.objectContaining({ technicalDetail: expect.objectContaining({ diagnosticClass: "role_lookup_blocked" }) }));
  });

  it("reports a transient profile read failure and succeeds only after a fresh recovered lookup", async () => {
    mockState.readErrorsByPath.set("users/user_123", { code: "unavailable", message: "private backend" });
    const response = await submit("evt_authority_transient"); expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, errorKey: "provider_unavailable" }); expect(mockState.writes).toEqual([]);
    mockState.readErrorsByPath.clear(); setRole("creator");
    expect((await submit("evt_authority_transient")).status).toBe(200); expect(source("evt_authority_transient")).toMatchObject({ actorType: "creator", actorCreatorId: "user_123" });
    expect(profileReads()).toHaveLength(2);
  });

  it("bounds profile admission to one lookup for the maximum accepted batch", async () => {
    const response = await POST(buildRequest({ events: Array.from({ length: 200 }, (_, index) => event("evt_authority_cap_" + index)) }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ processed: 200 });
    expect(profileReads()).toEqual(["users/user_123"]); expect(mockState.readPaths.filter(path => path.startsWith("analytics_event_facts/"))).toHaveLength(200);
  });

  it("does not read profiles or elevate history for a dedup-only replay", async () => {
    expect((await submit("evt_authority_saved")).status).toBe(200);
    const saved = source("evt_authority_saved")!; const preserved = structuredClone(saved);
    mockState.reset(); setRole("admin"); mockState.existingPaths.add("analytics_event_facts/evt_authority_saved"); mockState.existingDataByPath.set("analytics_event_facts/evt_authority_saved", preserved);
    expect((await submit("evt_authority_saved", { source_truth: "canonical", roles: ["admin"] })).status).toBe(200);
    expect(profileReads()).toEqual([]); expect(mockState.writes).toEqual([]);
    expect(mockState.existingDataByPath.get("analytics_event_facts/evt_authority_saved")).toEqual(preserved);
    expect(mockState.writeBehavioralTimelineFacts.mock.calls.flatMap(call => call[0])).toEqual([preserved.behavioralTimelineProjectionFact]);
  });

  it("keeps old source provenance and missing consent evidence untouched on replay", async () => {
    await submit("evt_authority_old"); const saved = source("evt_authority_old")!;
    const { requestConsentAdmission: _sourceAdmission, ...oldSource } = saved;
    const projection = oldSource.behavioralTimelineProjectionFact as Record<string, unknown>;
    const { requestConsentAdmission: _projectionAdmission, ...oldProjection } = projection;
    const old = { ...oldSource, sourceTruth: "server", behavioralTimelineProjectionFact: { ...oldProjection, sourceTruth: "server" } };
    mockState.reset(); mockState.existingPaths.add("analytics_event_facts/evt_authority_old"); mockState.existingDataByPath.set("analytics_event_facts/evt_authority_old", old);
    expect((await submit("evt_authority_old")).status).toBe(200); expect(profileReads()).toEqual([]); expect(mockState.writes).toEqual([]);
    const recovered = mockState.writeBehavioralTimelineFacts.mock.calls.flatMap(call => call[0])[0] as Record<string, unknown>;
    expect(recovered.sourceTruth).toBe("server"); expect(recovered).not.toHaveProperty("requestConsentAdmission");
  });

  it("does not read a profile for a denied or unsupported-only batch", async () => {
    const denied = new NextRequest("http://localhost/api/analytics/ingest-identified", { method: "POST", headers: { "content-type": "application/json", cookie: "kandydrops_analytics_consent=necessary_only" }, body: JSON.stringify({ events: [event("evt_authority_denied", {}, "semantic_target_clicked")] }) });
    expect((await POST(denied)).status).toBe(200); expect(profileReads()).toEqual([]); expect(mockState.readPaths).toEqual([]);
    expect((await submit("evt_authority_unsupported", {}, "unknown_unsupported_action")).status).toBe(200); expect(profileReads()).toEqual([]);
  });
});


describe("identified unknown actor quarantine", () => {
  it("keeps a new legacy-unknown observation out of the mapper's ordinary-user fallback", async () => {
    mockState.reset();
    const response = await POST(buildRequest({ events: [{ eventId: "evt_authority_legacy_unknown", eventName: "creator_followed", eventTimestampMs: 1_791_000_000_000, eventParams: { route: "/drops", session_id: "session_legacy", anonymous_visitor_id: "guest_legacy", actor_kind: "legacy_unknown", legacy_unknown: true, creator_id: "target_creator" } }] }));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ processed: 0, skippedUnsupported: 1 });
    expect(mockState.writes).toEqual([]); expect(mockState.writeBehavioralTimelineFacts.mock.calls.flatMap(call => call[0])).toEqual([]);
    expect(mockState.recordRouteWarning).toHaveBeenCalledWith("Analytics.IngestIdentified", expect.any(String), undefined, expect.objectContaining({ detail: expect.objectContaining({ skippedUnsupported: 1, eventNames: ["creator_followed"] }) }));
  });
});
