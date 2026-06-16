import { describe, expect, it } from "vitest";

import { MAJOR_SURFACE_PARITY_IDS } from "@/lib/parity/surface-parity-contract";
import { SURFACE_TELEMETRY_EVENT_SPINE } from "@/lib/telemetry/surface-telemetry-contract";
import { SURFACE_STATE_IDS } from "@/lib/parity/surface-state-contract";
import { ROLE_PERMISSION_IDS, ROLE_PERMISSION_ROLES } from "@/lib/parity/role-permission-contract";
import {
  buildFinalParityTelemetryLockReport,
  classifyFinalParityTelemetryLockDirtyFile,
  validateFinalParityTelemetryLockReport,
} from "../../scripts/agent/validate-final-parity-telemetry-lock";

describe("final parity telemetry lock", () => {
  it("locks major surface, telemetry, state, and role parity coverage", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: "test-head",
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.surfaceParityStatus).toBe("pass");
    expect(report.telemetryParityStatus).toBe("pass");
    expect(report.stateParityStatus).toBe("pass");
    expect(report.rolePermissionStatus).toBe("pass");
    expect(report.sourceParityStatus).toBe("pass");
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
    expect(report.remainingGaps.some((gap) => /formal proof classes still incomplete/iu.test(gap))).toBe(true);
    expect(report.debugLaneStatus).toBe("simplified");
    expect(report.staleLogicRemoved).toBe(true);
    expect(report.surfacesCovered.sort()).toEqual([...MAJOR_SURFACE_PARITY_IDS].sort());
    expect(report.surfacesMissing).toEqual([]);
    expect(report.scoreBefore).toBe(77.83);
    expect(report.scoreAfter).toBe(77.83);
    expect(report.scoreDimensions).toEqual(expect.arrayContaining(["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"]));
    expect(validateFinalParityTelemetryLockReport(report)).toEqual([]);
  });

  it("rejects reports that claim final pass while formal proof is incomplete", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: "test-head",
      dirtyFiles: [],
    });
    const invalidReport = {
      ...report,
      overallStatus: "pass" as const,
      finalEvidenceStatus: "pass" as const,
    };

    expect(validateFinalParityTelemetryLockReport(invalidReport)).toEqual(expect.arrayContaining([
      "final evidence status cannot pass while proof classes are missing.",
    ]));
  });

  it("fails when a major surface is missing from any lock layer", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: "test-head",
      dirtyFiles: [],
      omitSurfaceForTest: "chat",
    });

    expect(validateFinalParityTelemetryLockReport(report)).toContain("chat missing from final parity telemetry lock.");
  });

  it("requires telemetry spine, base states, role mappings, debug lanes, and score dimensions", () => {
    const report = buildFinalParityTelemetryLockReport({
      currentHead: "test-head",
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
      currentHead: "test-head",
      dirtyFiles: ["src/components/Navbar.tsx"],
    });
    expect(validateFinalParityTelemetryLockReport(report)).not.toContain("src/components/Navbar.tsx is unclassified for final parity telemetry lock.");
  });
});
