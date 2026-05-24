import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CHAT_ADMIN_SUMMARY_METRICS,
  CHAT_TELEMETRY_EVENT_FAMILIES,
  CHAT_TRANSCRIPT_TRUTH_POLICY,
  buildChatAdminTelemetrySummaryLane,
  buildChatTelemetryEventMapping,
  validateChatTelemetryAdminTruth,
} from "@/lib/chat/chat-telemetry-contract";
import {
  buildChatTelemetryAdminTruthReport,
  validateChatTelemetryAdminTruthReport,
} from "../../scripts/agent/validate-chat-telemetry-admin-truth";

describe("chat telemetry admin transcript truth", () => {
  it("maps required chat event families into catalog, envelopes, person metrics, debug, and score coverage", () => {
    expect(CHAT_TELEMETRY_EVENT_FAMILIES.map((family) => family.eventName)).toEqual([
      "chat_surface_viewed",
      "chat_thread_list_loaded",
      "chat_thread_opened",
      "chat_compose_sheet_opened",
      "chat_creator_selected",
      "chat_message_send_attempted",
      "chat_message_sent",
      "chat_message_failed",
      "chat_message_blocked",
      "chat_attachment_upload_started",
      "chat_attachment_upload_failed",
      "chat_presence_connected",
      "chat_typing_started",
      "chat_typing_stopped",
      "chat_read_marked",
      "chat_unread_updated",
      "chat_paid_gd_gate_viewed",
      "chat_purchase_cta_clicked",
    ]);

    const mappings = CHAT_TELEMETRY_EVENT_FAMILIES.map((family) => buildChatTelemetryEventMapping(family.eventName));
    expect(mappings.every((mapping) => mapping.inTelemetryCatalog)).toBe(true);
    expect(mappings.every((mapping) => mapping.eventEnvelopeMapped)).toBe(true);
    expect(mappings.every((mapping) => mapping.adminDebugVisible)).toBe(true);
    expect(mappings.every((mapping) => mapping.scoreDimensionsAffected.length > 0)).toBe(true);
    expect(mappings.filter((mapping) => mapping.personMetricIds.includes("chat_actions")).length).toBeGreaterThan(10);
  });

  it("keeps admin summaries compact and transcript content behind guarded drilldown", () => {
    expect(CHAT_ADMIN_SUMMARY_METRICS).toEqual([
      "activeChatUsers",
      "sendAttempts",
      "successfulSends",
      "blockedSends",
      "failedSends",
      "paidGdGateViews",
      "purchaseCtaClicks",
      "attachmentAttempts",
      "moderationBlocks",
    ]);
    expect(CHAT_TRANSCRIPT_TRUTH_POLICY).toMatchObject({
      broadAdminSummaryIncludesMessageContent: false,
      transcriptDefaultOpen: false,
      drilldownRequiresPermissionGuard: true,
      sourceRoute: "src/app/api/admin/moderation/threads/[threadId]/route.ts",
    });

    expect(buildChatAdminTelemetrySummaryLane()).toMatchObject({
      label: "Chat telemetry/admin truth",
      rawMessageContentDefault: false,
      transcriptTruth: "guarded_drilldown",
      blockedFailedVisible: true,
      userLevelMetricsVisible: true,
      creatorLevelMetricsVisible: true,
    });
  });

  it("validates source wiring and fails unsafe transcript or metric gaps", () => {
    const report = buildChatTelemetryAdminTruthReport({
      chatExperienceSource: readFileSync("src/components/Chat/ChatExperience.tsx", "utf8"),
      telemetryCatalogSource: readFileSync("src/lib/telemetry-catalog.ts", "utf8"),
      normalizeEventFactSource: readFileSync("src/lib/behavioral/normalize-event-fact.ts", "utf8"),
      eventFactNormalizerSource: readFileSync("src/lib/behavioral/event-fact-normalizer.ts", "utf8"),
      personMetricsContractSource: readFileSync("src/lib/analytics/person-metrics-contract.ts", "utf8"),
      adminDebugRouteSource: readFileSync("src/app/api/admin/debug/route.ts", "utf8"),
      adminDebugSummarySource: readFileSync("src/lib/server/admin-debug/summary.ts", "utf8"),
      debugTrackingSource: readFileSync("src/lib/debug/debug-panel-tracking-summary.ts", "utf8"),
      changedFiles: [
        "agent/state/chat-telemetry-admin-truth.generated.json",
        "docs/agent-truth/chat-telemetry-admin-truth.md",
        "scripts/agent/validate-chat-telemetry-admin-truth.ts",
        "src/lib/chat/chat-telemetry-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "src/lib/behavioral/normalize-event-fact.ts",
        "src/lib/behavioral/event-fact-normalizer.ts",
        "src/lib/analytics/person-metrics-contract.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/app/api/admin/debug/route.ts",
        "src/lib/server/admin-debug/summary.ts",
        "tests/unit/chat-telemetry-admin-truth.spec.ts",
        "package.json",
      ],
      currentHead: "HEAD",
      generatedAtUtc: "2026-05-23T00:00:00.000Z",
    });

    expect(report.sourceValidation).toMatchObject({
      telemetryCatalogComplete: true,
      eventEnvelopePersonMetricMapped: true,
      adminSummaryNoRawMessageContent: true,
      transcriptTruthGuarded: true,
      blockedFailedAttemptsAdminVisible: true,
      userLevelChatMetricsVisible: true,
      creatorLevelChatMetricsVisible: true,
      scoreCoverageMapped: true,
    });
    expect(validateChatTelemetryAdminTruth(report.sourceValidation)).toEqual([]);
    expect(validateChatTelemetryAdminTruthReport(report)).toEqual([]);

    const badReport = buildChatTelemetryAdminTruthReport({
      chatExperienceSource: "",
      telemetryCatalogSource: "",
      normalizeEventFactSource: "",
      eventFactNormalizerSource: "",
      personMetricsContractSource: "",
      adminDebugRouteSource: "message.text",
      adminDebugSummarySource: "",
      debugTrackingSource: "",
      changedFiles: ["src/lib/gumdrop-ledger.ts"],
    });
    expect(validateChatTelemetryAdminTruthReport(badReport)).toEqual(expect.arrayContaining([
      "chat events are not in telemetry catalog.",
      "chat events lack event envelope/person metrics mapping.",
      "admin chat summary exposes raw message content by default.",
      "transcript tracking claims connected without source.",
      "blocked/failed attempts are not visible to admin/debug.",
      "user-level chat metrics missing.",
      "creator-level chat metrics missing.",
      "score coverage missing.",
      "dirty files are unclassified.",
    ]));
  });
});
