import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION } from "@/lib/analytics/identity-link-contract";
import { upsertAnalyticsIdentityLink } from "@/lib/server/analytics-identity-linking";

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
