import { describe, expect, it } from "vitest";

import {
  buildTargetedBehaviorEvidenceReport,
  targetedBehaviorHeadsMatch,
  targetedBehaviorReportHasExplicitPass,
  targetedBehaviorReportIsFresh,
  targetedBehaviorValidatorResultForReport,
  validateTargetedBehaviorEvidenceReport,
  type TargetedBehaviorValidatorResult,
} from "../../scripts/agent/validate-targeted-behavior-evidence";

const head = "abcdef0123456789abcdef0123456789abcdef01";

function result(overrides: Partial<TargetedBehaviorValidatorResult> = {}): TargetedBehaviorValidatorResult {
  const id = overrides.id ?? "creator-settings-control-plane";
  return {
    id,
    command: "npm run check:creator-settings-control-plane",
    status: "pass",
    artifactPath: "agent/state/creator-settings-control-plane.generated.json",
    reportKey: id,
    currentHead: head,
    sourceCommit: head,
    artifactGeneratedAtUtc: "2026-05-20T00:00:00.000Z",
    canClearSourceGate: true,
    childValidationFailures: [],
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
    expect(targetedBehaviorReportHasExplicitPass({ currentHead: head, passed: true })).toBe(false);
    expect(targetedBehaviorReportHasExplicitPass({ currentHead: head, status: "pass", passed: true, validationFailures: [] })).toBe(true);
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

  it("fails a missing command and never records it as non-blocking in-flight work", () => {
    const validator = {
      id: "feature-registration-gate",
      command: "npm run check:feature-registration-gate",
      artifactPath: "agent/state/feature-registration-gate.generated.json",
      surfaces: ["feature_registration"],
      proves: "Feature registration source truth.",
    };
    const child = {
      reportKey: validator.id,
      status: "pass",
      passed: true,
      generatedAtUtc: "2026-07-14T11:00:00.000Z",
      currentHead: head,
      sourceCommit: head,
      canClearSourceGate: true,
      validationFailures: [],
    };
    const validatorResult = targetedBehaviorValidatorResultForReport({
      validator,
      report: child,
      currentHead: head,
      commandExists: false,
      nowMs: Date.parse("2026-07-14T12:00:00.000Z"),
    });
    const report = buildTargetedBehaviorEvidenceReport({
      generatedAtUtc: "2026-07-14T12:00:00.000Z",
      latestCodeVersion: head,
      validatorResults: [validatorResult],
      notCovered: [],
    });

    expect(validatorResult.status).toBe("fail");
    expect(validatorResult.requiredForCurrentLane).toBe(true);
    expect(report.status).toBe("failed");
    expect(report.passed).toBe(false);
    expect(report.canClearSourceGate).toBe(false);
    expect(report.validationFailures).toContain("npm run check:feature-registration-gate is not defined in package.json.");
  });

  it("rejects swapped identity, contradictory provenance, and source-gate denial", () => {
    const validator = {
      id: "feature-registration-gate",
      command: "npm run check:feature-registration-gate",
      artifactPath: "agent/state/feature-registration-gate.generated.json",
      surfaces: ["feature_registration"],
      proves: "Feature registration source truth.",
    };
    const validatorResult = targetedBehaviorValidatorResultForReport({
      validator,
      report: {
        reportKey: "unrelated-report",
        status: "pass",
        passed: true,
        generatedAtUtc: "2026-07-14T11:00:00.000Z",
        currentHead: head,
        sourceCommit: "f".repeat(40),
        canClearSourceGate: false,
        validationFailures: [],
      },
      currentHead: head,
      commandExists: true,
      nowMs: Date.parse("2026-07-14T12:00:00.000Z"),
    });

    expect(validatorResult.status).toBe("fail");
    expect(validatorResult.childValidationFailures).toEqual(expect.arrayContaining([
      "feature-registration-gate child reportKey must be feature-registration-gate.",
      "feature-registration-gate child sourceCommit must match currentHead.",
      "feature-registration-gate child canClearSourceGate must be true.",
    ]));
  });
});
