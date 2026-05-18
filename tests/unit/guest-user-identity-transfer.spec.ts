import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  guardApiRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: "user_1" })),
  upsertAnalyticsIdentityLink: vi.fn(async () => ({ identityLinkId: "identity_link_mock", created: true })),
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: routeMocks.guardApiRequest,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ANALYTICS_WRITE: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/analytics-identity-linking", () => ({
  upsertAnalyticsIdentityLink: routeMocks.upsertAnalyticsIdentityLink,
}));

import {
  buildIdentityLink,
  buildIdentityLinkPayload,
  createIdentityLinkStorageKey,
  shouldSubmitIdentityLink,
} from "@/lib/analytics/analytics-identity-link";
import {
  createCanonicalAnalyticsEvent,
  createIdentityLinkedEvent,
} from "@/lib/analytics/analytics-event-contract";
import { POST } from "@/app/api/analytics/identity-link/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/analytics/identity-link", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("guest-to-user identity transfer", () => {
  beforeEach(() => {
    routeMocks.guardApiRequest.mockReset();
    routeMocks.guardApiRequest.mockResolvedValue({ uid: "user_1" });
    routeMocks.upsertAnalyticsIdentityLink.mockReset();
    routeMocks.upsertAnalyticsIdentityLink.mockResolvedValue({ identityLinkId: "identity_link_mock", created: true });
  });

  it("builds a deterministic guest-to-user link id", () => {
    const first = buildIdentityLink({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "login",
    });
    const second = buildIdentityLink({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-19T04:00:00.000Z",
      reason: "login",
    });

    expect(first.identityLinkId).toBe(second.identityLinkId);
    expect(first.authTransitionId).toBe("auth_transition_login_subject_guest_sess_1_user_1");
    expect(first.identityState).toBe("guest_linked_to_user");
  });

  it("uses local idempotency keys so the same link submits once", () => {
    const link = buildIdentityLink({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "signup",
    });
    const sent = new Set<string>();

    expect(shouldSubmitIdentityLink(link, sent)).toBe(true);
    sent.add(createIdentityLinkStorageKey(link));
    expect(shouldSubmitIdentityLink(link, sent)).toBe(false);
  });

  it("lets authenticated events carry guest lineage and identity state", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "evt_linked_user",
      eventName: "drop_clicked",
      actorType: "user",
      anonymousVisitorId: "subject_guest",
      sessionId: "sess_1",
      userId: "user_1",
      identityLinkId: "identity_link_1",
      source: "identified_ingest",
    });

    expect(event.userId).toBe("user_1");
    expect(event.anonymousVisitorId).toBe("subject_guest");
    expect(event.identityLinkId).toBe("identity_link_1");
    expect(event.identityState).toBe("guest_linked_to_user");
  });

  it("keeps guest events guest-only", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "evt_guest",
      eventName: "page_view",
      actorType: "guest",
      anonymousVisitorId: "subject_guest",
      sessionId: "sess_1",
      source: "guest_batch",
    });

    expect(event.actorType).toBe("guest");
    expect(event.userId).toBeNull();
    expect(event.identityState).toBe("guest_only");
  });

  it("marks identity_linked events without duplicating historical guest rows", () => {
    const event = createIdentityLinkedEvent({
      eventId: "evt_identity_linked",
      anonymousVisitorId: "subject_guest",
      sessionId: "sess_1",
      userId: "user_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      method: "login",
      identityLinkId: "identity_link_1",
    });

    expect(event.identityState).toBe("guest_linked_to_user");
    expect(event.identityLinkId).toBe("identity_link_1");
    expect(event.payload.eligiblePastSessionIds).toEqual(["sess_1"]);
  });

  it("records transfer failures as non-blocking client results", async () => {
    const payload = buildIdentityLinkPayload({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "login",
    });

    const response = await payload.submit(async () => {
      throw new Error("network failed");
    });

    expect(response.success).toBe(false);
    expect(response.loginBlocking).toBe(false);
    expect(response.retryable).toBe(false);
  });

  it("requires auth for the transfer route", async () => {
    routeMocks.guardApiRequest.mockResolvedValueOnce(null);

    const response = await POST(buildRequest({
      guestId: "subject_guest",
      sessionId: "sess_1",
      identityLinkId: "identity_link_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "login",
    }));

    expect(response.status).toBe(401);
    expect(routeMocks.upsertAnalyticsIdentityLink).not.toHaveBeenCalled();
  });
});
