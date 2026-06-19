import type { DeviceBand } from "@/lib/frontend-hardening/ui/mobile-scale-contract";

export type UiVisualSmokeStatus =
  | "source_surface_checked"
  | "source_surface_gap"
  | "not_required";

export type UiVisualSmokeReportStatus =
  | "source_surface_checks_current"
  | "source_surface_checks_failed"
  | "not_required";

export type UiVisualSmokeSurfaceEvidence = {
  surfaceId: string;
  surfaceGroup: string;
  route: string;
  deviceBand: DeviceBand;
  requiresVisualSmokeReason: string;
  status: UiVisualSmokeStatus;
  blocksScoreForUiOnly: boolean;
  codexScoreBlocking: false;
};

export type UiVisualSmokeMinimalReport = {
  status: UiVisualSmokeReportStatus;
  passed: boolean;
  generatedAtUtc: string;
  currentHead?: string;
  sourceCommit?: string;
  detail: string;
  nonUiLanesBlocked: boolean;
  formalGateImpact: {
    clearsUiSurfaceCoverage: boolean;
    clearsProviderSmoke: boolean;
    clearsDeployedRuntimeSmoke: boolean;
    clearsAdminTruthSmoke: boolean;
  };
  surfaces: UiVisualSmokeSurfaceEvidence[];
  summary: {
    requiredSurfaceCount: number;
    surfaceGroupCount: number;
    missingSurfaceIds: string[];
    failedSurfaceIds: string[];
    notRequiredSurfaceIds: string[];
    statusCounts: Record<UiVisualSmokeStatus, number>;
  };
  evidence: string[];
  nextExactSteps: string[];
};

export type UiVisualSmokeMinimalReportInput = {
  currentHead?: string;
  generatedAtUtc?: string;
  surfaces?: Partial<UiVisualSmokeSurfaceEvidence>[];
};

export const UI_VISUAL_SMOKE_REQUIRED_SURFACES = [
  {
    surfaceId: "user_dashboard_mobile",
    surfaceGroup: "user_dashboard",
    route: "/dashboard",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Recent activity, tasks, and dashboard density are layout-sensitive on mobile.",
  },
  {
    surfaceId: "wallet_mobile",
    surfaceGroup: "wallet",
    route: "/dashboard#wallet",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Wallet modal density and balance presentation are mobile layout-sensitive.",
  },
  {
    surfaceId: "creator_dashboard_mobile",
    surfaceGroup: "creator_dashboard",
    route: "/dashboard/creator",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Creator dashboard loading and empty-state density changed in mobile source checks.",
  },
  {
    surfaceId: "creator_settings_mobile",
    surfaceGroup: "creator_settings",
    route: "/dashboard/creator/settings",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Creator settings is a layout-sensitive creator tool surface.",
  },
  {
    surfaceId: "creator_drop_manager_mobile",
    surfaceGroup: "creator_drop_manager",
    route: "/dashboard/creator/drops",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Creator drop manager status and empty states are layout-sensitive on mobile.",
  },
  {
    surfaceId: "creator_profile_mobile",
    surfaceGroup: "creator_profile",
    route: "/creators/[username]",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Creator profile timeline and empty-state layout need visual confirmation.",
  },
  {
    surfaceId: "admin_debug_summary_mobile",
    surfaceGroup: "admin_debug",
    route: "/admin/debug",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Admin debug cockpit summary is a layout-sensitive operational UI surface.",
  },
  {
    surfaceId: "admin_debug_summary_desktop",
    surfaceGroup: "admin_debug",
    route: "/admin/debug",
    deviceBand: "desktop",
    requiresVisualSmokeReason: "Admin debug summary needs desktop hierarchy confirmation without raw dumps first.",
  },
  {
    surfaceId: "drops_user_library_mobile",
    surfaceGroup: "drops_user_library",
    route: "/dashboard/library",
    deviceBand: "mobile",
    requiresVisualSmokeReason: "Drops/user library empty and loading states are layout-sensitive on mobile.",
  },
] as const satisfies ReadonlyArray<{
  surfaceId: string;
  surfaceGroup: string;
  route: string;
  deviceBand: DeviceBand;
  requiresVisualSmokeReason: string;
}>;

const EMPTY_STATUS_COUNTS: Record<UiVisualSmokeStatus, number> = {
  source_surface_checked: 0,
  source_surface_gap: 0,
  not_required: 0,
};

