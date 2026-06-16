import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/users/page.tsx"), "utf8");

describe("admin users fixture boundary", () => {
  it("labels local admin UI fixture user-management evidence as source_missing", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('data-admin-users-fixture-boundary="true"');
    expect(source).toContain('data-admin-users-fixture-state="source_missing"');
    expect(source).toContain("User-management layout is inspectable");
    expect(source).toContain("user metrics, feedback, task controls, identity, payment, and content-access samples remain source_missing");
  });

  it("skips user, feedback, behavior, and realtime reads in fixture mode", () => {
    expect(source).toContain("if (isLocalAdminUiTestSession)");
    expect(source).toContain('enabled: viewMode === "users" && !isLocalAdminUiTestSession');
    expect(source).toContain("setSummary(null)");
    expect(source).toContain("setUsers([])");
    expect(source).toContain("setBehaviorLeaderboard(null)");
    expect(source).toContain("setFeedback([])");
  });

  it("keeps task controls read-only instead of mounting the task manager in fixture mode", () => {
    expect(source).toContain('data-admin-users-tasks-fixture-boundary="true"');
    expect(source).toContain("Local UI review keeps the task builder read-only");
    expect(source).toContain("review latest task-trigger activity");
    expect(source).not.toContain("monitor live task triggers");
    expect(source).toContain("isLocalAdminUiTestSession ? (");
    expect(source).toContain("<AdminTasksManager users={users} />");
  });

  it("guards user-management mutations behind real admin sessions", () => {
    expect(source).toContain("User status changes require a real admin session");
    expect(source).toContain("Username changes require a real admin session");
    expect(source).toContain("Content access changes require a real admin session");
    expect(source).toContain("Role changes require a real admin session");
    expect(source).toContain("Verification changes require a real admin session");
  });
});
