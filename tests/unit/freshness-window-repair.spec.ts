import { describe, expect, it } from "vitest";

import {
  buildFreshnessWindowRepairReport,
  classifyFreshnessWindowRepairDirtyFile,
  validateFreshnessWindowRepairReport,
} from "../../scripts/agent/validate-freshness-window-repair";

const currentHead = "e75d98523cda258032a04e11eb16e1d128bea2f9";

describe("freshness window repair", () => {
  it("classifies the seven stale required beta reports without clearing formal evidence gates", () => {
    const report = buildFreshnessWindowRepairReport({
      generatedAtUtc: "2026-05-26T04:00:00.000Z",
      currentHead,
      latestMainHead: currentHead,
      scoreBefore: 78.03,
      scoreAfter: 78.03,
      freshnessBefore: 75.63,
      freshnessAfter: 87.5,
      dirtyFiles: [],
      staleReports: [
        {
          artifactPath: "agent/state/evidence-capture-status.generated.json",
          reportKey: "evidence-capture-status",
          oldStatus: "stale_age",
          classification: "refreshed",
          action: "npm run check:evidence-capture-status",
          replacementArtifactPath: "agent/state/evidence-capture-status.generated.json",
          nextAction: "No action needed after refresh.",
        },
        {
          artifactPath: "agent/state/post-economy-creator-flow-qa.generated.json",
          reportKey: "post-economy-creator-flow-qa",
          oldStatus: "stale_age",
          classification: "retired_superseded",
          action: "retired from REQUIRED_EVIDENCE_REPORTS",
          replacementArtifactPath: "agent/state/creator-monetization-readiness-lock.generated.json",
          nextAction: "Use creator monetization readiness lock for current source behavior evidence.",
        },
        {
          artifactPath: "agent/state/gumdrop-economy-accuracy.generated.json",
          reportKey: "gumdrop-economy-accuracy",
          oldStatus: "stale_age",
          classification: "refreshed",
          action: "npm run check:gumdrop-economy-accuracy",
          replacementArtifactPath: "agent/state/gumdrop-economy-accuracy.generated.json",
          nextAction: "No action needed after refresh.",
        },
        {
          artifactPath: "agent/state/creator-experience-simplification.generated.json",
          reportKey: "creator-experience-simplification",
          oldStatus: "stale_age",
          classification: "refreshed",
          action: "npm run check:creator-experience-simplification",
          replacementArtifactPath: "agent/state/creator-experience-simplification.generated.json",
          nextAction: "No action needed after refresh.",
        },
        {
          artifactPath: "agent/state/user-creator-ui-parity.generated.json",
          reportKey: "user-creator-ui-parity",
          oldStatus: "stale_age",
          classification: "refreshed",
          action: "npm run check:user-creator-ui-parity",
          replacementArtifactPath: "agent/state/user-creator-ui-parity.generated.json",
          nextAction: "No action needed after refresh.",
        },
        {
          artifactPath: "agent/state/user-facing-feature-connection-audit.generated.json",
          reportKey: "user-facing-feature-connection-audit",
          oldStatus: "stale_age",
          classification: "retired_superseded",
          action: "retired from REQUIRED_EVIDENCE_REPORTS",
          replacementArtifactPath: "agent/state/final-parity-telemetry-lock.generated.json",
          nextAction: "Use final parity telemetry lock for current source behavior evidence.",
        },
        {
          artifactPath: "agent/state/creator-dashboard-error-cost-inventory.generated.json",
          reportKey: "creator-dashboard-error-cost-inventory",
          oldStatus: "stale_age",
          classification: "retired_superseded",
          action: "retired from REQUIRED_EVIDENCE_REPORTS",
          replacementArtifactPath: "agent/state/score-80-cost-readiness.generated.json",
          nextAction: "Use beta score cost readiness for current source behavior evidence.",
        },
      ],
    });

    expect(report.status).toBe("pass");
    expect(report.exactStaleRequiredReportCountBefore).toBe(7);
    expect(report.staleReports[0].classification).toBe("refreshed");
    expect(report.staleReports[1].classification).toBe("retired_superseded");
    expect(report.formalEvidenceImpact).toBe("does_not_clear_formal_gates");
    expect(report.formalEvidenceGatesPreserved).toBe(true);
    expect(report.scoreDimensions.freshness.before).toBeLessThan(80);
    expect(report.scoreDimensions.freshness.after).toBeGreaterThanOrEqual(80);
    expect(validateFreshnessWindowRepairReport(report)).toEqual([]);
  });

  it("requires exact next actions when freshness remains below target", () => {
    const report = buildFreshnessWindowRepairReport({
      generatedAtUtc: "2026-05-26T04:00:00.000Z",
      currentHead,
      latestMainHead: currentHead,
      freshnessBefore: 75.63,
      freshnessAfter: 75.63,
      staleReports: [],
      dirtyFiles: [],
    });

    expect(validateFreshnessWindowRepairReport(report)).toContain("freshness below 80 requires exact next actions.");
  });

  it("classifies scoped files and blocks unsafe changes", () => {
    expect(classifyFreshnessWindowRepairDirtyFile("scripts/agent/validate-freshness-window-repair.ts")).toBe("failed_validator_to_repair");
    expect(classifyFreshnessWindowRepairDirtyFile("tests/unit/freshness-window-repair.spec.ts")).toBe("failed_validator_to_repair");
    expect(classifyFreshnessWindowRepairDirtyFile("agent/state/freshness-window-repair.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyFreshnessWindowRepairDirtyFile("docs/agent-truth/freshness-window-repair.md")).toBe("current_generated_artifact_to_commit");
    expect(classifyFreshnessWindowRepairDirtyFile("CHANGELOG.md")).toBe("release_artifact_expected");
    expect(classifyFreshnessWindowRepairDirtyFile("src/lib/agent-score/core.ts")).toBe("freshness_required_input_fix");
    expect(classifyFreshnessWindowRepairDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");
  });
});
