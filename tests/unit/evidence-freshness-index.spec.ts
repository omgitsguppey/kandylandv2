import { describe, expect, it } from "vitest";

import { buildEvidenceFreshnessIndex } from "../../scripts/agent/validate-evidence-freshness-index";

describe("evidence freshness index", () => {
  it("classifies stale consumed blockers with actionable next steps", () => {
    const report = buildEvidenceFreshnessIndex();
    const staleBlockers = report.blockingArtifacts.filter((artifact) => artifact.classification === "stale_consumed");

    expect(report.doctrine.generatedReportsAreTruth).toBe(false);
    expect(report.summary.byActionability.refreshable_by_existing_local_validator).toBeGreaterThan(0);
    expect(staleBlockers.length).toBeGreaterThan(0);
    expect(staleBlockers.every((artifact) => artifact.truthUse === "evidence_snapshot_only")).toBe(true);
    expect(staleBlockers.every((artifact) => artifact.actionability !== "no_action_required")).toBe(true);
    expect(staleBlockers.every((artifact) => artifact.nextExactSteps.length > 0)).toBe(true);
  });

  it("keeps external and manual proof gates separate from source freshness", () => {
    const report = buildEvidenceFreshnessIndex();

    expect(report.externalProofRequired.every((artifact) => artifact.truthUse === "formal_proof_gate")).toBe(true);
    expect(report.manualProofRequired.every((artifact) => artifact.truthUse === "formal_proof_gate")).toBe(true);
    expect(report.externalProofRequired.every((artifact) => artifact.actionability === "external_proof_required")).toBe(true);
    expect(report.manualProofRequired.every((artifact) => artifact.actionability === "manual_admin_truth_required")).toBe(true);
  });
});
