import {
  ADMIN_BROWSER_SURFACE_DEFINITIONS,
  type AdminBrowserSurfaceDefinition,
  type AdminBrowserSurfaceDeviceBand,
} from "@/lib/admin/admin-browser-surface-map";

export { ADMIN_BROWSER_SURFACE_DEFINITIONS };
export type { AdminBrowserSurfaceDefinition, AdminBrowserSurfaceDeviceBand };

export type AdminBrowserSurfaceEvidenceState =
  | "source_contract_only"
  | "unauth_boundary_verified"
  | "unauth_redirect_verified"
  | "local_fixture_surface_verified"
  | "authenticated_shell_verified"
  | "authenticated_surface_verified"
  | "authenticated_admin_signoff_missing"
  | "blocked_runtime_required";

export type AdminBrowserSurfaceReportStatus =
  | "source_contract_ready"
  | "browser_boundary_partial"
  | "local_fixture_browser_covered"
  | "authenticated_browser_pending"
  | "authenticated_browser_covered";

export type AdminBrowserSurfaceEvidenceInput = Partial<{
  surfaceId: string;
  route: string;
  deviceBand: AdminBrowserSurfaceDeviceBand;
  state: AdminBrowserSurfaceEvidenceState;
  checkedAtUtc: string;
  urlAfterNavigation: string;
  selectorUsed: string;
  visibleMarker: string;
  screenshotArtifactPath: string;
  note: string;
}>;

export type AdminBrowserSurfaceEvidence = Required<
  Pick<AdminBrowserSurfaceEvidenceInput, "surfaceId" | "route" | "deviceBand" | "state">
> &
  Omit<AdminBrowserSurfaceEvidenceInput, "surfaceId" | "route" | "deviceBand" | "state"> & {
    formalGateImpact: {
      clearsRuntimeSmoke: boolean;
      clearsProviderSmoke: boolean;
      clearsAdminTruthSample: boolean;
      clearsPaymentOrTreasuryTruth: boolean;
    };
  };

export type AdminBrowserSurfaceEvidenceMode =
  | "none"
  | "unauthenticated_only"
  | "local_fixture_only"
  | "authenticated_present";

export type AdminBrowserSurfaceEvidenceProvenance = {
  inputPath: string;
  source: "none" | "local_in_app_browser" | "operator_screenshot" | "manual_external" | "unknown";
  baseUrl?: string;
  capturedAtUtc?: string;
  evidenceMode: AdminBrowserSurfaceEvidenceMode;
  noteCount: number;
  notes: string[];
};

