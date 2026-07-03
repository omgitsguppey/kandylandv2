import { describe, expect, it } from "vitest";

import { buildNoSampleRouteDisplay, groupNoSampleRoutesByCohort } from "@/lib/debug/no-sample-route-display";
import { classifyNoSampleRouteCohort } from "@/lib/debug/no-sample-route-cohort-classifier";

describe("no-sample route display cleanup", () => {
  it("never emits a LIVE badge for unseen no-sample route cards", () => {
    const display = buildNoSampleRouteDisplay(classifyNoSampleRouteCohort("user/revoke-sessions:POST"));

    expect(display.badge).toBe("ROUTE EVIDENCE REQUIRED");
    expect(display.truthState).toBe("unavailable");
    expect(display.liveBadgeAllowed).toBe(false);
    expect(display.copy).toContain("Metrics are unavailable, not zero.");
    expect(display.copy).toContain("user/revoke-sessions:POST");
  });

  it("groups no-sample routes by cohort for default cockpit output", () => {
    const groups = groupNoSampleRoutesByCohort([
      classifyNoSampleRouteCohort("creator/messages:POST"),
      classifyNoSampleRouteCohort("creator/messages:DELETE"),
      classifyNoSampleRouteCohort("notifications:POST"),
    ]);

    expect(groups.defaultCollapsed).toBe(true);
    expect(groups.groups.creator_legacy_messages_compat.routeKeys).toEqual(["creator/messages:POST", "creator/messages:DELETE"]);
    expect(groups.groups.notification_dispatch_write.routeKeys).toEqual(["notifications:POST"]);
  });
});
