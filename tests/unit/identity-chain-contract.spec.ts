import { describe, expect, it } from "vitest";

import {
  resolveIdentityChain,
  validateIdentityChainContract,
} from "@/lib/identity-truth/identity-chain-contract";

describe("identity chain contract", () => {
  it("excludes admin/system behavior and keeps creator as a signed-in role overlay", () => {
    const admin = resolveIdentityChain({
      eventId: "evt_admin",
      actorKind: "admin_projection",
      sessionId: "sess_admin",
    });
    const creator = resolveIdentityChain({
      eventId: "evt_creator",
      actorKind: "creator_user",
      userId: "user_creator",
      sessionId: "sess_creator",
      role: "creator",
    });

    expect(admin.countScopes).toEqual(["admin_projection"]);
    expect(admin.countsAsUserBehavior).toBe(false);
    expect(creator.countScopes).toEqual(expect.arrayContaining(["global", "signed_in_user", "creator_role"]));
    expect(creator.linkedPersonId).toBe("user_creator");
    expect(creator.explanation).toContain("role overlay");
  });

  it("requires deterministic evidence for linked guest-to-user identity", () => {
    const weak = resolveIdentityChain({
      eventId: "evt_weak",
      actorKind: "signed_in_user",
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      identityState: "linked_guest_to_user",
    });
    const linked = resolveIdentityChain({
      eventId: "evt_linked",
      actorKind: "signed_in_user",
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      linkId: "link_1",
      identityState: "linked_guest_to_user",
    });

    expect(weak.identityConfidence).toBe("inferred");
    expect(weak.countScopes).not.toContain("linked_person");
    expect(linked.identityConfidence).toBe("linked");
    expect(linked.countScopes).toEqual(expect.arrayContaining(["global", "signed_in_user", "linked_person"]));
    expect(validateIdentityChainContract()).toEqual([]);
  });
});
