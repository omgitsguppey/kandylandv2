import { describe, expect, it } from "vitest";

import {
  buildDebugScoreImpactTriageReport,
  validateDebugScoreImpactTriageReport,
} from "../../scripts/agent/validate-debug-score-impact-triage";

const currentHead = "abc123";

describe("debug score impact triage", () => {
  it("prioritizes debug/runtime evidence, admin truth, site activity evidence, and stale score artifacts", () => {
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
          "Source evidence required: Provider-backed site activity + deployed route evidence - No deployed route evidence was supplied.",
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
    expect(JSON.stringify(report)).toContain("Provider-backed site activity + deployed route evidence");
    expect(JSON.stringify(report)).not.toMatch(/formal provider proof|deployed runtime smoke|runtime\/provider smoke/i);
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

  it("keeps partial debug runtime evidence source-backed without clearing deployed route evidence", () => {
    const report = buildDebugScoreImpactTriageReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      currentHead,
      betaScore: {
        overallScore: 74,
        runtimeHealthScore: 71,
        evidenceCompletenessScore: 70,
        freshnessScore: 80,
        evidenceCapDetails: [
          "Source evidence required: Provider-backed site activity + deployed route evidence - Deployed route evidence remains required.",
        ],
      },
      debugRuntimeEvidence: {
        status: "partial_debug_runtime_evidence",
      },
    });

    const debugRuntime = report.issues.find((issue) => issue.id === "debug-runtime-evidence-unknown-empty");

    expect(debugRuntime).toMatchObject({
      currentStatus: "partial_debug_runtime_evidence",
      sourceFixable: false,
      evidenceFixable: false,
    });
    expect(debugRuntime?.fixPlan).toContain("partial source-backed status");
    expect(debugRuntime?.fixPlan).toContain("deployed route evidence remains separate");
    expect(JSON.stringify(report)).not.toMatch(/deployed runtime smoke/i);
    expect(validateDebugScoreImpactTriageReport(report)).toEqual([]);
  });
});
