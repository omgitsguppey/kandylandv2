import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("creator drop submit repair", () => {
  it("shows creator-visible submitted, pending review, expired, and needs-changes statuses", () => {
    const manager = read("src/components/Creators/CreatorDropManager.tsx");

    expect(manager).toContain('"submitted"');
    expect(manager).toContain('"pending_review"');
    expect(manager).toContain('"expired"');
    expect(manager).toContain('"needs_changes"');
    expect(manager).toContain('trackEvent("creator_drop_manager_viewed"');
    expect(manager).toContain('trackEvent("creator_drop_pending_review_viewed"');
  });

  it("uses typed creator 4xx responses for permanent submit failures", () => {
    const route = read("src/app/api/creator/drops/route.ts");
    const modal = read("src/components/Admin/CreateDropModal.tsx");

    expect(route).toContain("creatorDrop4xxResponse");
    expect(route).toContain('"invalid_creator_drop_payload"');
    expect(route).toContain('"missing_creator_drop_id"');
    expect(route).toContain('"stale_creator_draft"');
    expect(route).toContain("status: 422");
    expect(modal).toContain("errorClass");
    expect(modal).toContain("recoveryAction");
    expect(modal).toContain('trackEvent("creator_drop_submit_attempted"');
    expect(modal).toContain('trackEvent("creator_drop_submit_succeeded"');
  });
});
