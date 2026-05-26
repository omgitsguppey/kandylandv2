import { describe, expect, it } from "vitest";

import {
  LEGACY_PIPELINE_INVENTORY,
  summarizeLegacyPipelineInventory,
} from "@/lib/codebase-hardening/legacy-pipeline-inventory";
import {
  auditPipelineOwnership,
  findBypassedPipelines,
  findDuplicateOwners,
  findMissingOwners,
} from "@/lib/codebase-hardening/pipeline-ownership-auditor";
import { auditGlobalFormulas } from "@/lib/math/global-formula-audit";
import { buildLegacyCanonicalRecoveryPlan } from "@/lib/codebase-hardening/legacy-canonical-recovery-plan";
import { buildCostAccuracyHardeningReport } from "@/lib/codebase-hardening/cost-accuracy-hardening";
import { buildSelfRevealingCodebaseReport } from "@/lib/codebase-hardening/self-revealing-codebase-engine";
import {
  buildMegaLegacyPipelineHardeningReport,
  classifyMegaLegacyPipelineDirtyFile,
  validateMegaLegacyPipelineHardeningReport,
} from "../../scripts/agent/validate-mega-legacy-pipeline-hardening";

describe("mega legacy pipeline hardening", () => {
  it("classifies legacy items into remove, reinforce, alias, dry-run, in-flight, or unsafe lanes", () => {
    const summary = summarizeLegacyPipelineInventory(LEGACY_PIPELINE_INVENTORY);

    expect(summary.total).toBeGreaterThanOrEqual(8);
    expect(summary.actions.reinforce_into_pipeline).toBeGreaterThan(0);
    expect(summary.actions.legacy_alias).toBeGreaterThan(0);
    expect(summary.actions.dry_run_recovery).toBeGreaterThan(0);
    expect(LEGACY_PIPELINE_INVENTORY.every((item) =>
      item.reason.length > 12 && item.exactNextStep.length > 12 && item.currentOwnerPipeline !== "no_owner",
    )).toBe(true);
  });

  it("audits canonical pipeline ownership without duplicate or missing owners", () => {
    const audit = auditPipelineOwnership();

    expect(audit.status).toBe("pass");
    expect(findDuplicateOwners(audit).filter((entry) => entry.severity === "blocking")).toEqual([]);
    expect(findMissingOwners(audit)).toEqual([]);
    expect(findBypassedPipelines(audit).filter((entry) => entry.exemption === "none")).toEqual([]);
    expect(audit.ownershipStages).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: "feature_surface_registry" }),
      expect.objectContaining({ stage: "central_normalizer" }),
      expect.objectContaining({ stage: "event_envelope" }),
      expect.objectContaining({ stage: "person_global_metrics" }),
      expect.objectContaining({ stage: "debug_interpretive_brain" }),
      expect.objectContaining({ stage: "score_evidence_cost" }),
    ]));
  });

  it("freezes formula, legacy recovery, cost, and self-revealing reports without fake proof", () => {
    const formulaAudit = auditGlobalFormulas();
    const recoveryPlan = buildLegacyCanonicalRecoveryPlan();
    const costReport = buildCostAccuracyHardeningReport();
    const selfRevealing = buildSelfRevealingCodebaseReport();

    expect(formulaAudit.requiredDecisions).toMatchObject({
      missingDataIsZero: false,
      unknownLegacyCanBecomeExact: false,
      pageDurationCanBeWatchTime: false,
      rewardGdCanBecomePaidGd: false,
      costSavingsCanReduceAccuracy: false,
    });
    expect(formulaAudit.personMetricHydrationGapMath).toMatchObject({
      debugLaneUsesActualGapCount: true,
      scoreImpactUsesActualGapCount: true,
    });
    expect(recoveryPlan.dryRunOnly).toBe(true);
    expect(recoveryPlan.startDate).toBe("2026-03-01");
    expect(recoveryPlan.confidenceRules.exact.requiredEvidence).toEqual([
      "userId",
      "sessionId",
      "eventId",
      "sourceTimestamp",
      "sourceRoute",
    ]);
    expect(costReport.externalBillingProofClaimed).toBe(false);
    expect(costReport.accuracyPreserved).toBe(true);
    expect(selfRevealing.findings.map((finding) => finding.domain)).toEqual(expect.arrayContaining([
      "orphaned_limb",
      "duplicate_formula",
      "stale_artifact",
      "cost_owner_review_lane",
      "legacy_recovery_candidate",
    ]));
  });

  it("builds a full mega report with exact classifications and hard-rule proof", () => {
    const report = buildMegaLegacyPipelineHardeningReport({
      currentHead: "test-head",
      dirtyFiles: [
        "src/lib/codebase-hardening/legacy-pipeline-inventory.ts",
        "src/lib/math/global-formula-audit.ts",
        "agent/state/mega-legacy-pipeline-hardening.generated.json",
        "docs/agent-truth/mega-legacy-pipeline-hardening.md",
        "scripts/agent/validate-mega-legacy-pipeline-hardening.ts",
        "tests/unit/mega-legacy-pipeline-hardening.spec.ts",
      ],
      openPullRequests: [],
      packageScripts: {
        "check:codebase-organization-hardening": "tsx scripts/agent/validate-codebase-organization-hardening.ts",
        "check:mega-legacy-pipeline-hardening": "tsx scripts/agent/validate-mega-legacy-pipeline-hardening.ts",
      },
    });

    expect(report.status).toBe("pass");
    expect(report.productionReadsPerformed).toBe(false);
    expect(report.providerCallsPerformed).toBe(false);
    expect(report.deployPerformed).toBe(false);
    expect(report.paymentRuntimeChanged).toBe(false);
    expect(report.gumdropPricingMathChanged).toBe(false);
    expect(report.inventorySummary.total).toBeGreaterThanOrEqual(8);
    expect(report.pipelineOwnership.status).toBe("pass");
    expect(report.globalFormulaAudit.personMetricHydrationGapMath.debugLaneUsesActualGapCount).toBe(true);
    expect(report.costAccuracyHardening.accuracyPreserved).toBe(true);
    expect(report.selfRevealingCodebase.findings.length).toBeGreaterThanOrEqual(6);
    expect(validateMegaLegacyPipelineHardeningReport(report)).toEqual([]);
  });

  it("classifies scoped artifacts and rejects protected runtime edits", () => {
    expect(classifyMegaLegacyPipelineDirtyFile("agent/state/mega-legacy-pipeline-hardening.generated.json"))
      .toBe("current_generated_artifact_to_commit");
    expect(classifyMegaLegacyPipelineDirtyFile("docs/agent-truth/legacy-pipeline-inventory.md"))
      .toBe("documentation_artifact_expected");
    expect(classifyMegaLegacyPipelineDirtyFile("scripts/agent/validate-mega-legacy-pipeline-hardening.ts"))
      .toBe("validator_artifact_expected");
    expect(classifyMegaLegacyPipelineDirtyFile("tests/unit/mega-legacy-pipeline-hardening.spec.ts"))
      .toBe("test_artifact_expected");
    expect(classifyMegaLegacyPipelineDirtyFile("src/app/api/paypal/capture/route.ts"))
      .toBe("unsafe_unknown");
  });
});