export type AdminBrowserSurfaceSmokeReport = {
  reportKey: "admin-browser-surface-smoke";
  status: AdminBrowserSurfaceReportStatus;
  evidenceClass: "generated_snapshot";
  canClearSourceGate: true;
  canClearRuntimeGate: false;
  canClearProviderGate: false;
  canClearAdminTruthGate: false;
  sourceFileDiscovery: "git";
  gitStatus: "available";
  toolingDegraded: false;
  degradationReason: null;
  currentHeadSource: "git";
  freshness: "fresh";
  baselineStatus: "current";
  reportCompleteness: "complete";
  totalFindingCount: number;
  emittedFindingCount: number;
  omittedFindingCount: 0;
  capReason: null;
  capStrategy: "none";
  capLimit: null;
  rankingInputCompleteness: "complete";
  highRiskCounts: {
    critical: 0;
    major: 0;
    signoff: number;
    privacy: 0;
    payment: number;
    lockedContent: 0;
    sourceTruth: number;
  };
  owner: "admin-browser-surface-smoke";
  safetyClass: "source_safe";
  costClass: "local_free";
  rollback: string;
  cleanupPolicy: "regenerate";
  cleanupCommand: "npm run check:admin-browser-surface-smoke";
  sourceTruthRole: "generated_snapshot";
  passed: false;
  generatedAtUtc: string;
  currentHead?: string;
  sourceCommit?: string;
  summary: {
    adminSurfaceCount: number;
    routeCount: number;
    sourceAdminPageCount: number;
    layoutSelectorContractPresent: boolean;
    browserHarnessContractPresent: boolean;
    requiredAuthenticatedSurfaceCount: number;
    evidenceCount: number;
    authenticatedSurfaceEvidenceCount: number;
    localFixtureSurfaceEvidenceCount: number;
    accountFreeFixtureCoveredCount: number;
    accountFreeFixturePendingCount: number;
    unauthBoundaryEvidenceCount: number;
    unauthRedirectEvidenceCount: number;
    sourceTruthStates: {
      sourceContractOnly: number;
      unauthBoundaryVerified: number;
      accountFreeFixtureVerified: number;
      accountFreeFixtureMissing: number;
      authenticatedAdminVerified: number;
      authenticatedAdminEvidenceMissing: number;
      protectedLabelOnly: number;
    };
    protectedSurfaceCount: number;
  };
  surfaces: AdminBrowserSurfaceDefinition[];
  evidenceProvenance: AdminBrowserSurfaceEvidenceProvenance;
  sourceAdminRoutes: string[];
  missingSourceAdminRoutes: string[];
  extraSurfaceRoutes: string[];
  layoutSelectorContract: {
    ownerPath: "src/app/admin/layout.tsx";
    hasSurfaceAttribute: boolean;
    hasRouteAttribute: boolean;
    hasGroupAttribute: boolean;
    usesSurfaceResolver: boolean;
  };
  browserHarnessContract: {
    ownerPath: "tests/ui-audits/admin-browser-surface-smoke.spec.ts";
    packageScriptName: "check:admin-browser-surface-smoke:browser";
    packageScriptPresent: boolean;
    importsCanonicalSurfaceMap: boolean;
    gatedByExplicitEnv: boolean;
    usesStorageStateEnv: boolean;
    supportsLocalFixtureSession: boolean;
    usesCanonicalSelectors: boolean;
    usesBrowserSmokePath: boolean;
    checksRouteAttribute: boolean;
    rejectsPublicHomeFallback: boolean;
    writesOptionalEvidenceDir: boolean;
  };
  evidence: AdminBrowserSurfaceEvidence[];
  missingAuthenticatedSurfaceIds: string[];
  missingAccountFreeFixtureSurfaceIds: string[];
  protectedSurfaceIds: string[];
  doesNotProve: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

const FORMAL_GATE_LIMITS = [
  "local browser smoke does not clear deployed runtime smoke",
  "local browser smoke does not clear provider smoke",
  "local browser smoke does not clear production admin truth sample evidence",
  "local browser smoke does not clear payment or GumDrop treasury truth",
] as const;

const DEFAULT_EVIDENCE_PROVENANCE: AdminBrowserSurfaceEvidenceProvenance = {
  inputPath: "agent/evidence/admin-browser-surface-smoke/evidence.json",
  source: "none",
  evidenceMode: "none",
  noteCount: 0,
  notes: [],
};

function keyForEvidence(surfaceId?: string, deviceBand?: string) {
  return `${surfaceId ?? ""}::${deviceBand ?? ""}`;
}

function isAuthenticatedEvidenceState(state: AdminBrowserSurfaceEvidenceState) {
  return state === "authenticated_surface_verified" || state === "authenticated_shell_verified";
}

function isLocalFixtureEvidenceState(state: AdminBrowserSurfaceEvidenceState) {
  return state === "local_fixture_surface_verified";
}

function matchesExpectedVisibleMarker(visibleMarker: string | undefined, expectedMarkers: readonly string[]) {
  const normalized = visibleMarker?.trim().toLowerCase();
  if (!normalized) return false;
  return expectedMarkers.some((marker) => normalized.includes(marker.toLowerCase()));
}

export function normalizeAdminBrowserSurfaceEvidence(
  input: AdminBrowserSurfaceEvidenceInput,
): AdminBrowserSurfaceEvidence | null {
  if (!input.surfaceId || !input.route || !input.deviceBand || !input.state) return null;
  return {
    surfaceId: input.surfaceId,
    route: input.route,
    deviceBand: input.deviceBand,
    state: input.state,
    checkedAtUtc: input.checkedAtUtc,
    urlAfterNavigation: input.urlAfterNavigation,
    selectorUsed: input.selectorUsed,
    visibleMarker: input.visibleMarker,
    screenshotArtifactPath: input.screenshotArtifactPath,
    note: input.note,
    formalGateImpact: {
      clearsRuntimeSmoke: false,
      clearsProviderSmoke: false,
      clearsAdminTruthSample: false,
      clearsPaymentOrTreasuryTruth: false,
    },
  };
}

export function buildAdminBrowserSurfaceSmokeReport(input: {
  currentHead?: string;
  generatedAtUtc?: string;
  evidence?: AdminBrowserSurfaceEvidenceInput[];
  evidenceProvenance?: Partial<AdminBrowserSurfaceEvidenceProvenance>;
  sourceAdminRoutes?: string[];
  layoutSelectorContract?: Partial<AdminBrowserSurfaceSmokeReport["layoutSelectorContract"]>;
  browserHarnessContract?: Partial<AdminBrowserSurfaceSmokeReport["browserHarnessContract"]>;
} = {}): AdminBrowserSurfaceSmokeReport {
  const evidence = (input.evidence ?? [])
    .map(normalizeAdminBrowserSurfaceEvidence)
    .filter((entry): entry is AdminBrowserSurfaceEvidence => Boolean(entry));
  const evidenceBySurfaceBand = new Map(evidence.map((entry) => [keyForEvidence(entry.surfaceId, entry.deviceBand), entry]));
  const requiredAuthenticated = ADMIN_BROWSER_SURFACE_DEFINITIONS.flatMap((surface) =>
    surface.deviceBands.map((deviceBand) => ({ surface, deviceBand })),
  );
  const requiredSurfaceBandKeys = new Set(requiredAuthenticated.map(({ surface, deviceBand }) => keyForEvidence(surface.surfaceId, deviceBand)));
  const missingAuthenticatedSurfaceIds = requiredAuthenticated
    .filter(({ surface, deviceBand }) => {
      const entry = evidenceBySurfaceBand.get(keyForEvidence(surface.surfaceId, deviceBand));
      return !entry || !isAuthenticatedEvidenceState(entry.state);
    })
    .map(({ surface, deviceBand }) => `${surface.surfaceId}:${deviceBand}`);
  const missingAccountFreeFixtureSurfaceIds = requiredAuthenticated
    .filter(({ surface, deviceBand }) => {
      const entry = evidenceBySurfaceBand.get(keyForEvidence(surface.surfaceId, deviceBand));
      return !entry || (!isLocalFixtureEvidenceState(entry.state) && !isAuthenticatedEvidenceState(entry.state));
    })
    .map(({ surface, deviceBand }) => `${surface.surfaceId}:${deviceBand}`);
  const authenticatedSurfaceEvidenceCount = evidence.filter((entry) => isAuthenticatedEvidenceState(entry.state)).length;
  const localFixtureSurfaceEvidenceCount = evidence.filter((entry) => isLocalFixtureEvidenceState(entry.state)).length;
  const accountFreeFixtureCoveredCount = requiredAuthenticated.length - missingAccountFreeFixtureSurfaceIds.length;
  const unauthBoundaryEvidenceCount = evidence.filter((entry) =>
    entry.state === "unauth_boundary_verified" || entry.state === "unauth_redirect_verified",
  ).length;
  const unauthRedirectEvidenceCount = evidence.filter((entry) => entry.state === "unauth_redirect_verified").length;
  const sourceContractOnlyCount = requiredAuthenticated.filter(({ surface, deviceBand }) => {
    const entry = evidenceBySurfaceBand.get(keyForEvidence(surface.surfaceId, deviceBand));
    return !entry || entry.state === "source_contract_only";
  }).length;
  const relevantUnauthBoundaryEvidenceCount = evidence.filter((entry) =>
    requiredSurfaceBandKeys.has(keyForEvidence(entry.surfaceId, entry.deviceBand)) &&
    (entry.state === "unauth_boundary_verified" || entry.state === "unauth_redirect_verified"),
  ).length;
  const evidenceMode: AdminBrowserSurfaceEvidenceMode = authenticatedSurfaceEvidenceCount > 0
    ? "authenticated_present"
    : localFixtureSurfaceEvidenceCount > 0
      ? "local_fixture_only"
    : evidence.length > 0
      ? "unauthenticated_only"
      : "none";
  const evidenceProvenance: AdminBrowserSurfaceEvidenceProvenance = {
    ...DEFAULT_EVIDENCE_PROVENANCE,
    ...input.evidenceProvenance,
    evidenceMode,
    noteCount: input.evidenceProvenance?.noteCount ?? input.evidenceProvenance?.notes?.length ?? 0,
    notes: (input.evidenceProvenance?.notes ?? []).slice(0, 5),
  };
  const protectedSurfaceIds = ADMIN_BROWSER_SURFACE_DEFINITIONS
    .filter((surface) => "protectedDomain" in surface && surface.protectedDomain)
    .map((surface) => surface.surfaceId);
  const surfaceRoutes = [...new Set<string>(ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface) => surface.route))].sort();
  const sourceAdminRoutes = [...new Set(input.sourceAdminRoutes ?? surfaceRoutes)].sort();
  const surfaceRouteSet = new Set(surfaceRoutes);
  const sourceRouteSet = new Set(sourceAdminRoutes);
  const missingSourceAdminRoutes = sourceAdminRoutes.filter((route) => !surfaceRouteSet.has(route));
  const extraSurfaceRoutes = surfaceRoutes.filter((route) => !sourceRouteSet.has(route));
  const layoutSelectorContract = {
    ownerPath: "src/app/admin/layout.tsx" as const,
    hasSurfaceAttribute: Boolean(input.layoutSelectorContract?.hasSurfaceAttribute),
    hasRouteAttribute: Boolean(input.layoutSelectorContract?.hasRouteAttribute),
    hasGroupAttribute: Boolean(input.layoutSelectorContract?.hasGroupAttribute),
    usesSurfaceResolver: Boolean(input.layoutSelectorContract?.usesSurfaceResolver),
  };
  const layoutSelectorContractPresent =
    layoutSelectorContract.hasSurfaceAttribute &&
    layoutSelectorContract.hasRouteAttribute &&
    layoutSelectorContract.hasGroupAttribute &&
    layoutSelectorContract.usesSurfaceResolver;
  const browserHarnessContract = {
    ownerPath: "tests/ui-audits/admin-browser-surface-smoke.spec.ts" as const,
    packageScriptName: "check:admin-browser-surface-smoke:browser" as const,
    packageScriptPresent: Boolean(input.browserHarnessContract?.packageScriptPresent),
    importsCanonicalSurfaceMap: Boolean(input.browserHarnessContract?.importsCanonicalSurfaceMap),
    gatedByExplicitEnv: Boolean(input.browserHarnessContract?.gatedByExplicitEnv),
    usesStorageStateEnv: Boolean(input.browserHarnessContract?.usesStorageStateEnv),
    supportsLocalFixtureSession: Boolean(input.browserHarnessContract?.supportsLocalFixtureSession),
    usesCanonicalSelectors: Boolean(input.browserHarnessContract?.usesCanonicalSelectors),
    usesBrowserSmokePath: Boolean(input.browserHarnessContract?.usesBrowserSmokePath),
    checksRouteAttribute: Boolean(input.browserHarnessContract?.checksRouteAttribute),
    rejectsPublicHomeFallback: Boolean(input.browserHarnessContract?.rejectsPublicHomeFallback),
    writesOptionalEvidenceDir: Boolean(input.browserHarnessContract?.writesOptionalEvidenceDir),
  };
  const browserHarnessContractPresent =
    browserHarnessContract.packageScriptPresent &&
    browserHarnessContract.importsCanonicalSurfaceMap &&
    browserHarnessContract.gatedByExplicitEnv &&
    browserHarnessContract.usesStorageStateEnv &&
    browserHarnessContract.supportsLocalFixtureSession &&
    browserHarnessContract.usesCanonicalSelectors &&
    browserHarnessContract.usesBrowserSmokePath &&
    browserHarnessContract.checksRouteAttribute &&
    browserHarnessContract.rejectsPublicHomeFallback &&
    browserHarnessContract.writesOptionalEvidenceDir;
  const totalFindingCount = missingAuthenticatedSurfaceIds.length;

  const status: AdminBrowserSurfaceReportStatus = authenticatedSurfaceEvidenceCount === requiredAuthenticated.length
    ? "authenticated_browser_covered"
    : missingAccountFreeFixtureSurfaceIds.length === 0
      ? "local_fixture_browser_covered"
    : unauthBoundaryEvidenceCount > 0
      ? "browser_boundary_partial"
      : missingAuthenticatedSurfaceIds.length > 0
        ? "authenticated_browser_pending"
        : "source_contract_ready";

  return {
    reportKey: "admin-browser-surface-smoke",
    status,
    evidenceClass: "generated_snapshot",
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    sourceFileDiscovery: "git",
    gitStatus: "available",
    toolingDegraded: false,
    degradationReason: null,
    currentHeadSource: "git",
    freshness: "fresh",
    baselineStatus: "current",
    reportCompleteness: "complete",
    totalFindingCount,
    emittedFindingCount: totalFindingCount,
    omittedFindingCount: 0,
    capReason: null,
    capStrategy: "none",
    capLimit: null,
    rankingInputCompleteness: "complete",
    highRiskCounts: {
      critical: 0,
      major: 0,
      signoff: missingAuthenticatedSurfaceIds.length,
      privacy: 0,
      payment: protectedSurfaceIds.length,
      lockedContent: 0,
      sourceTruth: missingAuthenticatedSurfaceIds.length,
    },
    owner: "admin-browser-surface-smoke",
    safetyClass: "source_safe",
    costClass: "local_free",
    rollback: "Revert the admin browser smoke contract/report changes and rerun npm run check:admin-browser-surface-smoke.",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run check:admin-browser-surface-smoke",
    sourceTruthRole: "generated_snapshot",
    passed: false,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    summary: {
      adminSurfaceCount: ADMIN_BROWSER_SURFACE_DEFINITIONS.length,
      routeCount: surfaceRoutes.length,
      sourceAdminPageCount: sourceAdminRoutes.length,
      layoutSelectorContractPresent,
      browserHarnessContractPresent,
      requiredAuthenticatedSurfaceCount: requiredAuthenticated.length,
      evidenceCount: evidence.length,
      authenticatedSurfaceEvidenceCount,
      localFixtureSurfaceEvidenceCount,
      accountFreeFixtureCoveredCount,
      accountFreeFixturePendingCount: missingAccountFreeFixtureSurfaceIds.length,
      unauthBoundaryEvidenceCount,
      unauthRedirectEvidenceCount,
      sourceTruthStates: {
        sourceContractOnly: sourceContractOnlyCount,
        unauthBoundaryVerified: relevantUnauthBoundaryEvidenceCount,
        accountFreeFixtureVerified: accountFreeFixtureCoveredCount,
        accountFreeFixtureMissing: missingAccountFreeFixtureSurfaceIds.length,
        authenticatedAdminVerified: authenticatedSurfaceEvidenceCount,
        authenticatedAdminEvidenceMissing: missingAuthenticatedSurfaceIds.length,
        protectedLabelOnly: protectedSurfaceIds.length,
      },
      protectedSurfaceCount: protectedSurfaceIds.length,
    },
    surfaces: [...ADMIN_BROWSER_SURFACE_DEFINITIONS],
    evidenceProvenance,
    sourceAdminRoutes,
    missingSourceAdminRoutes,
    extraSurfaceRoutes,
    layoutSelectorContract,
    browserHarnessContract,
    evidence,
    missingAuthenticatedSurfaceIds,
    missingAccountFreeFixtureSurfaceIds,
    protectedSurfaceIds,
    doesNotProve: [...FORMAL_GATE_LIMITS],
    nextExactSteps: [
      missingAccountFreeFixtureSurfaceIds.length > 0
        ? "For local account-free UI rendering checks, run NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1 and ADMIN_BROWSER_SMOKE=1 ADMIN_BROWSER_SMOKE_FIXTURE_SESSION=1 ADMIN_BROWSER_SMOKE_EVIDENCE_DIR=<tmp-dir> npm run check:admin-browser-surface-smoke:browser; this records local_fixture_surface_verified evidence without requiring real admin test accounts."
        : "Account-free local admin route rendering is covered by fixture evidence; keep it separate from real authenticated admin signoff, deployed runtime proof, and production admin truth samples.",
      "Run ADMIN_BROWSER_SMOKE=1 ADMIN_BROWSER_SMOKE_STORAGE_STATE=<path> ADMIN_BROWSER_SMOKE_EVIDENCE_DIR=<tmp-dir> npm run check:admin-browser-surface-smoke:browser against an authenticated admin session only when real auth/session/browser signoff is required, then rerun npm run check:admin-browser-surface-smoke with the same evidence dir.",
      "For direct in-app Browser audits without Playwright, start the local dev server with NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1, open /api/admin-ui-test-session?redirect=/admin once to mint the bounded local fixture cookie, then navigate admin routes normally; this proves local route rendering only.",
      "After reviewing the local fragment output, copy only intentional compact evidence into agent/evidence/admin-browser-surface-smoke/evidence.json when it should become tracked evidence.",
      "Keep /admin/economy in protected label-only review; browser smoke cannot prove GumDrop/payment truth.",
      "Use source validators for admin truth and runtime evidence separately; do not let browser smoke clear provider/runtime/admin-truth gates.",
    ],
    validationFailures: [],
  };
}

