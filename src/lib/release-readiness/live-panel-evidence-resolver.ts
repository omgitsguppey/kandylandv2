import type {
  AdminAnalyticsPanelHydrationRecord,
  AnalyticsPanelHydrationReport,
} from "@/lib/admin-analytics/panel-hydration-contract";

export type LivePanelEvidenceDecision = {
  panelId: string;
  panelLabel: string;
  status:
    | "live_panel_evidence"
    | "source_exists_collecting"
    | "stale_panel_evidence"
    | "source_missing_actionable"
    | "materializer_missing_actionable"
    | "bridge_missing_actionable"
    | "external_required"
    | "permission_blocked"
    | "broken";
  clearsLiveProductEvidence: boolean;
  betaExitImpact:
    | "can_reduce_manual_scope"
    | "source_exists_but_not_recent"
    | "blocks_until_hydrated"
    | "external_required"
    | "operator_or_permission_required";
  reason: string;
  nextExactAction: string;
};

export type LivePanelEvidenceReport = {
  reportKey: "live-panel-evidence";
  generatedAtUtc: string;
  currentHead: string;
  decisions: LivePanelEvidenceDecision[];
  liveEvidencePanelIds: string[];
  externalRequiredPanelIds: string[];
  blockedPanelIds: string[];
};

export function mapPanelHydrationToLiveEvidence(panel: AdminAnalyticsPanelHydrationRecord): LivePanelEvidenceDecision {
  if (panel.hydrationStatus === "hydrated") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "live_panel_evidence",
      clearsLiveProductEvidence: true,
      betaExitImpact: "can_reduce_manual_scope",
      reason: `${panel.panelLabel} is hydrated by ${panel.expectedSource}.`,
      nextExactAction: "Keep the source fresh and privacy-redacted.",
    };
  }
  if (panel.hydrationStatus === "collecting") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "source_exists_collecting",
      clearsLiveProductEvidence: false,
      betaExitImpact: "source_exists_but_not_recent",
      reason: `${panel.panelLabel} has a source path but no recent clearing activity or proven zero.`,
      nextExactAction: panel.nextExactAction,
    };
  }
  if (panel.hydrationStatus === "external_required" || panel.hydrationStatus === "provider_gated" || panel.hydrationStatus === "protected_payment_required") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "external_required",
      clearsLiveProductEvidence: false,
      betaExitImpact: "external_required",
      reason: panel.reason,
      nextExactAction: panel.nextExactAction,
    };
  }
  if (panel.hydrationStatus === "runtime_evidence_required" || panel.hydrationStatus === "admin_truth_source_required") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "source_missing_actionable",
      clearsLiveProductEvidence: false,
      betaExitImpact: "blocks_until_hydrated",
      reason: panel.reason,
      nextExactAction: panel.nextExactAction,
    };
  }
  if (panel.hydrationStatus === "materializer_missing") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "materializer_missing_actionable",
      clearsLiveProductEvidence: false,
      betaExitImpact: "blocks_until_hydrated",
      reason: panel.reason,
      nextExactAction: panel.nextExactAction,
    };
  }
  if (panel.hydrationStatus === "bridge_missing") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "bridge_missing_actionable",
      clearsLiveProductEvidence: false,
      betaExitImpact: "blocks_until_hydrated",
      reason: panel.reason,
      nextExactAction: panel.nextExactAction,
    };
  }
  if (panel.hydrationStatus === "permission_blocked" || panel.hydrationStatus === "hidden_by_role") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "permission_blocked",
      clearsLiveProductEvidence: false,
      betaExitImpact: "operator_or_permission_required",
      reason: panel.reason,
      nextExactAction: panel.nextExactAction,
    };
  }
  if (panel.hydrationStatus === "broken") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "broken",
      clearsLiveProductEvidence: false,
      betaExitImpact: "blocks_until_hydrated",
      reason: panel.reason,
      nextExactAction: panel.nextExactAction,
    };
  }
  if (panel.hydrationStatus === "stale") {
    return {
      panelId: panel.panelId,
      panelLabel: panel.panelLabel,
      status: "stale_panel_evidence",
      clearsLiveProductEvidence: false,
      betaExitImpact: "blocks_until_hydrated",
      reason: panel.reason,
      nextExactAction: panel.nextExactAction,
    };
  }
  return {
    panelId: panel.panelId,
    panelLabel: panel.panelLabel,
    status: "source_missing_actionable",
    clearsLiveProductEvidence: false,
    betaExitImpact: "blocks_until_hydrated",
    reason: panel.reason,
    nextExactAction: panel.nextExactAction,
  };
}

export function buildLivePanelEvidenceReport(panelHydration: AnalyticsPanelHydrationReport): LivePanelEvidenceReport {
  const decisions = Object.values(panelHydration.panelStatus).map(mapPanelHydrationToLiveEvidence);
  return {
    reportKey: "live-panel-evidence",
    generatedAtUtc: panelHydration.generatedAtUtc,
    currentHead: panelHydration.currentHead,
    decisions,
    liveEvidencePanelIds: decisions.filter((decision) => decision.clearsLiveProductEvidence).map((decision) => decision.panelId),
    externalRequiredPanelIds: decisions.filter((decision) => decision.status === "external_required").map((decision) => decision.panelId),
    blockedPanelIds: decisions
      .filter((decision) => decision.betaExitImpact === "blocks_until_hydrated")
      .map((decision) => decision.panelId),
  };
}
