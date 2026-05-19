import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("creator drop manager mobile refinement", () => {
  it("keeps the creator drop manager dependency in place", () => {
    expect(existsSync(join(root, "src/app/dashboard/creator/drops/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/components/Creators/CreatorDropManager.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/app/api/creator/drops/route.ts"))).toBe(true);
    expect(existsSync(join(root, "src/lib/drops/drop-form-contract.ts"))).toBe(true);
    expect(existsSync(join(root, "scripts/agent/validate-creator-drop-management-approval.ts"))).toBe(true);
  });

  it("renders a compact mobile-first manager with one clear primary action", () => {
    const manager = read("src/components/Creators/CreatorDropManager.tsx");
    const page = read("src/app/dashboard/creator/drops/page.tsx");

    expect(page).toContain("CreatorDropManager");
    expect(manager).toContain('data-creator-drop-manager="true"');
    expect(manager).toContain('data-mobile-primary-action="submit_drop"');
    expect(manager).toContain("Submit drops for review before they go live");
    expect(manager).toContain("Submit drop");
    expect(manager).toContain('data-bottom-nav-safe="true"');
    expect(manager).toContain("pb-[calc(env(safe-area-inset-bottom)+6rem)]");
    expect(manager).not.toContain("Submit drops for admin approval before they go live.");
    expect(manager).not.toContain("My KandyDrops");
    expect(manager).not.toContain("unwrapped library");
  });

  it("uses compact filters, rows, and empty state copy", () => {
    const manager = read("src/components/Creators/CreatorDropManager.tsx");

    expect(manager).toContain('data-creator-drop-status-filter="all"');
    expect(manager).toContain('data-creator-drop-list-density="compact_rows"');
    expect(manager).toContain('data-empty-state-density="compact"');
    expect(manager).toContain("No drops submitted yet");
    expect(manager).toContain("Create your first drop for review");
    expect(manager).toContain("Waiting on admin review");
    expect(manager).toContain("Not approved");
    expect(manager).not.toContain("No creator drops submitted yet.");
  });

  it("keeps the creator form submit-for-review copy and hides admin-only controls", () => {
    const modal = read("src/components/Admin/CreateDropModal.tsx");

    expect(modal).toContain("Submit drop for review");
    expect(modal).toContain("Submit for review");
    expect(modal).toContain('data-creator-drop-form-footer="mobile_safe"');
    expect(modal).toContain('mode === "admin" ? (');
    expect(modal).toContain("Auto queue when expired");
    expect(modal).not.toContain("Submit For Approval");
  });

  it("tracks bounded user actions without polling", () => {
    const manager = read("src/components/Creators/CreatorDropManager.tsx");
    const modal = read("src/components/Admin/CreateDropModal.tsx");

    expect(manager).toContain('trackEvent("creator_drop_manager_opened"');
    expect(manager).toContain('trackEvent("creator_drop_submission_started"');
    expect(modal).toContain('trackEvent("creator_drop_submit_failed"');
    expect(manager).not.toContain("setInterval(");
    expect(manager).not.toContain("setTimeout(");
  });

  it("preserves admin drop creation controls and user library separation", () => {
    const modal = read("src/components/Admin/CreateDropModal.tsx");
    const library = read("src/app/dashboard/library/LibraryClient.tsx");
    const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");

    expect(modal).toContain("Create Drop");
    expect(modal).toContain("Auto queue when expired");
    expect(library).toContain("My KandyDrops");
    expect(dropdown).toContain('href="/dashboard/library"');
  });
});
