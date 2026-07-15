import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildChatFunctionalityScoreLockReport,
  readChatFunctionalityArtifact,
  validateChatFunctionalityScoreLockReport,
} from "../../scripts/agent/validate-chat-functionality-score-lock";

const TEST_HEAD = "b".repeat(40);

function childEvidence(reportKey: string) {
  return {
    reportKey,
    generatedAtUtc: new Date().toISOString(),
    currentHead: TEST_HEAD,
    sourceCommit: TEST_HEAD,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    validationFailures: [],
  };
}

function passingChatChildren() {
  return {
    realtimeReport: {
      ...childEvidence("chat-realtime-cost-control"),
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
      ...childEvidence("chat-presence-typing"),
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
      ...childEvidence("chat-gating-moderation"),
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
      ...childEvidence("chat-telemetry-admin-truth"),
      transcriptPolicy: {
        broadAdminSummaryIncludesMessageContent: false,
        transcriptDefaultOpen: false,
        drilldownRequiresPermissionGuard: true,
        sourceRoute: "src/app/api/admin/moderation/threads/[threadId]/route.ts",
        sourceHelper: "src/lib/server/admin-moderation.ts",
      },
      eventFamilies: [
        { eventName: "chat_message_sent", inTelemetryCatalog: true, eventEnvelopeMapped: true, userLevelMetric: true, creatorLevelMetric: true, adminDebugVisible: true },
        { eventName: "chat_message_blocked", inTelemetryCatalog: true, eventEnvelopeMapped: true, userLevelMetric: true, creatorLevelMetric: true, adminDebugVisible: true },
      ],
      adminSummaryLane: {
        rawMessageContentIncluded: false,
        sourceState: "connected",
        blockedFailedVisible: true,
        userLevelMetricsVisible: true,
        creatorLevelMetricsVisible: true,
      },
    },
    personMetricsReport: {
      ...childEvidence("person-metrics-hydration"),
      debugLane: { lowConfidenceMetrics: 0 },
      metricStatus: {
        chat_actions: { metricId: "chat_actions", state: "hydrated", count: 1, confidence: "exact" },
      },
    },
  };
}

describe("chat functionality score lock", () => {
  it("locks chat readiness across realtime, presence, gating, telemetry, admin truth, and score dimensions", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
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
      ...passingChatChildren(),
      dirtyFiles: [
        "src/lib/chat/chat-telemetry-contract.ts",
        "tests/unit/chat-functionality-score-lock.spec.ts",
      ],
      oldLogicReferences: [],
    });

    expect(report.realtimePropagationStatus.status).toBe("pass");
    expect(report.status).toBe("pass");
    expect(report.passed).toBe(true);
    expect(report.sourceCommit).toBe(TEST_HEAD);
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
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
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
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
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

  it("does not let unrelated hydrated metrics or missing confidence evidence clear chat person metrics", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      personMetricsReport: {
        status: "pass",
        validationFailures: [],
        hydratedMetricCount: 34,
      },
      dirtyFiles: [],
    });

    expect(report.personMetricsStatus.status).toBe("fail");
    expect(validateChatFunctionalityScoreLockReport(report)).toContain("chat person metrics missing.");
  });

  it("does not launder failing, stale, or wrong-head child evidence through valid payload fields", () => {
    const children = passingChatChildren();
    const poison = (report: Record<string, unknown>) => ({
      ...report,
      status: "fail",
      passed: false,
      canClearSourceGate: false,
      currentHead: "d".repeat(40),
      sourceCommit: "e".repeat(40),
      generatedAtUtc: "2020-01-01T00:00:00.000Z",
      validationFailures: ["child failed"],
    });
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      realtimeReport: poison(children.realtimeReport),
      presenceReport: poison(children.presenceReport),
      gatingReport: poison(children.gatingReport),
      telemetryReport: poison(children.telemetryReport),
      personMetricsReport: poison(children.personMetricsReport),
      dirtyFiles: [],
      oldLogicReferences: [],
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.canClearSourceGate).toBe(false);
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "chat-realtime-cost-control child currentHead must match the current full Git SHA.",
      "chat-realtime-cost-control child sourceCommit must match currentHead.",
      "chat-realtime-cost-control child status must be pass.",
      "chat-realtime-cost-control child validationFailures must be an explicit empty array.",
      "chat-realtime-cost-control child canClearSourceGate must be true.",
      "person-metrics-hydration child generatedAtUtc must be non-future and fresh within 86400000ms.",
    ]));
  });

  it("treats a malformed child artifact as missing instead of preserving a stale passing parent", () => {
    const root = mkdtempSync(join(tmpdir(), "kandydrops-chat-child-"));
    const path = join(root, "malformed-child.json");
    try {
      writeFileSync(path, "{ interrupted write");
      expect(readChatFunctionalityArtifact(path)).toBeNull();
      const report = buildChatFunctionalityScoreLockReport({
        ...passingChatChildren(),
        currentHead: TEST_HEAD,
        generatedAtUtc: new Date().toISOString(),
        realtimeReport: readChatFunctionalityArtifact(path) ?? {},
        dirtyFiles: [],
        oldLogicReferences: [],
      });
      expect(report.status).toBe("fail");
      expect(report.canClearSourceGate).toBe(false);
      expect(report.validationFailures).toContain("chat-realtime-cost-control child reportKey must be chat-realtime-cost-control.");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("requires realtime, listener-cost, and typing sublanes to explicitly pass", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      realtimeReport: { sourceValidation: {} },
      presenceReport: { sourceValidation: {} },
      dirtyFiles: [],
    });
    const failures = validateChatFunctionalityScoreLockReport(report);

    expect(report.realtimePropagationStatus.status).toBe("fail");
    expect(report.listenerCostStatus.status).toBe("fail");
    expect(report.typingPresenceStatus.status).toBe("fail");
    expect(failures).toContain("realtime status missing.");
    expect(failures).toContain("listener cost status missing.");
    expect(failures).toContain("typing/presence status missing.");
  });

  it("requires all admin truth visibility claims to be explicitly true", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      telemetryReport: {
        adminSummaryLane: {
          rawMessageContentIncluded: false,
          sourceState: "connected",
        },
      },
      dirtyFiles: [],
    });

    expect(report.adminTruthStatus.status).toBe("fail");
    expect(validateChatFunctionalityScoreLockReport(report)).toContain("admin truth missing.");
  });

  it("fails closed on placeholder or stale provenance", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: "test-head",
      generatedAtUtc: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      dirtyFiles: [],
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.validationFailures).toContain("currentHead and sourceCommit must be the same full 40-character Git SHA.");
    expect(report.validationFailures).toContain("generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.");

    const futureDated = {
      ...report,
      currentHead: TEST_HEAD,
      sourceCommit: TEST_HEAD,
      generatedAtUtc: new Date(Date.now() + 60_000).toISOString(),
      status: "pass" as const,
      passed: true,
      validationFailures: [],
    };
    expect(validateChatFunctionalityScoreLockReport(futureDated)).toContain("generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.");
  });

  it("rejects contradictory top-level verdicts and validation failures", () => {
    const report = buildChatFunctionalityScoreLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      dirtyFiles: [],
    });
    const contradictory = {
      ...report,
      status: "pass" as const,
      passed: true,
      validationFailures: ["injected failure"],
    };

    expect(validateChatFunctionalityScoreLockReport(contradictory)).toContain("validator status cannot pass while validation failures are present.");
    expect(validateChatFunctionalityScoreLockReport({ ...report, sourceCommit: "d".repeat(40) })).toContain("currentHead and sourceCommit must be the same full 40-character Git SHA.");
  });
});
