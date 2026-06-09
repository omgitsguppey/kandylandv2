export type RouteHealthReconciledStatus =
  | "healthy_current"
  | "degraded_current"
  | "route_listener_delayed"
  | "route_listener_delayed_with_last_verified_sample"
  | "route_listener_failed_no_sample"
  | "current_fail"
  | "stale_route_sample"
  | "unknown";

export interface RouteHealthReconcilerInput {
  routeChecksActiveFailures: number;
  routeHealthFailCount: number;
  routeHealthWarnCount: number;
  routeHealthStaleCount: number;
  trackedRoutes: number;
  observedRoutes: number;
  unseenRoutes: number;
  hasRealtimeRows: boolean;
  hasSnapshotRows: boolean;
  routeListenerFailed: boolean;
  missingLastFailureTimestamp?: boolean;
  lastVerifiedAgeMs?: number | null;
  slowCount: number;
  serverErrorCount: number;
  clientErrorCount: number;
}

export interface RouteHealthReconciliation {
  activeFailureCount: number;
  staleFailureCount: number;
  warningCount: number;
  staleActionCount: number;
  currentActionCount: number;
  routeListenerStatus: "live" | "hydrating" | "failed" | "missing";
  canTrustLastVerified: boolean;
  lastVerifiedAgeMs: number | null;
  status: RouteHealthReconciledStatus;
  unseenRoutesClassified: {
    unseen_expected: number;
    unseen_inactive: number;
    unseen_source_missing: number;
    stale_unseen: number;
  };
  currentSlowCount: number;
  staleSlowCount: number;
  currentServerErrorCount: number;
  staleServerErrorCount: number;
  currentClientErrorCount: number;
  staleClientErrorCount: number;
  missingFailureTimestampActionable: boolean;
  nextAction: string;
}

function isTrustedLastVerified(input: RouteHealthReconcilerInput) {
  return input.hasSnapshotRows && typeof input.lastVerifiedAgeMs === "number" && input.lastVerifiedAgeMs >= 0 && input.lastVerifiedAgeMs <= 60 * 60_000;
}

export function reconcileRouteHealth(input: RouteHealthReconcilerInput): RouteHealthReconciliation {
  const routeListenerStatus: RouteHealthReconciliation["routeListenerStatus"] = input.hasRealtimeRows
    ? "live"
    : input.routeListenerFailed
      ? "failed"
      : input.hasSnapshotRows
        ? "hydrating"
        : "missing";
  const canTrustLastVerified = isTrustedLastVerified(input);
  const activeFailureCount = Math.max(0, input.routeChecksActiveFailures);
  const staleFailureCount = activeFailureCount > 0
    ? Math.max(0, input.routeHealthFailCount - activeFailureCount)
    : input.hasRealtimeRows
      ? 0
      : Math.max(0, input.routeHealthFailCount);
  const currentWarnCount = input.hasRealtimeRows ? Math.max(0, input.routeHealthWarnCount) : 0;
  const staleActionCount = Math.max(0, input.routeHealthStaleCount) + staleFailureCount + (input.hasRealtimeRows ? 0 : Math.max(0, input.routeHealthWarnCount));
  const currentActionCount = activeFailureCount + currentWarnCount;
  const unseenRoutesClassified = {
    unseen_expected: input.hasRealtimeRows ? Math.max(0, input.unseenRoutes) : 0,
    unseen_inactive: 0,
    unseen_source_missing: input.hasSnapshotRows || input.hasRealtimeRows ? 0 : Math.max(0, input.unseenRoutes),
    stale_unseen: !input.hasRealtimeRows && input.hasSnapshotRows ? Math.max(0, input.unseenRoutes) : 0,
  };
  const currentSlowCount = input.hasRealtimeRows ? Math.max(0, input.slowCount) : 0;
  const currentServerErrorCount = activeFailureCount > 0 && input.hasRealtimeRows ? Math.max(0, input.serverErrorCount) : 0;
  const currentClientErrorCount = input.hasRealtimeRows ? Math.max(0, input.clientErrorCount) : 0;
  const staleSlowCount = input.hasRealtimeRows ? 0 : Math.max(0, input.slowCount);
  const staleServerErrorCount = input.hasRealtimeRows ? Math.max(0, input.serverErrorCount - currentServerErrorCount) : Math.max(0, input.serverErrorCount);
  const staleClientErrorCount = input.hasRealtimeRows ? 0 : Math.max(0, input.clientErrorCount);
  const status: RouteHealthReconciledStatus = activeFailureCount > 0
    ? "current_fail"
    : routeListenerStatus === "failed" && input.hasSnapshotRows
      ? canTrustLastVerified
        ? "route_listener_delayed_with_last_verified_sample"
        : "route_listener_delayed"
      : routeListenerStatus === "failed"
        ? "route_listener_failed_no_sample"
        : staleActionCount > 0
          ? "stale_route_sample"
          : currentActionCount > 0
            ? "degraded_current"
            : input.trackedRoutes > 0
              ? "healthy_current"
              : "unknown";

  const nextAction = activeFailureCount > 0
    ? "Open the current failed route and inspect its latest response."
    : routeListenerStatus === "failed"
      ? "Repair the route listener, then refresh route runtime evidence."
      : staleActionCount > 0
        ? "Refresh route runtime evidence; do not count stale rows as current failures."
        : "No route health action needed.";

  return {
    activeFailureCount,
    staleFailureCount,
    warningCount: currentWarnCount + (input.hasRealtimeRows ? 0 : Math.max(0, input.routeHealthWarnCount)),
    staleActionCount,
    currentActionCount,
    routeListenerStatus,
    canTrustLastVerified,
    lastVerifiedAgeMs: typeof input.lastVerifiedAgeMs === "number" ? input.lastVerifiedAgeMs : null,
    status,
    unseenRoutesClassified,
    currentSlowCount,
    staleSlowCount,
    currentServerErrorCount,
    staleServerErrorCount,
    currentClientErrorCount,
    staleClientErrorCount,
    missingFailureTimestampActionable: Boolean(input.missingLastFailureTimestamp && (activeFailureCount > 0 || staleFailureCount > 0)),
    nextAction,
  };
}
