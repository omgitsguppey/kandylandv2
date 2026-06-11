import { describe, expect, it } from "vitest";

import {
  buildPublicBetaScoreReport,
  type PublicBetaEvidenceInput,
} from "@/lib/agent-score/core";
import { buildPublicBetaCommandBudget } from "@/lib/agent-score/reporting";

const freshRequiredReports: PublicBetaEvidenceInput["requiredReports"] = [{
  path: "agent/state/source-truth-authority-map.generated.json",
  generatedAt: new Date().toISOString(),
  freshness: "fresh",
  sourceCommit: "head",
  currentHead: "head",
}];

const freshGeneratedAtUtc = new Date().toISOString();

const formalPassedEvidence = {
  targetedBehaviorEvidence: {
    path: "agent/state/targeted-behavior-evidence.generated.json",
    status: "passed",
    passed: true,
    detail: "Targeted behavior validators passed.",
    evidence: ["targetedBehavior.status=passed"],
    generatedAtUtc: freshGeneratedAtUtc,
    sourceCommit: "head",
  },
  visualManualEvidence: {
    path: "agent/state/manual-smoke-evidence.generated.json",
    status: "passed",
    passed: true,
    detail: "Formal manual visual evidence attached.",
    evidence: ["manualSmoke=passed"],
    generatedAtUtc: freshGeneratedAtUtc,
    sourceCommit: "head",
  },
  providerSmokeEvidence: {
    path: "agent/state/provider-smoke-evidence.generated.json",
    status: "passed",
    passed: true,
    detail: "Formal provider smoke passed.",
    evidence: ["formal_provider_smoke_passed"],
    generatedAtUtc: freshGeneratedAtUtc,
    sourceCommit: "head",
  },
  runtimeSmokeEvidence: {
    path: "agent/state/runtime-smoke-evidence.generated.json",
    status: "passed",
    passed: true,
    detail: "Formal runtime smoke passed.",
    evidence: ["formal_runtime_smoke_passed"],
    generatedAtUtc: freshGeneratedAtUtc,
    sourceCommit: "head",
  },
  sourceBackedRuntimeConfidenceEvidence: {
    path: "agent/state/source-backed-runtime-confidence.generated.json",
    status: "source_ready_runtime_confidence",
    passed: true,
    detail: "Source-backed runtime confidence is current.",
    evidence: ["sourceBackedRuntimeConfidence=100"],
    generatedAtUtc: freshGeneratedAtUtc,
    sourceCommit: "head",
  },
  adminTruthSampleEvidence: {
    path: "agent/state/admin-truth-sample-evidence.generated.json",
    status: "passed",
    passed: true,
    detail: "Fresh admin truth sample attached.",
    evidence: ["formal_admin_truth_sample_passed", "sampleCount=1"],
    generatedAtUtc: freshGeneratedAtUtc,
    sourceCommit: "head",
  },
  behaviorMathEvidence: {
    path: "agent/state/behavior-math-verification.generated.json",
    status: "source_ready_behavior_math",
    passed: true,
    detail: "Behavior math source evidence is current.",
    evidence: ["source_ready_behavior_math"],
    generatedAtUtc: freshGeneratedAtUtc,
    sourceCommit: "head",
  },
};

function buildReport(evidence: PublicBetaEvidenceInput = {}) {
  return buildPublicBetaScoreReport([], {
    generatedAt: "2026-05-19T12:00:00.000Z",
    currentHead: "head",
    commandBudget: buildPublicBetaCommandBudget(),
    evidence: {
      requiredReports: freshRequiredReports,
      debugEvidence: {
        layout: [{
          id: "debug-1",
          fingerprint: "debug-1",
          source: "audit",
          severity: "info",
          category: "layout",
          message: "sample",
          humanMessage: "sample",
          occurrenceCount: 1,
          firstSeenAt: Date.now(),
          lastSeenAt: Date.now(),
        }],
      },
      openPrTriageFresh: true,
      costReadiness: {
        cloudRunCostReadiness: {
          status: "cost_review_required",
          detail: "Cloud Run owner review remains.",
          evidence: ["cloudRun=owner_review"],
          blocksBetaExit: false,
        },
        cloudSqlCostReadiness: {
          status: "not_detected_in_repo",
          detail: "SQL runtime not detected, external billing needs owner review.",
          evidence: ["cloudSqlRuntime=not_detected_in_repo", "externalBillingObserved=true"],
          blocksBetaExit: false,
        },
        geminiCloudAssistCostReadiness: {
          status: "owner_review",
          detail: "Gemini owner review remains.",
          evidence: ["gemini=owner_review"],
          blocksBetaExit: false,
        },
        route4xxReadiness: {
          status: "source_inventory_complete",
          detail: "Route 4xx source inventory complete.",
          evidence: ["route4xx=source_inventory_complete"],
          blocksBetaExit: false,
        },
      },
      ...evidence,
    },
  });
}

