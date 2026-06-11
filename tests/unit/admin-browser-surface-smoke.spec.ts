import { describe, expect, it } from "vitest";

import {
  ADMIN_BROWSER_SURFACE_DEFINITIONS,
  buildAdminBrowserSurfaceSmokeReport,
  validateAdminBrowserSurfaceSmokeReport,
  type AdminBrowserSurfaceSmokeReport,
} from "@/lib/evidence/admin-browser-surface-smoke-contract";

describe("admin browser surface smoke contract", () => {
  it("tracks every admin page as authenticated browser-pending by default", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      currentHead: "abc123",
      generatedAtUtc: "2026-06-11T12:00:00.000Z",
    });

    expect(report.reportKey).toBe("admin-browser-surface-smoke");
    expect(report.status).toBe("authenticated_browser_pending");
    expect(report.passed).toBe(false);
    expect(report.summary.adminSurfaceCount).toBe(14);
    expect(report.summary.routeCount).toBe(14);
    expect(report.summary.requiredAuthenticatedSurfaceCount).toBe(18);
    expect(report.summary.manualAdminAuthRequiredCount).toBe(18);
    expect(report.protectedSurfaceIds).toEqual(["admin_economy"]);
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
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual([]);
  });

  it("records unauthenticated browser boundary evidence without clearing authenticated admin checks", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
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
    expect(report.doesNotProve).toEqual(expect.arrayContaining([
      expect.stringContaining("production admin truth sample"),
      expect.stringContaining("GumDrop treasury truth"),
    ]));
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual([]);
  });

  it("rejects unknown surfaces and formal gate overclaims", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
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
      "evidence references unknown surface: admin_fake",
      "admin_fake:desktop overclaims formal gate impact.",
    ]));
  });
});
