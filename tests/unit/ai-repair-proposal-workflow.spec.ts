import { describe, expect, it } from "vitest";

import { buildAiRepairApplyContract } from "@/lib/debug/ai-repair-apply-contract";
import { createAiRepairProposalRecord, sanitizeAiRepairProposalForStore } from "@/lib/debug/ai-repair-proposal-store";

describe("AI repair proposal workflow", () => {
  it("returns manual patch instructions instead of silently mutating source", () => {
    const proposal = createAiRepairProposalRecord({
      workItemId: "wi-1",
      mode: "source_patch_candidate",
      filesToChange: ["src/lib/debug/example.ts"],
      validators: ["npm run check:debug-backlog-engine"],
      patchSummary: "Bounded source patch candidate.",
      createdBy: "admin-user",
    });
    const apply = buildAiRepairApplyContract(proposal);

    expect(apply.status).toBe("manual_patch_required");
    expect(apply.sourceMutationAllowed).toBe(false);
    expect(apply.productionMutationAllowed).toBe(false);
    expect(apply.validators).toContain("npm run check:debug-backlog-engine");
    expect(apply.rollbackPlan).toBe(proposal.rollbackPlan);
  });

  it("sanitizes forbidden payloads from persisted proposals", () => {
    const proposal = createAiRepairProposalRecord({
      workItemId: "wi-raw",
      mode: "inspect_only",
      filesToChange: [],
      validators: [],
      patchSummary: "raw support body from test@example.com token=secret",
      createdBy: "admin-user",
    });

    const sanitized = sanitizeAiRepairProposalForStore(proposal);

    expect(sanitized.patchSummary).not.toContain("test@example.com");
    expect(sanitized.patchSummary).not.toContain("secret");
    expect(sanitized.auditTrail.join(" ")).toContain("sanitized_for_store");
  });
});
