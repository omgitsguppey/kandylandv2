import { describe, expect, it } from "vitest";

import { classifyRecoveryPlaybookVisibility } from "@/lib/debug/recovery-playbook-visibility";

describe("recovery playbook CTA cleanup", () => {
  it("collapses generic score/runtime/admin CTAs when no matching active issue exists", () => {
    const result = classifyRecoveryPlaybookVisibility({
      scoreArtifactCurrent: true,
      debugRuntimeStatus: "source_ready_current",
      adminTruthStatus: "source_ready_formal_sample_required",
      activeIssues: [],
      playbooks: [
        { id: "stale_artifact_recovery", title: "Stale Artifact Recovery", command: "npm run score:beta", scoreImpact: 1 },
        { id: "debug_runtime_unknown_recovery", title: "Debug Runtime Unknown Recovery", command: "npm run check:debug-runtime-evidence", scoreImpact: 1 },
        { id: "admin_truth_unknown_recovery", title: "Admin Truth Unknown Recovery", command: "npm run check:admin-truth-source-sample", scoreImpact: 1 },
      ],
    });

    expect(result.visiblePlaybooks).toEqual([]);
    expect(result.collapsedPlaybooks.map((entry) => entry.id)).toEqual([
      "stale_artifact_recovery",
      "debug_runtime_unknown_recovery",
      "admin_truth_unknown_recovery",
    ]);
    expect(result.status).toBe("collapsed_no_active_issue");
    expect(result.fixFirstPlaybooks).toEqual([]);
  });
});
