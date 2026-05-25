import { describe, expect, it } from "vitest";
import { buildExperimentRolloutRegistryStatus } from "@/lib/experiments/experiment-rollout-registry-status";

describe("experiment rollout registry reconstruction", () => {
  it("does not treat missing registry as configured zero", () => {
    const report = buildExperimentRolloutRegistryStatus({
      configuredCount: 0,
      registryExists: false,
      sourcePath: "rollout registry",
    });

    expect(report.status.status).toBe("registry_missing_actionable");
    expect(report.status.nextAction).toContain("registry");
  });

  it("requires assignment and exposure context for active experiments", () => {
    const report = buildExperimentRolloutRegistryStatus({
      configuredCount: 2,
      activeCount: 1,
      actorResolutionStatus: "missing",
      assignmentSource: "",
      exposureEventSource: "",
      registryExists: true,
      sourcePath: "src/lib/rollouts.ts",
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
    });

    expect(report.status.status).toBe("loaded_with_data");
    expect(report.actorResolutionStatus).toBe("missing");
    expect(report.assignmentSource).toBe("unknown");
  });
});
