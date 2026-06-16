// @vitest-environment happy-dom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import type { PlatformPulseMetric } from "@/lib/admin-overview";

const baseMetric = {
  primaryScope: "rolling_30d",
  current30dValue: 10,
  prior30dValue: 5,
  deltaPct: 100,
  deltaLabel: "Current 30d vs previous 30d: +100%",
  sourceTruth: "materialized_summary",
  freshnessState: "live",
  issueState: "ok",
  warnings: [],
};

const metrics = [
  { ...baseMetric, id: "accounts", label: "Users", primaryValue: 10 },
  { ...baseMetric, id: "purchases30d", label: "Purchases", primaryValue: 5 },
  { ...baseMetric, id: "revenue", label: "Revenue", primaryValue: "$12.00" },
  { ...baseMetric, id: "unwraps", label: "Unwraps", primaryValue: 9 },
  { ...baseMetric, id: "gumdropsCirculation30d", label: "GumDrops", primaryValue: 650 },
  { ...baseMetric, id: "supportBugs30d", label: "Support/Bugs", primaryValue: 3 },
] as unknown as PlatformPulseMetric[];

describe("AdminStatsBar compact platform pulse", () => {
  it("renders six compact rolling-30-day cards without ok-state LIVE badges or source subtext", () => {
    const { container } = render(
      React.createElement(AdminStatsBar, {
        platformPulse: metrics,
        overviewIssues: [],
        truthState: "live",
      }),
    );

    expect(container.querySelectorAll("[data-admin-metric-id]")).toHaveLength(6);
    expect(container.querySelector("[data-admin-platform-pulse-grid]")?.className).toContain("grid-cols-2");
    expect(container.querySelector("[data-admin-platform-pulse-grid]")?.className).toContain("md:grid-cols-3");

    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.getByText("Purchases")).toBeTruthy();
    expect(screen.getByText("GumDrops")).toBeTruthy();
    expect(screen.getByText("Support/Bugs")).toBeTruthy();

    expect(screen.queryByText("LIVE")).toBeNull();
    expect(container.textContent).not.toMatch(/materialized_snapshot|materialized_summary|confidence|Server transaction truth only/i);
  });

  it("keeps issue badges visible only for non-ok metrics", () => {
    const withIssue = metrics.map((metric) =>
      metric.id === "supportBugs30d"
        ? { ...metric, freshnessState: "review", issueState: "review", warnings: ["Support summary missing"] }
        : metric,
    ) as PlatformPulseMetric[];

    render(
      React.createElement(AdminStatsBar, {
        platformPulse: withIssue,
        overviewIssues: [],
        truthState: "review",
      }),
    );

    expect(screen.getAllByText(/REVIEW/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("LIVE")).toBeNull();
  });

  it("uses the shared truth badge for non-live overview state", () => {
    const { container } = render(
      React.createElement(AdminStatsBar, {
        platformPulse: metrics,
        overviewIssues: [],
        truthState: "cached",
      }),
    );

    expect(container.querySelector("[data-admin-truth-state='cached']")).toBeTruthy();
    expect(screen.getByText("CACHED")).toBeTruthy();
  });
});
