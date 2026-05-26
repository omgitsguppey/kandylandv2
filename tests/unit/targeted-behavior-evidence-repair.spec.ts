import { describe, expect, it } from "vitest";

import {
  buildTargetedBehaviorEvidenceRepairReport,
  classifyTargetedBehaviorEvidenceRepairDirtyFile,
  validateTargetedBehaviorEvidenceRepairReport,
} from "../../scripts/agent/validate-targeted-behavior-evidence-repair";

const currentHead = "79ad1387";

describe("targeted behavior evidence repair", () => {
  it("replaces stale source behavior validators with current lock validators without clearing formal gates", () => {
    const report = buildTargetedBehaviorEvidenceRepairReport({
      currentHead,
      generatedAtUtc: "2026-05-26T00:00:00.000Z",
      scoreBefore: 77.83,
      scoreAfter: 77.83,
      packageScripts: {
        "check:final-parity-telemetry-lock": "tsx scripts/agent/validate-final-parity-telemetry-lock.ts",
        "check:media-discovery-score-lock": "tsx scripts/agent/validate-media-discovery-score-lock.ts",
        "check:creator-monetization-readiness-lock": "tsx scripts/agent/validate-creator-monetization-readiness-lock.ts",
        "check:feature-registration-gate": "tsx scripts/agent/validate-feature-registration-gate.ts",
        "check:event-translation-bridge": "tsx scripts/agent/validate-event-translation-bridge.ts",
        "check:person-metrics-hydration": "tsx scripts/agent/validate-person-metrics-hydration.ts",
      },
      artifactReports: {
        "agent/state/creator-monetization-readiness-lock.generated.json": { status: "pass", currentHead },
        "agent/state/feature-registration-gate.generated.json": { status: "pass", currentHead },
        "agent/state/event-translation-bridge.generated.json": { status: "pass", currentHead },
        "agent/state/person-metrics-hydration.generated.json": { status: "pass", currentHead },
      },
      previousValidatorResults: [
        {
          id: "creator-settings-control-plane",
          command: "npm run check:creator-settings-control-plane",
          status: "fail",
          artifactPath: "agent/state/creator-settings-control-plane.generated.json",
          surfaces: ["creator_settings"],
          proves: "old creator settings lane",
          doesNotProve: "manual_screenshot provider_smoke runtime_smoke admin_truth_sample",
          blocker: "stale head",
        },
      ],
      dirtyFiles: [],
    });

    expect(report.status).toBe("pass");
    expect(report.targetedBehaviorScoreBefore).toBe(0);
    expect(report.targetedBehaviorScoreAfter).toBeGreaterThan(0);
    expect(report.supersededValidators.map((validator) => validator.id)).toContain("creator-settings-control-plane");
    expect(report.currentValidators.some((validator) => validator.id === "creator-monetization-readiness-lock")).toBe(true);
    expect(report.currentValidators.some((validator) => validator.status === "in_flight")).toBe(true);
    expect(report.formalEvidenceImpact).toBe("source_behavior_only");
    expect(report.doesNotClear).toEqual(expect.arrayContaining(["manual_screenshot", "provider_smoke", "runtime_smoke", "admin_truth_sample"]));
    expect(validateTargetedBehaviorEvidenceRepairReport(report)).toEqual([]);
  });

  it("classifies scoped repair, generated, and release files", () => {
    expect(classifyTargetedBehaviorEvidenceRepairDirtyFile("scripts/agent/validate-targeted-behavior-evidence-repair.ts")).toBe("failed_validator_to_repair");
    expect(classifyTargetedBehaviorEvidenceRepairDirtyFile("agent/state/targeted-behavior-evidence-repair.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyTargetedBehaviorEvidenceRepairDirtyFile("docs/agent-truth/targeted-behavior-evidence-repair.md")).toBe("current_generated_artifact_to_commit");
    expect(classifyTargetedBehaviorEvidenceRepairDirtyFile("CHANGELOG.md")).toBe("release_artifact_expected");
    expect(classifyTargetedBehaviorEvidenceRepairDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
  });
});
