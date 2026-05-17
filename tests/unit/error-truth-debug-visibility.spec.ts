import { describe, expect, it } from "vitest";

import {
  summarizeBugReportsForAdmin,
  redactBugReportAdminValue,
} from "@/lib/errors/bug-report-admin-summary";
import { validateErrorTruthDebugVisibilityReport } from "../../scripts/agent/validate-error-truth-debug-visibility";

describe("error truth debug visibility", () => {
  it("summarizes bug reports for admin debug without leaking secrets", () => {
    const summary = summarizeBugReportsForAdmin([
      {
        id: "bug_1",
        userId: "user_1",
        errorKey: "internal_server_error",
        surface: "runtime",
        route: "/drops",
        previousRoute: "/",
        userTitle: "This hit a platform snag",
        userMessage: "Something ain't connected right on our side.",
        debugId: "dbg_1",
        sanitizedContext: {
          component: "PurchaseModal",
          token: "raw-token",
          paypalCaptureId: "CAPTURE",
        },
        rewardEligible: true,
        rewardGd: 10,
        status: "rewarded",
        createdAt: 1_800_000_000_000,
        sourceTruth: "human_error_bug_report",
      },
      {
        id: "bug_2",
        userId: "user_2",
        errorKey: "slot_unavailable",
        surface: "creator_booking",
        route: "/creators/test",
        previousRoute: "/creators/test",
        userTitle: "That slot got taken",
        userMessage: "Pick another open slot and try again.",
        debugId: null,
        sanitizedContext: {},
        rewardEligible: false,
        rewardGd: 0,
        status: "duplicate",
        createdAt: 1_800_000_000_500,
        sourceTruth: "human_error_bug_report",
      },
    ]);

    expect(summary.totalReports).toBe(2);
    expect(summary.rewardedCount).toBe(1);
    expect(summary.duplicateCount).toBe(1);
    expect(summary.topErrorKeys[0]).toMatchObject({ key: "internal_server_error", count: 1 });
    expect(summary.topSurfaces).toContainEqual({ key: "runtime", count: 1 });
    expect(JSON.stringify(summary)).not.toMatch(/raw-token|CAPTURE|paypalCaptureId|token/i);
    expect(summary.latestReports[0]).toMatchObject({
      id: "bug_2",
      operatorMessage: expect.stringContaining("Selected bookingStartAt"),
    });
  });

  it("redacts sensitive nested admin values", () => {
    expect(redactBugReportAdminValue("authorizationHeader", "Bearer raw")).toBe("[redacted]");
    expect(redactBugReportAdminValue("safeKey", "ok")).toBe("ok");
    expect(redactBugReportAdminValue("safeKey", "x".repeat(500))).toHaveLength(240);
  });

  it("requires a pass or formal deferred phase 4 state", () => {
    expect(validateErrorTruthDebugVisibilityReport({
      generatedAtUtc: "2026-05-17T00:00:00.000Z",
      reportKey: "error-truth-debug-visibility",
      currentHead: "head",
      summary: {
        phase4Status: "pass",
        routeCreated: true,
        componentCreated: true,
        adminReadOnly: true,
        maxReadLimit: 50,
        redactionEnabled: true,
        rewardMutationAllowed: false,
        balanceMutationAllowed: false,
        rawSecretsVisible: false,
        p0Count: 0,
        p1Count: 0,
        p2Count: 0,
      },
      routeFindings: [],
      componentFindings: [],
      redactionFindings: [],
      deferredFindings: [],
      nextFixOrder: ["Run npm run check:error-handling-final-readiness."],
    }, "head")).toEqual([]);
  });
});
