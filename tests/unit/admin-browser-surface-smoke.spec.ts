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

const BROWSER_HARNESS_CONTRACT = {
  ownerPath: "tests/ui-audits/admin-browser-surface-smoke.spec.ts" as const,
  packageScriptName: "check:admin-browser-surface-smoke:browser" as const,
  packageScriptPresent: true,
  importsCanonicalSurfaceMap: true,
  gatedByExplicitEnv: true,
  usesStorageStateEnv: true,
  supportsLocalFixtureSession: true,
  usesCanonicalSelectors: true,
  usesBrowserSmokePath: true,
  checksRouteAttribute: true,
  rejectsPublicHomeFallback: true,
  writesOptionalEvidenceDir: true,
};

const SOURCE_SMOKE_CONTRACTS = {
  routeContractPresent: true,
  layoutHydrationMarkerPresent: true,
  controlTowerFixtureSourceReportsOnly: true,
  routeRuntimeHealthVerificationPresent: true,
  clientErrorFixturePresent: true,
};

function fixtureEvidenceForAllDeviceBands() {
  return ADMIN_BROWSER_SURFACE_DEFINITIONS.flatMap((surface) =>
    surface.deviceBands.map((deviceBand) => ({
      surfaceId: surface.surfaceId,
      route: surface.route,
      deviceBand,
      state: "local_fixture_surface_verified" as const,
      checkedAtUtc: "2026-06-11T12:00:00.000Z",
      urlAfterNavigation: surface.browserSmokePath,
      selectorUsed: surface.authenticatedSelectors[0],
      visibleMarker: surface.authenticatedVisibleMarkers[0],
    })),
  );
}

