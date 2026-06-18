import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/drops/page.tsx"), "utf8");

describe("admin drops local fixture boundary", () => {
  it("keeps local admin UI fixture reviews read-only for mutation controls", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('data-admin-drops-fixture-boundary="true"');
    expect(source).toContain('data-admin-drops-fixture-state="source_missing"');
    expect(source).toContain("This shows the drop tools layout without loading live records");
    expect(source).toContain("Drop feed, creator options, queue state, creation, review, notifications, duplication, edits, and deletes need a real admin session");
    expect(source).toContain("useAdminDropsFeed({ enabled: !isLocalAdminUiTestSession })");
    expect(source).toContain("const ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS = 0");
    expect(source).toContain('useAdminPollingSWR<AdminDropQueueConfig>(isLocalAdminUiTestSession ? null : "/api/admin/queue", ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS)');
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n            setCreatorOptions([]);\n            return;\n        }");
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n            return;\n        }");
    expect(source).toContain('disabled={isLocalAdminUiTestSession}');
    expect(source).toContain('disabled={isLocalAdminUiTestSession || reviewingDropId === drop.id}');
    expect(source).toContain('isLocalAdminUiTestSession ? "Create needs admin" : "Create Drop"');
    expect(source).toContain('data-admin-drop-create-panel="inline"');
    expect(source).toContain('presentation="inline"');
    expect(source).not.toContain("isCreateModalOpen");
    expect(source).not.toContain("setIsCreateModalOpen");
    expect(source).toContain('const dropVisibilityLabel = isLocalAdminUiTestSession');
    expect(source).toContain('"No drop source loaded"');
    expect(source).toContain('className="flex flex-wrap gap-2 px-1"');
    expect(source).not.toContain("min-w-max");
  });
});
