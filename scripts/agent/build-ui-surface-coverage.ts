import { readFileSync } from "node:fs";
import { buildRepoInventory } from "./classify-repo-files";
import { buildLocalImportGraph } from "./summarize-dependency-graph";
import { compact, createMetadata, fileExists, readJsonFile, toAbsoluteRepoPath, toStableId, unique, validateWithSchema, walkDirectoryFiles, writeJsonFile } from "./shared";

type UiAuditMode = "runtime" | "accessibility" | "visual";

type UiSurfaceCoverageEntry = {
  stable_id: string;
  route_or_component: string;
  surface_type: "page" | "panel" | "modal" | "admin_page" | "dashboard_module" | "public_profile" | "shared_component";
  audience: string[];
  runtime_dependencies: string[];
  hydration_mode: "static" | "client_fetch" | "auth_hydrated" | "realtime" | "mixed";
  criticality: "critical" | "high" | "medium";
  source_readiness_owner: string;
  optional_browser_reproduction_owner: string | null;
  playwright_owner?: string | null;
  lighthouse_required: boolean;
  existing_tests: string[];
  known_gap: string | null;
  blocking_required: boolean;
  runtime_canary: {
    protected: boolean;
    helper_paths: string[];
    observability_lanes: string[];
  };
  audit_target: null | {
    path: string;
    source_route_contract_selector: string;
    hydration_marker: string;
    optional_browser_reproduction_selector: string;
    /**
     * Compatibility aliases for the Playwright audit harness. Source readiness
     * should read the source_* fields above.
     */
    ready_selector: string;
    hydration_signal: string;
    expected_anchors: string[];
    screenshot_selector: string;
    auth_required: "none" | "user" | "creator" | "admin";
    audit_modes: UiAuditMode[];
  };
  coverage_notes: string[];
};

type UiAuditTarget = NonNullable<UiSurfaceCoverageEntry["audit_target"]>;

const UI_SOURCE_READINESS_OWNER = "scripts/agent/check-ui-surface-coverage.ts" as const;
const ADMIN_BROWSER_REPRODUCTION_OWNER = "tests/ui-audits/admin-browser-surface-smoke.spec.ts" as const;
const GUEST_BROWSER_REPRODUCTION_OWNER = "tests/ui-audits/runtime.spec.ts" as const;
const GENERIC_RELATED_TEST_TOKENS = new Set([
  "admin",
  "app",
  "component",
  "components",
  "dashboard",
  "index",
  "page",
  "src",
  "tsx",
]);

function readSource(repoPath: string) {
  return readFileSync(toAbsoluteRepoPath(repoPath), "utf8");
}

