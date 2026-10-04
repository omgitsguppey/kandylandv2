import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const canonicalCreate = vi.fn(async () => undefined);
  const canonicalSet = vi.fn(async () => undefined);
  const lineageSet = vi.fn(async () => undefined);
  const canonicalGet = vi.fn(async () => ({ exists: false }));
  const canonicalDoc = vi.fn(() => ({
    get: canonicalGet,
    create: canonicalCreate,
    set: canonicalSet,
  }));
  const lineageDoc = vi.fn(() => ({ set: lineageSet }));
  const collection = vi.fn((name: string) => ({
    doc: name === "analytics_identity_links" ? canonicalDoc : lineageDoc,
  }));
  const trackServerEvent = vi.fn(async () => undefined);
  return {
    adminDb: { collection },
    canonicalCreate,
    canonicalSet,
    lineageSet,
    canonicalGet,
    canonicalDoc,
    lineageDoc,
    collection,
    trackServerEvent,
  };
});

vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: mocks.adminDb }));
vi.mock("@/lib/server/analytics", () => ({ trackServerEvent: mocks.trackServerEvent }));
vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: vi.fn(async () => ({ uid: "user_1" })) }));
vi.mock("@/lib/server/rate-limit", () => ({ ANALYTICS_WRITE: {} }));

import { ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION } from "@/lib/analytics/identity-link-contract";
import { upsertAnalyticsIdentityLink } from "@/lib/server/analytics-identity-linking";
import { POST } from "@/app/api/analytics/identity-link/route";

describe("analytics identity-link persistence", () => {
  beforeEach(() => {
    mocks.canonicalCreate.mockClear();
    mocks.canonicalSet.mockClear();
    mocks.lineageSet.mockClear();
    mocks.canonicalGet.mockClear();
    mocks.canonicalGet.mockResolvedValue({ exists: false });
    mocks.trackServerEvent.mockClear();
  });

  it("persists the truthful owner-key version to the canonical link and lineage records", async () => {
    const result = await upsertAnalyticsIdentityLink({
      anonymousVisitorId: "guest_1",
      sessionId: "session_1",
      userId: "user_1",
      linkedAt: "2026-07-14T00:00:00.000Z",
      method: "login",
      eligiblePastSessionIds: ["session_1", "session_0"],
      consentState: "granted",
      consentMode: "full_behavioral",
      mergeAllowed: true,
      personLevelBehaviorAllowed: true,
      confidence: 2,
      linkageConfidenceSource: "full_behavioral_consent",
    });

    expect(result).toEqual({ identityLinkId: expect.stringMatching(/^identity_link_/u), created: true });
    expect(mocks.canonicalCreate).toHaveBeenCalledWith(expect.objectContaining({
      identityLinkId: result.identityLinkId,
      ownerKeyVersion: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
      confidence: 1,
    }));
    expect(mocks.lineageSet).toHaveBeenCalledWith(expect.objectContaining({
      identityLinkId: result.identityLinkId,
      ownerKeyVersion: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
      sessionIds: ["session_1", "session_0"],
      confidence: 1,
    }), { merge: true });
    expect(mocks.trackServerEvent).toHaveBeenCalledWith("identity_linked", expect.objectContaining({
      identity_link_id: result.identityLinkId,
      owner_key_version: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
    }), "user_1");
  });

  it("backfills the owner-key version when an existing deterministic link is updated", async () => {
    mocks.canonicalGet.mockResolvedValueOnce({ exists: true });

    await upsertAnalyticsIdentityLink({
      anonymousVisitorId: "guest_1",
      sessionId: "session_1",
      userId: "user_1",
      linkedAt: "2026-07-14T00:00:00.000Z",
      method: "session_restore",
      eligiblePastSessionIds: ["session_1"],
      consentState: "granted",
      consentMode: "full_behavioral",
      mergeAllowed: true,
      personLevelBehaviorAllowed: true,
      confidence: 0.9,
      linkageConfidenceSource: "full_behavioral_consent",
    });

    expect(mocks.canonicalCreate).not.toHaveBeenCalled();
    expect(mocks.canonicalSet).toHaveBeenCalledWith(expect.objectContaining({
      ownerKeyVersion: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
    }), { merge: true });
    expect(mocks.lineageSet).toHaveBeenCalledWith(expect.objectContaining({
      ownerKeyVersion: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
    }), { merge: true });
  });
});

