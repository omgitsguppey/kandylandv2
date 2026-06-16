import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/admin/user/[userId]/page.tsx"), "utf8");

describe("admin user detail fixture boundary", () => {
  it("renders a bounded local fixture for browser smoke user detail without calling the API", () => {
    expect(source).toContain("isAdminUiTestSessionUser(user)");
    expect(source).toContain('ADMIN_USER_DETAIL_BROWSER_SMOKE_USER_ID = "browser-smoke-user"');
    expect(source).toContain("isLocalAdminUiTestSession && userId === ADMIN_USER_DETAIL_BROWSER_SMOKE_USER_ID");
    expect(source).toContain("if (isLocalAdminUserDetailFixture)");
    expect(source).toContain("setTargetUser(ADMIN_USER_DETAIL_BROWSER_SMOKE_PROFILE)");
    expect(source).toContain("setAnalytics(null)");
    expect(source).toContain('data-admin-user-detail-fixture-boundary="true"');
    expect(source).toContain("User detail layout is inspectable");
    expect(source).toContain("source_missing until a real admin session loads a verified user record");
  });

  it("keeps real admin sessions on the canonical admin user API path", () => {
    const fixtureBranch = source.indexOf("if (isLocalAdminUserDetailFixture)");
    const apiFetch = source.indexOf('authFetch(`/api/admin/user/${userId}`)');

    expect(fixtureBranch).toBeGreaterThan(-1);
    expect(apiFetch).toBeGreaterThan(fixtureBranch);
    expect(source).toContain("if (!isAdmin || !userId)");
  });
});