describe("public beta score v2 health model", () => {
  it("keeps backward compatible fields while exposing health dimensions", () => {
    const report = buildReport();

    expect(report.scoreVersion).toBe("beta_health_v2");
    expect(typeof report.overallScore).toBe("number");
    expect(typeof report.evidenceScore).toBe("number");
    expect(typeof report.readinessStatus).toBe("string");
    expect(Array.isArray(report.evidenceGates)).toBe(true);
    expect(report.sourceHealthScore).toBeGreaterThan(0);
    expect(report.runtimeHealthScore).toBeGreaterThanOrEqual(0);
    expect(report.evidenceCompletenessScore).toBeGreaterThanOrEqual(0);
    expect(report.freshnessScore).toBeGreaterThanOrEqual(0);
    expect(report.costRiskScore).toBeGreaterThanOrEqual(0);
    expect(report.regressionRiskScore).toBeGreaterThanOrEqual(0);
    expect(report.healthScore).toBeGreaterThanOrEqual(0);
  });

  it("lets source health survive missing provider evidence while launch remains blocked", () => {
    const report = buildReport({
      targetedBehaviorEvidence: {
        path: "agent/state/targeted-behavior-evidence.generated.json",
        status: "source_ready",
        passed: true,
        detail: "Source validators passed; runtime proof remains separate.",
        evidence: ["source_ready"],
        generatedAtUtc: "2026-05-19T12:00:00.000Z",
        sourceCommit: "head",
      },
      providerSmokeEvidence: {
        path: "agent/state/provider-smoke-evidence.generated.json",
        status: "missing_formal_evidence",
        passed: false,
        detail: "Formal provider smoke missing.",
        evidence: ["providerArtifactStatus=missing_formal_evidence"],
      },
    });

    expect(report.sourceHealthScore).toBeGreaterThan(70);
    expect(report.runtimeHealthScore).toBeLessThan(report.sourceHealthScore);
    expect(report.launchGateStatus).not.toBe("launch_ready");
    expect(report.launchBlockers.join("\n")).toContain("Runtime/provider smoke");
    expect(report.overallScore).toBeGreaterThan(report.evidenceScore);
  });

  it("requires manual, provider, runtime, and admin truth before launch ready", () => {
    const report = buildReport(formalPassedEvidence);

    expect(report.readinessStatus).toBe("Ready");
    expect(report.launchGateStatus).toBe("launch_ready");
    expect(report.launchBlockers).toEqual([]);
  });

  it("keeps source-ready runtime watch evidence out of runtime-proven status", () => {
    const report = buildReport({
      ...formalPassedEvidence,
      runtimeSmokeEvidence: {
        path: "agent/state/runtime-watch-time-v2.generated.json",
        status: "source_ready_runtime_proof_required",
        passed: true,
        detail: "Runtime watch source-ready but deployed playback proof is missing.",
        evidence: ["runtime_watch_time_v2_source_ready"],
        generatedAtUtc: "2026-05-19T12:00:00.000Z",
        sourceCommit: "head",
      },
    });

    expect(report.launchGateStatus).not.toBe("launch_ready");
    expect(report.runtimeHealthScore).toBeLessThan(100);
    expect(report.launchBlockers.join("\n")).toContain("Runtime/provider smoke");
  });

  it("penalizes stale source reports through freshness and regression dimensions", () => {
    const report = buildReport({
      ...formalPassedEvidence,
      requiredReports: [{
        path: "agent/state/source-truth-authority-map.generated.json",
        generatedAt: "2026-05-17T00:00:00.000Z",
        freshness: "stale",
        ageHours: 60,
        sourceCommit: "old",
        currentHead: "head",
      }],
      runtimeCodeChangedSinceReport: true,
    });

    expect(report.freshnessScore).toBeLessThan(100);
    expect(report.regressionRiskScore).toBeLessThan(100);
    expect(report.launchGateStatus).not.toBe("launch_ready");
    expect(report.nuancedScoreExplanation.join("\n")).not.toMatch(/\bHEAD\b|sourceCommit mismatch/u);
    expect(report.healthScoreBreakdown.regressionRisk.reasons.join("\n")).toContain("latest code changes");
  });

  it("still auto-fails critical scanner findings", () => {
    const report = buildPublicBetaScoreReport([{
      domain: "contentProtection",
      category: "content-leak",
      title: "Locked content leaks",
      severity: "critical",
      confidence: 0.99,
      blastRadius: "content",
      filePath: "src/components/Drops/LockedDropPreviewView.tsx",
      canAutofix: false,
      autofixConfidence: 0,
      escalation: "Stop and fix.",
      evidence: ["contentUrl exposed"],
      docsBasis: ["repo"],
    }], {
      generatedAt: "2026-05-19T12:00:00.000Z",
      currentHead: "head",
      commandBudget: buildPublicBetaCommandBudget(),
      evidence: {
        requiredReports: freshRequiredReports,
        ...formalPassedEvidence,
      },
    });

    expect(report.overallStatus).toBe("fail");
    expect(report.launchGateStatus).toBe("blocked");
    expect(report.launchBlockers.join("\n")).toContain("critical scanner");
  });

  it("records v2 fields on every evidence gate", () => {
    const report = buildReport();

    for (const gate of report.evidenceGates) {
      expect(gate.maxScore).toBeGreaterThanOrEqual(gate.score);
      expect(["high", "medium", "low", "none"]).toContain(gate.confidence);
      expect(typeof gate.evidenceQuality).toBe("string");
      expect(typeof gate.freshness).toBe("string");
      expect(typeof gate.sourceCredit).toBe("number");
      expect(typeof gate.runtimeCredit).toBe("number");
      expect(typeof gate.evidenceCredit).toBe("number");
      expect(typeof gate.riskPenalty).toBe("number");
      expect(typeof gate.capImpact).toBe("number");
      expect(typeof gate.gateRequiredForExit).toBe("boolean");
      expect(typeof gate.blocksLaunch).toBe("boolean");
    }
  });
});
