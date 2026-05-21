import { describe, expect, it } from "vitest";

import {
  buildDebugScoreImpactTriageReport,
  validateDebugScoreImpactTriageReport,
} from "../../scripts/agent/validate-debug-score-impact-triage";

const currentHead = "abc123";

describe("debug score impact triage", () => {
  it("prioritizes debug/runtime evidence, admin truth, runtime smoke, and stale score artifacts", () => {
    const report = buildDebugScoreImpactTriageReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      betaScore: {
        overallScore: 59.6,
        runtimeHealthScore: 18.33,
        evidenceCompletenessScore: 40,
        freshnessScore: 52.86,
        evidenceCapDetails: [
          "Unknown evidence: Debug/runtime evidence - Debug evidence is empty, so absence of runtime issues is unknown.",
          "Unknown evidence: Admin truth/sample evidence - No fresh admin truth sample.",
          "Runtime unverified: Runtime/provider smoke - No deployed runtime smoke evidence was supplied.",
        ],
        staleArtifacts: [
          {
            artifactPath: "agent/state/overnight-final-integration-lock.generated.json",
            refreshCommand: "npm run check:overnight-final-integration-lock",
          },
        ],
      },
      debugPanel: {
        debugItems: [
          {
            key: "report_debug_evidence",
            sourceArtifact: "agent/state/debug-evidence-pipeline.generated.json",
            freshness: "missing",
            uiTruthState: "missing",
            issue: "Source artifact is missing from the Debug source chain.",
            recommendedAction: "Keep missing state visible until an owning generator is identified.",
          },
        ],
      },
      telemetryAdmin: {
        lanes: [
          {
            lane: "watch_time",
            status: "runtime_unproven",
            nextAction: "Collect runtime evidence.",
          },
        ],
      },
    });

    expect(report.issues.map((issue) => issue.id).slice(0, 4)).toEqual([
      "debug-runtime-evidence-unknown-empty",
      "admin-truth-sample-missing",
      "runtime-provider-smoke-source-confidence-gap",
      "stale-artifact-overnight-final-integration-lock-generated-json",
    ]);
    expect(report.summary.p0Count).toBe(0);
    expect(report.summary.p1Count).toBeGreaterThan(0);
    expect(validateDebugScoreImpactTriageReport(report)).toEqual([]);
  });

  it("fails if unknown evidence is marked healthy or stale artifacts lack refresh commands", () => {
    const report = buildDebugScoreImpactTriageReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      betaScore: {
        overallScore: 59.6,
        runtimeHealthScore: 18.33,
        evidenceCompletenessScore: 40,
        freshnessScore: 52.86,
        evidenceCapDetails: ["Unknown evidence: Debug/runtime evidence"],
        staleArtifacts: [{ artifactPath: "agent/state/stale.generated.json" }],
      },
    });
    report.issues[0]!.currentStatus = "healthy";

    const failures = validateDebugScoreImpactTriageReport(report);
    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining("unknown evidence marked healthy"),
      expect.stringContaining("stale artifact lacks refresh command"),
    ]));
  });
});
