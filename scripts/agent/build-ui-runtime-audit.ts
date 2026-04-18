import { readJsonFile } from "./shared";

type UiCoverageFile = {
  surfaces: Array<{
    route_or_component: string;
    hydration_mode: "static" | "client_fetch" | "auth_hydrated" | "realtime" | "mixed";
    runtime_canary: {
      protected: boolean;
      helper_paths: string[];
      observability_lanes: string[];
    };
    audit_target: null | {
      hydration_signal: string;
      expected_anchors: string[];
    };
  }>;
};

type ObservabilityFile = {
  lanes: Array<{ key: string }>;
};

export function buildUiRuntimeAudit() {
  const coverage = readJsonFile<UiCoverageFile>("agent/index/ui-surface-coverage.json");
  const observability = readJsonFile<ObservabilityFile>("agent/index/runtime-observability.json");
  const observabilityKeys = new Set(observability.lanes.map((lane) => lane.key));
  const failures: string[] = [];

  coverage.surfaces.forEach((surface) => {
    if (surface.hydration_mode === "static") {
      return;
    }

    if (!surface.runtime_canary.protected) {
      failures.push(`${surface.route_or_component} is ${surface.hydration_mode} without a runtime canary.`);
    }

    if (surface.runtime_canary.helper_paths.length === 0) {
      failures.push(`${surface.route_or_component} has no continuity helper paths recorded.`);
    }

    const missingLanes = surface.runtime_canary.observability_lanes.filter((lane) => !observabilityKeys.has(lane));
    if (missingLanes.length > 0) {
      failures.push(`${surface.route_or_component} references missing observability lanes: ${missingLanes.join(", ")}`);
    }

    if (surface.audit_target && surface.audit_target.expected_anchors.length === 0) {
      failures.push(`${surface.route_or_component} has an audit target without expected anchors.`);
    }
  });

  if (failures.length > 0) {
    throw new Error(`UI runtime audit failed\n${failures.join("\n")}`);
  }

  return {
    hydrationSensitiveSurfaceCount: coverage.surfaces.filter((surface) => surface.hydration_mode !== "static").length,
    protectedSurfaceCount: coverage.surfaces.filter((surface) => surface.runtime_canary.protected).length,
  };
}

if (require.main === module) {
  const summary = buildUiRuntimeAudit();
  console.log(`UI runtime audit passed for ${summary.protectedSurfaceCount}/${summary.hydrationSensitiveSurfaceCount} hydration-sensitive surfaces.`);
}
