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

export type AdminBrowserSurfaceSmokeReport = {
  reportKey: "admin-browser-surface-smoke";
  status: AdminBrowserSurfaceReportStatus;
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
    browserSmokeReason: "Main admin landing page and shell navigation must render without hiding source-state labels.",
  },
  {
    surfaceId: "admin_analytics",
    route: "/admin/analytics",
    title: "Admin Analytics",
    group: "analytics",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Analytics panels are dense and must keep snapshot/cache states visible.",
  },
  {
    surfaceId: "admin_drops",
    route: "/admin/drops",
    title: "Admin Drops",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Drop moderation and approval controls need admin-only browser confirmation.",
  },
  {
    surfaceId: "admin_users",
    route: "/admin/users",
    title: "Admin Users",
    group: "people",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "User metrics must not collapse missing data into healthy zero states.",
  },
  {
    surfaceId: "admin_user_detail",
    route: "/admin/user/[userId]",
    title: "Admin User Detail",
    group: "people",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "User detail drilldown is identity and support sensitive and requires authenticated browser review.",
  },
  {
    surfaceId: "admin_roster",
    route: "/admin/roster",
    title: "Admin Roster",
    group: "people",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Creator roster decisions need explicit review/waiting/approved states.",
  },
  {
    surfaceId: "admin_debug",
    route: "/admin/debug",
    title: "Admin Debug",
    group: "ops",
    deviceBands: ["mobile", "desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Control Tower must show stale/missing/fallback evidence without raw dumps first.",
  },
  {
    surfaceId: "admin_ai",
    route: "/admin/ai",
    title: "Admin AI",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "AI tooling must show enablement, budget, model, and fallback states safely.",
  },
  {
    surfaceId: "admin_support",
    route: "/admin/support",
    title: "Admin Support",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Support inbox states must distinguish missing thread, permission denial, retryable failure, submitted, and received.",
  },
  {
    surfaceId: "admin_moderation",
    route: "/admin/moderation",
    title: "Admin Moderation",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Moderation must avoid treating weak browser heuristics as confirmed server proof.",
  },
  {
    surfaceId: "admin_content",
    route: "/admin/content",
    title: "Admin Content",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Content management affordances must be hidden, disabled, or unavailable when not implemented.",
  },
  {
    surfaceId: "admin_queue",
    route: "/admin/queue",
    title: "Admin Queue",
    group: "content",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
    browserSmokeReason: "Queue states must expose pending/review/source-missing truth.",
  },
  {
    surfaceId: "admin_privacy",
    route: "/admin/privacy",
    title: "Admin Privacy",
    group: "ops",
    deviceBands: ["desktop"],
    requiresAdminAuth: true,
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
    browserSmokeReason: "Economy views are protected: browser smoke may inspect labels only and cannot prove GumDrop/payment truth.",
  },
] as const satisfies readonly AdminBrowserSurfaceDefinition[];

const FORMAL_GATE_LIMITS = [
  "local browser smoke does not clear deployed runtime smoke",
  "local browser smoke does not clear provider smoke",
  "local browser smoke does not clear production admin truth sample evidence",
  "local browser smoke does not clear payment or GumDrop treasury truth",
] as const;

function keyForEvidence(surfaceId?: string, deviceBand?: string) {
  return `${surfaceId ?? ""}::${deviceBand ?? ""}`;
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
      return entry?.state !== "authenticated_surface_verified" && entry?.state !== "authenticated_shell_verified";
    })
    .map(({ surface, deviceBand }) => `${surface.surfaceId}:${deviceBand}`);
  const authenticatedSurfaceEvidenceCount = evidence.filter((entry) =>
    entry.state === "authenticated_surface_verified" || entry.state === "authenticated_shell_verified",
  ).length;
  const unauthBoundaryEvidenceCount = evidence.filter((entry) =>
    entry.state === "unauth_boundary_verified" || entry.state === "unauth_redirect_verified",
  ).length;
  const unauthRedirectEvidenceCount = evidence.filter((entry) => entry.state === "unauth_redirect_verified").length;
  const protectedSurfaceIds = ADMIN_BROWSER_SURFACE_DEFINITIONS
    .filter((surface) => "protectedDomain" in surface && surface.protectedDomain)
    .map((surface) => surface.surfaceId);

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
  const reportSurfaceIds = new Set(report.surfaces.map((surface) => surface.surfaceId));

  for (const expected of expectedSurfaceIds) {
    if (!reportSurfaceIds.has(expected)) failures.push(`missing admin browser surface: ${expected}`);
  }
  for (const surface of report.surfaces) {
    if (!surface.requiresAdminAuth) failures.push(`${surface.surfaceId} must require admin auth.`);
    if (surface.route.startsWith("/admin") === false) failures.push(`${surface.surfaceId} route must stay under /admin.`);
  }
  if (report.passed !== false) failures.push("admin browser smoke must not mark itself passed inside source validation.");
  if (report.doesNotProve.some((entry) => /provider|runtime|admin truth|GumDrop|payment/iu.test(entry)) === false) {
    failures.push("report must state formal proof boundaries.");
  }
  for (const entry of report.evidence) {
    if (!expectedSurfaceIds.has(entry.surfaceId)) failures.push(`evidence references unknown surface: ${entry.surfaceId}`);
    if (entry.formalGateImpact.clearsRuntimeSmoke || entry.formalGateImpact.clearsProviderSmoke || entry.formalGateImpact.clearsAdminTruthSample || entry.formalGateImpact.clearsPaymentOrTreasuryTruth) {
      failures.push(`${entry.surfaceId}:${entry.deviceBand} overclaims formal gate impact.`);
    }
  }
  if (!report.protectedSurfaceIds.includes("admin_economy")) {
    failures.push("admin_economy must remain a protected GumDrop treasury browser surface.");
  }
  return failures;
}
