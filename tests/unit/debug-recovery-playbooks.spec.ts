import { describe, expect, it } from "vitest";

import {
  DEBUG_RECOVERY_PLAYBOOK_IDS,
  buildDebugRecoveryPlaybooks,
  validateDebugRecoveryPlaybooks,
  type DebugRecoveryPlaybook,
} from "@/lib/debug/recovery-playbooks";

describe("debug recovery playbooks", () => {
  it("covers every high-impact debug category with executable playbooks", () => {
    const playbooks = buildDebugRecoveryPlaybooks();
    const ids = playbooks.map((playbook) => playbook.id);

    expect(ids).toEqual(expect.arrayContaining([...DEBUG_RECOVERY_PLAYBOOK_IDS]));
    expect(playbooks).toHaveLength(DEBUG_RECOVERY_PLAYBOOK_IDS.length);

    for (const playbook of playbooks) {
      expect(playbook.triggerPatterns.length).toBeGreaterThan(0);
      expect(playbook.sourceFiles.length).toBeGreaterThan(0);
      expect(playbook.commands.length).toBeGreaterThan(0);
      expect(playbook.validators.length).toBeGreaterThan(0);
      expect(playbook.fixes.length).toBeGreaterThan(0);
      expect(playbook.forbiddenActions).toEqual(expect.arrayContaining([
        "no_production_reads",
        "no_deploy",
        "no_payment_gumdrop_math_changes",
        "no_chat_nav_edits",
      ]));
      expect(playbook.evidenceOutcome).toContain("does not clear formal");
      expect(playbook.scoringImpactEstimate.dimensions.length).toBeGreaterThan(0);
    }

    expect(validateDebugRecoveryPlaybooks(playbooks)).toEqual([]);
  });

  it("maps fake evidence recovery to the AI critic and formal evidence gates", () => {
    const playbook = buildDebugRecoveryPlaybooks().find((entry) => entry.id === "fake_evidence_recovery");

    expect(playbook).toMatchObject({
      criticChecks: expect.arrayContaining([
        "no_fake_evidence",
        "no_formal_gate_cleared_without_artifact",
        "no_source_ready_as_runtime_proof",
      ]),
      validators: expect.arrayContaining([
        "npm run check:ai-debug-critic",
        "npm run check:beta-score",
      ]),
    });
    expect(playbook?.fixes.join(" ")).toContain("source-only");
  });

  it("rejects playbooks that can clear formal evidence without artifacts or touch protected surfaces", () => {
    const invalid: DebugRecoveryPlaybook[] = [
      {
        id: "fake_evidence_recovery",
        title: "Bad playbook",
        triggerPatterns: ["provider smoke missing"],
        sourceFiles: ["src/lib/gumdrop-economics.ts"],
        commands: [],
        validators: [],
        fixes: ["Mark provider gate passed from local source checks."],
        forbiddenActions: [],
        evidenceOutcome: "clears formal provider gate",
        scoringImpactEstimate: {
          dimensions: ["runtimeHealth"],
          estimatedPointImpact: 100,
          doesNotClearFormalGates: false,
        },
        criticChecks: [],
      },
    ];

    expect(validateDebugRecoveryPlaybooks(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("missing playbook"),
        expect.stringContaining("lacks exact commands"),
        expect.stringContaining("lacks forbidden actions"),
        expect.stringContaining("cannot clear formal evidence"),
        expect.stringContaining("touches protected default source file"),
      ]),
    );
  });
});