describe("admin browser surface smoke contract", () => {
  it("tracks every admin page as authenticated browser-pending by default", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      currentHead: "abc123",
      generatedAtUtc: "2026-06-11T12:00:00.000Z",
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
    });

    expect(report.reportKey).toBe("admin-browser-surface-smoke");
    expect(report.status).toBe("source_contract_ready");
    expect(report.evidenceClass).toBe("generated_snapshot");
    expect(report.canClearSourceGate).toBe(true);
    expect(report.canClearRuntimeGate).toBe(false);
    expect(report.canClearProviderGate).toBe(false);
    expect(report.canClearAdminTruthGate).toBe(false);
    expect(report.sourceFileDiscovery).toBe("git");
    expect(report.gitStatus).toBe("available");
    expect(report.freshness).toBe("fresh");
    expect(report.cleanupCommand).toBe("npm run check:admin-browser-surface-smoke");
    expect(report.totalFindingCount).toBe(0);
    expect(report.emittedFindingCount).toBe(0);
    expect(report.highRiskCounts.signoff).toBe(0);
    expect(report.highRiskCounts.payment).toBe(1);
    expect(report.passed).toBe(true);
    expect(report.summary.adminSurfaceCount).toBe(14);
    expect(report.summary.routeCount).toBe(14);
    expect(report.summary.sourceAdminPageCount).toBe(14);
    expect(report.summary.layoutSelectorContractPresent).toBe(true);
    expect(report.summary.browserHarnessContractPresent).toBe(true);
    expect(report.summary.optionalAuthenticatedSurfaceCount).toBe(18);
    expect(report.summary.localFixtureSurfaceEvidenceCount).toBe(0);
    expect(report.summary.accountFreeFixtureCoveredCount).toBe(0);
    expect(report.summary.accountFreeFixturePendingCount).toBe(18);
    expect(report.summary.sourceTruthStates).toEqual({
      sourceContractOnly: 18,
      unauthBoundaryVerified: 0,
      accountFreeFixtureVerified: 0,
      accountFreeFixtureMissing: 18,
      authenticatedAdminVerified: 0,
      authenticatedAdminEvidenceMissing: 18,
      protectedLabelOnly: 1,
    });
    expect(report.summary.sourceSmokeRows).toBe(14);
    expect(report.summary.sourceClearCount).toBe(12);
    expect(report.summary.sourceReportsOnlyCount).toBe(1);
    expect(report.summary.liveAdminRequiredCount).toBe(0);
    expect(report.summary.providerRequiredCount).toBe(1);
    expect(report.summary).not.toHaveProperty("manualAdminAuthRequiredCount");
    expect(report.sourceSmoke).toHaveLength(14);
    expect(report.sourceSmoke.every((surface) =>
      surface.route
      && surface.component.startsWith("src/app/admin/")
      && surface.selector.startsWith("[data-admin-browser-surface=")
      && surface.marker
      && surface.nextAction
    )).toBe(true);
    expect(report.sourceSmoke.find((surface) => surface.surfaceId === "admin_debug")).toMatchObject({
      route: "/admin/debug",
      component: "src/app/admin/debug/page.tsx",
      sourceTruth: "source_reports_only",
      freshnessState: "source_reports_only",
      confidence: "medium",
    });
    expect(report.sourceSmoke.find((surface) => surface.surfaceId === "admin_economy")).toMatchObject({
      sourceTruth: "provider_required",
      freshnessState: "external_proof_required",
      confidence: "external_required",
    });
    expect(report.sourceSmokeContracts).toEqual(SOURCE_SMOKE_CONTRACTS);
    expect(report.missingAccountFreeFixtureSurfaceIds).toHaveLength(18);
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
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
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
    expect(report.summary.localFixtureSurfaceEvidenceCount).toBe(0);
    expect(report.summary.accountFreeFixtureCoveredCount).toBe(0);
    expect(report.summary.accountFreeFixturePendingCount).toBeGreaterThan(0);
    expect(report.summary.sourceTruthStates.unauthBoundaryVerified).toBe(14);
    expect(report.summary.sourceTruthStates.authenticatedAdminEvidenceMissing).toBe(18);
    expect(report.evidenceProvenance.source).toBe("local_in_app_browser");
    expect(report.evidenceProvenance.evidenceMode).toBe("unauthenticated_only");
    expect(report.evidenceProvenance.baseUrl).toBe("http://127.0.0.1:3210");
    expect(report.doesNotProve).toEqual(expect.arrayContaining([
      expect.stringContaining("production admin truth sample"),
      expect.stringContaining("GumDrop treasury truth"),
    ]));
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual([]);
  });

  it("records local fixture browser evidence without clearing authenticated admin checks", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
      evidence: ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface) => ({
        surfaceId: surface.surfaceId,
        route: surface.route,
        deviceBand: surface.deviceBands[0],
        state: "local_fixture_surface_verified" as const,
        checkedAtUtc: "2026-06-11T12:00:00.000Z",
        urlAfterNavigation: surface.browserSmokePath,
        selectorUsed: surface.authenticatedSelectors[0],
        visibleMarker: surface.authenticatedVisibleMarkers[0],
      })),
    });

    expect(report.status).toBe("source_contract_ready");
    expect(report.summary.localFixtureSurfaceEvidenceCount).toBe(14);
    expect(report.summary.accountFreeFixtureCoveredCount).toBe(14);
    expect(report.summary.accountFreeFixturePendingCount).toBe(4);
    expect(report.summary.authenticatedSurfaceEvidenceCount).toBe(0);
    expect(report.summary.sourceTruthStates.accountFreeFixtureVerified).toBe(14);
    expect(report.summary.sourceTruthStates.accountFreeFixtureMissing).toBe(4);
    expect(report.summary.sourceTruthStates.authenticatedAdminEvidenceMissing).toBe(18);
    expect(report.evidenceProvenance.evidenceMode).toBe("local_fixture_only");
    expect(report.nextExactSteps).toEqual(expect.arrayContaining([
      expect.stringContaining("ADMIN_BROWSER_SMOKE_FIXTURE_SESSION=1"),
    ]));
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual([]);
  });

  it("classifies full local fixture coverage without requiring real admin test accounts", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
      evidence: fixtureEvidenceForAllDeviceBands(),
    });

    expect(report.status).toBe("local_fixture_browser_covered");
    expect(report.summary.localFixtureSurfaceEvidenceCount).toBe(18);
    expect(report.summary.accountFreeFixtureCoveredCount).toBe(18);
    expect(report.summary.accountFreeFixturePendingCount).toBe(0);
    expect(report.summary.authenticatedSurfaceEvidenceCount).toBe(0);
    expect(report.summary.sourceTruthStates.accountFreeFixtureVerified).toBe(18);
    expect(report.summary.sourceTruthStates.accountFreeFixtureMissing).toBe(0);
    expect(report.summary.sourceTruthStates.authenticatedAdminEvidenceMissing).toBe(18);
    expect(report.missingAccountFreeFixtureSurfaceIds).toEqual([]);
    expect(report.missingAuthenticatedSurfaceIds).toHaveLength(18);
    expect(report.nextExactSteps).toEqual(expect.arrayContaining([
      expect.stringContaining("Account-free local admin route rendering is covered"),
    ]));
    expect(report.doesNotProve).toEqual(expect.arrayContaining([
      expect.stringContaining("deployed runtime smoke"),
      expect.stringContaining("production admin truth sample"),
    ]));
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual([]);
  });

  it("requires diagnostic fields before authenticated browser evidence can be accepted", () => {
    const incomplete = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
      evidence: [{
        surfaceId: "admin_debug",
        route: "/admin/debug",
        deviceBand: "desktop",
        state: "authenticated_surface_verified",
      }],
    });

    expect(validateAdminBrowserSurfaceSmokeReport(incomplete)).toEqual(expect.arrayContaining([
      "admin_debug:desktop rendered surface evidence must include checkedAtUtc.",
      "admin_debug:desktop rendered surface evidence must include urlAfterNavigation.",
      "admin_debug:desktop rendered surface evidence must include the canonical selector used.",
      "admin_debug:desktop rendered surface evidence must include a visible admin marker.",
    ]));

    const complete = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
      evidence: [{
        surfaceId: "admin_debug",
        route: "/admin/debug",
        deviceBand: "desktop",
        state: "authenticated_surface_verified",
        checkedAtUtc: "2026-06-11T12:00:00.000Z",
        urlAfterNavigation: "/admin/debug",
        selectorUsed: '[data-admin-browser-surface="admin_debug"]',
        visibleMarker: "data-admin-mobile-surface=debug",
      }],
    });

    expect(validateAdminBrowserSurfaceSmokeReport(complete)).toEqual([]);

    const wrongMarker = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
      evidence: [{
        surfaceId: "admin_debug",
        route: "/admin/debug",
        deviceBand: "desktop",
        state: "authenticated_surface_verified",
        checkedAtUtc: "2026-06-11T12:00:00.000Z",
        urlAfterNavigation: "/admin/debug",
        selectorUsed: '[data-admin-browser-surface="admin_debug"]',
        visibleMarker: "Content Manager",
      }],
    });

    expect(validateAdminBrowserSurfaceSmokeReport(wrongMarker)).toEqual(expect.arrayContaining([
      "admin_debug:desktop rendered surface evidence marker must match one of: Debug Console, data-admin-mobile-surface=debug, data-admin-debug-sprawl-reduction=target-75-95.",
    ]));
  });

  it("rejects unknown surfaces and formal gate overclaims", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      evidenceProvenance: LOCAL_BROWSER_PROVENANCE,
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
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
      summary: {
        ...report.summary,
        manualAdminAuthRequiredCount: 1,
      },
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
      "admin browser smoke cannot clear runtime, provider, or admin truth gates.",
      "admin browser smoke summary must expose sourceTruthStates instead of manualAdminAuthRequiredCount.",
      "evidence references unknown surface: admin_fake",
      "admin_fake:desktop overclaims formal gate impact.",
    ]));
  });

  it("fails when a source admin page is not represented in the browser smoke matrix", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
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
    const report = buildAdminBrowserSurfaceSmokeReport({
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
    });

    expect(report.summary.layoutSelectorContractPresent).toBe(false);
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual(expect.arrayContaining([
      "admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-surface.",
      "admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-route.",
      "admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-surface-group.",
      "admin browser smoke requires src/app/admin/layout.tsx to use resolveAdminBrowserSurfaceForPathname.",
    ]));
  });

  it("fails when the opt-in browser harness drifts from the canonical surface contract", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
      browserHarnessContract: {
        ...BROWSER_HARNESS_CONTRACT,
        packageScriptPresent: false,
        importsCanonicalSurfaceMap: false,
        gatedByExplicitEnv: false,
        usesStorageStateEnv: false,
        supportsLocalFixtureSession: false,
        usesCanonicalSelectors: false,
        usesBrowserSmokePath: false,
        checksRouteAttribute: false,
        rejectsPublicHomeFallback: false,
        writesOptionalEvidenceDir: false,
      },
    });

    expect(report.summary.browserHarnessContractPresent).toBe(false);
    expect(validateAdminBrowserSurfaceSmokeReport(report)).toEqual(expect.arrayContaining([
      "admin browser smoke requires package script check:admin-browser-surface-smoke:browser.",
      "admin browser smoke browser test must import the canonical admin surface map.",
      "admin browser smoke browser test must be gated by ADMIN_BROWSER_SMOKE=1.",
      "admin browser smoke browser test must require ADMIN_BROWSER_SMOKE_STORAGE_STATE.",
      "admin browser smoke browser test must support ADMIN_BROWSER_SMOKE_FIXTURE_SESSION for account-free local UI rendering checks.",
      "admin browser smoke browser test must use canonical authenticated selectors.",
      "admin browser smoke browser test must navigate browserSmokePath, not hand-maintained routes.",
      "admin browser smoke browser test must assert data-admin-browser-route.",
      "admin browser smoke browser test must reject public-home fallback content.",
      "admin browser smoke browser test must write optional per-surface evidence only when ADMIN_BROWSER_SMOKE_EVIDENCE_DIR is set.",
    ]));
  });

  it("fails if a source smoke row is missing or hides source truth", () => {
    const report = buildAdminBrowserSurfaceSmokeReport({
      layoutSelectorContract: LAYOUT_SELECTOR_CONTRACT,
      browserHarnessContract: BROWSER_HARNESS_CONTRACT,
      sourceSmokeContracts: SOURCE_SMOKE_CONTRACTS,
    });
    const invalid = {
      ...report,
      summary: {
        ...report.summary,
        sourceSmokeRows: 12,
      },
      sourceSmoke: report.sourceSmoke
        .filter((surface) => surface.surfaceId !== "admin_debug")
        .map((surface) => surface.surfaceId === "admin_analytics"
          ? {
            ...surface,
            component: "",
            sourceTruth: "source_clear",
            freshnessState: "source_fresh",
            confidence: "high",
            nextAction: "",
            sourceEvidence: {
              ...surface.sourceEvidence,
              clientErrorFixture: false,
            },
          }
          : surface),
    } as unknown as AdminBrowserSurfaceSmokeReport;

    expect(validateAdminBrowserSurfaceSmokeReport(invalid)).toEqual(expect.arrayContaining([
      "sourceSmokeRows must match sourceSmoke length.",
      "source smoke must include one row for every admin browser surface.",
      "sourceReportsOnlyCount must match source smoke rows.",
      "source smoke missing surface row: admin_debug",
      "admin_analytics source smoke component must match the canonical source component.",
      "admin_analytics source smoke must include a nextAction.",
      "admin_analytics source smoke requires clientErrorFixture evidence.",
    ]));
  });
});
