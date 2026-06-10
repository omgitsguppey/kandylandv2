import { describe, expect, it } from "vitest";

import {
  buildChatFunctionalityScoreLockReport,
  validateChatFunctionalityScoreLockReport,
} from "../../scripts/agent/validate-chat-functionality-score-lock";

describe("chat functionality score lock", () => {
  it("locks chat readiness across realtime, presence, gating, telemetry, admin truth, and score dimensions", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: "test-head",
      scoreBefore: {
        sourceHealth: 91.7,
        runtimeHealth: 67.25,
        evidenceCompleteness: 38.75,
        freshness: 62.86,
        costRisk: 42,
        regressionRisk: 42,
        overallHealthScore: 61.95,
      },
      scoreAfter: {
        sourceHealth: 91.7,
        runtimeHealth: 67,
        evidenceCompleteness: 38.5,
        freshness: 62.86,
        costRisk: 42,
        regressionRisk: 42,
        overallHealthScore: 61.85,
      },
      realtimeReport: {
        sourceValidation: {
          threadListenerBounded: true,
          messageListenerSelectedThreadOnly: true,
          messageListenerBounded: true,
          detachOnUnmount: true,
          detachOnThreadSwitch: true,
          hasRealtimeErrorDebugVisibility: true,
          hasNoBroadAllMessageListener: true,
          failures: [],
        },
      },
      presenceReport: {
        sourceValidation: {
          onDisconnectAttached: true,
          usesTypingController: true,
          noPerKeystrokeTypingWrites: true,
          timeoutStopsTyping: true,
          blurStopsTyping: true,
          sendStopsTyping: true,
          unmountStopsTyping: true,
          presenceErrorsDebugVisible: true,
          telemetryNotPerKeystroke: true,
          failures: [],
        },
      },
      gatingReport: {
        sourceValidation: {
          backendEnforcesPaidOnly: true,
          rejectsRewardFreeGd: true,
          doesNotTrustClientPriceOrBalance: true,
          idempotencyKeyRequired: true,
          blockedSendTelemetry: true,
          humanSafeBlockedErrors: true,
          mediaLimitsEnforcedServerSide: true,
          moderationStatusDebugVisible: true,
          gumdropMathUntouched: true,
          failures: [],
        },
      },
      telemetryReport: {
        transcriptPolicy: {
          broadAdminSummaryIncludesMessageContent: false,
          transcriptDefaultOpen: false,
          drilldownRequiresPermissionGuard: true,
          sourceRoute: "src/app/api/admin/moderation/threads/[threadId]/route.ts",
          sourceHelper: "src/lib/server/admin-moderation.ts",
        },
        eventFamilies: [
          {
            eventName: "chat_message_sent",
            inTelemetryCatalog: true,
            eventEnvelopeMapped: true,
            userLevelMetric: true,
            creatorLevelMetric: true,
            adminDebugVisible: true,
          },
          {
            eventName: "chat_message_blocked",
            inTelemetryCatalog: true,
            eventEnvelopeMapped: true,
            userLevelMetric: true,
            creatorLevelMetric: true,
            adminDebugVisible: true,
          },
        ],
        adminSummaryLane: {
          rawMessageContentIncluded: false,
          sourceState: "connected",
        },
      },
      personMetricsReport: {
        hydratedMetricCount: 34,
        lowConfidenceMetricCount: 0,
      },
      dirtyFiles: [
        "src/lib/chat/chat-telemetry-contract.ts",
        "tests/unit/chat-functionality-score-lock.spec.ts",
      ],
      oldLogicReferences: [],
    });

    expect(report.realtimePropagationStatus.status).toBe("pass");
    expect(report.listenerCostStatus.status).toBe("pass");
    expect(report.typingPresenceStatus.status).toBe("pass");
    expect(report.paidGdGatingStatus.status).toBe("pass");
    expect(report.moderationStatus.status).toBe("pass");
    expect(report.telemetryStatus.status).toBe("pass");
    expect(report.adminTruthStatus.status).toBe("pass");
    expect(report.transcriptTruthStatus.messageContentExposedByDefault).toBe(false);
    expect(report.personMetricsStatus.status).toBe("pass");
    expect(report.scoreDimensions).toHaveProperty("overallHealthScore");
    expect(validateChatFunctionalityScoreLockReport(report)).toEqual([]);
  });

  it("fails when transcript truth claims connected without a guarded source", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: "test-head",
      telemetryReport: {
        transcriptPolicy: {
          broadAdminSummaryIncludesMessageContent: false,
          transcriptDefaultOpen: false,
          drilldownRequiresPermissionGuard: false,
          sourceRoute: "",
          sourceHelper: "",
        },
        eventFamilies: [],
        adminSummaryLane: {
          rawMessageContentIncluded: false,
          sourceState: "connected",
        },
      },
    });

    expect(validateChatFunctionalityScoreLockReport(report)).toContain("transcript truth claims connected without source.");
  });

  it("rejects raw unsafe unknown chat logic classifications", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: "test-head",
      dirtyFiles: ["src/components/Support/SupportInbox.tsx"],
      oldLogicReferences: [
        {
          reference: "legacy floating chat bridge",
          classification: "unsafe_unknown",
          reason: "Regression fixture: old chat logic must use a named owner bucket.",
        },
      ] as any,
    });

    expect(report.dirtyFiles[0]?.classification).toBe("support_inbox_truth_review");
    expect(validateChatFunctionalityScoreLockReport(report)).toContain("old chat unknown/orphan logic remains active.");
  });
});
