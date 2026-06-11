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
  | "authenticated_shell_verified"
  | "authenticated_surface_verified"
  | "manual_admin_auth_required"
  | "blocked_runtime_required";

export type AdminBrowserSurfaceReportStatus =
  | "source_contract_ready"
  | "browser_boundary_partial"
  | "authenticated_browser_pending"
  | "authenticated_browser_covered";

export type AdminBrowserSurfaceEvidenceInput = Partial<{
  surfaceId: string;
  route: string;
  deviceBand: AdminBrowserSurfaceDeviceBand;
  state: AdminBrowserSurfaceEvidenceState;
  checkedAtUtc: string;
  urlAfterNavigation: string;
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
    requiredAuthenticatedSurfaceCount: number;
    evidenceCount: number;
    authenticatedSurfaceEvidenceCount: number;
    unauthBoundaryEvidenceCount: number;
    unauthRedirectEvidenceCount: number;
    manualAdminAuthRequiredCount: number;
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
  evidence: AdminBrowserSurfaceEvidence[];
  missingAuthenticatedSurfaceIds: string[];
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
} = {}): AdminBrowserSurfaceSmokeReport {
  const evidence = (input.evidence ?? [])
    .map(normalizeAdminBrowserSurfaceEvidence)
    .filter((entry): entry is AdminBrowserSurfaceEvidence => Boolean(entry));
  const evidenceBySurfaceBand = new Map(evidence.map((entry) => [keyForEvidence(entry.surfaceId, entry.deviceBand), entry]));
  const requiredAuthenticated = ADMIN_BROWSER_SURFACE_DEFINITIONS.flatMap((surface) =>
    surface.deviceBands.map((deviceBand) => ({ surface, deviceBand })),
  );
  const missingAuthenticatedSurfaceIds = requiredAuthenticated
    .filter(({ surface, deviceBand }) => {
      const entry = evidenceBySurfaceBand.get(keyForEvidence(surface.surfaceId, deviceBand));
      return !entry || !isAuthenticatedEvidenceState(entry.state);
    })
    .map(({ surface, deviceBand }) => `${surface.surfaceId}:${deviceBand}`);
  const authenticatedSurfaceEvidenceCount = evidence.filter((entry) => isAuthenticatedEvidenceState(entry.state)).length;
  const unauthBoundaryEvidenceCount = evidence.filter((entry) =>
    entry.state === "unauth_boundary_verified" || entry.state === "unauth_redirect_verified",
  ).length;
  const unauthRedirectEvidenceCount = evidence.filter((entry) => entry.state === "unauth_redirect_verified").length;
  const evidenceMode: AdminBrowserSurfaceEvidenceMode = authenticatedSurfaceEvidenceCount > 0
    ? "authenticated_present"
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
  const totalFindingCount = missingAuthenticatedSurfaceIds.length;

  const status: AdminBrowserSurfaceReportStatus = authenticatedSurfaceEvidenceCount === requiredAuthenticated.length
    ? "authenticated_browser_covered"
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
      requiredAuthenticatedSurfaceCount: requiredAuthenticated.length,
      evidenceCount: evidence.length,
      authenticatedSurfaceEvidenceCount,
      unauthBoundaryEvidenceCount,
      unauthRedirectEvidenceCount,
      manualAdminAuthRequiredCount: missingAuthenticatedSurfaceIds.length,
      protectedSurfaceCount: protectedSurfaceIds.length,
    },
    surfaces: [...ADMIN_BROWSER_SURFACE_DEFINITIONS],
    evidenceProvenance,
    sourceAdminRoutes,
    missingSourceAdminRoutes,
    extraSurfaceRoutes,
    layoutSelectorContract,
    evidence,
    missingAuthenticatedSurfaceIds,
    protectedSurfaceIds,
    doesNotProve: [...FORMAL_GATE_LIMITS],
    nextExactSteps: [
      "Run local browser smoke against every admin route with an authenticated admin session or attach operator screenshots.",
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
  for (const entry of report.evidence) {
    if (!expectedSurfaceIds.has(entry.surfaceId)) failures.push(`evidence references unknown surface: ${entry.surfaceId}`);
    const surface = surfacesById.get(entry.surfaceId);
    if (surface && !(surface.deviceBands as readonly AdminBrowserSurfaceDeviceBand[]).includes(entry.deviceBand)) {
      failures.push(`${entry.surfaceId}:${entry.deviceBand} is not an expected admin browser device band.`);
    }
    if (!entry.route.startsWith("/admin")) {
      failures.push(`${entry.surfaceId}:${entry.deviceBand} evidence route must stay under /admin.`);
    }
    if (isAuthenticatedEvidenceState(entry.state)) {
      if (!entry.checkedAtUtc || Number.isNaN(Date.parse(entry.checkedAtUtc))) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} authenticated evidence must include checkedAtUtc.`);
      }
      if (!entry.urlAfterNavigation?.trim()) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} authenticated evidence must include urlAfterNavigation.`);
      }
      if (!entry.visibleMarker?.trim()) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} authenticated evidence must include a visible admin marker.`);
      } else if (surface && !matchesExpectedVisibleMarker(entry.visibleMarker, surface.authenticatedVisibleMarkers)) {
        failures.push(`${entry.surfaceId}:${entry.deviceBand} authenticated evidence marker must match one of: ${surface.authenticatedVisibleMarkers.join(", ")}.`);
      }
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
