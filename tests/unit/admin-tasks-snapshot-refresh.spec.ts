import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/components/Admin/AdminTasksManager.tsx"), "utf8");

describe("admin tasks snapshot refresh", () => {
  it("keeps admin task management on snapshot/manual refresh instead of background polling", () => {
    expect(source).toContain("const ADMIN_TASKS_SNAPSHOT_REFRESH_INTERVAL_MS = 0");
    expect(source).toContain("ADMIN_TASKS_SNAPSHOT_REFRESH_INTERVAL_MS");
    expect(source).not.toContain('useAdminPollingSWR<AdminTasksResponse>("/api/admin/tasks", 30_000)');
    expect(source).toContain('aria-label="Refresh task snapshot"');
    expect(source).toContain("onClick={() => void mutate()}");
  });

  it("does not describe task snapshots as live analytics", () => {
    expect(source).toContain("latest task snapshot");
    expect(source).toContain("Latest task-trigger rollup");
    expect(source).not.toContain("live task system");
    expect(source).not.toContain("Live rollup of the telemetry triggers");
  });
});
