import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { expectSourceValidatorWithDirtyTreeIsolation } from "./utils/source-validator-contract";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("account settings mobile padding parity", () => {
  it("passes source checks or reports only the exact dirty-tree isolation blocker", () => {
    expectSourceValidatorWithDirtyTreeIsolation({
      command: "npm run check:account-settings-mobile-padding",
      artifact: "agent/state/account-settings-mobile-padding.generated.json",
      isolationCheck: "reportIssueAndNavUntouched",
      expectedIsolationFailure: "reportIssueAndNavUntouched failed.",
    });
    expect(JSON.parse(read("agent/state/account-settings-mobile-padding.generated.json")).mutationScope).toEqual({ mode: "whole_git_worktree" });
  }, 30000);

  it("marks Account Settings as shell aligned and keeps bottom safety", () => {
    const page = read("src/components/Settings/UserSettingsPage.tsx");

    expect(page).toContain('data-account-settings-side-padding-parity="true"');
    expect(page).toContain('data-account-settings-shell-aligned="true"');
    expect(page).toContain('data-settings-bottom-safe="true"');
    expect(page).toContain("--account-settings-shell-side-padding");
    expect(page).toContain("USER_MOBILE_BOTTOM_NAV_SAFE_GAP");
    expect(page).toContain('ACCOUNT_SETTINGS_SHELL_SIDE_PADDING = "0rem"');
    expect(page).toContain('data-account-settings-nav-reservation="root-owned"');
    expect(page).not.toContain("env(safe-area-inset-bottom)");
    expect(page).not.toContain("-mx-");
    const center = read("src/components/creative-tim/kandydrops/account/KandyAccountCenter.tsx");
    expect(center).toContain("<UserSettingsPage />");
    expect(center).toContain("mx-auto w-full max-w-4xl px-4");
    expect(center).not.toMatch(/(?:sm|md|lg|xl|2xl):px-/u);
  });
});
