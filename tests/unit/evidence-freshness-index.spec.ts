import { beforeAll, describe, expect, it, vi } from "vitest";

import { buildEvidenceFreshnessIndex } from "../../scripts/agent/validate-evidence-freshness-index";

describe("evidence freshness index", () => {
  let report: ReturnType<typeof buildEvidenceFreshnessIndex>;

  beforeAll(() => {
    const nowMs = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(nowMs + (48 * 60 * 60 * 1000));
      report = buildEvidenceFreshnessIndex();
    } finally {
      vi.useRealTimers();
    }
  }, 30_000);

  it("classifies stale consumed blockers with actionable next steps", () => {
    const staleBlockers = report.blockingArtifacts.filter((artifact) => artifact.classification === "stale_consumed");

    expect(report.doctrine.generatedReportsAreTruth).toBe(false);
    expect(report.summary.byActionability.refreshable_by_existing_local_validator).toBeGreaterThan(0);
    expect(staleBlockers.length).toBeGreaterThan(0);
    expect(staleBlockers.every((artifact) => artifact.truthUse === "evidence_snapshot_only")).toBe(true);
    expect(staleBlockers.every((artifact) => artifact.actionability !== "no_action_required")).toBe(true);
    expect(staleBlockers.every((artifact) => artifact.nextExactSteps.length > 0)).toBe(true);
  });

  it("keeps the general artifact inventory compact while preserving blocker detail", () => {
    expect(report.artifacts.length).toBeLessThanOrEqual(report.summary.indexedArtifactCap);
    expect(report.archiveCandidates.length).toBeLessThanOrEqual(report.summary.archiveCandidateCap);
    expect(report.summary.omittedArtifactCount).toBeGreaterThanOrEqual(0);
    expect(report.summary.omittedArchiveCandidateCount).toBeGreaterThanOrEqual(0);
    expect(report.artifacts.every((artifact) => !("consumerPaths" in artifact))).toBe(true);
    expect(report.blockingArtifacts.every((artifact) => Array.isArray(artifact.consumerPaths))).toBe(true);
  });

  it("keeps external, UI source coverage, and admin source gates separate from source freshness", () => {
    expect(report.externalProofRequired.every((artifact) => artifact.truthUse === "formal_proof_gate")).toBe(true);
    expect(report.uiSourceCoverageRequired.every((artifact) => artifact.truthUse === "evidence_snapshot_only")).toBe(true);
    expect(report.adminTruthSourceRequired.every((artifact) => artifact.truthUse === "evidence_snapshot_only")).toBe(true);
    expect(report.externalProofRequired.every((artifact) => artifact.actionability === "external_proof_required")).toBe(true);
    expect(report.uiSourceCoverageRequired.every((artifact) => artifact.actionability === "ui_source_coverage_required")).toBe(true);
    expect(report.adminTruthSourceRequired.every((artifact) => artifact.actionability === "admin_truth_source_required")).toBe(true);
    expect(report.summary.adminTruthSourceRequiredCount).toBe(report.adminTruthSourceRequired.length);
    expect(report.summary.uiSourceCoverageRequiredCount).toBe(report.uiSourceCoverageRequired.length);
  });

  it("uses typed evidence wording without breaking external proof compatibility schema", () => {
    const external = report.externalProofRequired[0];

    expect(report.doctrine.formalProofNote).toContain("Deployed route, provider-backed site activity, and admin source activity evidence");
    expect(report.doctrine.formalProofNote).not.toContain("Runtime/provider proof gates");
    expect(report.externalProofRequired.every((artifact) => artifact.truthUse === "formal_proof_gate")).toBe(true);
    if (external) {
      expect(`${external.reason}\n${external.nextExactSteps.join("\n")}`).toContain("provider-backed site activity evidence");
      expect(`${external.reason}\n${external.nextExactSteps.join("\n")}`).not.toContain("formal external/runtime/provider evidence");
    }
  });
});
