import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { expectSourceValidatorWithDirtyTreeIsolation } from "./utils/source-validator-contract";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(`${ROOT}/${path}`, "utf8");
}

describe("account settings delete flow", () => {
  it("passes source checks or reports only the exact dirty-tree isolation blocker", () => {
    expectSourceValidatorWithDirtyTreeIsolation({
      command: "npm run check:account-settings-delete-flow",
      artifact: "agent/state/account-settings-delete-flow.generated.json",
      isolationCheck: ["bottomNavUntouched", "topNavUntouched", "chatPaymentGumdropMathUntouched"],
      expectedIsolationFailure: ["bottomNavUntouched failed.", "topNavUntouched failed.", "chatPaymentGumdropMathUntouched failed."],
    });
    expect(JSON.parse(read("agent/state/account-settings-delete-flow.generated.json")).mutationScope).toEqual({ mode: "whole_git_worktree" });
  }, 30000);

  it("keeps the delete account row visible above mobile floating controls", () => {
    const settingsPage = read("src/components/Settings/UserSettingsPage.tsx");

    expect(settingsPage).toContain('data-account-settings-bottom-safe="true"');
    expect(settingsPage).toContain('data-report-issue-chip-untouched="true"');
    expect(settingsPage).toContain('data-delete-account-visible-above-floating-actions="true"');
    expect(settingsPage).toContain("USER_MOBILE_BOTTOM_NAV_SAFE_GAP");
    expect(settingsPage).toContain('data-account-settings-nav-reservation="root-owned"');
    expect(settingsPage).toContain("calc(2.75rem +");
    expect(settingsPage).not.toContain("env(safe-area-inset-bottom)");
    expect(read("src/components/CoreLayoutWrapper.tsx")).toContain("USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT");
  });

  it("uses a confirmation modal and human failure states instead of raw direct deletion UI", () => {
    const supportSection = read("src/components/creative-tim/kandydrops/account/AccountSettingsPanels.tsx");
    const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");

    expect(supportSection).toContain("Delete account?");
    expect(supportSection).toContain("data-account-delete-confirmation-modal");
    expect(supportSection).toContain("DialogContent");
    expect(supportSection).toContain('aria-modal="true"');
    expect(supportSection).toContain("deletionTitleRef.current?.focus()");
    expect(supportSection).toContain("tabIndex={-1}");
    expect(supportSection).not.toContain("gap-0 overflow-hidden p-0");
    expect(profileState).toContain("data.success !== true");
    expect(profileState).toContain("account_deletion_retention_review_required");
    expect(profileState).toContain("deletionRequiresSupportReview");
    expect(supportSection).toContain("Contact support");
    expect(profileState).not.toContain("window.confirm(");
    expect(profileState).toContain("Account deletion could not start because your account session is missing. Sign in again and retry.");
    expect(profileState).toContain("We could not submit the deletion request right now. Try again or contact support.");
    expect(profileState).not.toContain("Internal server error");
  });
});
