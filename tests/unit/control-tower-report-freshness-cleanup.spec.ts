import { describe, expect, it } from "vitest";

import { classifyControlTowerReportFreshness } from "@/lib/debug/report-freshness-control-tower";

describe("control tower report freshness cleanup", () => {
  it("separates stale formal gates from refreshable source reports", () => {
    const result = classifyControlTowerReportFreshness({
      currentHead: "head-current",
      reports: [
        {
          artifactPath: "agent/state/admin-truth-sample-evidence.generated.json",
          owner: "admin",
          generatedAtUtc: "2026-05-23T17:10:15.346Z",
          artifactHead: "old-head",
          requiredFreshnessWindowHours: 24,
          refreshCommand: "npm run check:admin-truth-sample-evidence",
          formalGateOnly: true,
          replacementArtifact: "agent/state/admin-truth-source-sample.generated.json",
          scoreImpact: 4,
        },
        {
          artifactPath: "agent/state/telemetry-parity-score.generated.json",
          owner: "telemetry",
          generatedAtUtc: "2026-05-24T17:10:15.346Z",
          artifactHead: "head-current",
          requiredFreshnessWindowHours: 24,
          refreshCommand: "npm run check:telemetry-parity-score",
          status: "clean_current",
          scoreImpact: 0,
        },
      ],
      nowUtc: "2026-05-24T18:00:00.000Z",
    });

    expect(result.staleReports).toHaveLength(1);
    expect(result.staleButFormalGateOnly).toContain("agent/state/admin-truth-sample-evidence.generated.json");
    expect(result.staleAndRefreshable).toHaveLength(0);
    expect(result.refreshedCurrent).toContain("agent/state/telemetry-parity-score.generated.json");
    expect(result.reportAverageDisplay).toContain("current/stale split");
    expect(result.sourceBugArtifacts).not.toContain("agent/state/admin-truth-sample-evidence.generated.json");
  });
});
