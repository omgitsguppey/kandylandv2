export type AdminBrowserSurfaceDeviceBand = "mobile" | "desktop";

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

export type AdminBrowserSurfaceDefinition = {
  surfaceId: string;
  route: string;
  title: string;
  group: "overview" | "analytics" | "ops" | "content" | "people" | "protected_money";
  deviceBands: AdminBrowserSurfaceDeviceBand[];
  requiresAdminAuth: true;
  protectedDomain?: "gumdrop_treasury";
  authenticatedVisibleMarkers: readonly string[];
  browserSmokeReason: string;
};

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
  evidence: AdminBrowserSurfaceEvidence[];
  missingAuthenticatedSurfaceIds: string[];
  protectedSurfaceIds: string[];
  doesNotProve: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

export const ADMIN_BROWSER_SURFACE_DEFINITIONS = [
  {
    surfaceId: "admin_overview",
    route: "/admin",
    title: "Admin Overview",
    group: "overview",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Admin Overview", "data-admin-platform-pulse-grid"],
    browserSmokeReason: "Main admin landing page and shell navigation must render without hiding source-state labels.",
  },
  {
    surfaceId: "admin_analytics",
    route: "/admin/analytics",
    title: "Admin Analytics",
    group: "analytics",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Analytics Overview", "data-admin-mobile-surface=analytics", "data-admin-analytics-summary=primary"],
    browserSmokeReason: "Analytics panels are dense and must keep snapshot/cache states visible.",
  },
  {
    surfaceId: "admin_drops",
    route: "/admin/drops",
    title: "Admin Drops",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Manage Drops", "Admin Drops"],
    browserSmokeReason: "Drop moderation and approval controls need admin-only browser confirmation.",
  },
  {
    surfaceId: "admin_users",
    route: "/admin/users",
    title: "Admin Users",
    group: "people",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["User Management", "data-admin-users-snapshot-state", "data-admin-users-stats-layout=compact-grid"],
    browserSmokeReason: "User metrics must not collapse missing data into healthy zero states.",
  },
  {
    surfaceId: "admin_user_detail",
    route: "/admin/user/[userId]",
    title: "Admin User Detail",
    group: "people",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Engagement verdict", "Recommendation verdict", "Value verdict"],
    browserSmokeReason: "User detail drilldown is identity and support sensitive and requires authenticated browser review.",
  },
  {
    surfaceId: "admin_roster",
    route: "/admin/roster",
    title: "Admin Roster",
    group: "people",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Creator Review", "data-roster-mode=decision_queue"],
    browserSmokeReason: "Creator roster decisions need explicit review/waiting/approved states.",
  },
  {
    surfaceId: "admin_debug",
    route: "/admin/debug",
    title: "Admin Debug",
    group: "ops",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Debug Console", "data-admin-mobile-surface=debug", "data-admin-debug-sprawl-reduction=target-75-95"],
    browserSmokeReason: "Control Tower must show stale/missing/fallback evidence without raw dumps first.",
  },
  {
    surfaceId: "admin_ai",
    route: "/admin/ai",
    title: "Admin AI",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Cover Ops", "Cover Ops Verification"],
    browserSmokeReason: "AI tooling must show enablement, budget, model, and fallback states safely.",
  },
  {
    surfaceId: "admin_support",
    route: "/admin/support",
    title: "Admin Support",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Support Workspace", "Admin Console"],
    browserSmokeReason: "Support inbox states must distinguish missing thread, permission denial, retryable failure, submitted, and received.",
  },
  {
    surfaceId: "admin_moderation",
    route: "/admin/moderation",
    title: "Admin Moderation",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Moderation Control Tower", "data-admin-moderation-v2=real-risk-workspace"],
    browserSmokeReason: "Moderation must avoid treating weak browser heuristics as confirmed server proof.",
  },
  {
    surfaceId: "admin_content",
    route: "/admin/content",
    title: "Admin Content",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Content Manager", "Admin Storage"],
    browserSmokeReason: "Content management affordances must be hidden, disabled, or unavailable when not implemented.",
  },
  {
    surfaceId: "admin_queue",
    route: "/admin/queue",
    title: "Admin Queue",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Manage Queue", "Admin Queue"],
    browserSmokeReason: "Queue states must expose pending/review/source-missing truth.",
  },
  {
    surfaceId: "admin_privacy",
    route: "/admin/privacy",
    title: "Admin Privacy",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    authenticatedVisibleMarkers: ["Privacy Console", "Admin Setup"],
    browserSmokeReason: "Privacy and consent surfaces must keep source and policy boundaries visible.",
  },
  {
    surfaceId: "admin_economy",
    route: "/admin/economy",
    title: "Admin Economy",
    group: "protected_money",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    protectedDomain: "gumdrop_treasury",
    authenticatedVisibleMarkers: ["GumDrops Commerce Control Center", "Platform Economy"],
    browserSmokeReason: "Economy views are protected: browser smoke may inspect labels only and cannot prove GumDrop/payment truth.",
  },
] as const satisfies readonly AdminBrowserSurfaceDefinition[];

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
      routeCount: new Set(ADMIN_BROWSER_SURFACE_DEFINITIONS.map((surface) => surface.route)).size,
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
