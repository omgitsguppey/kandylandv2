import { describe, expect, it } from "vitest";

import {
  buildAdminViewAsHeaders,
  buildAdminViewAsTelemetryPayload,
  buildSyntheticCreatorMarker,
  getSyntheticCreatorMarkerMissingFields,
  INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE,
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
      syntheticLegalEvidenceMode: INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE,
    });
  });

  it("requires internal synthetic legal evidence metadata", () => {
    expect(getSyntheticCreatorMarkerMissingFields({
      isSyntheticCreator: true,
      syntheticCreatorType: "ai_creator",
      syntheticCreatedByUid: "owner_1",
      syntheticCreatedAt: 1_714_600_000_000,
      syntheticReason: "Internal AI creator QA",
      syntheticLegalEvidenceMode: INTERNAL_SYNTHETIC_LEGAL_EVIDENCE_MODE,
    })).toEqual([]);

    expect(getSyntheticCreatorMarkerMissingFields({
      isSyntheticCreator: true,
      syntheticCreatorType: "ai_creator",
      syntheticReason: "Internal AI creator QA",
    })).toEqual(expect.arrayContaining([
      "syntheticCreatedByUid",
      "syntheticCreatedAt",
      "syntheticLegalEvidenceMode",
    ]));
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

  it("builds local-only projection telemetry with admin actor and target creator fields", () => {
    expect(buildAdminViewAsTelemetryPayload({
      actorAdminId: "admin_1",
      targetUserId: "creator_1",
      route: "/admin/roster",
      actionKey: "admin_view_as_creator_started",
      reason: "QA check",
      simulationStartedAt: 1_714_600_000_000,
    })).toMatchObject({
      actorType: "admin",
      actorAdminId: "admin_1",
      adminId: "admin_1",
      actorCreatorId: "",
      targetUserId: "creator_1",
      targetCreatorId: "creator_1",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_creator_projection",
      projectionScope: "local_only",
      includeInUserBehavior: false,
      metricEligible: false,
      metricExclusionReason: "admin_projection",
      sourceTruth: "local_projection",
    });
  });
});