export function validateAdminBrowserSurfaceSmokeReport(report: AdminBrowserSurfaceSmokeReport) {
  const failures: string[] = [];
  const expectedSurfaceIds = new Set<string>(ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface) => surface.surfaceId));
  const surfacesById = new Map<string, AdminBrowserSurfaceDefinition>(
    ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface) => [surface.surfaceId, surface]),
  );
  const reportSurfaceIds = new Set(report.surfaces.map((surface) => surface.surfaceId));

  for (const expected of expectedSurfaceIds) {
    if (!reportSurfaceIds.has(expected)) failures.push(`missing admin browser surface: ${expected}`);
  }
  for (const surface of report.surfaces) {
    if (!surface.requiresAdminAuth) failures.push(`${surface.surfaceId} must require admin auth.`);
    if (surface.route.startsWith("/admin") === false) failures.push(`${surface.surfaceId} route must stay under /admin.`);
    if (!surface.browserSmokePath.startsWith("/admin")) {
      failures.push(`${surface.surfaceId} browser smoke path must stay under /admin.`);
    }
    if (surface.browserSmokePath.includes("[") || surface.browserSmokePath.includes("]")) {
      failures.push(`${surface.surfaceId} browser smoke path must be directly navigable, not a route pattern.`);
    }
    if (surface.authenticatedSelectors.length === 0) {
      failures.push(`${surface.surfaceId} must declare an authenticated browser selector.`);
    }
    if (!surface.authenticatedSelectors.includes(`[data-admin-browser-surface="${surface.surfaceId}"]`)) {
      failures.push(`${surface.surfaceId} must include its canonical data-admin-browser-surface selector.`);
    }
  }
  if (report.passed !== false) failures.push("admin browser smoke must not mark itself passed inside source validation.");
  if (report.canClearRuntimeGate || report.canClearProviderGate || report.canClearAdminTruthGate) {
    failures.push("admin browser smoke cannot clear runtime, provider, or admin truth gates.");
  }
  if (Object.prototype.hasOwnProperty.call(report.summary, "manualAdminAuthRequiredCount")) {
    failures.push("admin browser smoke summary must expose sourceTruthStates instead of manualAdminAuthRequiredCount.");
  }
  if (report.summary.sourceTruthStates.authenticatedAdminEvidenceMissing !== report.missingAuthenticatedSurfaceIds.length) {
    failures.push("authenticatedAdminEvidenceMissing must match missingAuthenticatedSurfaceIds.");
  }
  if (report.summary.sourceTruthStates.accountFreeFixtureMissing !== report.missingAccountFreeFixtureSurfaceIds.length) {
    failures.push("accountFreeFixtureMissing must match missingAccountFreeFixtureSurfaceIds.");
  }
  if (report.summary.sourceTruthStates.accountFreeFixtureVerified !== report.summary.accountFreeFixtureCoveredCount) {
    failures.push("accountFreeFixtureVerified must match accountFreeFixtureCoveredCount.");
  }
  if (report.summary.sourceTruthStates.authenticatedAdminVerified !== report.summary.authenticatedSurfaceEvidenceCount) {
    failures.push("authenticatedAdminVerified must match authenticatedSurfaceEvidenceCount.");
  }
  if (report.summary.sourceTruthStates.protectedLabelOnly !== report.protectedSurfaceIds.length) {
    failures.push("protectedLabelOnly must match protectedSurfaceIds.");
  }
  if (report.summary.evidenceCount > 0 && report.evidenceProvenance.source === "none") {
    failures.push("browser evidence provenance must name the evidence source when evidence entries exist.");
  }
  if (report.evidenceProvenance.capturedAtUtc && Number.isNaN(Date.parse(report.evidenceProvenance.capturedAtUtc))) {
    failures.push("browser evidence provenance capturedAtUtc must be a valid timestamp when present.");
  }
  if (report.evidenceProvenance.notes.length > 5) {
    failures.push("browser evidence provenance notes must stay compact.");
  }
  if (report.evidenceProvenance.evidenceMode === "authenticated_present" && report.summary.authenticatedSurfaceEvidenceCount === 0) {
    failures.push("browser evidence provenance cannot claim authenticated evidence when none is present.");
  }
  if (report.evidenceProvenance.evidenceMode === "unauthenticated_only" && report.summary.authenticatedSurfaceEvidenceCount > 0) {
    failures.push("browser evidence provenance cannot claim unauthenticated-only when authenticated evidence is present.");
  }
  if (report.evidenceProvenance.evidenceMode === "local_fixture_only" && report.summary.authenticatedSurfaceEvidenceCount > 0) {
    failures.push("browser evidence provenance cannot claim fixture-only when authenticated evidence is present.");
  }
  if (report.evidenceProvenance.evidenceMode === "local_fixture_only" && report.summary.localFixtureSurfaceEvidenceCount === 0) {
    failures.push("browser evidence provenance cannot claim fixture-only when no fixture evidence is present.");
  }
  if (report.doesNotProve.some((entry) => /provider|runtime|admin truth|GumDrop|payment/iu.test(entry)) === false) {
    failures.push("report must state formal proof boundaries.");
  }
  if (report.missingSourceAdminRoutes.length > 0) {
    failures.push(`admin browser smoke is missing source admin routes: ${report.missingSourceAdminRoutes.join(", ")}.`);
  }
  if (report.extraSurfaceRoutes.length > 0) {
    failures.push(`admin browser smoke lists routes without source admin pages: ${report.extraSurfaceRoutes.join(", ")}.`);
  }
  if (!report.layoutSelectorContract.hasSurfaceAttribute) {
    failures.push("admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-surface.");
  }
  if (!report.layoutSelectorContract.hasRouteAttribute) {
    failures.push("admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-route.");
  }
  if (!report.layoutSelectorContract.hasGroupAttribute) {
    failures.push("admin browser smoke requires src/app/admin/layout.tsx to emit data-admin-browser-surface-group.");
  }
  if (!report.layoutSelectorContract.usesSurfaceResolver) {
    failures.push("admin browser smoke requires src/app/admin/layout.tsx to use resolveAdminBrowserSurfaceForPathname.");
  }
  if (!report.browserHarnessContract.packageScriptPresent) {
    failures.push("admin browser smoke requires package script check:admin-browser-surface-smoke:browser.");
  }
  if (!report.browserHarnessContract.importsCanonicalSurfaceMap) {
    failures.push("admin browser smoke browser test must import the canonical admin surface map.");
  }
  if (!report.browserHarnessContract.gatedByExplicitEnv) {
    failures.push("admin browser smoke browser test must be gated by ADMIN_BROWSER_SMOKE=1.");
  }
  if (!report.browserHarnessContract.usesStorageStateEnv) {
    failures.push("admin browser smoke browser test must require ADMIN_BROWSER_SMOKE_STORAGE_STATE.");
  }
  if (!report.browserHarnessContract.supportsLocalFixtureSession) {
    failures.push("admin browser smoke browser test must support ADMIN_BROWSER_SMOKE_FIXTURE_SESSION for account-free local UI rendering checks.");
  }
  if (!report.browserHarnessContract.usesCanonicalSelectors) {
    failures.push("admin browser smoke browser test must use canonical authenticated selectors.");
  }
  if (!report.browserHarnessContract.usesBrowserSmokePath) {
    failures.push("admin browser smoke browser test must navigate browserSmokePath, not hand-maintained routes.");
  }
  if (!report.browserHarnessContract.checksRouteAttribute) {
    failures.push("admin browser smoke browser test must assert data-admin-browser-route.");
  }
  if (!report.browserHarnessContract.rejectsPublicHomeFallback) {
    failures.push("admin browser smoke browser test must reject public-home fallback content.");
  }
  if (!report.browserHarnessContract.writesOptionalEvidenceDir) {
    failures.push("admin browser smoke browser test must write optional per-surface evidence only when ADMIN_BROWSER_SMOKE_EVIDENCE_DIR is set.");
  }
  for (const entry of report.evidence) {
    if (!expectedSurfaceIds.has(entry.surfaceId)) failures.push(`evidence references unknown surface: ${entry.surfaceId}`);
    const surface = surfacesById.get(entry.surfaceId);
    if (surface && !(surface.deviceBands as readonly AdminBrowserSurfaceDeviceBand[]).includes(entry.deviceBand)) {
      failures.push(`${entry.surfaceId}:${entry.deviceBand} is not an expected admin browser device band.`);
    }
    if (!entry.route.startsWith("/admin")) {
      failures.push(`${entry.surfaceId}:${entry.deviceBand} evidence route must stay under /admin.`);
    }
    if (isAuthenticatedEvidenceState(entry.state) || isLocalFixtureEvidenceState(entry.state)) {
      if (!entry.checkedAtUtc || Number.isNaN(Date.parse(entry.checkedAtUtc))) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} rendered surface evidence must include checkedAtUtc.`);
      }
      if (!entry.urlAfterNavigation?.trim()) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} rendered surface evidence must include urlAfterNavigation.`);
      }
      if (!entry.selectorUsed?.trim()) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} rendered surface evidence must include the canonical selector used.`);
      } else if (surface && !surface.authenticatedSelectors.includes(entry.selectorUsed)) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} rendered surface evidence selector must match one of: ${surface.authenticatedSelectors.join(", ")}.`);
      }
      if (!entry.visibleMarker?.trim()) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} rendered surface evidence must include a visible admin marker.`);
      } else if (surface && !matchesExpectedVisibleMarker(entry.visibleMarker, surface.authenticatedVisibleMarkers)) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} rendered surface evidence marker must match one of: ${surface.authenticatedVisibleMarkers.join(", ")}.`);
      }
    }
    if (isLocalFixtureEvidenceState(entry.state) && report.missingAuthenticatedSurfaceIds.includes(`${entry.surfaceId}:${entry.deviceBand}`) === false) {
      failures.push(`${entry.surfaceId}:${entry.deviceBand} fixture evidence must not satisfy authenticated browser signoff.`);
    }
    if (entry.formalGateImpact.clearsRuntimeSmoke || entry.formalGateImpact.clearsProviderSmoke || entry.formalGateImpact.clearsAdminTruthSample || entry.formalGateImpact.clearsPaymentOrTreasuryTruth) {
      failures.push(`${entry.surfaceId}:${entry.deviceBand} overclaims formal gate impact.`);
    }
  }
  if (!report.protectedSurfaceIds.includes("admin_economy")) {
    failures.push("admin_economy must remain a protected GumDrop treasury browser surface.");
  }
  return failures;
}