describe("canonical identity-link request consent admission", () => {
  const request = (mode: string | null, bodyMode = "full_behavioral", gpc = false, consentState = "granted") => new NextRequest("http://localhost/api/analytics/identity-link", {
    method: "POST",
    headers: { "content-type": "application/json", ...(mode ? { cookie: `kandydrops_analytics_consent=${mode}` } : {}), ...(gpc ? { "sec-gpc": "1" } : {}) },
    body: JSON.stringify({ guestId: "subject_route-proof", sessionId: "sess_route-proof", userId: "foreign_body_user", reason: "login", consentMode: bodyMode, consentState, linkedAt: "2026-10-02T00:00:00.000Z" }),
  });

  beforeEach(() => {
    mocks.canonicalCreate.mockClear();
    mocks.canonicalSet.mockClear();
    mocks.lineageSet.mockClear();
    mocks.canonicalGet.mockClear();
    mocks.canonicalGet.mockResolvedValue({ exists: false });
    mocks.collection.mockClear();
    mocks.trackServerEvent.mockClear();
  });

  it.each([
    ["necessary_only", false],
    ["minimal_analytics", false],
    ["full_behavioral", true],
    [null, false],
    ["invalid_mode", false],
  ] as const)("does not persist a granted full-body association under request %s / GPC %s", async (mode, gpc) => {
    const response = await POST(request(mode, "full_behavioral", gpc));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ignored: true, created: false, mergeAllowed: false, retryable: false, reason: "identity_link_blocked_by_consent" });
    expect(mocks.collection).not.toHaveBeenCalled();
    expect(mocks.canonicalGet).not.toHaveBeenCalled();
    expect(mocks.canonicalCreate).not.toHaveBeenCalled();
    expect(mocks.canonicalSet).not.toHaveBeenCalled();
    expect(mocks.lineageSet).not.toHaveBeenCalled();
    expect(mocks.trackServerEvent).not.toHaveBeenCalled();
  });

  it.each([
    ["full_analytics", "partial", false, 0.8, "identity_link_allowed_behavior_blocked"],
    ["full_behavioral", "granted", true, 0.95, "full_behavioral_consent"],
  ] as const)("persists the existing admitted %s linkage policy for the authenticated caller only", async (mode, consentState, personLevelBehaviorAllowed, confidence, linkageConfidenceSource) => {
    const response = await POST(request(mode));
    expect(await response.json()).toMatchObject({ success: true, created: true, consentMode: mode, mergeAllowed: true, personLevelBehaviorAllowed });
    expect(mocks.canonicalCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: "user_1", consentMode: mode, consentState, mergeAllowed: true, personLevelBehaviorAllowed, confidence, linkageConfidenceSource }));
    expect(mocks.lineageSet).toHaveBeenCalledWith(expect.objectContaining({ userId: "user_1", consentMode: mode, consentState, mergeAllowed: true, personLevelBehaviorAllowed, confidence, linkageConfidenceSource }), { merge: true });
    expect(Array.from(new Set(mocks.collection.mock.calls.map(([name]) => name)))).toEqual(["analytics_identity_links", "identity_lineage_indexes"]);
  });

  it.each(["necessary_only", "minimal_analytics", "unknown"])("preserves an explicitly narrower %s body under a full request", async bodyMode => {
    const response = await POST(request("full_behavioral", bodyMode));
    expect(await response.json()).toMatchObject({ ignored: true, created: false, consentMode: bodyMode, mergeAllowed: false });
    expect(mocks.collection).not.toHaveBeenCalled();
  });

  it("retains the unique explicit body denial safeguard and permits the next admitted handoff", async () => {
    const blocked = await POST(request("full_behavioral", "full_behavioral", false, "denied"));
    expect(await blocked.json()).toMatchObject({ ignored: true, mergeAllowed: false, created: false });
    expect(mocks.canonicalCreate).not.toHaveBeenCalled();
    const admitted = await POST(request("full_behavioral"));
    expect(await admitted.json()).toMatchObject({ success: true, created: true, personLevelBehaviorAllowed: true });
    expect(mocks.canonicalCreate).toHaveBeenCalledOnce();
  });
});
