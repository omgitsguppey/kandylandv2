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
  | "blocked_runtime_required";

export type AdminBrowserSurfaceReportStatus =
  | "source_contract_ready"
  | "browser_boundary_partial"
  | "local_fixture_browser_covered"
  | "authenticated_browser_covered";

export type AdminBrowserSurfaceSourceTruth =
  | "source_clear"
  | "source_reports_only"
  | "live_admin_required"
  | "provider_required";

export type AdminBrowserSurfaceFreshnessState =
  | "source_fresh"
  | "source_reports_only"
  | "external_proof_required";

export type AdminBrowserSurfaceSourceConfidence =
  | "high"
  | "medium"
  | "external_required";

export type AdminBrowserSurfaceSourceSmokeRow = {
  surfaceId: string;
  route: string;
  component: string;
  selector: string;
  marker: string;
  sourceTruth: AdminBrowserSurfaceSourceTruth;
  freshnessState: AdminBrowserSurfaceFreshnessState;
  confidence: AdminBrowserSurfaceSourceConfidence;
  nextAction: string;
  sourceEvidence: {
    routeContract: boolean;
    layoutHydrationMarker: boolean;
    sourceReportFixture: boolean;
    routeRuntimeHealth: boolean;
    clientErrorFixture: boolean;
  };
};

