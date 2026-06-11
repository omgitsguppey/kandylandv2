import { readJsonFile } from "./shared";

type UiCoverageFile = {
  surfaces: Array<{
    route_or_component: string;
    criticality: "critical" | "high" | "medium";
    blocking_required: boolean;
    playwright_owner: string | null;
    existing_tests: string[];
    hydration_mode: string;
    runtime_canary: {
      protected: boolean;
      helper_paths: string[];
    };
    audit_target: null | {
      auth_required: "none" | "user" | "creator" | "admin";
    };
  }>;
};

const ADMIN_BROWSER_SMOKE_OWNER = "tests/ui-audits/admin-browser-surface-smoke.spec.ts";
const GUEST_RUNTIME_SMOKE_OWNER = "tests/ui-audits/runtime.spec.ts";

export function checkUiSurfaceCoverage() {
  const coverage = readJsonFile<UiCoverageFile>("agent/index/ui-surface-coverage.json");
  const failures: string[] = [];

  if (!Array.isArray(coverage.surfaces) || coverage.surfaces.length === 0) {
    failures.push("ui-surface-coverage.json did not include any discovered surfaces.");
  }

  coverage.surfaces.forEach((surface) => {
    if (!surface.route_or_component) {
      failures.push("A UI surface entry is missing route_or_component.");
    }

    if ((surface.criticality === "critical" || surface.criticality === "high") && surface.existing_tests.length === 0) {
      failures.push(`${surface.route_or_component} is ${surface.criticality} but has no coverage lane.`);
    }

    if (surface.blocking_required && (!surface.playwright_owner || surface.audit_target === null)) {
      failures.push(`${surface.route_or_component} is blocking-required but has no Playwright owner/target.`);
    }

    if (surface.hydration_mode !== "static" && !surface.runtime_canary.protected) {
      failures.push(`${surface.route_or_component} is hydration-sensitive without runtime canary metadata.`);
    }

    if (surface.blocking_required && surface.audit_target?.auth_required !== "none") {
      failures.push(`${surface.route_or_component} is marked blocking-required but still requires authenticated Playwright state.`);
    }

    if (surface.audit_target?.auth_required === "admin") {
      if (surface.playwright_owner !== ADMIN_BROWSER_SMOKE_OWNER) {
        failures.push(`${surface.route_or_component} admin surface must be owned by ${ADMIN_BROWSER_SMOKE_OWNER}.`);
      }
      if (!surface.existing_tests.includes(ADMIN_BROWSER_SMOKE_OWNER)) {
        failures.push(`${surface.route_or_component} admin surface must list ${ADMIN_BROWSER_SMOKE_OWNER} as coverage.`);
      }
      if (surface.existing_tests.includes(GUEST_RUNTIME_SMOKE_OWNER)) {
        failures.push(`${surface.route_or_component} admin surface must not list guest runtime smoke as authenticated coverage.`);
      }
    }
  });

  if (failures.length > 0) {
    throw new Error(`UI surface coverage check failed\n${failures.join("\n")}`);
  }
}

if (require.main === module) {
  checkUiSurfaceCoverage();
  console.log("UI surface coverage is complete.");
}
