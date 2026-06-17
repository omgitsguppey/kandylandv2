import { describe, expect, it } from "vitest";

import {
  CREATOR_DROP_WORKFLOW_STATES,
  CREATOR_DROP_WORKFLOW_TRANSITIONS,
  getCreatorDropTransition,
} from "@/lib/creator/drops/creator-drop-workflow-contract";

describe("creator drop workflow contract", () => {
  it("declares every creator-facing status required by the approval workflow", () => {
    expect(CREATOR_DROP_WORKFLOW_STATES).toEqual(expect.arrayContaining([
      "draft",
      "ready_to_submit",
      "submitted",
      "pending_review",
      "approved",
      "rejected",
      "needs_changes",
      "scheduled",
      "live",
      "expired",
      "archived",
      "failed",
      "unknown_legacy",
    ]));
  });

  it("keeps creator submission pending and hidden from users until admin approval", () => {
    const submit = getCreatorDropTransition("creator_submits_for_review");

    expect(submit.allowedActor).toBe("creator_owner");
    expect(submit.requiredPermission).toBe("creator.drop.submit");
    expect(submit.resultingStatus).toBe("pending_review");
    expect(submit.userVisibility).toBe(false);
    expect(submit.creatorVisibility).toBe(true);
    expect(submit.adminVisibility).toBe(true);
    expect(submit.fourxxPolicy).toBe("invalid_creator_drop_payload");
  });

  it("requires admin review before user-facing rotation can become eligible", () => {
    const approve = getCreatorDropTransition("admin_approves");

    expect(approve.allowedActor).toBe("admin_reviewer");
    expect(approve.requiredPermission).toBe("admin.drop.review");
    expect(approve.resultingStatus).toBe("approved");
    expect(approve.userVisibility).toBe(true);
    expect(approve.rotationEligibility).toBe(true);
    expect(approve.requiredFields).toContain("content_asset");
  });

  it("does not leave workflow transitions without telemetry, debug, or recovery policy", () => {
    for (const transition of CREATOR_DROP_WORKFLOW_TRANSITIONS) {
      expect(transition.telemetryEvent).toMatch(/creator_drop|admin_creator_drop/);
      expect(transition.debugLane).toBe("creator_drop_workflow");
      expect(transition.nextRecoveryAction.length).toBeGreaterThan(8);
      expect(transition.validationErrorClass.length).toBeGreaterThan(0);
    }
  });
});
