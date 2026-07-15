import { describe, expect, it } from "vitest";

import { MAJOR_SURFACE_PARITY_IDS } from "@/lib/parity/surface-parity-contract";
import { SURFACE_TELEMETRY_EVENT_SPINE } from "@/lib/analytics/telemetry/surface-telemetry-contract";
import { SURFACE_STATE_IDS } from "@/lib/parity/surface-state-contract";
import { ROLE_PERMISSION_IDS, ROLE_PERMISSION_ROLES } from "@/lib/parity/role-permission-contract";
import {
  buildFinalParityTelemetryLockReport,
  classifyFinalParityExternalProofArtifact,
  classifyFinalParityTelemetryLockDirtyFile,
  validateFinalParityTelemetryLockReport,
} from "../../scripts/agent/validate-final-parity-telemetry-lock";
import {
  targetedBehaviorHeadsMatch,
  targetedBehaviorReportHasExplicitPass,
  targetedBehaviorReportIsFresh,
} from "../../scripts/agent/validate-targeted-behavior-evidence";

const TEST_HEAD = "a".repeat(40);
const TEST_NOW_MS = Date.parse("2026-07-14T12:00:00.000Z");
const TEST_GENERATED_AT = "2026-07-14T11:00:00.000Z";

function positiveExternalProofArtifact(
  proofClass: "runtime_route_health" | "provider_smoke" | "admin_truth_sample",
): Record<string, unknown> {
  const provenance = {
    generatedAtUtc: TEST_GENERATED_AT,
    currentHead: TEST_HEAD,
    sourceCommit: TEST_HEAD,
  };
  if (proofClass === "runtime_route_health") {
    return {
      ...provenance,
      reportKey: "route-health-reconciliation",
      status: "formal_route_health_passed",
      routeHealthStatusAfter: "formal_route_health_passed",
      runtimeProofRequired: false,
      sourceOnlyCanClear: false,
      delayedClassification: "runtime_verified",
      activeFailureCount: 0,
      validationFailures: [],
    };
  }
  if (proofClass === "provider_smoke") {
    return {
      ...provenance,
      reportKey: "provider-smoke-evidence",
      status: "formal_provider_smoke_passed",
      overallStatus: "formal_provider_smoke_passed",
      externalEvidenceStatus: "formal_provider_proof_attached",
      providerSmoke: { status: "formal_provider_smoke_passed", passed: true },
      paypalRefillSmoke: { formalRepoArtifactAttached: true },
      readinessImpact: { providerSmokeGatePassed: true, paypalSmokeGatePassed: true },
      passingArtifacts: ["agent/evidence/provider-smoke/redacted.json"],
      validationFailures: [],
    };
  }
  return {
    ...provenance,
    reportKey: "admin-truth-sample-evidence",
    status: "formal_admin_truth_sample_passed",
    overallStatus: "formal_admin_truth_sample_passed",
    passed: true,
    formalAdminTruthSamplePassed: true,
    freshAdminTruthSampleAttached: true,
    productionSampleAttached: true,
    sampleCount: 1,
    readinessImpact: { adminTruthSampleGatePassed: true, canClearAdminTruthGate: true },
    passingArtifacts: ["agent/evidence/admin-truth-sample/redacted.json"],
  };
}