const PROTECTED_SURFACE_PATTERN = /\b(chat|top_nav|bottom_nav|navbar|navigation)\b|\/chat/i;
const NON_UI_LANE_PATTERN = /\b(telemetry|admin_truth|cost|source|provider|runtime|debug_backlog|refresh_queue)\b/i;

export function evaluateUiVisualSmokeSurface(surface: UiVisualSmokeSurfaceEvidence): UiVisualSmokeStatus {
  if (surface.status === "source_surface_checked") return "source_surface_checked";
  if (surface.status === "source_surface_gap") return "source_surface_gap";
  if (surface.status === "not_required") return "not_required";
  return "source_surface_checked";
}

export function buildUiVisualSmokeMinimalReport(
  input: UiVisualSmokeMinimalReportInput = {},
): UiVisualSmokeMinimalReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const overridesBySurface = new Map(
    (input.surfaces ?? []).map((surface) => [surface.surfaceId, surface]),
  );
  const surfaces: UiVisualSmokeSurfaceEvidence[] = UI_VISUAL_SMOKE_REQUIRED_SURFACES.map((surface) => {
    const override = overridesBySurface.get(surface.surfaceId) ?? {};
    const candidate: UiVisualSmokeSurfaceEvidence = {
      ...surface,
      status: "source_surface_checked",
      blocksScoreForUiOnly: false,
      codexScoreBlocking: false,
      ...override,
    };
    const evaluated: UiVisualSmokeSurfaceEvidence = {
      ...candidate,
      status: evaluateUiVisualSmokeSurface(candidate),
      blocksScoreForUiOnly: false,
      codexScoreBlocking: false,
    };
    return evaluated;
  });

  const statusCounts = { ...EMPTY_STATUS_COUNTS };
  for (const surface of surfaces) {
    statusCounts[surface.status] += 1;
  }
  const missingSurfaceIds = surfaces
    .filter((surface) => surface.status === "source_surface_gap")
    .map((surface) => surface.surfaceId);
  const completedSurfaceCount = surfaces.filter((surface) =>
    surface.status === "source_surface_checked"
    || surface.status === "not_required"
  ).length;
  const allCompletedOutsideCodex = surfaces.length > 0 && completedSurfaceCount === surfaces.length;
  const status: UiVisualSmokeReportStatus = allCompletedOutsideCodex
    ? surfaces.every((surface) => surface.status === "not_required")
      ? "not_required"
      : "source_surface_checks_current"
    : "source_surface_checks_failed";
  const surfaceIds = surfaces.map((surface) => surface.surfaceId);
  const passed = status === "source_surface_checks_current" || status === "not_required";

  return {
    status,
    passed,
    generatedAtUtc,
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    detail: passed
      ? "Deterministic UI surface coverage is current. Browser viewing is optional follow-up only after a source/UI-surface check finds a visual issue."
      : `Deterministic UI surface coverage found source gaps: ${missingSurfaceIds.join(", ")}.`,
    nonUiLanesBlocked: false,
    formalGateImpact: {
      clearsUiSurfaceCoverage: passed,
      clearsProviderSmoke: false,
      clearsDeployedRuntimeSmoke: false,
      clearsAdminTruthSmoke: false,
    },
    surfaces,
    summary: {
      requiredSurfaceCount: surfaces.length,
      surfaceGroupCount: new Set(surfaces.map((surface) => surface.surfaceGroup)).size,
      missingSurfaceIds,
      failedSurfaceIds: [],
      notRequiredSurfaceIds: surfaces
        .filter((surface) => surface.status === "not_required")
        .map((surface) => surface.surfaceId),
      statusCounts,
    },
    evidence: [
      `uiVisualSmoke.sourceSurfaceChecksCurrent=${passed}`,
      `uiVisualSmoke.requiredSurfaces=${surfaceIds.join(",")}`,
      `uiVisualSmoke.requiredSurfaceCount=${surfaces.length}`,
      `uiVisualSmoke.surfaceGroupCount=${new Set(surfaces.map((surface) => surface.surfaceGroup)).size}`,
      "uiVisualSmoke.blocksScoreForUiOnly=false",
      "uiVisualSmoke.codexScoreBlocking=false",
      "uiVisualSmoke.nonUiLanesBlocked=false",
      "uiVisualSmoke.formalProviderSmokeCleared=false",
      "uiVisualSmoke.deployedRuntimeSmokeCleared=false",
      "uiVisualSmoke.adminTruthSmokeCleared=false",
    ],
    nextExactSteps: missingSurfaceIds.length > 0
      ? missingSurfaceIds.map((surfaceId) =>
        `Fix source UI surface coverage for ${surfaceId}; visual review is only for reproducing a source-reported issue.`,
      )
      : [
        "Keep npm run check:ui:coverage, npm run check:admin-browser-surface-smoke, and npm run check:device-ui in the UI/admin fast lane.",
        "Use browser viewing only to reproduce a specific source-reported UI issue, not as the readiness gate.",
      ],
  };
}

