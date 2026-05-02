import { describe, expect, it } from "vitest";

import {
  buildAdminViewAsHeaders,
  buildSyntheticCreatorMarker,
  isAdminViewAsBlockedRequest,
  normalizeSyntheticCreatorType,
  parseAdminViewAsState,
} from "@/lib/admin/synthetic-creators-view-as";

describe("synthetic creators and admin view-as helpers", () => {
  it("creates synthetic creator markers with required audit fields", () => {
    expect(buildSyntheticCreatorMarker({
      syntheticCreatorType: "internal_character",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1_714_600_000_000,
      syntheticReason: "Zaylani launch QA persona",
      humanOperatorRequired: true,
    })).toMatchObject({
      isSyntheticCreator: true,
      syntheticCreatorType: "internal_character",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1_714_600_000_000,
      syntheticReason: "Zaylani launch QA persona",
      humanOperatorRequired: true,
    });
  });

  it("rejects missing synthetic reasons", () => {
    expect(() => buildSyntheticCreatorMarker({
      syntheticCreatorType: "demo_creator",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1,
      syntheticReason: "",
    })).toThrow("Synthetic creator reason is required.");
  });

  it("normalizes invalid synthetic types to test creator", () => {
    expect(normalizeSyntheticCreatorType("zaylani")).toBe("test_creator");
    expect(normalizeSyntheticCreatorType("ai_creator")).toBe("ai_creator");
  });

  it("parses view-as state without replacing the real auth identity", () => {
    const state = parseAdminViewAsState({
      adminViewingAsUserId: "creator_1",
      adminViewingAsDisplayName: "Zaylani",
      adminViewingAsRole: "creator",
      simulationStartedAt: 1_714_600_000_000,
      simulationReason: "Admin QA",
      viewAsActorUid: "admin_1",
      viewAsReturnHref: "/admin/roster?focus=creator_1",
    });

    expect(state).toMatchObject({
      adminViewingAsUserId: "creator_1",
      adminViewingAsRole: "creator",
      viewAsActorUid: "admin_1",
    });
    expect(buildAdminViewAsHeaders(state!)).toMatchObject({
      "x-admin-view-as-user-id": "creator_1",
      "x-admin-view-as-role": "creator",
      "x-admin-view-as-actor-uid": "admin_1",
    });
  });

  it("blocks purchase, wallet, unlock, and creator writes in view-as mode", () => {
    expect(isAdminViewAsBlockedRequest("/api/purchase/capture", "POST")?.reason).toContain("Purchase actions");
    expect(isAdminViewAsBlockedRequest("/api/wallet/grant", "POST")?.reason).toContain("Wallet actions");
    expect(isAdminViewAsBlockedRequest("/api/drops/unlock", "POST")?.reason).toContain("Unlock actions");
    expect(isAdminViewAsBlockedRequest("/api/creator/settings", "PUT")?.reason).toContain("Creator settings");
    expect(isAdminViewAsBlockedRequest("/api/creator/settings", "GET")).toBeNull();
  });

  it("records blocked purchase validation language", () => {
    expect(isAdminViewAsBlockedRequest("/api/paypal/capture", "POST")?.reason).toBe(
      "Payment actions are blocked while viewing as a creator.",
    );
  });
});