export type AdminBrowserSurfaceEvidenceInput = Partial<{
  surfaceId: string;
  route: string;
  deviceBand: AdminBrowserSurfaceDeviceBand;
  state: AdminBrowserSurfaceEvidenceState;
  checkedAtUtc: string;
  urlAfterNavigation: string;
  selectorUsed: string;
  visibleMarker: string;
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
  source: "none" | "local_in_app_browser" | "manual_external" | "unknown";
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
  passed: boolean;
  generatedAtUtc: string;
  currentHead?: string;
  sourceCommit?: string;
  summary: {
    adminSurfaceCount: number;
    routeCount: number;
    sourceAdminPageCount: number;
    layoutSelectorContractPresent: boolean;
    browserHarnessContractPresent: boolean;
    optionalAuthenticatedSurfaceCount: number;
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
    sourceSmokeRows: number;
    sourceClearCount: number;
    sourceReportsOnlyCount: number;
    liveAdminRequiredCount: number;
    providerRequiredCount: number;
    protectedSurfaceCount: number;
  };
  surfaces: AdminBrowserSurfaceDefinition[];
  sourceSmoke: AdminBrowserSurfaceSourceSmokeRow[];
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
  sourceSmokeContracts: {
    routeContractPresent: boolean;
    layoutHydrationMarkerPresent: boolean;
    controlTowerFixtureSourceReportsOnly: boolean;
    routeRuntimeHealthVerificationPresent: boolean;
    clientErrorFixturePresent: boolean;
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
  inputPath: "ADMIN_BROWSER_SMOKE_EVIDENCE_DIR",
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

function resolveSurfaceSourceTruth(surface: AdminBrowserSurfaceDefinition): AdminBrowserSurfaceSourceTruth {
  if (surface.protectedDomain === "gumdrop_treasury") return "provider_required";
  if (surface.surfaceId === "admin_debug") return "source_reports_only";
  return "source_clear";
}

function resolveSurfaceFreshnessState(sourceTruth: AdminBrowserSurfaceSourceTruth): AdminBrowserSurfaceFreshnessState {
  if (sourceTruth === "provider_required" || sourceTruth === "live_admin_required") return "external_proof_required";
  if (sourceTruth === "source_reports_only") return "source_reports_only";
  return "source_fresh";
}

function resolveSurfaceConfidence(sourceTruth: AdminBrowserSurfaceSourceTruth): AdminBrowserSurfaceSourceConfidence {
  if (sourceTruth === "provider_required" || sourceTruth === "live_admin_required") return "external_required";
  if (sourceTruth === "source_reports_only") return "medium";
  return "high";
}

function buildSurfaceNextAction(surface: AdminBrowserSurfaceDefinition, sourceTruth: AdminBrowserSurfaceSourceTruth) {
  if (sourceTruth === "provider_required") {
    return `${surface.title} is source-visible only; keep GumDrop/payment proof in the formal provider/admin truth lane.`;
  }
  if (sourceTruth === "live_admin_required") {
    return `${surface.title} requires a formal live admin evidence artifact before claiming runtime/admin truth.`;
  }
  if (sourceTruth === "source_reports_only") {
    return `${surface.title} uses local generated source reports for account-free smoke; use browser only to reproduce a source-reported issue.`;
  }
  return `${surface.title} source contract is clear; use browser only to reproduce a source-reported issue.`;
}

function buildSourceSmokeRows(input: {
  layoutSelectorContractPresent: boolean;
  controlTowerFixtureSourceReportsOnly: boolean;
  routeRuntimeHealthVerificationPresent: boolean;
  clientErrorFixturePresent: boolean;
}) {
  return ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface): AdminBrowserSurfaceSourceSmokeRow => {
    const sourceTruth = resolveSurfaceSourceTruth(surface);
    return {
      surfaceId: surface.surfaceId,
      route: surface.route,
      component: surface.sourceComponentPath,
      selector: surface.authenticatedSelectors[0] ?? "",
      marker: surface.authenticatedVisibleMarkers[0] ?? "",
      sourceTruth,
      freshnessState: resolveSurfaceFreshnessState(sourceTruth),
      confidence: resolveSurfaceConfidence(sourceTruth),
      nextAction: buildSurfaceNextAction(surface, sourceTruth),
      sourceEvidence: {
        routeContract: true,
        layoutHydrationMarker: input.layoutSelectorContractPresent,
        sourceReportFixture: sourceTruth === "source_reports_only"
          ? input.controlTowerFixtureSourceReportsOnly
          : true,
        routeRuntimeHealth: input.routeRuntimeHealthVerificationPresent,
        clientErrorFixture: input.clientErrorFixturePresent,
      },
    };
  });
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
  sourceSmokeContracts?: Partial<AdminBrowserSurfaceSmokeReport["sourceSmokeContracts"]>;
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
  const sourceSmokeContracts = {
    routeContractPresent: ADMIN_BROWSER_SURFACE_DEFINITIONS.length > 0,
    layoutHydrationMarkerPresent: layoutSelectorContractPresent,
    controlTowerFixtureSourceReportsOnly: Boolean(input.sourceSmokeContracts?.controlTowerFixtureSourceReportsOnly),
    routeRuntimeHealthVerificationPresent: Boolean(input.sourceSmokeContracts?.routeRuntimeHealthVerificationPresent),
    clientErrorFixturePresent: Boolean(input.sourceSmokeContracts?.clientErrorFixturePresent),
  };
  const sourceSmoke = buildSourceSmokeRows({
    layoutSelectorContractPresent,
    controlTowerFixtureSourceReportsOnly: sourceSmokeContracts.controlTowerFixtureSourceReportsOnly,
    routeRuntimeHealthVerificationPresent: sourceSmokeContracts.routeRuntimeHealthVerificationPresent,
    clientErrorFixturePresent: sourceSmokeContracts.clientErrorFixturePresent,
  });
  const sourceClearCount = sourceSmoke.filter((row) => row.sourceTruth === "source_clear").length;
  const sourceReportsOnlyCount = sourceSmoke.filter((row) => row.sourceTruth === "source_reports_only").length;
  const liveAdminRequiredCount = sourceSmoke.filter((row) => row.sourceTruth === "live_admin_required").length;
  const providerRequiredCount = sourceSmoke.filter((row) => row.sourceTruth === "provider_required").length;
  const status: AdminBrowserSurfaceReportStatus = authenticatedSurfaceEvidenceCount === requiredAuthenticated.length
    ? "authenticated_browser_covered"
    : missingAccountFreeFixtureSurfaceIds.length === 0
      ? "local_fixture_browser_covered"
    : unauthBoundaryEvidenceCount > 0
      ? "browser_boundary_partial"
      : "source_contract_ready";
  const totalFindingCount = missingSourceAdminRoutes.length + extraSurfaceRoutes.length;
  const passed = totalFindingCount === 0 && layoutSelectorContractPresent && browserHarnessContractPresent;

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
      signoff: 0,
      privacy: 0,
      payment: protectedSurfaceIds.length,
      lockedContent: 0,
      sourceTruth: totalFindingCount,
    },
    owner: "admin-browser-surface-smoke",
    safetyClass: "source_safe",
    costClass: "local_free",
    rollback: "Revert the admin browser smoke contract/report changes and rerun npm run check:admin-browser-surface-smoke.",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run check:admin-browser-surface-smoke",
    sourceTruthRole: "generated_snapshot",
    passed,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    summary: {
      adminSurfaceCount: ADMIN_BROWSER_SURFACE_DEFINITIONS.length,
      routeCount: surfaceRoutes.length,
      sourceAdminPageCount: sourceAdminRoutes.length,
      layoutSelectorContractPresent,
      browserHarnessContractPresent,
      optionalAuthenticatedSurfaceCount: requiredAuthenticated.length,
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
      sourceSmokeRows: sourceSmoke.length,
      sourceClearCount,
      sourceReportsOnlyCount,
      liveAdminRequiredCount,
      providerRequiredCount,
      protectedSurfaceCount: protectedSurfaceIds.length,
    },
    surfaces: [...ADMIN_BROWSER_SURFACE_DEFINITIONS],
    sourceSmoke,
    evidenceProvenance,
    sourceAdminRoutes,
    missingSourceAdminRoutes,
    extraSurfaceRoutes,
    layoutSelectorContract,
    browserHarnessContract,
    sourceSmokeContracts,
    evidence,
    missingAuthenticatedSurfaceIds,
    missingAccountFreeFixtureSurfaceIds,
    protectedSurfaceIds,
    doesNotProve: [...FORMAL_GATE_LIMITS],
    nextExactSteps: [
      missingAccountFreeFixtureSurfaceIds.length > 0
        ? "For local account-free UI rendering checks, run NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1 and ADMIN_BROWSER_SMOKE=1 ADMIN_BROWSER_SMOKE_FIXTURE_SESSION=1 ADMIN_BROWSER_SMOKE_EVIDENCE_DIR=<tmp-dir> npm run check:admin-browser-surface-smoke:browser; this records local_fixture_surface_verified evidence without requiring real admin test accounts."
        : "Account-free local admin route rendering is covered by fixture evidence; keep it separate from optional authenticated browser reproduction, deployed runtime proof, and production admin truth samples.",
      "Use authenticated browser checks only as optional reproduction for a source-reported admin UI issue; do not use them as source, provider, runtime, admin-truth, payment, or GumDrop proof.",
      "For direct in-app Browser audits without Playwright, start the local dev server with NEXT_PUBLIC_ENABLE_ADMIN_UI_TEST_SESSION=1, open /api/admin-ui-test-session?redirect=/admin once to mint the bounded local fixture cookie, then navigate admin routes normally; this proves local route rendering only.",
      "Keep browser evidence fragments local or attach them to a specific issue; do not commit route-rendering logs as canonical proof.",
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
  if (report.passed !== (report.validationFailures.length === 0)) {
    failures.push("admin browser smoke passed must reflect source validation failures only.");
  }
  if (report.canClearRuntimeGate || report.canClearProviderGate || report.canClearAdminTruthGate) {
    failures.push("admin browser smoke cannot clear runtime, provider, or admin truth gates.");
  }
  if (Object.prototype.hasOwnProperty.call(report.summary, "manualAdminAuthRequiredCount")) {
    failures.push("admin browser smoke summary must expose sourceTruthStates instead of manualAdminAuthRequiredCount.");
  }
  if (report.summary.sourceSmokeRows !== report.sourceSmoke.length) {
    failures.push("sourceSmokeRows must match sourceSmoke length.");
  }
  if (report.summary.sourceSmokeRows !== ADMIN_BROWSER_SURFACE_DEFINITIONS.length) {
    failures.push("source smoke must include one row for every admin browser surface.");
  }
  if (report.summary.sourceClearCount !== report.sourceSmoke.filter((row) => row.sourceTruth === "source_clear").length) {
    failures.push("sourceClearCount must match source smoke rows.");
  }
  if (report.summary.sourceReportsOnlyCount !== report.sourceSmoke.filter((row) => row.sourceTruth === "source_reports_only").length) {
    failures.push("sourceReportsOnlyCount must match source smoke rows.");
  }
  if (report.summary.liveAdminRequiredCount !== report.sourceSmoke.filter((row) => row.sourceTruth === "live_admin_required").length) {
    failures.push("liveAdminRequiredCount must match source smoke rows.");
  }
  if (report.summary.providerRequiredCount !== report.sourceSmoke.filter((row) => row.sourceTruth === "provider_required").length) {
    failures.push("providerRequiredCount must match source smoke rows.");
  }
  if (!report.sourceSmokeContracts.routeContractPresent) {
    failures.push("source smoke requires canonical route contract entries.");
  }
  if (!report.sourceSmokeContracts.layoutHydrationMarkerPresent) {
    failures.push("source smoke requires shared admin layout hydration markers.");
  }
  if (!report.sourceSmokeContracts.controlTowerFixtureSourceReportsOnly) {
    failures.push("source smoke requires local Control Tower fixture reports to be source_reports_only.");
  }
  if (!report.sourceSmokeContracts.routeRuntimeHealthVerificationPresent) {
    failures.push("source smoke requires route runtime health verification injection.");
  }
  if (!report.sourceSmokeContracts.clientErrorFixturePresent) {
    failures.push("source smoke requires client-error fixture/debug evidence reporting.");
  }
  const sourceSmokeBySurface = new Map(report.sourceSmoke.map((row) => [row.surfaceId, row]));
  for (const surface of ADMIN_BROWSER_SURFACE_DEFINITIONS) {
    const row = sourceSmokeBySurface.get(surface.surfaceId);
    if (!row) {
      failures.push(`source smoke missing surface row: ${surface.surfaceId}`);
      continue;
    }
    if (row.route !== surface.route) failures.push(`${surface.surfaceId} source smoke route must match the canonical route.`);
    if (row.component !== surface.sourceComponentPath) failures.push(`${surface.surfaceId} source smoke component must match the canonical source component.`);
    if (!row.selector || !(surface.authenticatedSelectors as readonly string[]).includes(row.selector)) {
      failures.push(`${surface.surfaceId} source smoke selector must match a canonical selector.`);
    }
    if (!row.marker || !(surface.authenticatedVisibleMarkers as readonly string[]).includes(row.marker)) {
      failures.push(`${surface.surfaceId} source smoke marker must match a canonical marker.`);
    }
    if (!row.nextAction.trim()) failures.push(`${surface.surfaceId} source smoke must include a nextAction.`);
    const expectedTruth = resolveSurfaceSourceTruth(surface);
    if (row.sourceTruth !== expectedTruth) {
      failures.push(`${surface.surfaceId} source smoke sourceTruth must be ${expectedTruth}.`);
    }
    if (row.freshnessState !== resolveSurfaceFreshnessState(expectedTruth)) {
      failures.push(`${surface.surfaceId} source smoke freshnessState does not match sourceTruth.`);
    }
    if (row.confidence !== resolveSurfaceConfidence(expectedTruth)) {
      failures.push(`${surface.surfaceId} source smoke confidence does not match sourceTruth.`);
    }
    if (!row.sourceEvidence.routeContract) failures.push(`${surface.surfaceId} source smoke requires routeContract evidence.`);
    if (!row.sourceEvidence.layoutHydrationMarker) failures.push(`${surface.surfaceId} source smoke requires layoutHydrationMarker evidence.`);
    if (!row.sourceEvidence.sourceReportFixture) failures.push(`${surface.surfaceId} source smoke requires sourceReportFixture evidence.`);
    if (!row.sourceEvidence.routeRuntimeHealth) failures.push(`${surface.surfaceId} source smoke requires routeRuntimeHealth evidence.`);
    if (!row.sourceEvidence.clientErrorFixture) failures.push(`${surface.surfaceId} source smoke requires clientErrorFixture evidence.`);
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
      failures.push(`${entry.surfaceId}:${entry.deviceBand} fixture evidence must not satisfy optional authenticated browser reproduction.`);
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
