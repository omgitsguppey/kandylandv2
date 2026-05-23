import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CHAT_GATING_DEBUG_LANE,
  CHAT_GATING_MODERATION_TELEMETRY_EVENTS,
  CHAT_GATING_STATUSES,
  CHAT_MESSAGE_PRICE_GD,
  buildChatGatingDebugLane,
  resolveChatGatingDecision,
  validateChatGatingSource,
} from "@/lib/chat/chat-gating-contract";
import {
  buildChatGatingModerationReport,
  validateChatGatingModerationReport,
} from "../../scripts/agent/validate-chat-gating-moderation";

describe("chat gating and moderation enforcement", () => {
  it("requires paid GumDrops for paid chat while preserving subscriber and creator bypasses", () => {
    const rewardOnly = resolveChatGatingDecision({
      viewerRole: "user",
      messageKind: "text",
      purchasedBalanceGd: 0,
      rewardBalanceGd: 100,
      subscriberFreeChatApplies: false,
      fanPassActive: false,
      media: null,
      threadVisible: true,
      authenticated: true,
      moderationAllowed: true,
    });

    expect(rewardOnly).toMatchObject({
      status: "blocked_insufficient_paid_gd",
      allowed: false,
      paidGdOnly: true,
      rewardGdAccepted: false,
      requiredPriceGd: CHAT_MESSAGE_PRICE_GD.text,
    });

    expect(resolveChatGatingDecision({
      viewerRole: "user",
      messageKind: "video",
      purchasedBalanceGd: 0,
      rewardBalanceGd: 0,
      subscriberFreeChatApplies: true,
      fanPassActive: true,
      media: { mimeType: "video/mp4", sizeBytes: 50 * 1024 * 1024 },
      threadVisible: true,
      authenticated: true,
      moderationAllowed: true,
    })).toMatchObject({
      status: "allowed",
      bypass: "fan_pass_subscriber",
      requiredPriceGd: 0,
    });

    expect(resolveChatGatingDecision({
      viewerRole: "creator",
      messageKind: "image",
      purchasedBalanceGd: 0,
      rewardBalanceGd: 0,
      subscriberFreeChatApplies: false,
      fanPassActive: false,
      media: { mimeType: "image/png", sizeBytes: 500_000 },
      threadVisible: true,
      authenticated: true,
      moderationAllowed: true,
    })).toMatchObject({
      status: "allowed",
      bypass: "creator_reply",
      requiredPriceGd: 0,
    });
  });

  it("classifies auth, visibility, moderation, unsupported media, and media size blocks", () => {
    expect(CHAT_GATING_STATUSES).toEqual([
      "allowed",
      "blocked_insufficient_paid_gd",
      "blocked_media_too_large",
      "blocked_unsupported_media",
      "blocked_moderation",
      "blocked_thread_visibility",
      "blocked_auth",
      "blocked_unknown",
    ]);

    expect(resolveChatGatingDecision({
      viewerRole: "user",
      messageKind: "text",
      purchasedBalanceGd: 1,
      rewardBalanceGd: 0,
      subscriberFreeChatApplies: false,
      fanPassActive: false,
      media: null,
      threadVisible: true,
      authenticated: false,
      moderationAllowed: true,
    }).status).toBe("blocked_auth");

    expect(resolveChatGatingDecision({
      viewerRole: "user",
      messageKind: "image",
      purchasedBalanceGd: 10,
      rewardBalanceGd: 0,
      subscriberFreeChatApplies: false,
      fanPassActive: false,
      media: { mimeType: "application/pdf", sizeBytes: 1000 },
      threadVisible: true,
      authenticated: true,
      moderationAllowed: true,
    }).status).toBe("blocked_unsupported_media");

    expect(resolveChatGatingDecision({
      viewerRole: "user",
      messageKind: "image",
      purchasedBalanceGd: 10,
      rewardBalanceGd: 0,
      subscriberFreeChatApplies: false,
      fanPassActive: false,
      media: { mimeType: "image/png", sizeBytes: 26 * 1024 * 1024 },
      threadVisible: true,
      authenticated: true,
      moderationAllowed: true,
    })).toMatchObject({
      status: "blocked_media_too_large",
      humanSafeErrorCode: "file_too_large_requires_fan_pass",
    });

    expect(resolveChatGatingDecision({
      viewerRole: "user",
      messageKind: "text",
      purchasedBalanceGd: 1,
      rewardBalanceGd: 0,
      subscriberFreeChatApplies: false,
      fanPassActive: false,
      media: null,
      threadVisible: true,
      authenticated: true,
      moderationAllowed: false,
    }).status).toBe("blocked_moderation");
  });

  it("registers blocked/bypass telemetry and exposes one debug lane", () => {
    expect(CHAT_GATING_MODERATION_TELEMETRY_EVENTS.map((event) => event.eventName)).toEqual([
      "chat_gating_checked",
      "chat_send_blocked",
      "chat_insufficient_paid_gd_viewed",
      "chat_purchase_cta_clicked",
      "chat_media_upload_blocked",
      "chat_moderation_blocked",
      "chat_fan_pass_bypass_applied",
      "chat_creator_reply_bypass_applied",
    ]);
    expect(CHAT_GATING_MODERATION_TELEMETRY_EVENTS.every((event) => event.identityAware)).toBe(true);
    expect(CHAT_GATING_MODERATION_TELEMETRY_EVENTS.every((event) => event.consentAware)).toBe(true);
    expect(CHAT_GATING_MODERATION_TELEMETRY_EVENTS.every((event) => event.debugVisible)).toBe(true);

    expect(CHAT_GATING_DEBUG_LANE).toBe("Chat gating/moderation");
    expect(buildChatGatingDebugLane()).toMatchObject({
      label: "Chat gating/moderation",
      sourceOfFundsTruthStatus: "purchased_only_enforced",
      backendEnforcement: true,
      uiOnlyGate: false,
      rawMessageDumpDefault: false,
    });
  });

  it("validates backend enforcement, safe errors, telemetry, debug visibility, and dirty classification", () => {
    const report = buildChatGatingModerationReport({
      chatServerSource: readFileSync("src/lib/server/chat.ts", "utf8"),
      chatRouteSource: readFileSync("src/app/api/chat/threads/[threadId]/messages/route.ts", "utf8"),
      attachmentPrepareSource: readFileSync("src/app/api/chat/attachments/prepare/route.ts", "utf8"),
      attachmentCompleteSource: readFileSync("src/app/api/chat/attachments/complete/route.ts", "utf8"),
      chatExperienceSource: readFileSync("src/components/Chat/ChatExperience.tsx", "utf8"),
      telemetryCatalogSource: readFileSync("src/lib/telemetry-catalog.ts", "utf8"),
      changedFiles: [
        "agent/state/chat-gating-moderation.generated.json",
        "docs/agent-truth/chat-gating-moderation.md",
        "scripts/agent/validate-chat-gating-moderation.ts",
        "src/lib/chat/chat-gating-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/chat-gating-moderation.spec.ts",
        "package.json",
      ],
      currentHead: "HEAD",
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
    });

    expect(report.sourceValidation).toMatchObject({
      backendEnforcesPaidOnly: true,
      rejectsRewardFreeGd: true,
      doesNotTrustClientPriceOrBalance: true,
      idempotencyKeyRequired: true,
      humanSafeBlockedErrors: true,
      mediaLimitsEnforcedServerSide: true,
      moderationStatusDebugVisible: true,
      gumdropMathUntouched: true,
    });
    expect(Object.keys(report.scoreImpactByDimension)).toEqual([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
    ]);
    expect(validateChatGatingSource(report.sourceValidation)).toEqual([]);
    expect(validateChatGatingModerationReport(report)).toEqual([]);

    const badReport = buildChatGatingModerationReport({
      chatServerSource: "const spend = totalBalance - clientPrice; rewardAmountSpent: 1;",
      chatRouteSource: "const { priceGd, balanceGd } = await request.json();",
      attachmentPrepareSource: "",
      attachmentCompleteSource: "",
      chatExperienceSource: "",
      telemetryCatalogSource: "",
      changedFiles: ["src/lib/gumdrop-ledger.ts"],
    });
    expect(validateChatGatingModerationReport(badReport)).toEqual(expect.arrayContaining([
      "paid chat can use reward/free GD.",
      "UI-only gate without backend enforcement.",
      "client can spoof price/balance.",
      "blocked send lacks telemetry.",
      "blocked send lacks human-safe error.",
      "moderation status not debug-visible.",
      "media limits not enforced.",
      "GumDrop math/source-of-funds changed.",
    ]));
  });
});