describe("final parity telemetry lock", () => {
  it("locks major surface, telemetry, state, and role parity coverage", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.surfaceParityStatus).toBe("pass");
    expect(report.telemetryParityStatus).toBe("pass");
    expect(report.stateParityStatus).toBe("pass");
    expect(report.rolePermissionStatus).toBe("pass");
    expect(report.sourceParityStatus).toBe("pass");
    expect(report.status).toBe("pass");
    expect(report.passed).toBe(true);
    expect(report.sourceCommit).toBe(TEST_HEAD);
    expect(targetedBehaviorHeadsMatch(report.sourceCommit, TEST_HEAD)).toBe(true);
    expect(targetedBehaviorReportIsFresh(report as unknown as Record<string, unknown>)).toBe(true);
    expect(targetedBehaviorReportHasExplicitPass(report as unknown as Record<string, unknown>)).toBe(true);
    expect(report.finalEvidenceStatus).not.toBe("pass");
    expect(report.overallStatus).toBe(report.finalEvidenceStatus);
    expect(report.canClearSourceGate).toBe(true);
    expect(report.canClearRuntimeGate).toBe(false);
    expect(report.canClearProviderGate).toBe(false);
    expect(report.proofClasses.map((proof) => proof.proofClass)).toEqual([
      "source_parity",
      "runtime_route_health",
      "provider_smoke",
      "admin_truth_sample",
    ]);
    expect(report.missingProofClasses.length).toBeGreaterThan(0);
    expect(report.remainingGaps.some((gap) => /typed evidence classes still incomplete/iu.test(gap))).toBe(true);
    expect(report.debugLaneStatus).toBe("simplified");
    expect(report.staleLogicRemoved).toBe(true);
    expect(report.surfacesCovered.sort()).toEqual([...MAJOR_SURFACE_PARITY_IDS].sort());
    expect(report.surfacesMissing).toEqual([]);
    expect(report.scoreBefore).toBe(77.83);
    expect(report.scoreAfter).toBe(77.83);
    expect(report.scoreDimensions).toEqual(expect.arrayContaining(["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"]));
    expect(validateFinalParityTelemetryLockReport(report)).toEqual([]);
  });

  it("rejects reports that claim final pass while typed evidence is incomplete", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
    });
    const invalidReport = {
      ...report,
      overallStatus: "pass" as const,
      finalEvidenceStatus: "pass" as const,
    };

    expect(validateFinalParityTelemetryLockReport(invalidReport)).toEqual(expect.arrayContaining([
      "final evidence status cannot pass while evidence classes are missing.",
    ]));
  });

  it("fails when a major surface is missing from any lock layer", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      omitSurfaceForTest: "chat",
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(targetedBehaviorReportHasExplicitPass(report as unknown as Record<string, unknown>)).toBe(false);
    expect(validateFinalParityTelemetryLockReport(report)).toContain("chat missing from final parity telemetry lock.");
  });

  it("fails closed when provenance is not full-head and current", () => {
    const report = buildFinalParityTelemetryLockReport({
      generatedAtUtc: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      currentHead: "short-head",
      dirtyFiles: [],
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "currentHead and sourceCommit must be the same full 40-character Git SHA.",
      "generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.",
    ]));
  });

  it("accepts only structurally valid current child artifacts with recognized positive verdicts", () => {
    for (const proofClass of ["runtime_route_health", "provider_smoke", "admin_truth_sample"] as const) {
      expect(classifyFinalParityExternalProofArtifact({
        proofClass,
        report: positiveExternalProofArtifact(proofClass),
        currentHead: TEST_HEAD,
        nowMs: TEST_NOW_MS,
      })).toBe("present");
    }
  });

  it("does not infer external proof from positive-looking free text or contradictory booleans", () => {
    const providerDecoy = {
      ...positiveExternalProofArtifact("provider_smoke"),
      status: "missing_formal_evidence",
      overallStatus: "missing_formal_evidence",
      evidenceBoundary: { note: "passed_formal_evidence" },
    };
    const routeDecoy = {
      ...positiveExternalProofArtifact("runtime_route_health"),
      status: "route_health_passed",
      routeHealthStatusAfter: "route_health_passed",
    };
    const contradictoryAdmin = {
      ...positiveExternalProofArtifact("admin_truth_sample"),
      passed: false,
    };

    expect(classifyFinalParityExternalProofArtifact({
      proofClass: "provider_smoke",
      report: providerDecoy,
      currentHead: TEST_HEAD,
      nowMs: TEST_NOW_MS,
    })).toBe("missing");
    expect(classifyFinalParityExternalProofArtifact({
      proofClass: "runtime_route_health",
      report: routeDecoy,
      currentHead: TEST_HEAD,
      nowMs: TEST_NOW_MS,
    })).toBe("missing");
    expect(classifyFinalParityExternalProofArtifact({
      proofClass: "admin_truth_sample",
      report: contradictoryAdmin,
      currentHead: TEST_HEAD,
      nowMs: TEST_NOW_MS,
    })).toBe("missing");
  });

  it("keeps missing, malformed, stale, future, wrong-head, and failed children blocking", () => {
    const validProvider = positiveExternalProofArtifact("provider_smoke");
    const classifyProvider = (report: Record<string, unknown> | null) => classifyFinalParityExternalProofArtifact({
      proofClass: "provider_smoke",
      report,
      currentHead: TEST_HEAD,
      nowMs: TEST_NOW_MS,
    });

    expect(classifyProvider(null)).toBe("missing");
    expect(classifyProvider({ ...validProvider, sourceCommit: "short-head" })).toBe("stale");
    expect(classifyProvider({ ...validProvider, currentHead: "b".repeat(40) })).toBe("stale");
    expect(classifyProvider({ ...validProvider, generatedAtUtc: "2026-07-13T10:59:59.999Z" })).toBe("stale");
    expect(classifyProvider({ ...validProvider, generatedAtUtc: "2026-07-13T12:00:00.000Z" })).toBe("present");
    expect(classifyProvider({ ...validProvider, generatedAtUtc: "2026-07-14T12:00:00.001Z" })).toBe("stale");
    expect(classifyProvider({ ...validProvider, generatedAtUtc: "not-a-timestamp" })).toBe("stale");
    expect(classifyProvider({ ...validProvider, validationFailures: ["provider child failed"] })).toBe("missing");
  });

  it("requires telemetry spine, base states, role mappings, debug lanes, and score dimensions", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: [],
    });
    const chat = report.surfaceLocks.find((surface) => surface.surfaceId === "chat");

    expect(chat?.telemetryEvents).toEqual(SURFACE_TELEMETRY_EVENT_SPINE);
    expect(chat?.states).toEqual(expect.arrayContaining(["loading", "empty", "error"] satisfies Array<(typeof SURFACE_STATE_IDS)[number]>));
    expect(chat?.roles).toEqual(ROLE_PERMISSION_ROLES);
    expect(chat?.permissions).toEqual(ROLE_PERMISSION_IDS);
    expect(chat?.debugLanes).toEqual(expect.arrayContaining(["Surface telemetry parity", "Surface state parity", "Role parity"]));
    expect(chat?.scoreDimensions.length).toBeGreaterThan(0);
  });

  it("classifies final lock dirty files and blocks unknown churn", () => {
    expect(classifyFinalParityTelemetryLockDirtyFile("scripts/agent/validate-final-parity-telemetry-lock.ts")).toBe("validator_artifact_expected");
    expect(classifyFinalParityTelemetryLockDirtyFile("tests/unit/final-parity-telemetry-lock.spec.ts")).toBe("test_artifact_expected");
    expect(classifyFinalParityTelemetryLockDirtyFile("agent/state/final-parity-telemetry-lock.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyFinalParityTelemetryLockDirtyFile("src/components/Navbar.tsx")).toBe("source_change_outside_final_parity");

    const report = buildFinalParityTelemetryLockReport({
      currentHead: TEST_HEAD,
      dirtyFiles: ["src/components/Navbar.tsx"],
    });
    expect(validateFinalParityTelemetryLockReport(report)).not.toContain("src/components/Navbar.tsx is unclassified for final parity telemetry lock.");
  });
});