function routePathFromPage(pagePath: string) {
  const relative = pagePath.replace(/^src\/app\//, "").replace(/\/page\.tsx$/, "");
  if (!relative) {
    return "/";
  }
  return `/${relative}`;
}

function sourceAuditTarget(input: Omit<UiAuditTarget, "ready_selector" | "hydration_signal" | "screenshot_selector">): UiAuditTarget {
  return {
    ...input,
    ready_selector: input.source_route_contract_selector,
    hydration_signal: input.hydration_marker,
    screenshot_selector: input.optional_browser_reproduction_selector,
  };
}

function optionalBrowserReproductionOwnerFor(auditTarget: UiSurfaceCoverageEntry["audit_target"]) {
  if (!auditTarget) {
    return null;
  }

  if (auditTarget.auth_required === "admin") {
    return ADMIN_BROWSER_REPRODUCTION_OWNER;
  }

  if (auditTarget.auth_required === "none" && auditTarget.audit_modes.includes("runtime")) {
    return GUEST_BROWSER_REPRODUCTION_OWNER;
  }

  return null;
}

function auditTargetFor(routeOrComponent: string, surfaceType: UiSurfaceCoverageEntry["surface_type"]): UiSurfaceCoverageEntry["audit_target"] {
  if (routeOrComponent === "src/app/page.tsx") {
    return sourceAuditTarget({
      path: "/",
      source_route_contract_selector: "main",
      hydration_marker: "main",
      expected_anchors: ["KandyDrops"],
      optional_browser_reproduction_selector: "main section:first-of-type",
      auth_required: "none" as const,
      audit_modes: ["runtime", "accessibility", "visual"],
    });
  }

  if (routeOrComponent === "src/app/privacy/page.tsx") {
    return sourceAuditTarget({
      path: "/privacy",
      source_route_contract_selector: "main",
      hydration_marker: "main",
      expected_anchors: ["How KandyDrops handles your data"],
      optional_browser_reproduction_selector: "main",
      auth_required: "none" as const,
      audit_modes: ["runtime", "accessibility", "visual"],
    });
  }

  if (routeOrComponent === "src/app/creators/apply/page.tsx") {
    return sourceAuditTarget({
      path: "/creators/apply",
      source_route_contract_selector: "main",
      hydration_marker: "main",
      expected_anchors: ["Apply for creator access"],
      optional_browser_reproduction_selector: "main section:first-of-type",
      auth_required: "none" as const,
      audit_modes: ["runtime", "accessibility", "visual"],
    });
  }

  if (routeOrComponent === "src/app/creators/waitlist/page.tsx") {
    return sourceAuditTarget({
      path: "/creators/waitlist",
      source_route_contract_selector: "main",
      hydration_marker: "main",
      expected_anchors: ["Start your creator application"],
      optional_browser_reproduction_selector: "main section:first-of-type",
      auth_required: "none" as const,
      audit_modes: ["runtime", "accessibility", "visual"],
    });
  }

  if (routeOrComponent === "src/app/dashboard/page.tsx") {
    return sourceAuditTarget({
      path: "/dashboard",
      source_route_contract_selector: "#dashboard-home, main",
      hydration_marker: "#dashboard-home",
      expected_anchors: ["Your Stats"],
      optional_browser_reproduction_selector: "#dashboard-home",
      auth_required: "user",
      audit_modes: ["runtime"],
    });
  }

  if (routeOrComponent.startsWith("src/app/admin/")) {
    return sourceAuditTarget({
      path: routePathFromPage(routeOrComponent),
      source_route_contract_selector: "main",
      hydration_marker: "main",
      expected_anchors: ["Admin"],
      optional_browser_reproduction_selector: "main",
      auth_required: "admin" as const,
      audit_modes: ["runtime"],
    });
  }

  return null;
}

function audienceFor(repoPath: string) {
  if (repoPath.startsWith("src/app/admin/")) return ["admin"];
  if (repoPath.startsWith("src/app/dashboard/") || repoPath.includes("CreatorWorkspacePanel")) return ["user", "creator"];
  if (repoPath.includes("creators/[username]")) return ["guest", "user"];
  if (repoPath.includes("creators/apply") || repoPath.includes("creators/waitlist")) return ["guest", "creator"];
  return ["guest", "user"];
}

function hydrationModeFor(repoPath: string, source: string, runtimeDependencies: string[]) {
  const usesClient = source.includes('"use client"') || source.includes("'use client'");
  const usesRealtime = source.includes("onSnapshot") || source.includes("reportRealtimeIssue");
  const usesAuth = source.includes("useAuth(") || source.includes("authFetch(");
  const usesFetch = source.includes("fetch(") || source.includes("authFetch(") || runtimeDependencies.some((entry) => entry.startsWith("src/app/api/"));
  if (usesRealtime) return "realtime";
  if (usesAuth && usesFetch) return "auth_hydrated";
  if (usesClient && usesFetch) return "client_fetch";
  return "static";
}

function criticalityFor(repoPath: string) {
  if (
    repoPath === "src/app/page.tsx"
    || repoPath === "src/app/dashboard/page.tsx"
    || repoPath === "src/app/creators/[username]/page.tsx"
    || repoPath === "src/app/creators/[username]/CreatorProfileClient.tsx"
  ) {
    return "critical" as const;
  }

  if (
    repoPath.startsWith("src/app/admin/")
    || repoPath.includes("CreatorWorkspacePanel")
    || repoPath.includes("CreatorExperiencesPanel")
  ) {
    return "high" as const;
  }

  return "medium" as const;
}

function surfaceTypeFor(repoPath: string) {
  if (repoPath.startsWith("src/app/admin/")) return "admin_page" as const;
  if (repoPath.includes("CreatorWorkspacePanel")) return "dashboard_module" as const;
  if (repoPath.includes("CreatorProfileClient") || repoPath === "src/app/creators/[username]/page.tsx") return "public_profile" as const;
  if (repoPath.startsWith("src/app/")) return "page" as const;
  return "shared_component" as const;
}

function runtimeCanaryFor(repoPath: string, source: string) {
  const protectedByHelper = source.includes("loadUiContinuityModules(");
  const protectedByLegacyDiagnostics =
    source.includes("reportClientIssue(")
    || source.includes("Promise.allSettled(")
    || source.includes("useAdminPollingSWR(")
    || source.includes("useHistoricalSectionOverride(");
  const protectedState = protectedByHelper || protectedByLegacyDiagnostics;
  return {
    protected: protectedState,
    helper_paths: protectedByHelper
      ? ["src/lib/ui-continuity.ts", "src/components/ui/UiContinuityNotice.tsx"]
      : protectedByLegacyDiagnostics
        ? [repoPath]
        : [],
    observability_lanes: compact([
      protectedState ? "server_diagnostics" : null,
      protectedState ? "route_runtime_health" : null,
      repoPath.startsWith("src/app/admin/") ? "admin_ui_chart_health" : null,
    ]),
  };
}

function relatedTestsFor(repoPath: string, testFiles: string[]) {
  const manual = compact([
    repoPath === "src/app/dashboard/page.tsx" ? "tests/unit/dashboard-viewer-page.spec.tsx" : null,
    repoPath.includes("creators/[username]") ? "tests/unit/creator-experiences-panel.spec.tsx" : null,
    repoPath.includes("CreatorWorkspacePanel") ? "tests/unit/creator-workspace-panel.spec.tsx" : null,
    repoPath.includes("CreatorExperiencesPanel") ? "tests/unit/creator-experiences-panel.spec.tsx" : null,
  ]).filter((entry) => testFiles.includes(entry));
  const normalized = repoPath.replace(/^src\/app\//, "").replace(/^src\/components\//, "").toLowerCase();
  const tokens = unique(
    normalized
      .replace(/page\.tsx$|\.tsx$/g, "")
      .split(/[/_-]+/)
      .filter((token) => token.length > 2 && token !== "username" && !GENERIC_RELATED_TEST_TOKENS.has(token)),
  );

  return unique([...manual, ...testFiles.filter((testPath) => tokens.some((token) => testPath.toLowerCase().includes(token)))]);
}

function runtimeDependenciesFor(repoPath: string, graph: ReturnType<typeof buildLocalImportGraph>) {
  const node = graph.get(repoPath);
  if (!node) {
    return [];
  }

  return [...node.imports]
    .filter((entry) =>
      entry.startsWith("src/app/api/")
      || entry.startsWith("src/hooks/")
      || entry.startsWith("src/lib/server/")
      || entry.startsWith("src/lib/"),
    )
    .sort();
}

function buildSurfaceEntries() {
  const graph = buildLocalImportGraph();
  const inventory = buildRepoInventory();
  const surfaceMap = fileExists("agent/index/surface-map.json")
    ? readJsonFile<{ domains: Array<{ name: string; path_prefixes: string[] }> }>("agent/index/surface-map.json")
    : { domains: [] };
  const existingUiTests = walkDirectoryFiles("tests/ui-audits").filter((entry) => entry.endsWith(".ts"));
  const unitTests = walkDirectoryFiles("tests/unit").filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"));
  const testFiles = [...existingUiTests, ...unitTests];

  const pageFiles = inventory
    .filter((entry) => entry.path.startsWith("src/app/") && entry.path.endsWith("/page.tsx") && !entry.path.startsWith("src/app/api/"))
    .map((entry) => entry.path);
  const componentFiles = inventory
    .filter((entry) => [
      "src/components/Dashboard/CreatorWorkspacePanel.tsx",
      "src/components/Creators/CreatorExperiencesPanel.tsx",
      "src/components/Creators/CreatorProfileHeader.tsx",
      "src/components/Creators/CreatorUpdatesFeed.tsx",
      "src/components/DropGrid.tsx",
    ].includes(entry.path))
    .map((entry) => entry.path);

  return [...pageFiles, ...componentFiles]
    .map((repoPath) => {
      const source = readSource(repoPath);
      const surface_type = surfaceTypeFor(repoPath);
      const runtime_dependencies = runtimeDependenciesFor(repoPath, graph);
      const hydration_mode = hydrationModeFor(repoPath, source, runtime_dependencies);
      const criticality = criticalityFor(repoPath);
      const audit_target = auditTargetFor(repoPath, surface_type);
      const canary = runtimeCanaryFor(repoPath, source);
      const existing_tests = unique([
        ...relatedTestsFor(repoPath, testFiles),
        ...(repoPath.startsWith("src/app/admin/") ? [ADMIN_BROWSER_REPRODUCTION_OWNER] : []),
        ...(audit_target ? [
          ...(audit_target.audit_modes.includes("runtime") && audit_target.auth_required === "none" ? [GUEST_BROWSER_REPRODUCTION_OWNER] : []),
          ...(audit_target.audit_modes.includes("accessibility") ? ["tests/ui-audits/accessibility.spec.ts"] : []),
          ...(audit_target.audit_modes.includes("visual") ? ["tests/ui-audits/visual-regression.spec.ts"] : []),
        ] : []),
      ]).sort();
      const optional_browser_reproduction_owner = optionalBrowserReproductionOwnerFor(audit_target);
      const blocking_required = audit_target !== null && audit_target.auth_required === "none" && criticality !== "medium";
      const known_gap = compact([
        hydration_mode !== "static" && !canary.protected ? "hydration_sensitive_surface_missing_runtime_canary" : null,
        criticality !== "medium" && existing_tests.length === 0 ? "high_or_critical_surface_missing_coverage_lane" : null,
        audit_target && audit_target.auth_required === "admin" ? "authenticated_admin_source_coverage_indexed_browser_optional" : null,
        audit_target && audit_target.auth_required !== "none" && audit_target.auth_required !== "admin" ? "auth_required_surface_source_indexed_browser_reproduction_unassigned" : null,
      ])[0] ?? null;
      const coverage_notes = compact([
        blocking_required ? "Blocking public surface has a source route contract selector; browser reproduction remains optional diagnostic tooling." : null,
        audit_target && audit_target.auth_required === "admin" ? "Admin surface source readiness is owned by route and selector coverage; authenticated browser smoke is optional reproduction only." : null,
        audit_target && audit_target.auth_required !== "none" ? `Auth-required surface indexed with ${audit_target.auth_required} audit requirement.` : null,
        !runtime_dependencies.length ? "No direct runtime dependency imports detected." : null,
        surfaceMap.domains.find((domain) => domain.path_prefixes.some((prefix) => repoPath.startsWith(prefix)))?.name
          ? `Mapped to ${surfaceMap.domains.find((domain) => domain.path_prefixes.some((prefix) => repoPath.startsWith(prefix)))?.name}.`
          : null,
      ]);

      return {
        stable_id: toStableId("ui_surface", repoPath),
        route_or_component: repoPath,
        surface_type,
        audience: audienceFor(repoPath),
        runtime_dependencies,
        hydration_mode,
        criticality,
        source_readiness_owner: UI_SOURCE_READINESS_OWNER,
        optional_browser_reproduction_owner,
        playwright_owner: optional_browser_reproduction_owner,
        lighthouse_required: repoPath === "src/app/page.tsx" || repoPath === "src/app/creators/[username]/page.tsx",
        existing_tests,
        known_gap,
        blocking_required,
        runtime_canary: canary,
        audit_target,
        coverage_notes,
      } satisfies UiSurfaceCoverageEntry;
    })
    .sort((left, right) => left.route_or_component.localeCompare(right.route_or_component));
}

export function buildUiSurfaceCoverage() {
  const payload = {
    ...createMetadata([
      "agent/index/surface-map.json",
      "src/app",
      "src/components",
      "src/hooks",
      "tests/ui-audits",
      "tests/unit",
    ]),
    surfaces: buildSurfaceEntries(),
  };

  writeJsonFile("agent/index/ui-surface-coverage.json", payload);
  validateWithSchema("agent/schemas/ui-surface-coverage.schema.json", payload);
  return payload;
}

if (require.main === module) {
  buildUiSurfaceCoverage();
  console.log("UI surface coverage generated.");
}
