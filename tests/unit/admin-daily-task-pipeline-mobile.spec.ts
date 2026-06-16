import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/components/Admin/Analytics/AdminDailyTaskPipelineModule.tsx"),
  "utf8",
);

describe("Admin daily task pipeline mobile consolidation", () => {
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
});
