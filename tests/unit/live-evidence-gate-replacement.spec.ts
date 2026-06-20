import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { buildReleaseReadinessContext } from "@/lib/release-readiness/final-release-readiness";
import {
  buildLiveEvidenceGateReplacementReport,
  resolveLiveEvidenceForGate,
  validateLiveEvidenceGateReplacementReport,
} from "@/lib/release-readiness/live-evidence-resolver";

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), "kandydrops-live-evidence-"));
  mkdirSync(join(root, "agent/state"), { recursive: true });
  mkdirSync(join(root, "agent/evidence/live-runtime-activity"), { recursive: true });
  return root;
}

function writeJson(root: string, relativePath: string, value: unknown) {
  const fullPath = join(root, relativePath);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

describe("live evidence gate replacement", () => {
  it("splits broad manual gates without turning source-only evidence into live proof", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
      publicBetaScore: {
        healthScore: 85.34,
        sourceHealthScore: 100,
        runtimeHealthScore: 84.2,
        evidenceCompletenessScore: 84.6,
        freshnessScore: 91.88,
        costRiskScore: 42,
        regressionRiskScore: 86,
      },
      currentBetaExitStatus: { summary: { canStartBetaExitReview: false } },
    });
    const report = buildLiveEvidenceGateReplacementReport(context);

    expect(report.betaExitReadyAfter).toBe(false);
    expect(report.broadManualGatesAfter).not.toContain("manual production smoke");
    expect(report.broadManualGatesAfter).not.toContain("visual-only operator QA");
    expect(report.visualOnlyManualGatesRemaining).toEqual([]);
    expect(report.externalProviderGatesRemaining.length).toBe(1);
    expect(report.externalBillingGatesRemaining.length).toBe(1);
    expect(report.liveEvidenceBySystem.every((system) => system.freshnessWindowHours > 0)).toBe(true);
    expect(report.liveEvidenceBySystem.every((system) => system.privacyRedactionPolicy.length > 0)).toBe(true);
    expect(report.liveEvidenceBySystem.some((system) => system.status === "source_only_evidence" || system.status === "source_missing_live_evidence")).toBe(true);
    expect(validateLiveEvidenceGateReplacementReport(report)).toEqual([]);
  });

  it("fails if visual QA is allowed to prove backend behavior", () => {
    const context = buildReleaseReadinessContext(process.cwd(), { currentHead: "head", openPrs: [], artifacts: [], dirtyFiles: [] });
    const report = buildLiveEvidenceGateReplacementReport(context);
    report.visualOnlyManualGatesRemaining.push({
      gate: "legacy visual gate",
      beforeClass: "broad_manual",
      afterClass: "visual_operator_evidence",
      status: "visual_only_manual",
      replacement: "visual QA proves backend runtime payment behavior",
      reason: "legacy test fixture",
      blocksBetaExit: false,
    } as never);

    expect(validateLiveEvidenceGateReplacementReport(report)).toContain("visual QA claims to prove backend/runtime/payment behavior.");
  });

  it("counts privacy-safe recent aggregate activity as aggregate live evidence without exact user proof", () => {
    const root = tempRoot();
    writeJson(root, "agent/evidence/live-runtime-activity/recent-activity.export.json", {
      reportKey: "live-runtime-activity-export",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      sourceWindow: {
        fromUtc: "2026-05-31T00:00:00.000Z",
        toUtc: "2026-05-31T12:00:00.000Z",
      },
      privacy: {
        piiRedacted: true,
        aggregateOnly: true,
        rawProviderIdsExcluded: true,
        rawPaymentDataExcluded: true,
      },
      activity: [
        {
          eventName: "drop_preview_opened",
          count: 18,
          lastSeenAtUtc: "2026-05-31T11:45:00.000Z",
          source: "analytics_event_facts",
          identityScope: "anonymous_aggregate",
          identityConfidence: "weak",
          countsGlobal: true,
          countsForExactUser: false,
        },
      ],
    });

    const decision = resolveLiveEvidenceForGate({
      root,
      currentHead: "head",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      systemId: "drops_open_unlock_unwrap_watch",
    });

    expect(decision.liveRuntimeEvidenceStatus).toBe("aggregate_activity_confirmed");
    expect(decision.status).toBe("live_evidence_replaced");
    expect(decision.betaExitImpact).toBe("can_clear_live_gate");
    expect(decision.confidence).not.toBe("exact");
    expect(decision.evidenceSources.some((source) =>
      source.artifactPath === "agent/evidence/live-runtime-activity/recent-activity.export.json"
      && source.clearsLiveGate,
    )).toBe(true);
  });

  it("counts linked recent activity as live evidence without relying on generic aggregate proof", () => {
    const root = tempRoot();
    writeJson(root, "agent/evidence/live-runtime-activity/recent-activity.export.json", {
      reportKey: "live-runtime-activity-export",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      sourceWindow: {
        fromUtc: "2026-05-31T00:00:00.000Z",
        toUtc: "2026-05-31T12:00:00.000Z",
      },
      privacy: {
        piiRedacted: true,
        aggregateOnly: true,
        rawProviderIdsExcluded: true,
        rawPaymentDataExcluded: true,
      },
      activity: [
        {
          eventName: "creator_profile_viewed",
          count: 4,
          lastSeenAtUtc: "2026-05-31T11:50:00.000Z",
          source: "analytics_event_facts",
          identityScope: "linked_person",
          identityConfidence: "linked",
          countsGlobal: true,
          countsForExactUser: false,
        },
      ],
    });

    const decision = resolveLiveEvidenceForGate({
      root,
      currentHead: "head",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      systemId: "creator_profile_discovery_follow",
    });

    expect(decision.liveRuntimeEvidenceStatus).toBe("live_activity_confirmed");
    expect(decision.status).toBe("live_evidence_replaced");
    expect(decision.confidence).toBe("linked");
  });

  it("keeps source-ready lanes waiting when no recent activity artifact exists", () => {
    const root = tempRoot();
    writeJson(root, "agent/state/event-liveness-audit.generated.json", {
      reportKey: "event-liveness-audit",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      currentHead: "head",
      observedRecentlyCount: 0,
      classifications: [
        {
          eventName: "drop_preview_opened",
          livenessStatus: "source_ready_waiting_for_activity",
          expectedTrafficClass: "occasional",
        },
      ],
    });

    const decision = resolveLiveEvidenceForGate({
      root,
      currentHead: "head",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      systemId: "drops_open_unlock_unwrap_watch",
    });

    expect(decision.liveRuntimeEvidenceStatus).toBe("source_ready_waiting_for_activity");
    expect(decision.status).toBe("source_only_evidence");
    expect(decision.betaExitImpact).toBe("source_confidence_only");
  });

  it("keeps future-only quiet lanes from blocking live evidence", () => {
    const root = tempRoot();
    writeJson(root, "agent/state/event-liveness-audit.generated.json", {
      reportKey: "event-liveness-audit",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      currentHead: "head",
      classifications: [
        {
          eventName: "search_performed",
          livenessStatus: "future_only_quiet",
          expectedTrafficClass: "future_only",
        },
      ],
    });

    const decision = resolveLiveEvidenceForGate({
      root,
      currentHead: "head",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      systemId: "search_discovery",
    });

    expect(decision.liveRuntimeEvidenceStatus).toBe("future_only_quiet");
    expect(decision.betaExitImpact).toBe("source_confidence_only");
    expect(validateLiveEvidenceGateReplacementReport({
      ...buildLiveEvidenceGateReplacementReport(buildReleaseReadinessContext(process.cwd(), { currentHead: "head", openPrs: [], artifacts: [], dirtyFiles: [] }), root),
      validationFailures: [],
    })).toEqual([]);
  });

  it("does not let generic user activity satisfy provider, admin, billing, or visual proof", () => {
    const root = tempRoot();
    writeJson(root, "agent/evidence/live-runtime-activity/recent-activity.export.json", {
      reportKey: "live-runtime-activity-export",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      sourceWindow: {
        fromUtc: "2026-05-31T00:00:00.000Z",
        toUtc: "2026-05-31T12:00:00.000Z",
      },
      privacy: {
        piiRedacted: true,
        aggregateOnly: true,
        rawProviderIdsExcluded: true,
        rawPaymentDataExcluded: true,
      },
      activity: [
        {
          eventName: "page_viewed",
          count: 100,
          lastSeenAtUtc: "2026-05-31T11:55:00.000Z",
          source: "analytics_event_facts",
          identityScope: "anonymous_aggregate",
          identityConfidence: "weak",
          countsGlobal: true,
          countsForExactUser: false,
        },
      ],
    });

    expect(resolveLiveEvidenceForGate({
      root,
      currentHead: "head",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      systemId: "wallet_payment_gumdrop_ledger",
    }).liveRuntimeEvidenceStatus).toBe("provider_required");
    expect(resolveLiveEvidenceForGate({
      root,
      currentHead: "head",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      systemId: "admin_debug_user_management",
    }).liveRuntimeEvidenceStatus).toBe("admin_truth_source_required");
    expect(resolveLiveEvidenceForGate({
      root,
      currentHead: "head",
      generatedAtUtc: "2026-05-31T12:00:00.000Z",
      systemId: "cost_runtime_4xx_summaries",
    }).liveRuntimeEvidenceStatus).toBe("billing_required");
  });
});
