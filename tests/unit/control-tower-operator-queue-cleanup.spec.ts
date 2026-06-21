import { describe, expect, it } from "vitest";

import { buildControlTowerOperatorQueueCleanupReport } from "../../scripts/agent/control-tower-cleanup-shared";

describe("control tower operator queue cleanup", () => {
  it("removes formal gates, score-impact-zero cost lanes, stale critic noise, and generic playbooks from fix-first", () => {
    const report = buildControlTowerOperatorQueueCleanupReport({
      currentHead: "head-current",
      scoreImpactQueue: [
        { artifact: "runtime_provider_smoke", scoreImpactEstimate: 16, staleReason: "Runtime unverified", refreshCommand: "Produce provider-backed site activity evidence", canRunAutomatically: false },
        { artifact: "agent/state/score-80-path-lock.generated.json", scoreImpactEstimate: 8, staleReason: "stale", refreshCommand: "npm run check:beta-score", canRunAutomatically: true },
        { artifact: "cost-owner-review", scoreImpactEstimate: 0, staleReason: "score impact: 0", refreshCommand: "npm run check:google-cost", canRunAutomatically: false },
      ],
      aiCriticFindings: [{ title: "Stale debug logic is still active", requiredFix: "Refresh/formal/operator confirmation work; no source changes requested." }],
      recoveryPlaybooks: [{ id: "stale_artifact_recovery", title: "Stale artifact recovery" }],
      telemetryStatus: "clean_current",
      adminTruthStatus: "source_ready_formal_sample_required",
    });

    expect(report.scoreImpactQueueAfter).toHaveLength(0);
    expect(report.costLaneQueueStatus).toBe("collapsed_score_impact_zero");
    expect(report.aiCriticStatusAfter).toBe("no_source_changes_requested");
    expect(report.recoveryPlaybooksVisibleAfter).toBe(0);
    expect(report.formalEvidenceItems).toContain("runtime_provider_smoke");
    expect(report.retiredReports).toContain("agent/state/score-80-path-lock.generated.json");
  });
});
