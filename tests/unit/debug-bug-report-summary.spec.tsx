// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DebugBugReportSummary } from "@/app/admin/debug/components/DebugBugReportSummary";
import type { BugReportAdminSummary } from "@/lib/errors/bug-report-admin-summary";

function summaryFixture(): BugReportAdminSummary {
  return {
    generatedAtUtc: "2026-05-17T00:00:00.000Z",
    source: "bug_reports",
    readLimit: 50,
    totalReports: 3,
    rewardedCount: 1,
    duplicateCount: 1,
    capReachedCount: 1,
    topErrorKeys: [{ key: "internal_server_error", count: 2 }],
    topSurfaces: [{ key: "runtime", count: 2 }],
    latestReports: [
      {
        id: "bug_1",
        userId: "user_1",
        errorKey: "internal_server_error",
        surface: "runtime",
        route: "/drops",
        previousRoute: "/",
        status: "rewarded",
        rewardGd: 10,
        userTitle: "This hit a platform snag",
        userMessage: "Something ain't connected right on our side.",
        operatorMessage: "Unhandled server failure blocked this action.",
        debugId: "dbg_1",
        sanitizedContext: { component: "PurchaseModal" },
        createdAtUtc: "2026-05-17T00:00:00.000Z",
      },
    ],
  };
}

describe("DebugBugReportSummary", () => {
  it("renders read-only bug report truth and redacted latest reports", () => {
    render(<DebugBugReportSummary summary={summaryFixture()} />);

    expect(screen.getByText("Bug report truth")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getAllByText(/rewarded/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/internal_server_error/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/This hit a platform snag/i)).toBeTruthy();
    expect(screen.queryByText(/token|secret|paypal|capture|stack/i)).toBeNull();
  });
});
