import { describe, expect, it } from "vitest";

import {
  reviewAiDebugRepairProposal,
  summarizeRepairProposalReview,
} from "@/lib/debug/repair-proposal-review";

describe("ai debug critic repair proposal review", () => {
  it("rejects unsafe payment and GumDrop math repair proposals", () => {
    const review = reviewAiDebugRepairProposal({
      proposalId: "proposal-payment-math",
      workItemId: "payment-lane",
      mode: "source_patch_candidate",
      filesToInspect: ["src/lib/gumdrop-ledger.ts"],
      filesToChange: ["src/lib/gumdrop-ledger.ts", "src/app/api/paypal/capture/route.ts"],
      validatorsToRun: ["npm run check:beta-score"],
      rollbackPlan: "Revert payment math edits.",
      humanApprovalRequired: true,
      autoApplyAllowed: false,
      riskScore: 80,
    });

    expect(review.result).toBe("reject_unsafe");
    expect(review.securityRisk).toBe("high");
    expect(review.costRisk).toBe("high");
    expect(review.correctnessRisk).toBe("high");
    expect(review.issues.join(" ")).toContain("payment");
    expect(summarizeRepairProposalReview(review).approvedForHumanReview).toBe(false);
  });

  it("requires critic review and tests for source patch candidates", () => {
    const review = reviewAiDebugRepairProposal({
      proposalId: "proposal-debug-helper",
      workItemId: "admin-debug-route",
      mode: "source_patch_candidate",
      filesToInspect: ["src/app/api/admin/debug/route.ts"],
      filesToChange: ["src/app/api/admin/debug/route.ts"],
      validatorsToRun: [],
      rollbackPlan: "Revert route helper extraction.",
      humanApprovalRequired: true,
      autoApplyAllowed: false,
      riskScore: 35,
    });

    expect(review.result).toBe("revise_required");
    expect(review.testCoverageRisk).toBe("high");
    expect(review.issues.join(" ")).toContain("validator");
  });

  it("passes bounded inspect-only proposals to human review without auto-apply", () => {
    const review = reviewAiDebugRepairProposal({
      proposalId: "proposal-inspect",
      workItemId: "bug-intake-no-sample",
      mode: "inspect_only",
      filesToInspect: ["src/lib/debug/bug-intake-triage-status.ts"],
      filesToChange: [],
      validatorsToRun: ["npm run check:ai-debug-queue-truth"],
      rollbackPlan: "No source mutation proposed.",
      humanApprovalRequired: true,
      autoApplyAllowed: false,
      riskScore: 10,
    });

    expect(review.result).toBe("inspect_only");
    expect(review.securityRisk).toBe("low");
    expect(review.privacyRisk).toBe("low");
    expect(review.costRisk).toBe("low");
    expect(summarizeRepairProposalReview(review).autoApplyBlocked).toBe(true);
  });

  it("describes typed evidence source-patch blocks without stale formal copy", () => {
    const review = reviewAiDebugRepairProposal({
      proposalId: "proposal-typed-evidence",
      workItemId: "provider-backed-site-activity",
      mode: "source_patch_candidate",
      filesToInspect: ["agent/evidence/provider-smoke/template.json"],
      filesToChange: ["agent/evidence/provider-smoke/template.json"],
      validatorsToRun: ["npm run check:provider-smoke-evidence"],
      rollbackPlan: "Revert provider smoke evidence template-only change.",
      humanApprovalRequired: true,
      autoApplyAllowed: false,
      riskScore: 20,
    });

    expect(review.result).toBe("reject_unsafe");
    expect(review.issues.join(" ")).toContain("Typed evidence requests must not become source patches.");
    expect(review.issues.join(" ")).not.toContain("Formal evidence requests");
  });
});