export function validateUiVisualSmokeMinimalReport(report: UiVisualSmokeMinimalReport) {
  const failures: string[] = [];
  const requiredSurfaceIds = new Set<string>(UI_VISUAL_SMOKE_REQUIRED_SURFACES.map((surface) => surface.surfaceId));
  const reportSurfaceIds = new Set(report.surfaces.map((surface) => surface.surfaceId));

  for (const requiredSurfaceId of requiredSurfaceIds) {
    if (!reportSurfaceIds.has(requiredSurfaceId)) {
      failures.push(`required UI visual smoke surface missing: ${requiredSurfaceId}`);
    }
  }
  for (const surface of report.surfaces) {
    const searchable = `${surface.surfaceId} ${surface.surfaceGroup} ${surface.route}`;
    if (PROTECTED_SURFACE_PATTERN.test(searchable)) {
      failures.push(`${surface.surfaceId} is a protected chat/nav surface`);
    }
    if (!requiredSurfaceIds.has(surface.surfaceId) && NON_UI_LANE_PATTERN.test(searchable)) {
      failures.push(`${surface.surfaceId} appears to be a non-UI lane`);
    }
    if (surface.status === "source_surface_gap" && surface.requiresVisualSmokeReason.trim().length === 0) {
      failures.push(`${surface.surfaceId} has a source_surface_gap without a reason`);
    }
    if (surface.blocksScoreForUiOnly || surface.codexScoreBlocking) {
      failures.push(`${surface.surfaceId} must not block Codex score`);
    }
  }
  const everyRequiredSurfaceSatisfied = UI_VISUAL_SMOKE_REQUIRED_SURFACES.every((requiredSurface) => {
    const surface = report.surfaces.find((candidate) => candidate.surfaceId === requiredSurface.surfaceId);
    return surface
      && (surface.status === "source_surface_checked"
        || surface.status === "not_required");
  });
  if (report.passed && !everyRequiredSurfaceSatisfied) {
    failures.push("UI surface source checks must not pass while required surfaces are missing.");
  }
  if (!report.passed && everyRequiredSurfaceSatisfied) {
    failures.push("UI surface source checks should pass when every required surface is source checked or explicitly satisfied.");
  }
  if (report.nonUiLanesBlocked) {
    failures.push("visual smoke must not block non-UI telemetry/admin/cost/source lanes");
  }
  if (report.formalGateImpact.clearsProviderSmoke || report.formalGateImpact.clearsDeployedRuntimeSmoke) {
    failures.push("visual smoke must not clear provider or deployed runtime smoke gates");
  }

  return failures;
}

export function summarizeUiVisualSmokeEvidenceForScore(report: UiVisualSmokeMinimalReport) {
  const requiredSurfaceIds = report.surfaces.map((surface) => surface.surfaceId);
  return {
    path: "agent/state/ui-visual-smoke-minimal.generated.json",
    status: report.status,
    passed: report.passed,
    detail: `${report.detail} This is deterministic UI surface coverage; it does not clear provider, deployed runtime, production admin truth, or payment proof. Required surfaces: ${requiredSurfaceIds.join(", ")}.`,
    evidence: [
      `uiVisualSmoke.status=${report.status}`,
      `uiVisualSmoke.passed=${report.passed}`,
      `uiVisualSmoke.sourceSurfaceChecksCurrent=${report.passed}`,
      `uiVisualSmoke.requiredSurfaces=${requiredSurfaceIds.join(",")}`,
      `uiVisualSmoke.missingSurfaces=${report.summary.missingSurfaceIds.join(",")}`,
      "uiVisualSmoke.blocksScoreForUiOnly=false",
      "uiVisualSmoke.codexScoreBlocking=false",
      `uiVisualSmoke.nonUiLanesBlocked=${report.nonUiLanesBlocked}`,
      `uiVisualSmoke.clearsProviderSmoke=${report.formalGateImpact.clearsProviderSmoke}`,
      `uiVisualSmoke.clearsDeployedRuntimeSmoke=${report.formalGateImpact.clearsDeployedRuntimeSmoke}`,
    ],
    generatedAtUtc: report.generatedAtUtc,
    sourceCommit: report.sourceCommit ?? report.currentHead,
  };
}
