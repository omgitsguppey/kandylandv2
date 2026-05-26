import { describe, expect, it } from "vitest";

import {
  buildFinalProductIntegrityLockReport,
  classifyFinalProductIntegrityLockDirtyFile,
  validateFinalProductIntegrityLockReport,
} from "@/lib/product-integrity/final-product-integrity-lock";

const packageScripts = {
  "check:product-body-map": "tsx scripts/agent/validate-product-body-map.ts",
  "check:central-normalizer-spine": "tsx scripts/agent/validate-central-normalizer-spine.ts",
  "check:interpretive-brain-debug-triage": "tsx scripts/agent/validate-interpretive-brain-debug-triage.ts",
  "check:body-system-wiring-repair": "tsx scripts/agent/validate-body-system-wiring-repair.ts",
  "check:final-product-integrity-lock": "tsx scripts/agent/validate-final-product-integrity-lock.ts",
};

const scoreSnapshot = {
  sourceHealth: 100,
  runtimeHealth: 84.2,
  evidenceCompleteness: 84.6,
  freshness: 91.88,
  costRisk: 42,
  regressionRisk: 86,
  overallHealthScore: 85.34,
};

describe("final product integrity lock", () => {
  it("locks mapped limbs, normalizer, product brain, debug, and owned deferred gaps without clearing formal gates", () => {
    const report = buildFinalProductIntegrityLockReport({
      packageScripts,
      dirtyFiles: [],
      openPullRequests: [],
      scoreBefore: scoreSnapshot,
      scoreAfter: scoreSnapshot,
      launchBlockers: [
        "Runtime/provider smoke: Runtime unverified",
        "Admin truth/sample evidence: Ready with smoke required",
      ],
    });

    expect(report.status).toBe("pass");
    expect(report.bodySystems).toContain("wallet_commerce");
    expect(report.bodySystems).toContain("telemetry_behavioral_intelligence");
    expect(report.mappedLimbCount).toBeGreaterThan(100);
    expect(report.connectedLimbCount).toBeGreaterThan(100);
    expect(report.unsafeUnknownCount).toBe(0);
    expect(report.centralNormalizerStatus).toBe("pass");
    expect(report.interpretiveBrainStatus).toBe("pass");
    expect(report.debugSummaryStatus).toBe("product_brain_root_cause_ready");
    expect(report.remainingGaps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        gapId: "metric:global:runtime_watch_time",
        classification: "deferred_with_owner",
        owner: "viewer-runtime",
      }),
    ]));
    expect(report.launchBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        blockerId: "runtime-provider-smoke",
        classification: "formal_evidence_required",
      }),
    ]));
    expect(validateFinalProductIntegrityLockReport(report)).toEqual([]);
  });

  it("fails when a user-visible or revenue-affecting gap lacks owner classification", () => {
    const report = buildFinalProductIntegrityLockReport({
      packageScripts,
      dirtyFiles: [],
      openPullRequests: [],
      scoreBefore: scoreSnapshot,
      scoreAfter: scoreSnapshot,
    });

    const failures = validateFinalProductIntegrityLockReport({
      ...report,
      remainingGaps: [
        ...report.remainingGaps,
        {
          gapId: "surface:wallet",
          classification: "unsafe_unknown",
          owner: "",
          bodySystem: "wallet_commerce",
          nextAction: "",
          reason: "",
        },
      ],
    });

    expect(failures).toEqual(expect.arrayContaining([
      "surface:wallet remains unsafe_unknown.",
      "surface:wallet lacks owner, reason, or next action.",
    ]));
  });

  it("classifies final-lock artifacts for scoped staging and blocks protected runtime edits", () => {
    expect(classifyFinalProductIntegrityLockDirtyFile("agent/state/final-product-integrity-lock.generated.json"))
      .toBe("current_generated_artifact_to_commit");
    expect(classifyFinalProductIntegrityLockDirtyFile("docs/agent-truth/final-product-integrity-lock.md"))
      .toBe("documentation_artifact_expected");
    expect(classifyFinalProductIntegrityLockDirtyFile("scripts/agent/validate-final-product-integrity-lock.ts"))
      .toBe("validator_artifact_expected");
    expect(classifyFinalProductIntegrityLockDirtyFile("src/lib/wallet/runtime.ts"))
      .toBe("unsafe_unknown");
  });
});
