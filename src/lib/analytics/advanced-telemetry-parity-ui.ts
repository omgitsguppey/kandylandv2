import type { ValidationItem } from "@/types/admin-analytics";

type UiFailureCluster = NonNullable<ValidationItem["failureClusters"]>[number] & {
  current?: boolean;
  likelyOwner?: string;
};

export function buildAdvancedTelemetryParityUiState(input: {
  row: Pick<ValidationItem, "checkKey" | "status" | "confidence" | "sampleCount" | "passAllowed" | "passBlockedReason" | "eventSource" | "sampleSource" | "action">;
  failureClusters?: UiFailureCluster[];
}) {
  const blocking = input.row.passAllowed === false || input.row.status === "fail" || Boolean(input.row.passBlockedReason);
  const lowConfidence = typeof input.row.confidence === "number" && input.row.confidence < 50;
  const sourcesPresent = Boolean(input.row.eventSource && input.row.sampleSource);
  const refreshBlocked = input.row.passBlockedReason === "analytics_refresh_failures_present"
    || input.failureClusters?.some((cluster) => cluster.current !== false) === true;
  const nextAction = refreshBlocked
    ? "Fix analytics refresh failures before promoting event sample parity."
    : lowConfidence && sourcesPresent
      ? "Event source and sample source are present; confidence is too low to promote telemetry parity."
      : input.row.action || "Review telemetry parity blockers before promotion.";

  return {
    statusBadgeLabel: blocking ? "BLOCKING" : "LOADED",
    refreshDiagnosticsBadgeLabel: refreshBlocked ? "FAILED CURRENT" : blocking ? "BLOCKING" : "LOADED",
    confidenceBadgeLabel: lowConfidence ? "LOW" : input.row.confidence == null ? "UNAVAILABLE" : "INFO",
    passAllowedBadgeLabel: input.row.passAllowed === false ? "BLOCKED" : "PASS ALLOWED",
    rawDiagnosticsDefaultOpen: false,
    nextAction,
    failureClusters: (input.failureClusters ?? []).map((cluster) => ({
      ...cluster,
      likelyOwner: cluster.likelyOwner || (cluster.affectedRoute ? "analytics pipeline route" : "analytics diagnostics attribution"),
      currentLabel: cluster.current === false ? "stale" : "current",
    })),
  };
}
