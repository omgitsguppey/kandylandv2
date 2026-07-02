import { readJsonFile } from "./shared";

type UiAuditTarget = {
  auth_required: "none" | "user" | "creator" | "admin";
  source_route_contract_selector?: string;
  hydration_marker?: string;
  expected_anchors?: string[];
  ready_selector?: string;
  hydration_signal?: string;
};

type UiCoverageFile = {
  surfaces: Array<{
    route_or_component: string;
    criticality: "critical" | "high" | "medium";
    blocking_required: boolean;
    source_readiness_owner?: string;
    optional_browser_reproduction_owner?: string | null;
    playwright_owner?: string | null;
    existing_tests: string[];
    hydration_mode: string;
    runtime_canary: {
      protected: boolean;
      helper_paths: string[];
    };
    audit_target: null | UiAuditTarget;
  }>;
};

const ADMIN_BROWSER_REPRODUCTION_OWNER = "tests/ui-audits/admin-browser-surface-smoke.spec.ts";
const GUEST_BROWSER_REPRODUCTION_OWNER = "tests/ui-audits/runtime.spec.ts";

function sourceRouteContractSelector(target: UiAuditTarget | null) {
  return target?.source_route_contract_selector ?? target?.ready_selector ?? "";
}

function hydrationMarker(target: UiAuditTarget | null) {
  return target?.hydration_marker ?? target?.hydration_signal ?? "";
}

function optionalBrowserReproductionOwner(surface: UiCoverageFile["surfaces"][number]) {
  return surface.optional_browser_reproduction_owner ?? surface.playwright_owner ?? null;
}

export function validateUiSurfaceCoveragePayload(coverage: UiCoverageFile) {
  const failures: string[] = [];

  if (!Array.isArray(coverage.surfaces) || coverage.surfaces.length === 0) {
    failures.push("ui-surface-coverage.json did not include any discovered surfaces.");
    return failures;
  }

  coverage.surfaces.forEach((surface) => {
    if (!surface.route_or_component) {
      failures.push("A UI surface entry is missing route_or_component.");
    }

    if ((surface.criticality === "critical" || surface.criticality === "high") && surface.existing_tests.length === 0) {
      failures.push(`${surface.route_or_component} is ${surface.criticality} but has no coverage lane.`);
    }

    if (surface.audit_target !== null) {
      if (!sourceRouteContractSelector(surface.audit_target).trim()) {
        failures.push(`${surface.route_or_component} has an audit target without a source route contract selector.`);
      }
      if (!hydrationMarker(surface.audit_target).trim()) {
        failures.push(`${surface.route_or_component} has an audit target without a hydration marker.`);
      }
      if (!Array.isArray(surface.audit_target.expected_anchors) || surface.audit_target.expected_anchors.length === 0) {
        failures.push(`${surface.route_or_component} has an audit target without expected source anchors.`);
      }
    }

    if (surface.blocking_required && surface.audit_target === null) {
      failures.push(`${surface.route_or_component} is source-blocking but has no source audit target.`);
    }

    if (surface.hydration_mode !== "static" && !surface.runtime_canary.protected) {
      failures.push(`${surface.route_or_component} is hydration-sensitive without runtime canary metadata.`);
    }

    if (surface.blocking_required && surface.audit_target?.auth_required !== "none") {
      failures.push(`${surface.route_or_component} is marked source-blocking but still requires authenticated UI state.`);
    }

    if (surface.audit_target?.auth_required === "admin") {
      const owner = optionalBrowserReproductionOwner(surface);
      if (owner !== null && owner !== ADMIN_BROWSER_REPRODUCTION_OWNER) {
        failures.push(`${surface.route_or_component} admin optional browser reproduction owner must be ${ADMIN_BROWSER_REPRODUCTION_OWNER} when present.`);
      }
      if (surface.existing_tests.includes(GUEST_BROWSER_REPRODUCTION_OWNER)) {
        failures.push(`${surface.route_or_component} admin surface must not list guest runtime smoke as authenticated coverage.`);
      }
    }
  });

  return failures;
}

export function checkUiSurfaceCoverage() {
  const coverage = readJsonFile<UiCoverageFile>("agent/index/ui-surface-coverage.json");
  const failures = validateUiSurfaceCoveragePayload(coverage);

  if (failures.length > 0) {
    throw new Error(`UI surface coverage check failed\n${failures.join("\n")}`);
  }
}

if (require.main === module) {
  checkUiSurfaceCoverage();
  console.log("UI surface coverage is complete.");
}
