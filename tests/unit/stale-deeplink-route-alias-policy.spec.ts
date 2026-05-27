import { describe, expect, it } from "vitest";

import {
  STALE_DEEPLINK_ROUTE_ALIAS_POLICY,
  validateStaleDeeplinkRouteAliasPolicy,
} from "@/lib/route-hardening/stale-deeplink-route-alias-policy";

describe("stale deeplink route alias policy", () => {
  it("guards notification, PWA, and old alias links without retry loops", () => {
    expect(validateStaleDeeplinkRouteAliasPolicy()).toEqual([]);
    expect(STALE_DEEPLINK_ROUTE_ALIAS_POLICY.map((entry) => entry.source)).toEqual(
      expect.arrayContaining(["notification_deeplink", "pwa_cached_route", "old_route_alias"]),
    );
    expect(
      STALE_DEEPLINK_ROUTE_ALIAS_POLICY.every((entry) => entry.missingRouteRetryPolicy === "do_not_retry"),
    ).toBe(true);
  });

  it("keeps redirects canonical and open-redirect safe", () => {
    expect(STALE_DEEPLINK_ROUTE_ALIAS_POLICY.every((entry) => entry.openRedirectRisk === "blocked")).toBe(true);
    expect(
      STALE_DEEPLINK_ROUTE_ALIAS_POLICY.some(
        (entry) => entry.expiredBehavior.reasonClass === "resource_unavailable_expired",
      ),
    ).toBe(true);
  });
});
