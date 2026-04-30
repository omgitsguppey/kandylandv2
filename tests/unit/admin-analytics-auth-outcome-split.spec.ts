import { describe, expect, it } from "vitest";

import {
  buildAdminAnalyticsAuthOutcomeModel,
  normalizeAuthOutcomeMethod,
} from "@/lib/admin-analytics-auth-outcome-split";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

function response(authBreakdown: HistoricalAnalyticsResponse["authBreakdown"]): HistoricalAnalyticsResponse {
  return {
    success: true,
    cacheState: "fresh",
    authBreakdown,
  } as HistoricalAnalyticsResponse;
}

describe("normalizeAuthOutcomeMethod", () => {
  it("normalizes visible auth method casing", () => {
    expect(normalizeAuthOutcomeMethod("Google Sign IN")).toMatchObject({
      key: "google_sign_in",
      label: "Google sign-in",
      isOutcome: false,
    });
    expect(normalizeAuthOutcomeMethod("Email Sign UP")).toMatchObject({
      key: "email_sign_up",
      label: "Email sign-up",
      isOutcome: false,
    });
    expect(normalizeAuthOutcomeMethod("Email Sign IN")).toMatchObject({
      key: "email_sign_in",
      label: "Email sign-in",
      isOutcome: false,
    });
    expect(normalizeAuthOutcomeMethod("Registered Users")).toMatchObject({
      key: "registration_completed",
      label: "Registration completed",
      isOutcome: true,
    });
  });
});

describe("buildAdminAnalyticsAuthOutcomeModel", () => {
  it("moves registered users out of method rows and prevents fake finish timing", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "30d",
      response: response([
        {
          method: "Google Sign IN",
          attempts: 22,
          successes: 9,
          failures: 4,
          avgDurationMs: 0,
          successRate: 9 / 22,
        },
        {
          method: "Registered Users",
          attempts: 8,
          successes: 8,
          failures: 0,
          avgDurationMs: 0,
          successRate: 1,
        },
      ]),
      authBreakdown: [
        {
          method: "Google Sign IN",
          attempts: 22,
          successes: 9,
          failures: 4,
          avgDurationMs: 0,
          successRate: 9 / 22,
        },
        {
          method: "Registered Users",
          attempts: 8,
          successes: 8,
          failures: 0,
          avgDurationMs: 0,
          successRate: 1,
        },
      ],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.methodBreakdown.map((row) => row.visibleLabel)).toEqual([
      "Google sign-in",
    ]);
    expect(model.registrationOutcome?.visibleLabel).toBe("Registration completed");
    expect(model.registrationOutcome?.registeredUsersMovedToOutcome).toBe(true);
    expect(model.avgFinish.value).toBeNull();
    expect(model.timingAvailable).toBe(false);
    expect(model.fakeZeroPrevented).toBe(false);
    expect(model.recommendation).toContain("Finish timing unavailable");
  });

  it("computes action fields and exposes reconciliation details", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "7d",
      response: response([
        {
          method: "Email sign in",
          attempts: 4,
          successes: 0,
          failures: 4,
          avgDurationMs: 0,
          successRate: 0,
        },
        {
          method: "Google sign in",
          attempts: 22,
          successes: 9,
          failures: 4,
          avgDurationMs: 2500,
          successRate: 9 / 22,
        },
      ]),
      authBreakdown: [
        {
          method: "Email sign in",
          attempts: 4,
          successes: 0,
          failures: 4,
          avgDurationMs: 0,
          successRate: 0,
        },
        {
          method: "Google sign in",
          attempts: 22,
          successes: 9,
          failures: 4,
          avgDurationMs: 2500,
          successRate: 9 / 22,
        },
      ],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.successRate.formula).toBe("successes / attempts");
    expect(model.weakestMethod?.visibleLabel).toBe("Email sign-in");
    expect(model.mostFailuresMethod?.visibleLabel).toBe("Email sign-in");
    expect(model.mostUnfinishedMethod?.visibleLabel).toBe("Google sign-in");
    expect(model.methodBreakdown.every((row) => row.reconciliationDelta === 0)).toBe(true);
    expect(model.avgFinish.value).toBe(2500);
  });

  it("does not render fake zeros when no validated source exists", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "24h",
      authBreakdown: [],
      loading: true,
    });

    expect(model.attempts.value).toBeNull();
    expect(model.successRate.value).toBeNull();
    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.modeLabel).toBe("WAIT");
  });
});
