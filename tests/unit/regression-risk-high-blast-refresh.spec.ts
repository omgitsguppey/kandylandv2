import { describe, expect, it } from "vitest";

import {
  buildRegressionRiskRefreshPlan,
  validateRegressionRiskRefreshPlan,
  type RegressionRiskLaneResult,
} from "../../src/lib/agent-score/regression-risk-refresh-plan";

const currentHead = "abc123";

function lane(id: string, status: RegressionRiskLaneResult["status"] = "pass"): RegressionRiskLaneResult {
  return {
    laneId: id,
    command: `npm run check:${id}`,
    artifactPath: `agent/state/${id}.generated.json`,
    status,
    currentHead: status === "pass" ? currentHead : undefined,
    sourceCommit: status === "pass" ? currentHead : undefined,
    generatedAtUtc: "2026-05-24T06:00:00.000Z",
    scoreDimensionsAffected: ["regressionRisk"],
    nextAction: status === "pass" ? "Keep this validator in the high-blast refresh set." : "Refresh this validator.",
  };
}

describe("regression risk high-blast refresh", () => {
  it("treats current high-blast validator coverage as fresh regression evidence", () => {
    const report = buildRegressionRiskRefreshPlan({
      generatedAtUtc: "2026-05-24T06:00:00.000Z",
      currentHead,
      scoreBefore: {
        sourceHealth: 91.7,
        runtimeHealth: 84.2,
        evidenceCompleteness: 69.6,
        freshness: 75.63,
        costRisk: 80.5,
        regressionRisk: 18,
        overallHealthScore: 74.88,
      },
      laneResults: [
        lane("event-translation-bridge"),
        lane("person-metrics-hydration"),
        lane("debug-signal-grouping"),
        lane("chat-functionality-score-lock"),
        lane("daily-task-debug-score-lock"),
        lane("settings-connection-parity"),
        lane("wallet-modal-telemetry-cleanup"),
        lane("user-management-refactor"),
        lane("formal-evidence-bridge"),
        lane("cost-risk-owner-review-closure"),
        lane("event-liveness-audit"),
      ],
      dirtyFiles: [],
      previousTargetedBehaviorEvidence: {
        currentHead: "old",
        status: "passed",
      },
    });

    expect(report.highBlastCoverageCurrent).toBe(true);
    expect(report.staleTargetedBehaviorEvidenceRetired).toBe(true);
    expect(report.scoreAfter.regressionRisk).toBeGreaterThanOrEqual(80);
    expect(validateRegressionRiskRefreshPlan(report)).toEqual([]);
  });

  it("keeps in-flight lanes separate from failed stale evidence", () => {
    const report = buildRegressionRiskRefreshPlan({
      generatedAtUtc: "2026-05-24T06:00:00.000Z",
      currentHead,
      scoreBefore: {
        sourceHealth: 91.7,
        runtimeHealth: 84.2,
        evidenceCompleteness: 69.6,
        freshness: 75.63,
        costRisk: 80.5,
        regressionRisk: 18,
        overallHealthScore: 74.88,
      },
      laneResults: [
        lane("event-liveness-audit", "in_flight"),
        lane("event-translation-bridge"),
        lane("person-metrics-hydration"),
        lane("debug-signal-grouping"),
        lane("chat-functionality-score-lock"),
        lane("daily-task-debug-score-lock"),
        lane("settings-connection-parity"),
        lane("wallet-modal-telemetry-cleanup"),
        lane("user-management-refactor"),
        lane("formal-evidence-bridge"),
        lane("cost-risk-owner-review-closure"),
      ],
      dirtyFiles: ["src/lib/analytics/event-liveness-engine.ts"],
      previousTargetedBehaviorEvidence: {
        currentHead: "old",
        status: "passed",
      },
    });

    expect(report.inFlightLanes.map((entry) => entry.laneId)).toContain("event-liveness-audit");
    expect(report.failedLanes).toHaveLength(0);
    expect(validateRegressionRiskRefreshPlan(report)).toEqual([]);
  });

  it("fails validation when a high-blast lane lacks current evidence", () => {
    const report = buildRegressionRiskRefreshPlan({
      generatedAtUtc: "2026-05-24T06:00:00.000Z",
      currentHead,
      scoreBefore: {
        sourceHealth: 91.7,
        runtimeHealth: 84.2,
        evidenceCompleteness: 69.6,
        freshness: 75.63,
        costRisk: 80.5,
        regressionRisk: 18,
        overallHealthScore: 74.88,
      },
      laneResults: [lane("event-translation-bridge", "stale")],
      dirtyFiles: [],
      previousTargetedBehaviorEvidence: {
        currentHead: "old",
        status: "passed",
      },
    });

    expect(validateRegressionRiskRefreshPlan(report)).toContain("high-blast lane person-metrics-hydration lacks current validator result.");
  });
});
