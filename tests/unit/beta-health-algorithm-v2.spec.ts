import { describe, expect, it } from "vitest";

import {
  resolveEvidenceQuality,
  scoreCostReadiness,
  scoreRegressionRisk,
} from "@/lib/agent-score/evidence-quality";

const now = "2026-05-19T12:00:00.000Z";

describe("beta health algorithm v2 evidence quality", () => {
  it("gives fresh formal passed evidence high credit", () => {
    const quality = resolveEvidenceQuality({
      artifact: {
        path: "agent/state/provider-smoke-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Formal provider smoke passed.",
        evidence: ["formal_provider_smoke_passed"],
        generatedAtUtc: now,
        sourceCommit: "head",
      },
      context: {
        currentHead: "head",
        lane: "provider_smoke",
        requiredForExit: true,
        nowUtc: now,
      },
    });

    expect(quality.quality).toBe("formal_passed");
    expect(quality.confidence).toBeGreaterThanOrEqual(0.95);
    expect(quality.partialCredit).toBe(1);
    expect(quality.blocksLaunch).toBe(false);
  });

  it("gives source-ready evidence source credit without runtime proof", () => {
    const quality = resolveEvidenceQuality({
      artifact: {
        path: "agent/state/runtime-watch-time-v2.generated.json",
        status: "source_ready_runtime_proof_required",
        passed: true,
        detail: "Source model is ready; deployed playback evidence is still required.",
        evidence: ["runtime_watch_time_v2_source_ready"],
        generatedAtUtc: now,
        sourceCommit: "head",
      },
      context: {
        currentHead: "head",
        lane: "runtime_smoke",
        requiredForExit: true,
        requiresRuntimeProof: true,
        nowUtc: now,
      },
    });

    expect(quality.quality).toBe("source_ready");
    expect(quality.partialCredit).toBeGreaterThan(0);
    expect(quality.partialCredit).toBeLessThan(0.7);
    expect(quality.blocksLaunch).toBe(true);
    expect(quality.reason).toContain("deployed runtime route evidence");
  });

  it("keeps operator-reported provider smoke low confidence and launch-blocking", () => {
    const quality = resolveEvidenceQuality({
      artifact: {
        path: "agent/state/provider-smoke-evidence.generated.json",
        status: "operator_reported_not_formal_provider_smoke",
        passed: false,
        detail: "Operator report exists but no formal artifact is attached.",
        evidence: ["paypalRefillSmoke.status=operator_reported_not_formal_provider_smoke"],
      },
      context: {
        currentHead: "head",
        lane: "provider_smoke",
        requiredForExit: true,
        nowUtc: now,
      },
    });

    expect(quality.quality).toBe("operator_reported");
    expect(quality.confidence).toBeLessThan(0.3);
    expect(quality.partialCredit).toBeLessThan(0.3);
    expect(quality.blocksLaunch).toBe(true);
  });

  it("decays stale evidence instead of treating it as fresh", () => {
    const quality = resolveEvidenceQuality({
      artifact: {
        path: "agent/state/manual-smoke-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Old manual smoke evidence.",
        evidence: ["manualSmoke=passed"],
        generatedAtUtc: "2026-05-17T00:00:00.000Z",
        sourceCommit: "head",
      },
      context: {
        currentHead: "head",
        lane: "manual_smoke",
        requiredForExit: true,
        nowUtc: now,
        freshnessWindowHours: 24,
      },
    });

    expect(quality.freshness).toBe("stale");
    expect(quality.freshnessScore).toBeGreaterThan(0);
    expect(quality.freshnessScore).toBeLessThan(1);
    expect(quality.partialCredit).toBeLessThan(1);
  });

  it("scores owner-review cost lanes as partial risk, not pass", () => {
    const score = scoreCostReadiness({
      cloudRunCostReadiness: {
        status: "cost_review_required",
        detail: "Cloud Run owner review remains.",
        evidence: ["cloudRun=owner_review"],
        blocksBetaExit: false,
      },
      cloudSqlCostReadiness: {
        status: "not_detected_in_repo",
        detail: "Runtime SQL not detected; external billing needs owner review.",
        evidence: ["cloudSqlRuntime=not_detected_in_repo", "externalBillingObserved=true"],
        blocksBetaExit: false,
      },
      geminiCloudAssistCostReadiness: {
        status: "owner_review",
        detail: "Gemini billing lane needs owner review.",
        evidence: ["gemini=owner_review"],
        blocksBetaExit: false,
      },
      route4xxReadiness: {
        status: "source_inventory_complete",
        detail: "Source inventory exists.",
        evidence: ["route4xx=source_inventory_complete"],
        blocksBetaExit: false,
      },
    });

    expect(score.score).toBeGreaterThan(0);
    expect(score.score).toBeLessThan(100);
    expect(score.ownerReviewRequired).toBe(true);
    expect(score.blocksLaunch).toBe(false);
  });

  it("lets blocked cost lanes block launch", () => {
    const score = scoreCostReadiness({
      cloudRunCostReadiness: {
        status: "blocked",
        detail: "Cloud Run cost lane is blocked.",
        evidence: ["blocked"],
        blocksBetaExit: true,
      },
      cloudSqlCostReadiness: {
        status: "source_inventory_complete",
        detail: "SQL source inventory complete.",
        evidence: ["complete"],
        blocksBetaExit: false,
      },
      geminiCloudAssistCostReadiness: {
        status: "source_inventory_complete",
        detail: "AI source inventory complete.",
        evidence: ["complete"],
        blocksBetaExit: false,
      },
      route4xxReadiness: {
        status: "source_inventory_complete",
        detail: "Route 4xx source inventory complete.",
        evidence: ["complete"],
        blocksBetaExit: false,
      },
    });

    expect(score.blocksLaunch).toBe(true);
    expect(score.score).toBeLessThan(80);
  });

  it("penalizes regression risk for reports generated before the latest code changes", () => {
    const score = scoreRegressionRisk({
      requiredReports: [{
        path: "agent/state/public-beta-score.generated.json",
        sourceCommit: "old",
        currentHead: "head",
        freshness: "fresh",
      }],
      runtimeCodeChangedSinceReport: false,
    });

    expect(score.score).toBeLessThan(100);
    expect(score.reasons.join("\n")).toContain("latest code changes");
    expect(score.reasons.join("\n")).not.toContain("current HEAD");
  });
});
