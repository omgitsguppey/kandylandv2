import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
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
  buildAnalyticsIdentityLink,
  buildIdentityLink,
  buildIdentityLinkPayload,
  buildIdentityTransferCountingKeys,
  createIdentityLinkStorageKey,
  getAnalyticsIdentityLinkId,
  hasSubmittedIdentityLink,
  shouldSubmitIdentityLink,
} from "@/lib/analytics/identity-transfer";
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

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("guest-to-user identity transfer", () => {
  beforeEach(() => {
    routeMocks.guardApiRequest.mockReset();
    routeMocks.guardApiRequest.mockResolvedValue({ uid: "user_1" });
    routeMocks.upsertAnalyticsIdentityLink.mockReset();
    routeMocks.upsertAnalyticsIdentityLink.mockResolvedValue({ identityLinkId: "identity_link_mock", created: true });
  });

  it("builds a deterministic guest-to-user link id", () => {
    const first = buildAnalyticsIdentityLink({
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
    expect(getAnalyticsIdentityLinkId(first)).toBe(first.identityLinkId);
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

  it("uses linked-person counting keys instead of counting the same handoff as guest plus user", () => {
    const keys = buildIdentityTransferCountingKeys({
      userId: "user_1",
      anonymousVisitorId: "subject_guest",
      sessionId: "sess_1",
      identityLinkId: "identity_link_1",
      identityState: "guest_linked_to_user",
    });

    expect(keys).toMatchObject({
      identityState: "guest_linked_to_user",
      knownUserCountKey: "user_1",
      linkedGuestCountKey: "subject_guest",
      identityLinkId: "identity_link_1",
      countAsKnownUser: true,
      countAsGuest: false,
      countAsAdditionalKnownUser: false,
      countAsUnknownLegacy: false,
    });
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

  it("marks login submit success as sent through the payload lifecycle owner", async () => {
    const storage = createMemoryStorage();
    const payload = buildIdentityLinkPayload({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "login",
    });
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, identityLinkId: payload.identityLinkId, created: true }), { status: 200 }));

    const response = await payload.submit(fetcher, storage);

    expect(response).toMatchObject({
      success: true,
      identityLinkId: payload.identityLinkId,
      created: true,
      identityState: "guest_linked_to_user",
      loginBlocking: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(hasSubmittedIdentityLink(payload, storage)).toBe(true);
    expect(storage.getItem(createIdentityLinkStorageKey(payload))).toBe("sent");
  });

  it("marks failed login submit as retry_after without blocking login", async () => {
    const storage = createMemoryStorage();
    const payload = buildIdentityLinkPayload({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "login",
    });

    const response = await payload.submit(async () =>
      new Response(JSON.stringify({ success: false, reason: "try_later" }), { status: 503 }), storage);

    expect(response).toMatchObject({
      success: false,
      loginBlocking: false,
      retryable: false,
      reason: "try_later",
    });
    expect(storage.getItem(createIdentityLinkStorageKey(payload))).toMatch(/^retry_after:\d+$/u);
  });

  it("does not resubmit while a previous submit is pending", async () => {
    const storage = createMemoryStorage();
    const payload = buildIdentityLinkPayload({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "login",
    });
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, identityLinkId: payload.identityLinkId }), { status: 200 }));
    storage.setItem(createIdentityLinkStorageKey(payload), `pending:${Date.now() + 60_000}`);

    const response = await payload.submit(fetcher, storage);

    expect(response).toMatchObject({
      success: false,
      identityLinkId: payload.identityLinkId,
      loginBlocking: false,
      retryable: false,
      reason: "identity_link_submit_suppressed_by_lifecycle_state",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not resubmit or re-emit after a link was already sent", async () => {
    const storage = createMemoryStorage();
    const payload = buildIdentityLinkPayload({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "session_restore",
    });
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, identityLinkId: payload.identityLinkId }), { status: 200 }));
    storage.setItem(createIdentityLinkStorageKey(payload), "sent");

    const response = await payload.submit(fetcher, storage);

    expect(response).toMatchObject({
      success: false,
      identityLinkId: payload.identityLinkId,
      loginBlocking: false,
      retryable: false,
      reason: "identity_link_submit_suppressed_by_lifecycle_state",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("lets signup links emit and submit once when no lifecycle state exists", async () => {
    const storage = createMemoryStorage();
    const payload = buildIdentityLinkPayload({
      guestId: "subject_guest",
      userId: "user_1",
      sessionId: "sess_1",
      linkedAt: "2026-05-18T04:00:00.000Z",
      reason: "signup",
    });
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, identityLinkId: payload.identityLinkId, created: true }), { status: 200 }));

    expect(hasSubmittedIdentityLink(payload, storage)).toBe(false);
    const response = await payload.submit(fetcher, storage);

    expect(response.success).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(storage.getItem(createIdentityLinkStorageKey(payload))).toBe("sent");
  });

  it("checks AuthContext identity-link dedupe before client identity_linked telemetry", () => {
    const source = readFileSync("src/context/AuthContext.tsx", "utf8");
    const buildIndex = source.indexOf("const payload = buildIdentityLinkPayload");
    const dedupeIndex = source.indexOf("if (hasSubmittedIdentityLink(payload))");
    const ownerSyncIndex = source.indexOf("syncIdentifiedTelemetryOwnership(userId);", dedupeIndex);
    const trackIndex = source.indexOf("trackIdentityLinked({", dedupeIndex);
    const submitIndex = source.indexOf("void payload.submit(authFetch)", dedupeIndex);
    const authStateOwnerSyncIndex = source.indexOf("syncIdentifiedTelemetryOwnership(nextUserId)");

    expect(buildIndex).toBeGreaterThanOrEqual(0);
    expect(dedupeIndex).toBeGreaterThan(buildIndex);
    expect(ownerSyncIndex).toBeGreaterThan(dedupeIndex);
    expect(trackIndex).toBeGreaterThan(ownerSyncIndex);
    expect(submitIndex).toBeGreaterThan(trackIndex);
    expect(authStateOwnerSyncIndex).toBe(-1);
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
