import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/debug/page.tsx"), "utf8").replace(/\r\n/g, "\n");

describe("admin debug preferences snapshot refresh", () => {
  it("keeps debug preferences on explicit refresh while preserving live evidence lanes", () => {
    expect(source).toContain("const ADMIN_DEBUG_PREFERENCES_REFRESH_INTERVAL_MS = 0");
    expect(source).toContain(
      'isLocalAdminUiTestSession ? null : "/api/admin/debug/preferences",\n        ADMIN_DEBUG_PREFERENCES_REFRESH_INTERVAL_MS',
    );
    expect(source).toContain("await mutateDebugPreferences();");
    expect(source).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug", 60000');
    expect(source).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug/assistant", 15000');
    expect(source).not.toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug/preferences", 15000');
  });
});
