import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("settings route alias cleanup", () => {
  it("passes the source-level route alias cleanup validator", () => {
    expect(() => {
      execSync("npm run check:settings-route-alias-cleanup", {
        cwd: ROOT,
        stdio: "pipe",
        encoding: "utf8",
      });
    }).not.toThrow();
  }, 20000);

  it("declares the canonical settings route table", () => {
    expect(existsSync(`${ROOT}/src/lib/settings/settings-route-contract.ts`)).toBe(true);
    const contract = read("src/lib/settings/settings-route-contract.ts");

    expect(contract).toContain('accountSettingsRoute: "/settings"');
    expect(contract).toContain('creatorSettingsRoute: "/dashboard/creator/settings"');
    expect(contract).toContain('creatorDashboardRoute: "/dashboard/creator"');
    expect(contract).toContain('creatorDropManagerRoute: "/dashboard/creator/drops"');
    expect(contract).toContain('publicCreatorProfileRoutePattern: "/creators/[username]"');
    expect(contract).toContain('"/dashboard/settings"');
    expect(contract).toContain('"/dashboard/profile"');
    expect(contract).toContain('"/profile/settings"');
  });

  it("keeps aliases as redirects while visible account settings links use the canonical route", () => {
    const routing = read("src/lib/creator-profile-routing.ts");
    const dashboardSettings = read("src/app/dashboard/settings/page.tsx");
    const dashboardProfile = read("src/app/dashboard/profile/page.tsx");
    const profileSettings = read("src/app/profile/settings/page.tsx");
    const accountPage = read("src/app/account/page.tsx");
    const privacy = read("src/app/(legal)/privacy/page.tsx");

    expect(routing).toContain('USER_SETTINGS_ROUTE = "/settings"');
    expect(dashboardSettings).toContain('redirect("/settings")');
    expect(dashboardProfile).toContain('redirect("/settings")');
    expect(profileSettings).toContain('redirect("/settings")');
    expect(accountPage).toContain('redirect("/settings")');
    expect(privacy).toContain('href="/settings"');
    expect(privacy).toContain("Account Settings");
    expect(privacy).not.toContain("Profile Settings");
  });
});
