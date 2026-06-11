import { describe, expect, it } from "vitest";

import {
  ADMIN_BROWSER_SURFACE_DEFINITIONS,
  buildAdminBrowserSurfaceSmokeReport,
  validateAdminBrowserSurfaceSmokeReport,
  type AdminBrowserSurfaceSmokeReport,
} from "@/lib/evidence/admin-browser-surface-smoke-contract";
import { resolveAdminBrowserSurfaceForPathname } from "@/lib/admin/admin-browser-surface-map";

const LOCAL_BROWSER_PROVENANCE = {
  inputPath: "agent/evidence/admin-browser-surface-smoke/evidence.json",
  source: "local_in_app_browser" as const,
  baseUrl: "http://127.0.0.1:3210",
  capturedAtUtc: "2026-06-11T12:00:00.000Z",
  noteCount: 1,
  notes: ["Unit fixture for local browser evidence."],
};

const LAYOUT_SELECTOR_CONTRACT = {
  ownerPath: "src/app/admin/layout.tsx" as const,
  hasSurfaceAttribute: true,
  hasRouteAttribute: true,
  hasGroupAttribute: true,
  usesSurfaceResolver: true,
};

describe("admin browser surface smoke contract", () => {
  it("tracks every admin page as authenticated browser-pending by default", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      currentHead: "abc123",
      generatedAtUtc: "2026-06-11T12:00:00.000Z",
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
    });

    expect(report.reportKey).toBe("admin-browser-surface-smoke");
    expect(report.status).toBe("authenticated_browser_pending");
    expect(report.evidenceClass).toBe("generated_snapshot");
    expect(report.canClearSourceGate).toBe(true);
    expect(report.canClearRuntimeGate).toBe(false);
    expect(report.canClearProviderGate).toBe(false);
    expect(report.canClearAdminTruthGate).toBe(false);
    expect(report.sourceFileDiscovery).toBe("git");
    expect(report.gitStatus).toBe("available");
    expect(report.freshness).toBe("fresh");
    expect(report.cleanupCommand).toBe("npm run check:admin-browser-surface-smoke");
    expect(report.totalFindingCount).toBe(18);
    expect(report.emittedFindingCount).toBe(18);
    expect(report.highRiskCounts.signoff).toBe(18);
    expect(report.highRiskCounts.payment).toBe(1);
    expect(report.passed).toBe(false);
    expect(report.summary.adminSurfaceCount).toBe(14);
    expect(report.summary.routeCount).toBe(14);
    expect(report.summary.sourceAdminPageCount).toBe(14);
    expect(report.summary.layoutSelectorContractPresent).toBe(true);
    expect(report.summary.requiredAuthenticatedSurfaceCount).toBe(18);
    expect(report.summary.manualAdminAuthRequiredCount).toBe(18);
    expect(report.evidenceProvenance.source).toBe("none");
    expect(report.evidenceProvenance.evidenceMode).toBe("none");
    expect(report.protectedSurfaceIds).toEqual(["admin_economy"]);
    expect(report.surfaces.find((surface) => surface.surfaceId === "admin_debug")?.authenticatedVisibleMarkers).toEqual(expect.arrayContaining([
      "Debug Console",
      "data-admin-mobile-surface=debug",
    ]));
    expect(report.surfaces.find((surface) => surface.surfaceId === "admin_debug")?.authenticatedSelectors).toEqual([
      '[data-admin-browser-surface="admin_debug"]',
    ]);
    expect(report.surfaces.map((surface) => surface.route)).toEqual([
      "/admin",
      "/admin/analytics",
      "/admin/drops",
      "/admin/users",
      "/admin/user/[userId]",
      "/admin/roster",
      "/admin/debug",
      "/admin/ai",
      "/admin/support",
      "/admin/moderation",
      "/admin/content",
      "/admin/queue",
      "/admin/privacy",
      "/admin/economy",
    ]);
    expect(report.surfaces.find((surface) => surface.surfaceId === "admin_user_detail")?.browserSmokePath).toBe("/admin/user/browser-smoke-user");
    expect(report.sourceAdminRoutes).toEqual(report.surfaces.map((surface) => surface.route).sort());
    expect(report.missingSourceAdminRoutes).toEqual([]);
    expect(report.extraSurfaceRoutes).toEqual([]);
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual([]);
  });

  it("resolves canonical browser surface ids for concrete admin paths", () => {
    expect(resolveAdminBrowserSurfaceForPathname("/admin")?.surfaceId).toBe("admin_overview");
    expect(resolveAdminBrowserSurfaceForPathname("/admin/debug")?.surfaceId).toBe("admin_debug");
    expect(resolveAdminBrowserSurfaceForPathname("/admin/user/example-user")?.surfaceId).toBe("admin_user_detail");
    expect(resolveAdminBrowserSurfaceForPathname("/admin/not-implemented")).toBeNull();
  });

  it("keeps every admin browser surface route and selector uniquely resolvable", () => {
    const selectors = ADMIN_BROWSER_SURFACE_DEFINITIONS.flatMap((surface) => surface.authenticatedSelectors);
    expect(new Set(selectors).size).toBe(selectors.length);

    for (const surface of ADMIN_BROWSER_SURFACE_DEFINITIONS) {
      expect(surface.authenticatedSelectors).toContain(`[data-admin-browser-surface="${surface.surfaceId}"]`);
      expect(surface.browserSmokePath.startsWith("/admin")).toBe(true);
      expect(surface.browserSmokePath).not.toContain("[");
      if (surface.route.includes("[userId]")) continue;
      expect(resolveAdminBrowserSurfaceForPathname(surface.route)?.surfaceId).toBe(surface.surfaceId);
    }
  });

  it("records unauthenticated browser boundary evidence without clearing authenticated admin checks", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      evidence: ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface) => ({
        surfaceId: surface.surfaceId,
        route: surface.route,
        deviceBand: surface.deviceBands[0],
        state: "unauth_boundary_verified" as const,
        urlAfterNavigation: "/",
        visibleMarker: "auth boundary",
      })),
    });

    expect(report.status).toBe("browser_boundary_partial");
    expect(report.summary.unauthBoundaryEvidenceCount).toBe(14);
    expect(report.summary.unauthRedirectEvidenceCount).toBe(0);
    expect(report.summary.authenticatedSurfaceEvidenceCount).toBe(0);
    expect(report.summary.manualAdminAuthRequiredCount).toBeGreaterThan(0);
    expect(report.evidenceProvenance.source).toBe("local_in_app_browser");
    expect(report.evidenceProvenance.evidenceMode).toBe("unauthenticated_only");
    expect(report.evidenceProvenance.baseUrl).toBe("http://127.0.0.1:3210");
    expect(report.doesNotProve).toEqual(expect.arrayContaining([
      expect.stringContaining("production admin truth sample"),
      expect.stringContaining("GumDrop treasury truth"),
    ]));
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual([]);
  });

  it("requires diagnostic fields before authenticated browser evidence can be accepted", () => {
    const incomplete = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      evidence: [{
        surfaceId: "admin_debug",
        route: "/admin/debug",
        deviceBand: "desktop",
        state: "authenticated_surface_verified",
      }],
    });

    expect(validateAdminBrowserSurfaceSmokeReport(incomplete)).toEqual(expect.arrayContaining([
      "admin_debug:desktop authenticated evidence must include checkedAtUtc.",
      "admin_debug:desktop authenticated evidence must include urlAfterNavigation.",
      "admin_debug:desktop authenticated evidence must include a visible admin marker.",
    ]));

    const complete = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      evidence: [{
        surfaceId: "admin_debug",
        route: "/admin/debug",
        deviceBand: "desktop",
        state: "authenticated_surface_verified",
        checkedAtUtc: "2026-06-11T12:00:00.000Z",
        urlAfterNavigation: "/admin/debug",
        visibleMarker: "data-admin-mobile-surface=debug",
      }],
    });

    expect(validateAdminBrowserSurfaceSmokeReport(complete)).toEqual([]);

    const wrongMarker = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      evidence: [{
        surfaceId: "admin_debug",
        route: "/admin/debug",
        deviceBand: "desktop",
        state: "authenticated_surface_verified",
        checkedAtUtc: "2026-06-11T12:00:00.000Z",
        urlAfterNavigation: "/admin/debug",
        visibleMarker: "Content Manager",
      }],
    });

    expect(validateAdminBrowserSurfaceSmokeReport(wrongMarker)).toEqual(expect.arrayContaining([
      "admin_debug:desktop authenticated evidence marker must match one of: Debug Console, data-admin-mobile-surface=debug, data-admin-debug-sprawl-reduction=target-75-95.",
    ]));
  });

  it("rejects unknown surfaces and formal gate overclaims", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      evidence: [{
        surfaceId: "admin_debug",
        route: "/admin/debug",
        deviceBand: "desktop",
        state: "authenticated_surface_verified",
      }],
    });
    const invalid = {
      ...report,
      passed: true,
      canClearRuntimeGate: true,
      evidence: [
        ...report.evidence,
        {
          surfaceId: "admin_fake",
          route: "/admin/fake",
          deviceBand: "desktop",
          state: "authenticated_surface_verified",
          formalGateImpact: {
            clearsRuntimeSmoke: true,
            clearsProviderSmoke: false,
            clearsAdminTruthSample: false,
            clearsPaymentOrTreasuryTruth: false,
          },
        },
      ],
    } as unknown as AdminBrowserSurfaceSmokeReport;

    expect(validateAdminBrowserSurfaceSmokeReport(invalid)).toEqual(expect.arrayContaining([
      "admin browser smoke must not mark itself passed inside source validation.",
      "admin browser smoke cannot clear runtime, provider, or admin truth gates.",
      "evidence references unknown surface: admin_fake",
      "admin_fake:desktop overclaims formal gate impact.",
    ]));
  });

  it("fails when a source admin page is not represented in the browser smoke matrix", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      sourceAdminRoutes: [
        ...ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface) => surface.route),
        "/admin/new-panel",
      ],
    });

    expect(report.missingSourceAdminRoutes).toEqual(["/admin/new-panel"]);
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual(expect.arrayContaining([
      "admin browser smoke is missing source admin routes: /admin/new-panel.",
    ]));
  });

  it("fails when the shared admin layout does not expose browser smoke selectors", () => {
    const report = buildAdminBrowserSurfaceSmokeReport();

    expect(report.summary.layoutSelectorContractPresent).toBe(false);
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual(expect.arrayContaining([
      "admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-surface.",
      "admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-route.",
      "admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-surface-group.",
      "admin browser smoke requires src/app/admin/layout.tsx to use resolveAdminBrowserSurfaceForPathname.",
    ]));
  });
});
