// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { afterEach, describe, expect, it } from "vitest";
import { AdminDailyTaskPipelineModule } from "@/components/Admin/Analytics/AdminDailyTaskPipelineModule";
import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

const source = readFileSync(
  join(process.cwd(), "src/components/Admin/Analytics/AdminDailyTaskPipelineModule.tsx"),
  "utf8",
);

describe("Admin daily task pipeline mobile consolidation", () => {
  afterEach(cleanup);

  function renderPartitions(partitions?: { activeCurrentWindow: number | null; historicalUnstarted: number | null; expiredUnstarted: number | null }) {
    const model = buildAdminTaskPipelineModel({
      selectedRange: "30d", response: { success: true, cacheState: "fresh" } as HistoricalAnalyticsResponse,
      loading: false, overviewTruthState: "live", items: [{ label: "Assigned", count: 100 }, { label: "Started", count: 60 }],
      taskDurationBuckets: [], taskLeaderboard: [],
    });
    if (partitions) model.stuckAssignedBreakdown = { ...model.stuckAssignedBreakdown, ...partitions };
    render(createElement(AdminDailyTaskPipelineModule, { model, renderSectionRangeControl: () => null, formatDuration: String, formatPercent: String }));
    fireEvent.click(screen.getByRole("button", { name: "Show Daily Task Pipeline details" }));
    return model;
  }

  it("retains the range total without assigning it to an unsupported current window", () => {
    const model = renderPartitions();
    expect(screen.getByText(/^Stuck assigned:/)).toHaveTextContent("40");
    for (const label of [/^Active stuck assigned:/, /^Historical stuck assigned:/, /^Expired unstarted:/]) {
      expect(screen.getByText(label)).toHaveTextContent("Not separated by source");
    }
    expect(screen.getByText((_, element) => element?.tagName === "P" && Boolean(element.textContent?.includes(model.stuckAssignedBreakdown.explanation)))).toBeInTheDocument();
  });

  it("shows separately admitted zero and nonzero partitions without replacing unknown partitions", () => {
    renderPartitions({ activeCurrentWindow: 0, historicalUnstarted: 9, expiredUnstarted: null });
    expect(screen.getByText(/^Active stuck assigned:/)).toHaveTextContent("Active stuck assigned: 0");
    expect(screen.getByText(/^Historical stuck assigned:/)).toHaveTextContent("Historical stuck assigned: 9");
    expect(screen.getByText(/^Expired unstarted:/)).toHaveTextContent("Not separated by source");
  });

  it("renders Daily Task Pipeline as one compact mobile view mode at a time", () => {
    expect(source).toContain("taskPipelineViewMode");
    expect(source).toContain("setTaskPipelineViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={taskPipelineViewMode}");
    expect(source).toContain('data-task-pipeline-chart="compact"');
    expect(source).toContain('data-task-pipeline-table="compact"');
    expect(source).toContain("data-task-pipeline-snapshot-state={props.model.snapshotState}");
    expect(source).toContain("data-task-pipeline-truth-state={props.model.truthState}");
    expect(source).toContain("data-task-pipeline-guidance-state={props.model.guidanceTelemetryState}");
    expect(source).toContain('taskPipelineViewMode === "chart"');
    expect(source).toContain('taskPipelineViewMode === "table"');
    expect(source).toContain('taskPipelineViewMode === "cards"');
  });

  it("labels refresh-due snapshots without stale truth copy", () => {
    expect(source).toContain("refresh is due");
    expect(source).not.toContain("stale validated task pipeline snapshot");
  });

  it("uses source-aware missing labels instead of bare unavailable copy", () => {
    expect(source).toContain("No rate sample");
    expect(source).toContain("No timing sample");
    expect(source).toContain("No verified snapshot yet");
    expect(source).not.toContain('"Unavailable"');
    expect(source).not.toContain("timing unavailable");
  });
});
