import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { shouldShowDropInPublicDiscovery } from "@/lib/server/creator-drop-scope";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("creator drop management approval lane", () => {
  it("routes Creator Dashboard Manage drops to the creator submission manager", () => {
    const routing = read("src/lib/creator-profile-routing.ts");
    const dashboard = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");

    expect(routing).toContain('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"');
    expect(routing).toContain('CREATOR_DROP_ROUTE_STATE = "creator_submission"');
    expect(dashboard).toContain("href={CREATOR_DROP_MANAGE_ROUTE}");
    expect(dashboard).toContain("data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}");
    expect(dashboard).not.toContain('href="/dashboard/library"');
  });

  it("renders a creator drop manager surface instead of My KandyDrops library language", () => {
    expect(existsSync(join(root, "src/app/dashboard/creator/drops/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/components/Creators/CreatorDropManager.tsx"))).toBe(true);

    const manager = read("src/components/Creators/CreatorDropManager.tsx");
    const page = read("src/app/dashboard/creator/drops/page.tsx");

    expect(page).toContain("CreatorDropManager");
    expect(manager).toContain('data-creator-drop-manager="true"');
    expect(manager).toContain('data-drop-manager-surface="creator_submission"');
    expect(manager).toContain('data-admin-approval-required="true"');
    expect(manager).toContain("Submit drops for review before they go live.");
    expect(manager).not.toContain("My KandyDrops");
    expect(manager).not.toContain("unwrapped library");
  });

  it("keeps the normal user library surface separate", () => {
    const library = read("src/app/dashboard/library/LibraryClient.tsx");
    const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");

    expect(library).toContain("My KandyDrops");
    expect(dropdown).toContain('href="/dashboard/library"');
    expect(dropdown).toContain('label="My KandyDrops"');
  });

  it("shares admin and creator drop form contracts", async () => {
    expect(existsSync(join(root, "src/lib/drops/drop-form-contract.ts"))).toBe(true);
    expect(existsSync(join(root, "src/lib/drops/drop-submission-contract.ts"))).toBe(true);

    const formContract = await import("@/lib/drops/drop-form-contract");
    const submissionContract = await import("@/lib/drops/drop-submission-contract");

    expect(formContract.getAdminDropFormFields()).toContain("approvalStatus");
    expect(formContract.getCreatorDropSubmissionFields()).toContain("title");
    expect(formContract.getCreatorDropSubmissionFields()).not.toContain("approvalStatus");
    expect(formContract.isCreatorAllowedDropField("publicDiscovery")).toBe(false);
    expect(submissionContract.sanitizeAdminDropPayload({ title: "Admin drop" }, "admin_1")).toMatchObject({
      title: "Admin drop",
    });
  });

  it("forces creator submissions into pending admin approval and blocks admin-only fields", async () => {
    const {
      assertCreatorDropSubmissionSafe,
      buildCreatorPendingDropPayload,
      sanitizeCreatorDropSubmission,
      stripAdminOnlyDropFields,
    } = await import("@/lib/drops/drop-submission-contract");

    const unsafe = {
      title: "Creator drop",
      description: "A creator submitted drop with locked content.",
      imageUrl: "https://cdn.kandydrops.com/cover.jpg",
      contentUrls: ["https://cdn.kandydrops.com/content.mp4"],
      unlockCost: 25,
      validFrom: 1_800_000_000_000,
      type: "content",
      creatorId: "other_creator",
      submittedByCreatorId: "other_creator",
      approvalStatus: "approved",
      reviewStatus: "approved",
      status: "active",
      published: true,
      live: true,
      publicDiscovery: true,
      rotationEligibility: true,
    };

    expect(stripAdminOnlyDropFields(unsafe)).not.toHaveProperty("publicDiscovery");
    expect(() => assertCreatorDropSubmissionSafe(unsafe)).toThrow(/admin-only/i);

    const sanitized = sanitizeCreatorDropSubmission({
      ...unsafe,
      approvalStatus: "pending_review",
      reviewStatus: "pending_admin_approval",
      published: false,
      live: false,
      publicDiscovery: false,
      rotationEligibility: false,
    }, "creator_1", "user_1");
    expect(sanitized.creatorId).toBe("creator_1");
    expect(sanitized.submittedByCreatorId).toBe("creator_1");
    expect(sanitized.submittedByUserId).toBe("user_1");
    expect(sanitized.approvalStatus).toBe("pending_review");
    expect(sanitized.reviewStatus).toBe("pending_admin_approval");
    expect(sanitized.publicDiscovery).toBe(false);
    expect(sanitized.rotationEligibility).toBe(false);
    expect((sanitized as Record<string, unknown>).published).toBeUndefined();
    expect((sanitized as Record<string, unknown>).live).toBeUndefined();

    expect(buildCreatorPendingDropPayload({
      ...unsafe,
      approvalStatus: "pending_review",
      reviewStatus: "pending_admin_approval",
      published: false,
      live: false,
      publicDiscovery: false,
      rotationEligibility: false,
    }, "creator_1", "user_1")).toMatchObject({
      creatorId: "creator_1",
      submittedByCreatorId: "creator_1",
      submittedByUserId: "user_1",
      createdByRole: "creator",
      reviewStatus: "pending_admin_approval",
      sourceTruth: "creator_submission_pending_admin_approval",
    });
  });

  it("keeps pending creator submissions out of discovery and rotation", () => {
    const pending = {
      id: "drop_pending",
      title: "Pending creator drop",
      status: "active",
      approvalStatus: "pending_review",
      reviewStatus: "pending_admin_approval",
      publicDiscovery: false,
      rotationEligibility: false,
      creatorId: "creator_1",
      submittedByCreatorId: "creator_1",
    };

    expect(shouldShowDropInPublicDiscovery(pending, { now: 1_800_000_000_000 })).toBe(false);
  });

  it("wires creator route ownership and submission tracking", () => {
    const route = read("src/app/api/creator/drops/route.ts");

    expect(route).toContain("export let GET");
    expect(route).toContain("sanitizeCreatorDropSubmission");
    expect(route).toContain("buildCreatorPendingDropPayload");
    expect(route).toContain("trackCreatorDropEvent(\"creator_drop_submitted\"");
    expect(route).toContain("trackCreatorDropEvent(\"creator_drop_updated\"");
    expect(route).toContain(".where(\"submittedByCreatorId\", \"==\", caller.uid)");
    expect(route).toContain("creatorIdOverride: caller.uid");
    expect(route).toContain("You can only edit your own submitted drops.");
  });
});
