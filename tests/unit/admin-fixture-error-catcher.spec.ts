// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";

import { afterEach, describe, expect, it, vi } from "vitest";

const errorCatcherSource = readFileSync(join(process.cwd(), "src/components/AdminErrorCatcher.tsx"), "utf8");
afterEach(cleanup);

describe("admin fixture error catcher boundary", () => {
  it("does not send authenticated admin UI error reports for local fixture sessions", () => {
    expect(errorCatcherSource).toContain('import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";');
    expect(errorCatcherSource).toContain("const { user, userProfile } = useAuth();");
    expect(errorCatcherSource).toContain("const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);");
    expect(errorCatcherSource).toContain("if (!isAdmin || isLocalAdminUiTestSession) {");
  });

  it("keeps dashboard module action buttons out of the collapse button", () => {
    const refresh = vi.fn();
    render(createElement(AdminDashboardModule, {title:"Source", defaultOpen:true,
      actions:createElement("button", {onClick:refresh}, "Refresh source"),
      children:createElement("p", null, "Retained detail") }));
    const actions = screen.getAllByRole("button", {name:"Refresh source"});
    for (const action of actions) {
      expect(action.parentElement?.closest("button")).toBeNull();
      fireEvent.click(action);
      expect(screen.getByText("Retained detail")).toBeVisible();
    }
    expect(refresh).toHaveBeenCalledTimes(actions.length);
    fireEvent.click(screen.getByRole("button", {name:"Collapse Source"}));
    expect(screen.queryByText("Retained detail")).toBeNull();
  });
});
