import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("account settings delete flow", () => {
  it("passes the source-level account settings delete flow validator", () => {
    expect(() => {
      execSync("npm run check:account-settings-delete-flow", {
        cwd: ROOT,
        stdio: "pipe",
        encoding: "utf8",
      });
    }).not.toThrow();
  });

  it("keeps the delete account row visible above mobile floating controls", () => {
    const settingsPage = read("src/components/Settings/UserSettingsPage.tsx");

    expect(settingsPage).toContain('data-account-settings-bottom-safe="true"');
    expect(settingsPage).toContain('data-report-issue-chip-untouched="true"');
    expect(settingsPage).toContain('data-delete-account-visible-above-floating-actions="true"');
    expect(settingsPage).toContain("USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET");
    expect(settingsPage).toContain("env(safe-area-inset-bottom)");
  });

  it("uses a confirmation modal and human failure states instead of raw direct deletion UI", () => {
    const supportSection = read("src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx");
    const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");

    expect(supportSection).toContain("Delete account?");
    expect(supportSection).toContain("data-account-delete-confirmation-modal");
    expect(profileState).not.toContain("window.confirm(");
    expect(profileState).toContain("Account deletion could not start because your account session is missing. Sign in again and retry.");
    expect(profileState).toContain("We could not submit the deletion request right now. Try again or contact support.");
    expect(profileState).not.toContain("Internal server error");
  });
});
