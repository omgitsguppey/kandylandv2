import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/users/page.tsx"), "utf8");

describe("admin users fixture boundary", () => {
  it("labels local admin UI fixture user-management evidence as no-source", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('data-admin-users-fixture-boundary="true"');
    expect(source).toContain('data-admin-users-fixture-state="source_missing"');
    expect(source).toContain("source_missing: users source is not loaded in this fixture.");
    expect(source).toContain("Protected user records, metrics, feedback, task controls, identity, payment, and content access stay blocked.");
    expect(source).toContain("No consent source loaded");
    expect(source).toContain("Behavioral metrics wait for consent and source materialization before they can be shown.");
    expect(source).toContain('"-- exact / -- shown"');
    expect(source).toContain('"-- collecting / low-confidence rows"');
    expect(source).toContain("user source is not loaded in this fixture");
    expect(source).not.toContain("—");
    expect(source).not.toContain("·");
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
    expect(source).toContain("permission_blocked: this fixture keeps the task builder read-only");
    expect(source).toContain("review latest task-trigger activity");
    expect(source).not.toContain("monitor live task triggers");
    expect(source).toContain("isLocalAdminUiTestSession ? (");
    expect(source).toContain("<AdminTasksManager users={users} />");
  });

  it("does not show an empty quoted search when no user filter is active", () => {
    expect(source).toContain("No users match");
    expect(source).toContain("No users found.");
    expect(source).toContain("searchQuery.trim()");
    expect(source).not.toContain('No users found matching &quot;{searchQuery}&quot;');
  });

  it("guards user-management mutations behind verified admin access", () => {
    expect(source).toContain("permission_blocked: user status changes require verified admin access");
    expect(source).toContain("permission_blocked: username changes require verified admin access");
    expect(source).toContain("permission_blocked: content access changes require verified admin access");
    expect(source).toContain("permission_blocked: role changes require verified admin access");
    expect(source).toContain("permission_blocked: verification changes require verified admin access");
  });
});
