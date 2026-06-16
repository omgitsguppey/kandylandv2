import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const errorCatcherSource = readFileSync(join(process.cwd(), "src/components/AdminErrorCatcher.tsx"), "utf8");
const dashboardModuleSource = readFileSync(join(process.cwd(), "src/components/Admin/AdminDashboardModule.tsx"), "utf8");

describe("admin fixture error catcher boundary", () => {
  it("does not send authenticated admin UI error reports for local fixture sessions", () => {
    expect(errorCatcherSource).toContain('import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";');
    expect(errorCatcherSource).toContain("const { user, userProfile } = useAuth();");
    expect(errorCatcherSource).toContain("const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);");
    expect(errorCatcherSource).toContain("if (!isAdmin || isLocalAdminUiTestSession) {");
  });

  it("keeps dashboard module action buttons out of the collapse button", () => {
    expect(dashboardModuleSource).toContain('className="min-w-0 flex-1 text-left"');
    expect(dashboardModuleSource).toContain("aria-label={`${resolvedOpen ? \"Collapse\" : \"Expand\"} ${title}`}");
    expect(dashboardModuleSource).not.toContain('onClick={(event) => event.stopPropagation()}');

    const firstActionsSlot = dashboardModuleSource.indexOf("{actions}");
    const firstHeaderButtonClose = dashboardModuleSource.indexOf("</button>");
    expect(firstActionsSlot).toBeGreaterThan(firstHeaderButtonClose);
  });
});
