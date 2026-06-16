import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/drops/page.tsx"), "utf8");

describe("admin drops local fixture boundary", () => {
  it("keeps local admin UI fixture reviews read-only for mutation controls", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('data-admin-drops-fixture-boundary="true"');
    expect(source).toContain('data-admin-drops-fixture-state="source_missing"');
    expect(source).toContain("Drop list rendering is inspectable");
    expect(source).toContain("drop feed, creator options, queue state, create, review, queue, notify, duplicate, edit, and delete remain source_missing");
    expect(source).toContain("useAdminDropsFeed({ enabled: !isLocalAdminUiTestSession })");
    expect(source).toContain("const ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS = 0");
    expect(source).toContain('useAdminPollingSWR<AdminDropQueueConfig>(isLocalAdminUiTestSession ? null : "/api/admin/queue", ADMIN_DROP_QUEUE_SNAPSHOT_REFRESH_INTERVAL_MS)');
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n            setCreatorOptions([]);\n            return;\n        }");
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n            return;\n        }");
    expect(source).toContain('disabled={isLocalAdminUiTestSession}');
    expect(source).toContain('disabled={isLocalAdminUiTestSession || reviewingDropId === drop.id}');
    expect(source).toContain('isLocalAdminUiTestSession ? "Create unavailable" : "Create Drop"');
  });
});
