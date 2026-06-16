import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsAuthOutcomeModel } from "@/lib/admin-analytics-auth-outcome-split";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

function response(summary: HistoricalAnalyticsResponse["authOutcomeSummary"]): HistoricalAnalyticsResponse {
  return {
    success: true,
    cacheState: "fresh",
    authOutcomeSummary: summary,
    authBreakdown: [],
  } as HistoricalAnalyticsResponse;
}

describe("buildAdminAnalyticsAuthOutcomeModel", () => {
  it("keeps registration completed in lifecycle outcomes instead of auth methods", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "30d",
      response: response({
        generatedAtUtc: "2026-05-06T12:00:00.000Z",
        range: "30d",
        attempts: 4,
        successes: 0,
        failures: 4,
        unfinished: 0,
        successRatePct: 0,
        avgFinishMs: null,
        timingState: "missing_starts",
        lastAuthEventAtUtc: "2026-05-06T11:58:00.000Z",
        methods: [
          {
            method: "email_sign_in",
            attempts: 4,
            successes: 0,
            failures: 4,
            unfinished: 0,
            successRatePct: 0,
            avgFinishMs: null,
            weakestReason: "auth/invalid-credential",
            failureBreakdown: [{
              failureCode: "auth/invalid-credential",
              count: 4,
              explanation: "Normalized safe auth failure code auth/invalid-credential.",
            }],
            state: "error",
          },
        ],
        lifecycleOutcomes: [
          {
            name: "registration_completed",
            count: 8,
            state: "live",
            explanation: "Registration completed is tracked as an auth lifecycle outcome, not an auth method.",
          },
        ],
      }),
      authBreakdown: [],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.methodBreakdown.map((row) => row.visibleLabel)).toEqual(["Email sign-in"]);
    expect(model.lifecycleOutcomes[0]?.name).toBe("registration_completed");
    expect(model.timingState).toBe("missing_starts");
    expect(model.timingMissingReason).toContain("start timestamps");
    expect(model.hasUsableAuthSample).toBe(true);
    expect(model.measurementMode).toBe("canonical_attempt_chain");
  });

  it("uses canonical method summary with failure breakdown and explicit successes", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "7d",
      response: response({
        generatedAtUtc: "2026-05-06T12:00:00.000Z",
        range: "7d",
        attempts: 31,
        successes: 15,
        failures: 8,
        unfinished: 8,
        successRatePct: 48,
        avgFinishMs: 2500,
        timingState: "available",
        lastAuthEventAtUtc: "2026-05-06T11:58:00.000Z",
        methods: [
          {
            method: "email_sign_in",
            attempts: 4,
            successes: 0,
            failures: 4,
            unfinished: 0,
            successRatePct: 0,
            avgFinishMs: null,
            weakestReason: "auth/invalid-credential",
            failureBreakdown: [{
              failureCode: "auth/invalid-credential",
              count: 4,
              explanation: "Normalized safe auth failure code auth/invalid-credential.",
            }],
            state: "error",
          },
          {
            method: "google_sign_in",
            attempts: 17,
            successes: 7,
            failures: 4,
            unfinished: 6,
            successRatePct: 41,
            avgFinishMs: 2500,
            failureBreakdown: [{
              failureCode: "auth/popup-closed-by-user",
              count: 4,
              explanation: "Normalized safe auth failure code auth/popup-closed-by-user.",
            }],
            state: "review",
          },
          {
            method: "email_sign_up",
            attempts: 10,
            successes: 8,
            failures: 0,
            unfinished: 2,
            successRatePct: 80,
            avgFinishMs: 1800,
            failureBreakdown: [],
            state: "review",
          },
        ],
        lifecycleOutcomes: [],
      }),
      authBreakdown: [],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.successRate.formula).toBe("successes / attempts");
    expect(model.avgFinish.value).toBe(2500);
    expect(model.weakestMethod?.visibleLabel).toBe("Email sign-in");
    expect(model.mostFailuresMethod?.failureBreakdown[0]?.failureCode).toBe("auth/invalid-credential");
    expect(model.mostUnfinishedMethod?.visibleLabel).toBe("Google sign-in");
    expect(model.methodGroups.emailPassword.attempts).toBe(14);
    expect(model.methodGroups.emailPassword.successes).toBe(8);
    expect(model.methodGroups.emailPassword.failures).toBe(4);
    expect(model.methodGroups.emailPassword.topFailureCode).toBe("auth/invalid-credential");
    expect(model.methodGroups.google.attempts).toBe(17);
    expect(model.methodGroups.google.failures).toBe(4);
    expect(model.methodGroups.google.topFailureCode).toBe("auth/popup-closed-by-user");
    expect(model.trackingCapability.emailPasswordTracked).toBe(true);
    expect(model.trackingCapability.googleTracked).toBe(true);
    expect(model.trackingCapability.failureReasonsAvailable).toBe(true);
    expect(model.trackingCapability.exactAttemptChainAvailable).toBe(true);
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

  it("does not map missing non-loading auth data to error", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "24h",
      authBreakdown: [],
      loading: false,
    });

    expect(model.hydrationState).toBe("no_sample");
    expect(model.modeLabel).not.toBe("ERROR");
    expect(model.modeLabel).toBe("NO SAMPLE");
    expect(model.hasUsableAuthSample).toBe(false);
    expect(model.canRenderMethodDetails).toBe(false);
    expect(model.attempts.value).toBeNull();
    expect(model.successRate.value).toBeNull();
    expect(model.timingMissingReason).toBeNull();
    expect(model.nextSourceStep).toContain("email/password");
    expect(model.trackingCapability.nextSourceStep).toContain("bounded email/password");
  });

  it("keeps actual auth route errors distinct from no sample", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "24h",
      authBreakdown: [],
      loading: false,
      error: new Error("historical auth failed"),
    });

    expect(model.hydrationState).toBe("error");
    expect(model.modeLabel).toBe("ERROR");
  });

  it("labels legacy auth count fallback as partial, not exact attempt chain", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "30d",
      response: {
        success: true,
        cacheState: "fresh",
        authBreakdown: [
          { method: "Email sign in", attempts: 3, successes: 1, failures: 2, avgDurationMs: 0, successRate: 1 / 3 },
          { method: "Google sign in", attempts: 2, successes: 2, failures: 0, avgDurationMs: 0, successRate: 1 },
        ],
      } as HistoricalAnalyticsResponse,
      authBreakdown: [
        { method: "Email sign in", attempts: 3, successes: 1, failures: 2, avgDurationMs: 0, successRate: 1 / 3 },
        { method: "Google sign in", attempts: 2, successes: 2, failures: 0, avgDurationMs: 0, successRate: 1 },
      ],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.modeLabel).toBe("PARTIAL");
    expect(model.hydrationState).toBe("legacy_fallback");
    expect(model.measurementMode).toBe("legacy_event_counts");
    expect(model.hasLegacyAuthSample).toBe(true);
    expect(model.hasCanonicalAuthAttemptSample).toBe(false);
    expect(model.methodGroups.emailPassword.topFailureCode).toBe("failure_code_unavailable");
    expect(model.trackingCapability.failureReasonsAvailable).toBe(false);
  });

  it("surfaces unavailable failure reasons without treating them as errors", () => {
    const model = buildAdminAnalyticsAuthOutcomeModel({
      selectedRange: "7d",
      response: response({
        generatedAtUtc: "2026-05-06T12:00:00.000Z",
        range: "7d",
        sourceMode: "canonical_attempt_chain",
        attempts: 1,
        successes: 0,
        failures: 1,
        unfinished: 0,
        successRatePct: 0,
        avgFinishMs: null,
        timingState: "missing_starts",
        lastAuthEventAtUtc: "2026-05-06T11:58:00.000Z",
        methods: [
          {
            method: "email_sign_in",
            attempts: 1,
            successes: 0,
            failures: 1,
            unfinished: 0,
            successRatePct: 0,
            avgFinishMs: null,
            weakestReason: "failure_code_unavailable",
            failureBreakdown: [{
              failureCode: "failure_code_unavailable",
              count: 1,
              explanation: "Failure telemetry was recorded without a normalized safe code.",
            }],
            state: "review",
          },
        ],
        lifecycleOutcomes: [],
      }),
      authBreakdown: [],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.methodGroups.emailPassword.topFailureCode).toBe("failure_code_unavailable");
    expect(model.trackingCapability.failureReasonsAvailable).toBe(false);
    expect(model.trackingCapability.missingPieces).toContain("No safe failureCode captured for failed email/password attempts");
  });
});
