export type AdminSurfaceHydrationState =
  | "snapshot_ready"
  | "snapshot_stale"
  | "snapshot_missing"
  | "refreshing"
  | "failed"
  | "unauthorized"
  | "no_access";

export type AdminSurfaceHydrationDecision = {
  state: AdminSurfaceHydrationState;
  shouldRenderShell: true;
  shouldRenderSnapshotValues: boolean;
  shouldRenderSkeleton: boolean;
  shouldShowManualRefresh: boolean;
  freshnessLabel: string;
};

export function resolveAdminSurfaceHydrationState(input: {
  hasSnapshot: boolean;
  isStale?: boolean;
  isRefreshing?: boolean;
  failed?: boolean;
  unauthorized?: boolean;
  noAccess?: boolean;
}): AdminSurfaceHydrationDecision {
  if (input.unauthorized) {
    return {
      state: "unauthorized",
      shouldRenderShell: true,
      shouldRenderSnapshotValues: false,
      shouldRenderSkeleton: false,
      shouldShowManualRefresh: false,
      freshnessLabel: "Admin auth required.",
    };
  }
  if (input.noAccess) {
    return {
      state: "no_access",
      shouldRenderShell: true,
      shouldRenderSnapshotValues: false,
      shouldRenderSkeleton: false,
      shouldShowManualRefresh: false,
      freshnessLabel: "Admin access is not available.",
    };
  }
  if (input.failed) {
    return {
      state: "failed",
      shouldRenderShell: true,
      shouldRenderSnapshotValues: input.hasSnapshot,
      shouldRenderSkeleton: !input.hasSnapshot,
      shouldShowManualRefresh: true,
      freshnessLabel: input.hasSnapshot ? "Snapshot retained after refresh failure." : "Snapshot failed to load.",
    };
  }
  if (!input.hasSnapshot) {
    return {
      state: "snapshot_missing",
      shouldRenderShell: true,
      shouldRenderSnapshotValues: false,
      shouldRenderSkeleton: false,
      shouldShowManualRefresh: true,
      freshnessLabel: "Source snapshot is missing.",
    };
  }
  if (input.isRefreshing) {
    return {
      state: "refreshing",
      shouldRenderShell: true,
      shouldRenderSnapshotValues: true,
      shouldRenderSkeleton: false,
      shouldShowManualRefresh: false,
      freshnessLabel: "Refreshing snapshot; showing last cached values.",
    };
  }
  if (input.isStale) {
    return {
      state: "snapshot_stale",
      shouldRenderShell: true,
      shouldRenderSnapshotValues: true,
      shouldRenderSkeleton: false,
      shouldShowManualRefresh: true,
      freshnessLabel: "Snapshot is stale; values remain visible for review.",
    };
  }
  return {
    state: "snapshot_ready",
    shouldRenderShell: true,
    shouldRenderSnapshotValues: true,
    shouldRenderSkeleton: false,
    shouldShowManualRefresh: false,
    freshnessLabel: "Snapshot ready.",
  };
}
