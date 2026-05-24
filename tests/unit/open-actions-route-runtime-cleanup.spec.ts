import { describe, expect, it } from "vitest";

import { groupOpenRouteRuntimeActions } from "../../scripts/agent/ops-health-cleanup-shared";

describe("open actions route runtime cleanup", () => {
  it("collapses raw route runtime rows into current and stale groups", () => {
    const result = groupOpenRouteRuntimeActions({ failRows: 2, staleRows: 55, warnRows: 8, listenerFailed: true });

    expect(result.rawRows).toBe(65);
    expect(result.groupCount).toBeLessThan(65);
    expect(result.groups.map((group) => group.kind)).toEqual([
      "current_fail_groups",
      "current_warn_groups",
      "stale_refresh_groups",
      "listener_failure_group",
    ]);
    expect(result.staleRowsCountAsCurrentActions).toBe(false);
  });
});
