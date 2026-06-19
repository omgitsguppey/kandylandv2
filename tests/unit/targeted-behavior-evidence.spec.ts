import { describe, expect, it } from "vitest";

import {
  buildTargetedBehaviorEvidenceReport,
  validateTargetedBehaviorEvidenceReport,
  type TargetedBehaviorValidatorResult,
} from "../../scripts/agent/validate-targeted-behavior-evidence";

const head = "abc123";

function result(overrides: Partial<TargetedBehaviorValidatorResult> = {}): TargetedBehaviorValidatorResult {
  return {
    id: "creator-settings-control-plane",
    command: "npm run check:creator-settings-control-plane",
    status: "pass",
    artifactPath: "agent/state/creator-settings-control-plane.generated.json",
    currentHead: head,
    surfaces: ["creator_settings", "creator_profile"],
    proves: "Creator settings controls are source-validated.",
    doesNotProve: "Does not prove provider_smoke, runtime_smoke, or admin_truth_sample.",
    ...overrides,
  };
}

describe("targeted behavior evidence", () => {
  it("passes for current source-only behavior evidence without clearing formal gates", () => {
    const report = buildTargetedBehaviorEvidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      latestCodeVersion: head,
      validatorResults: [
        result(),
        result({
          id: "mobile-ui-final-lock",
          command: "npm run check:mobile-ui-final-lock",
          artifactPath: "agent/state/mobile-ui-final-lock.generated.json",
          surfaces: ["mobile_ui"],
        }),
      ],
      notCovered: ["provider smoke"],
    });

    expect(report.status).toBe("passed");
    expect(report.passed).toBe(true);
    expect(report.formalEvidenceImpact).toBe("source_behavior_only");
    expect(report.doesNotClear).toContain("runtime_smoke");
    expect(validateTargetedBehaviorEvidenceReport(report)).toEqual([]);
  });

  it("fails when source-only evidence claims runtime proof", () => {
    const report = buildTargetedBehaviorEvidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      latestCodeVersion: head,
      validatorResults: [
        result({
          doesNotProve: "Does not prove provider_smoke.",
        }),
      ],
      notCovered: [],
    });
    report.formalEvidenceImpact = "runtime_smoke";

    expect(validateTargetedBehaviorEvidenceReport(report)).toContain(
      "targeted behavior evidence must remain source_behavior_only.",
    );
  });
});
