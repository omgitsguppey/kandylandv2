import { describe, expect, it } from "vitest";

import { CREATOR_MESSAGE_COSTS, CREATOR_SUBSCRIPTION_MIN_GD, DEFAULT_CREATOR_SETTINGS } from "@/lib/creator-experiences";
import {
  CREATOR_MONETIZATION_DEBUG_LANE,
  CREATOR_MONETIZATION_EVENTS,
  CREATOR_MONETIZATION_USER_CONSUMERS,
  buildCreatorMonetizationContractShape,
  validateCreatorMonetizationContractShape,
} from "@/lib/creator-monetization/creator-monetization-contract";
import {
  explainCreatorMonetizationMismatch,
  resolveCreatorMonetizationSettings,
  resolveUserFacingCreatorMonetization,
  validateCreatorMonetizationUpdate,
} from "@/lib/creator-monetization/creator-monetization-resolver";
import {
  buildCreatorMonetizationSettingsTruthReport,
  classifyCreatorMonetizationSettingsDirtyFile,
  validateCreatorMonetizationSettingsTruthReport,
} from "../../scripts/agent/validate-creator-monetization-settings-truth";

describe("creator monetization settings truth", () => {
  it("defines the canonical contract fields, consumers, events, and debug lane", () => {
    const shape = buildCreatorMonetizationContractShape();

    expect(shape.requiredFields).toEqual(expect.arrayContaining([
      "creatorId",
      "fanPassEnabled",
      "fanPassPrice",
      "chatTextPriceGd",
      "chatImagePriceGd",
      "chatVideoPriceGd",
      "subscriberFreeChatEnabled",
      "gumdropExperiencesEnabled",
      "broadcastsEnabled",
      "timelineEnabled",
      "profileVisibility",
      "dropManagerEnabled",
      "sourceTruth",
      "updatedAt",
      "validation",
      "userFacingConsumers",
      "creatorFacingControls",
    ]));
    expect(shape.userFacingConsumers).toEqual(expect.arrayContaining([
      "public_creator_profile",
      "creator_profile_timeline",
      "creator_experiences_panel",
      "chat_pricing",
      "fan_pass_access",
      "broadcasts",
      "drop_manager",
    ]));
    expect(shape.telemetryEvents).toEqual(CREATOR_MONETIZATION_EVENTS);
    expect(shape.debugLane).toBe(CREATOR_MONETIZATION_DEBUG_LANE);
    expect(validateCreatorMonetizationContractShape(shape)).toEqual([]);
  });

  it("resolves one normalized source of truth for creator controls and fan-facing consumers", () => {
    const resolved = resolveCreatorMonetizationSettings({
      creatorId: "creator_1",
      rawSettings: {
        ...DEFAULT_CREATOR_SETTINGS,
        subscriptionsEnabled: true,
        subscriptionPriceGd: 900,
        messagingEnabled: true,
        chatFreeForSubscribers: true,
        customRequestsEnabled: true,
        broadcastsEnabled: true,
        profileTimelineEnabled: true,
        showBroadcastsOnTimeline: false,
      },
      rawRestrictions: {},
      settingsConfigured: true,
      updatedAt: 123,
    });

    expect(resolved).toMatchObject({
      creatorId: "creator_1",
      fanPassEnabled: true,
      fanPassPrice: 900,
      chatTextPriceGd: CREATOR_MESSAGE_COSTS.text,
      chatImagePriceGd: CREATOR_MESSAGE_COSTS.image,
      chatVideoPriceGd: CREATOR_MESSAGE_COSTS.video,
      subscriberFreeChatEnabled: true,
      gumdropExperiencesEnabled: true,
      broadcastsEnabled: true,
      timelineEnabled: true,
      profileVisibility: "public",
      dropManagerEnabled: true,
      sourceTruth: "creator_settings_doc",
      updatedAt: 123,
    });
    expect(resolved.userFacingConsumers).toEqual(expect.arrayContaining([...CREATOR_MONETIZATION_USER_CONSUMERS]));
    expect(resolved.creatorFacingControls).toEqual(expect.arrayContaining([
      "creator_settings_fan_pass",
      "creator_settings_chat",
      "creator_settings_gumdrop_experiences",
      "creator_settings_broadcasts",
      "creator_settings_timeline",
    ]));
    expect(resolved.validation.status).toBe("valid");
  });

  it("rejects invalid monetization updates without mutating payment or GumDrop math", () => {
    const invalid = validateCreatorMonetizationUpdate({
      fanPassEnabled: true,
      fanPassPrice: CREATOR_SUBSCRIPTION_MIN_GD - 1,
      chatTextPriceGd: -5,
      chatImagePriceGd: -1,
      chatVideoPriceGd: -1,
      profileVisibility: "hidden",
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.errors).toEqual(expect.arrayContaining([
      `fanPassPrice must be at least ${CREATOR_SUBSCRIPTION_MIN_GD} GD when Fan Pass is enabled.`,
      "chatTextPriceGd must be zero or greater.",
    ]));
    expect(invalid.paymentRuntimeTouched).toBe(false);
    expect(invalid.gumdropMathTouched).toBe(false);
  });

  it("projects user-facing visibility and explains mismatches", () => {
    const resolved = resolveCreatorMonetizationSettings({
      creatorId: "creator_1",
      rawSettings: {
        ...DEFAULT_CREATOR_SETTINGS,
        subscriptionsEnabled: true,
        subscriptionPriceGd: 100,
        broadcastsEnabled: false,
        profileTimelineEnabled: false,
      },
      settingsConfigured: true,
    });
    const userFacing = resolveUserFacingCreatorMonetization(resolved);

    expect(userFacing.fanPass.visible).toBe(true);
    expect(userFacing.fanPass.priceGd).toBe(CREATOR_SUBSCRIPTION_MIN_GD);
    expect(userFacing.broadcasts.visible).toBe(false);
    expect(userFacing.timeline.visible).toBe(false);
    expect(userFacing.debugLane).toBe(CREATOR_MONETIZATION_DEBUG_LANE);
    expect(explainCreatorMonetizationMismatch({
      expected: resolved,
      consumer: "chat_pricing",
      observed: { chatTextPriceGd: 999 },
    })).toContain("chat_pricing");
  });

  it("reports source-only evidence and scoped dirty files", () => {
    const report = buildCreatorMonetizationSettingsTruthReport({
      currentHead: "test-head",
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.status).toBe("pass");
    expect(report.contractStatus).toBe("pass");
    expect(report.resolverStatus).toBe("pass");
    expect(report.consumerStatus).toBe("pass");
    expect(report.telemetryStatus).toBe("pass");
    expect(report.debugVisibilityStatus).toBe("pass");
    expect(report.paymentRuntimeStatus).toBe("unchanged");
    expect(report.gumdropMathStatus).toBe("unchanged");
    expect(report.debugLane.label).toBe(CREATOR_MONETIZATION_DEBUG_LANE);
    expect(validateCreatorMonetizationSettingsTruthReport(report)).toEqual([]);
  });

  it("blocks payment and GumDrop runtime files from this settings pass", () => {
    expect(classifyCreatorMonetizationSettingsDirtyFile("src/lib/creator-monetization/creator-monetization-contract.ts")).toBe("current_source_change");
    expect(classifyCreatorMonetizationSettingsDirtyFile("scripts/agent/validate-creator-monetization-settings-truth.ts")).toBe("validator_artifact_expected");
    expect(classifyCreatorMonetizationSettingsDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");
    expect(classifyCreatorMonetizationSettingsDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");

    const report = buildCreatorMonetizationSettingsTruthReport({
      currentHead: "test-head",
      dirtyFiles: ["src/lib/gumdrop-ledger.ts"],
    });
    expect(validateCreatorMonetizationSettingsTruthReport(report)).toContain("src/lib/gumdrop-ledger.ts is unclassified for creator monetization settings truth.");
  });
});
