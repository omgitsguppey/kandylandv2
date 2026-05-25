import { describe, expect, it } from "vitest";

import { resolveAdminSurfaceHydrationState } from "@/lib/admin/admin-surface-hydration-contract";

describe("admin surface hydration contract", () => {
  it("renders cached values immediately when a snapshot exists", () => {
    const state = resolveAdminSurfaceHydrationState({ hasSnapshot: true });

    expect(state.state).toBe("snapshot_ready");
    expect(state.shouldRenderShell).toBe(true);
    expect(state.shouldRenderSnapshotValues).toBe(true);
    expect(state.shouldRenderSkeleton).toBe(false);
  });

  it("keeps stale snapshot values visible with review/refresh guidance", () => {
    const state = resolveAdminSurfaceHydrationState({ hasSnapshot: true, isStale: true });

    expect(state.state).toBe("snapshot_stale");
    expect(state.shouldRenderSnapshotValues).toBe(true);
    expect(state.shouldShowManualRefresh).toBe(true);
    expect(state.freshnessLabel).toContain("stale");
  });

  it("shows source-missing state without pretending it is healthy", () => {
    const state = resolveAdminSurfaceHydrationState({ hasSnapshot: false });

    expect(state.state).toBe("snapshot_missing");
    expect(state.shouldRenderSnapshotValues).toBe(false);
    expect(state.shouldRenderSkeleton).toBe(false);
    expect(state.shouldShowManualRefresh).toBe(true);
  });
});
