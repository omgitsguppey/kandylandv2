// @vitest-environment happy-dom

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(container.querySelector("[data-admin-metric-source]")).toBeNull();
    expect(container.querySelectorAll("[data-admin-metric-freshness]")).toHaveLength(6);

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
    expect(screen.getByText("Cached")).toBeTruthy();
  });

  it("does not display placeholder numbers or trends when a source is missing, even with legacy review warnings", () => {
    const { container } = render(React.createElement(AdminStatsBar, {
      platformPulse: metrics.map((metric) => ({ ...metric, primaryValue: 0, current30dValue: 0, prior30dValue: 0, freshnessState: "unavailable", issueState: "review", warnings: ["Snapshot missing"] })),
      truthState: "unavailable",
      overviewIssues: [{ source: "analytics_cache", summary: "Snapshot missing", sourceTruth: "materialized_summary", freshnessState: "unknown" }],
    }));
    const cards = container.querySelectorAll("[data-admin-metric-id]");
    for (const card of cards) {
      expect(within(card as HTMLElement).getByText("Unavailable")).toBeTruthy();
      expect(within(card as HTMLElement).queryByText("0")).toBeNull();
      expect(within(card as HTMLElement).queryByText("0%")).toBeNull();
      expect(card.textContent).not.toMatch(/Source disagreement/i);
      expect(card.querySelector("[data-admin-metric-card-has-value='false']")).toBeTruthy();
    }
    expect(container.querySelector("details")?.open).toBe(false);
  });

  it("keeps observed zero and its valid zero-to-zero comparison visible", () => {
    const { container } = render(React.createElement(AdminStatsBar, {
      platformPulse: [{ ...metrics[0], primaryValue: 0, current30dValue: 0, prior30dValue: 0 }],
      truthState: "live",
    }));
    const card = container.querySelector("[data-admin-metric-id='accounts']") as HTMLElement;
    expect(within(card).getByText("0")).toBeTruthy();
    expect(within(card).getByText("0%")).toBeTruthy();
    expect(within(card).queryByText("Unavailable")).toBeNull();
  });
  it("keeps complete source issues reachable through the native disclosure", () => {
    const issue = { source: "analytics_cache", summary: "Admin overview hot-cache snapshot is missing.", sourceTruth: "materialized_summary", freshnessState: "unknown" };
    const { container } = render(React.createElement(AdminStatsBar, { platformPulse: metrics, overviewIssues: [issue], truthState: "cached" }));
    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = within(details).getByText("Source details (1)");
    expect(details.open).toBe(false);
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    expect(within(details).getByText("analytics_cache: Admin overview hot-cache snapshot is missing.")).toBeTruthy();
    fireEvent.click(summary);
    expect(details.open).toBe(false);
  });
});
