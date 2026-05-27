import { describe, expect, it } from "vitest";

import {
  AUTH_ROLE_DRIFT_4XX_POLICY,
  validateAuthRoleDrift4xxPolicy,
} from "@/lib/route-hardening/auth-role-drift-4xx-policy";

describe("auth role drift 4xx policy", () => {
  it("caps expired session refresh and blocks permission retry loops", () => {
    expect(validateAuthRoleDrift4xxPolicy()).toEqual([]);
    const expired = AUTH_ROLE_DRIFT_4XX_POLICY.find((entry) => entry.caseId === "expired_session");
    const permission = AUTH_ROLE_DRIFT_4XX_POLICY.find((entry) => entry.caseId === "role_downgraded_stale_controls");

    expect(expired?.authRefreshPolicy.maxAttempts).toBe(1);
    expect(expired?.finalRetryable).toBe(false);
    expect(permission?.clearStaleClientState).toBe(true);
    expect(permission?.finalRetryable).toBe(false);
  });

  it("does not hide suspended or banned users as generic errors", () => {
    const suspended = AUTH_ROLE_DRIFT_4XX_POLICY.find((entry) => entry.caseId === "deleted_suspended_or_banned_user");

    expect(suspended?.safeUserCopy).toContain("account");
    expect(suspended?.safeUserCopy).not.toContain("Internal server error");
    expect(suspended?.telemetryEvent).toBe("auth_4xx_account_unavailable");
  });
});
