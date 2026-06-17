import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBehaviorNormalizationInternals } from "@/lib/behavioral/behavior-normalization-internals-engine";
import { buildTaskCatalogRuntimeReconstruction } from "@/lib/tasks/task-catalog-coverage-engine";
import { buildTaskTelemetryMappingReconstruction } from "@/lib/tasks/task-telemetry-mapping-engine";
import { buildBehavioralIntelligenceSnapshotStatus } from "@/lib/behavioral/behavioral-intelligence-snapshot-status";
import { buildTelemetryTruthRecoveryStatus } from "@/lib/analytics/telemetry-truth-recovery-status";
import { buildExperimentRolloutRegistryStatus } from "@/lib/features/experiments/experiment-rollout-registry-status";

describe("debug cockpit batch 35 behavior stack", () => {
  it("classifies every zero-shell lane with an actionable source/formula status", () => {
    const behavior = buildBehaviorNormalizationInternals({
      normalizedEventCount: 0,
      evalEligibleCount: 0,
      evalEligibleDenominator: 0,
      sourcePath: "orchestration evidence collections",
    });
    const catalog = buildTaskCatalogRuntimeReconstruction({
      builtInCount: 0,
      sourcePath: "src/lib/tasks/task-catalog.ts",
    });
    const mapping = buildTaskTelemetryMappingReconstruction({
      catalogEventCount: 1,
      mappingRowCount: 0,
      sourcePath: "task telemetry mapping",
      aliasScanned: false,
    });
    const intelligence = buildBehavioralIntelligenceSnapshotStatus({
      userProfiles: 0,
      dropProfiles: 0,
      connectedModules: 0,
      sampleSize: 0,
      sourcePath: "behavioral snapshot status",
    });
    const recovery = buildTelemetryTruthRecoveryStatus({
      observedViews: 0,
      checkedViews: 0,
      estimatedViews: 0,
      dropMetricCount: 0,
      userMetricCount: 0,
      sourcePath: "analytics truth recovery",
    });
    const experiments = buildExperimentRolloutRegistryStatus({
      configuredCount: 0,
      registryExists: false,
      sourcePath: "src/lib/rollouts.ts",
    });

    expect(behavior.status.status).not.toBe("loaded_with_data");
    expect(catalog.status.status).toContain("formula_missing");
    expect(mapping.contradictions).toContain("tracked_events_zero_while_catalog_has_task_events");
    expect(intelligence.status.status).toBe("formula_missing_actionable");
    expect(recovery.status.status).toBe("stale_rebuild_required");
    expect(experiments.status.status).toBe("registry_missing_actionable");
  });

  it("wires route payloads and UI source status fields", () => {
    const route = fs.readFileSync("src/app/api/admin/debug/route.ts", "utf8");
    const ui = [
      "src/app/admin/debug/components/DebugAdvancedTruth.tsx",
      "src/app/admin/debug/components/DebugAdvancedBehavior.tsx",
      "src/app/admin/debug/components/DebugAdvancedDrift.tsx",
      "src/app/admin/debug/components/DebugAdvancedTelemetry.tsx",
      "src/app/admin/debug/components/DebugAdvancedExperiments.tsx",
    ].map((file) => fs.readFileSync(file, "utf8")).join("\n");

    expect(route).toContain("behaviorNormalizationInternals");
    expect(route).toContain("taskCatalogRuntimeStatus");
    expect(route).toContain("sourceStatus");
    expect(route).toContain("registryStatus");
    expect(ui).toContain("Source state");
    expect(ui).not.toContain("formula missing\"} truthState=\"live\"");
  });
});
