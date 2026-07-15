import { describe, expect, it } from "vitest";

import {
  buildTargetedBehaviorEvidenceReport,
  targetedBehaviorHeadsMatch,
  targetedBehaviorReportHasExplicitPass,
  targetedBehaviorReportIsFresh,
  validateTargetedBehaviorEvidenceReport,
  type TargetedBehaviorValidatorResult,
} from "../../scripts/agent/validate-targeted-behavior-evidence";

const head = "abcdef0123456789abcdef0123456789abcdef01";

function result(overrides: Partial<TargetedBehaviorValidatorResult> = {}): TargetedBehaviorValidatorResult {
  return {
    id: "creator-settings-control-plane",
    command: "npm run check:creator-settings-control-plane",
    status: "pass",
    artifactPath: "agent/state/creator-settings-control-plane.generated.json",
    currentHead: head,
    artifactGeneratedAtUtc: "2026-05-20T00:00:00.000Z",
    surfaces: ["creator_settings", "creator_profile"],
    proves: "Creator settings controls are source-validated.",
    doesNotProve: "Does not prove provider_smoke, runtime_smoke, or admin_truth_sample.",
    ...overrides,
  };
}

describe("targeted behavior evidence", () => {
  it("passes for current source-only behavior evidence without clearing required evidence lanes", () => {
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
      notCovered: ["provider-backed site activity evidence"],
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

  it("rejects a passing child validator from an older code version", () => {
    const report = buildTargetedBehaviorEvidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      latestCodeVersion: head,
      validatorResults: [result({ currentHead: "older-head" })],
      notCovered: [],
    });

    expect(validateTargetedBehaviorEvidenceReport(report)).toContain(
      "creator-settings-control-plane cannot pass from an older or unverifiable code version.",
    );
  });

  it("rejects a same-head child pass that is older than the evidence window", () => {
    const report = buildTargetedBehaviorEvidenceReport({
      generatedAtUtc: "2026-05-20T00:00:00.000Z",
      latestCodeVersion: head,
      validatorResults: [result({ artifactGeneratedAtUtc: "2026-05-18T23:59:59.999Z" })],
      notCovered: [],
    });

    expect(validateTargetedBehaviorEvidenceReport(report)).toContain(
      "creator-settings-control-plane cannot pass from missing, future, or outdated child evidence.",
    );
  });

  it("requires the exact full SHA for a child-validator commit", () => {
    expect(targetedBehaviorHeadsMatch("0123456789ab", "0123456789abcdef0123456789abcdef01234567")).toBe(false);
    expect(targetedBehaviorHeadsMatch("0123456789abcdef0123456789abcdef01234567", "0123456789abcdef0123456789abcdef01234567")).toBe(true);
    expect(targetedBehaviorHeadsMatch("fedcba9", "0123456789abcdef0123456789abcdef01234567")).toBe(false);
  });

  it("requires an explicit child-validator passing verdict", () => {
    expect(targetedBehaviorReportHasExplicitPass({ currentHead: head })).toBe(false);
    expect(targetedBehaviorReportHasExplicitPass({ currentHead: head, passed: true })).toBe(true);
    expect(targetedBehaviorReportHasExplicitPass({ currentHead: head, status: "review", passed: true })).toBe(false);
    expect(targetedBehaviorReportHasExplicitPass({ currentHead: head, status: "review", validationFailures: [] })).toBe(false);
    expect(targetedBehaviorReportHasExplicitPass({ currentHead: head, validationFailures: [] })).toBe(false);
  });

  it("rejects a stale or future child pass even when its full source version matches", () => {
    const nowMs = Date.parse("2026-07-14T12:00:00.000Z");
    expect(targetedBehaviorReportIsFresh({ generatedAtUtc: "2026-07-14T11:00:00.000Z" }, nowMs)).toBe(true);
    expect(targetedBehaviorReportIsFresh({ generatedAtUtc: "2026-07-13T11:59:59.999Z" }, nowMs)).toBe(false);
    expect(targetedBehaviorReportIsFresh({ generatedAtUtc: "2026-07-14T12:00:00.001Z" }, nowMs)).toBe(false);
  });
});
