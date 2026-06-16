import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const hookSource = readFileSync(
  join(process.cwd(), "src/hooks/useNotifications.ts"),
  "utf8",
);

describe("admin notifications local fixture boundary", () => {
  it("skips authenticated notification reads and runtime subscriptions for local admin UI test sessions", () => {
    expect(hookSource).toContain('import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";');
    expect(hookSource).toContain("const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);");
    expect(hookSource).toContain("if (isLocalAdminUiTestSession) {");
    expect(hookSource).toContain("setNotificationsState([]);");
    expect(hookSource).toContain("setLoadedForUserId(userId);");

    const fixtureBranchStart = hookSource.indexOf("if (isLocalAdminUiTestSession) {");
    const fetchStart = hookSource.indexOf("const fetchNotifications = async () => {");
    const subscriptionStart = hookSource.indexOf("const subscribeToUserRuntime = async () => {");

    expect(fixtureBranchStart).toBeGreaterThan(-1);
    expect(fetchStart).toBeGreaterThan(fixtureBranchStart);
    expect(subscriptionStart).toBeGreaterThan(fixtureBranchStart);
  });
});
