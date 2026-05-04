import { describe, expect, it } from "vitest";

import {
  buildEngagementBehavioralExplanation,
  buildRecommendationBehavioralExplanation,
  buildValueBehavioralExplanation,
} from "@/lib/behavioral/behavioral-explanation";

describe("behavioral explanations", () => {
  it("shows insufficient signal when confidence is below threshold", () => {
    const explanation = buildEngagementBehavioralExplanation({
      engagement: undefined,
      behaviorRollup: {
        confidence: "insufficient",
        confidenceScore: 18,
        freshnessState: "live",
        source: "event_facts",
        sourceLabel: "analytics_event_facts",
        issues: [],
      } as any,
      truthState: "review",
    });

    expect(explanation.type).toBe("insufficient_signal");
    expect(explanation.verdict).toBe("Insufficient signal");
  });

  it("promotes tracking issues over fake recommendation confidence", () => {
    const explanation = buildRecommendationBehavioralExplanation({
      behavioralProfile: {
        confidenceScore: 0.72,
        confidenceLabel: "strong",
        freshnessLabel: "live",
        recommendationState: "profile-driven",
      },
      recommendationDebug: {
        showExplanationCards: true,
        drops: [{ dropId: "drop-1", explanationSummary: "Strong watch signal." }],
      },
      behaviorRollup: {
        confidence: "usable",
        confidenceScore: 64,
        freshnessState: "degraded",
        source: "event_facts",
        sourceLabel: "analytics_event_facts",
        issues: [{
          code: "watch_time_missing_despite_views",
          severity: "warn",
          message: "views exist but watch sessions are missing",
          evidence: {},
        }],
      } as any,
      truthState: "review",
    });

    expect(explanation.type).toBe("tracking_issue");
    expect(explanation.summary).toContain("views exist but watch sessions are missing");
  });

  it("labels fallback-only recommendations plainly", () => {
    const explanation = buildRecommendationBehavioralExplanation({
      behavioralProfile: {
        confidenceScore: 0.58,
        confidenceLabel: "usable",
        freshnessLabel: "live",
        recommendationState: "deterministic-fallback",
      },
      recommendationDebug: {
        mode: "deterministic-fallback",
        showExplanationCards: false,
      },
      behaviorRollup: {
        confidence: "usable",
        confidenceScore: 58,
        freshnessState: "live",
        source: "materialized_rollup",
        sourceLabel: "behavior_rollup",
        issues: [],
      } as any,
      truthState: "live",
    });

    expect(explanation.type).toBe("fallback_only");
    expect(explanation.summary).toContain("fallback-only");
  });

  it("keeps value verdicts spend-first and plain-English", () => {
    const explanation = buildValueBehavioralExplanation({
      value: {
        verdict: "Repeat buyer",
        valueScore: 72,
        valueTier: "repeat_buyer",
        repeatPurchaseLikelihood: 0.61,
        topReasons: [
          { code: "total_spend", label: "Total spend", contribution: 0.4, value: 99, summary: "$99 spend." },
          { code: "purchase_count", label: "Purchase count", contribution: 0.2, value: 3, summary: "3 purchases." },
        ],
      } as any,
      behaviorRollup: {
        confidence: "strong",
        confidenceScore: 82,
        freshnessState: "live",
        source: "materialized_rollup",
        sourceLabel: "behavior_rollup",
        issues: [],
      } as any,
      truthState: "live",
    });

    expect(explanation.type).toBe("spend_likely");
    expect(explanation.summary).toContain("likely to spend again");
    expect(explanation.debugFacts.some((fact) => fact.includes("Score 72/100"))).toBe(true);
  });
});
