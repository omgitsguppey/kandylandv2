import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("account settings mobile padding parity", () => {
  it("passes the source-level account settings mobile padding validator", () => {
    expect(() => {
      execSync("npm run check:account-settings-mobile-padding", {
        cwd: ROOT,
        stdio: "pipe",
        encoding: "utf8",
      });
    }).not.toThrow();
  }, 20000);

  it("marks Account Settings as shell aligned and keeps bottom safety", () => {
    const page = read("src/components/Settings/UserSettingsPage.tsx");

    expect(page).toContain('data-account-settings-side-padding-parity="true"');
    expect(page).toContain('data-account-settings-shell-aligned="true"');
    expect(page).toContain('data-settings-bottom-safe="true"');
    expect(page).toContain("--account-settings-shell-side-padding");
    expect(page).toContain("USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET");
    expect(page).toContain("env(safe-area-inset-bottom)");
  });
});
