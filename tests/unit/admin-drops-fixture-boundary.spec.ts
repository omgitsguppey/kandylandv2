import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/drops/page.tsx"), "utf8");

describe("admin drops local fixture boundary", () => {
  it("keeps local admin UI fixture reviews read-only for mutation controls", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('data-admin-drops-fixture-boundary="true"');
    expect(source).toContain("Drop list rendering is inspectable");
    expect(source).toContain("create, review, queue, notify, duplicate, edit, and delete require real admin auth");
    expect(source).toContain("if (isLocalAdminUiTestSession) {\n            return;\n        }");
    expect(source).toContain('disabled={isLocalAdminUiTestSession}');
    expect(source).toContain('disabled={isLocalAdminUiTestSession || reviewingDropId === drop.id}');
    expect(source).toContain('isLocalAdminUiTestSession ? "Create unavailable" : "Create Drop"');
  });
});
