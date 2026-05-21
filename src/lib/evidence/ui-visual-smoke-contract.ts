import type { DeviceBand } from "@/lib/ui/mobile-scale-contract";

export type UiVisualSmokeStatus =
  | "operator_final_pending"
  | "operator_confirmed_outside_codex"
  | "screenshot_attached"
  | "not_required";

export type UiVisualSmokeReportStatus =
  | "operator_final_pending"
  | "operator_confirmed_outside_codex"
  | "screenshot_attached"
  | "not_required";

export type UiVisualSmokeSurfaceEvidence = {
  surfaceId: string;
  surfaceGroup: string;
  route: string;
  deviceBand: DeviceBand;
  requiresVisualSmokeReason: string;
  screenshotArtifactPath?: string;
  operatorConfirmed: boolean;
  operatorNote?: string;
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
    clearsVisualManualSmoke: boolean;
    clearsProviderSmoke: boolean;
    clearsDeployedRuntimeSmoke: boolean;
    clearsAdminTruthSmoke: boolean;
  };
  surfaces: UiVisualSmokeSurfaceEvidence[];
  summary: {
    requiredSurfaceCount: number;
    surfaceGroupCount: number;
    missingSurfaceIds: string[];
    operatorConfirmedSurfaceIds: string[];
    screenshotAttachedSurfaceIds: string[];
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
  operator_final_pending: 0,
  operator_confirmed_outside_codex: 0,
  screenshot_attached: 0,
  not_required: 0,
};

const PROTECTED_SURFACE_PATTERN = /\b(chat|top_nav|bottom_nav|navbar|navigation)\b|\/chat/i;
const NON_UI_LANE_PATTERN = /\b(telemetry|admin_truth|cost|source|provider|runtime|debug_backlog|refresh_queue)\b/i;

export function evaluateUiVisualSmokeSurface(surface: UiVisualSmokeSurfaceEvidence): UiVisualSmokeStatus {
  if (surface.status === "not_required") return "not_required";
  if (surface.status === "operator_confirmed_outside_codex" && surface.operatorConfirmed) {
    return "operator_confirmed_outside_codex";
  }
  if (surface.status === "screenshot_attached" && Boolean(surface.screenshotArtifactPath)) {
    return "screenshot_attached";
  }
  return "operator_final_pending";
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
      operatorConfirmed: false,
      status: "operator_final_pending",
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
    .filter((surface) => surface.status === "operator_final_pending")
    .map((surface) => surface.surfaceId);
  const completedSurfaceCount = surfaces.filter((surface) =>
    surface.status === "operator_confirmed_outside_codex"
    || surface.status === "screenshot_attached"
    || surface.status === "not_required"
  ).length;
  const allCompletedOutsideCodex = surfaces.length > 0 && completedSurfaceCount === surfaces.length;
  const status: UiVisualSmokeReportStatus = allCompletedOutsideCodex
    ? surfaces.every((surface) => surface.status === "not_required")
      ? "not_required"
      : surfaces.some((surface) => surface.status === "screenshot_attached")
        ? "screenshot_attached"
        : "operator_confirmed_outside_codex"
    : "operator_final_pending";
  const surfaceIds = surfaces.map((surface) => surface.surfaceId);

  return {
    status,
    passed: false,
    generatedAtUtc,
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    detail: allCompletedOutsideCodex
      ? "Visual confirmation is tracked as an operator-final step outside Codex."
      : `Visual confirmation handled outside Codex; operator review is pending for: ${missingSurfaceIds.join(", ")}.`,
    nonUiLanesBlocked: false,
    formalGateImpact: {
      clearsVisualManualSmoke: false,
      clearsProviderSmoke: false,
      clearsDeployedRuntimeSmoke: false,
      clearsAdminTruthSmoke: false,
    },
    surfaces,
    summary: {
      requiredSurfaceCount: surfaces.length,
      surfaceGroupCount: new Set(surfaces.map((surface) => surface.surfaceGroup)).size,
      missingSurfaceIds,
      operatorConfirmedSurfaceIds: surfaces
        .filter((surface) => surface.status === "operator_confirmed_outside_codex")
        .map((surface) => surface.surfaceId),
      screenshotAttachedSurfaceIds: surfaces
        .filter((surface) => surface.status === "screenshot_attached")
        .map((surface) => surface.surfaceId),
      failedSurfaceIds: [],
      notRequiredSurfaceIds: surfaces
        .filter((surface) => surface.status === "not_required")
        .map((surface) => surface.surfaceId),
      statusCounts,
    },
    evidence: [
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
    nextExactSteps: missingSurfaceIds.map((surfaceId) =>
      `Operator final visual review needed for ${surfaceId}; visual confirmation handled outside Codex and must not block source/debug scoring.`,
    ),
  };
}

export function validateUiVisualSmokeMinimalReport(
  report: UiVisualSmokeMinimalReport,
  options: { templateExists?: boolean } = {},
) {
  const failures: string[] = [];
  const requiredSurfaceIds = new Set<string>(UI_VISUAL_SMOKE_REQUIRED_SURFACES.map((surface) => surface.surfaceId));
  const reportSurfaceIds = new Set(report.surfaces.map((surface) => surface.surfaceId));

  if (options.templateExists === false) {
    failures.push("agent/evidence/ui-visual-smoke/template.json is missing");
  }
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
    if (surface.status === "operator_confirmed_outside_codex" && !surface.operatorConfirmed) {
      failures.push(`${surface.surfaceId} is operator_confirmed_outside_codex but lacks operator confirmation`);
    }
    if (surface.status === "screenshot_attached" && !surface.screenshotArtifactPath) {
      failures.push(`${surface.surfaceId} is screenshot_attached but lacks screenshotArtifactPath`);
    }
    if (surface.blocksScoreForUiOnly || surface.codexScoreBlocking) {
      failures.push(`${surface.surfaceId} must not block Codex score`);
    }
  }
  const everyRequiredSurfaceSatisfied = UI_VISUAL_SMOKE_REQUIRED_SURFACES.every((requiredSurface) => {
    const surface = report.surfaces.find((candidate) => candidate.surfaceId === requiredSurface.surfaceId);
    return surface
      && (surface.status === "operator_confirmed_outside_codex"
        || surface.status === "screenshot_attached"
        || surface.status === "not_required");
  });
  if (report.passed) {
    failures.push("visual smoke must not pass inside Codex; it is operator-final outside Codex");
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
    detail: `${report.detail} This is an operator-final checklist; visual confirmation handled outside Codex and does not block source/debug/beta scoring or non-UI telemetry, admin, cost, refresh, provider, or source-runtime evidence. Required surfaces: ${requiredSurfaceIds.join(", ")}.`,
    evidence: [
      `uiVisualSmoke.status=${report.status}`,
      `uiVisualSmoke.passed=${report.passed}`,
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
