import { describe, expect, it } from "vitest";

import { buildAiDebugCriticReport } from "@/lib/debug/ai-debug-critic";
import {
  buildAiCriticP1TriageReport,
  classifyBacklogAction,
  validateAiCriticP1TriageReport,
} from "@/lib/debug/ai-critic-p1-triage";
import type { DebugBacklogItem } from "@/lib/debug/debug-backlog-contract";

function backlogItem(overrides: Partial<DebugBacklogItem>): DebugBacklogItem {
  return {
    id: "item",
    title: "Item",
    owner: "admin_debug",
    surface: "admin_debug",
    severity: "p1",
    source: "debug_panel",
    status: "open",
    fixClass: "evidence_refresh",
    scoreDimensionImpact: ["evidenceCompleteness"],
    scoreImpact: 1,
    sourceFiles: ["agent/state/example.generated.json"],
    sourceRoute: "/admin/debug",
    evidenceStatus: "stale",
    evidenceReason: "stale",
    exactNextAction: "Refresh evidence.",
    sourceMessage: "stale",
    ...overrides,
  };
}

describe("ai critic p1 triage", () => {
  it("classifies formal gates away from source request changes while UI coverage remains source-refreshable", () => {
    expect(classifyBacklogAction(backlogItem({
      exactNextAction: "Attach formal deployed runtime smoke evidence.",
    }))).toBe("blocked_formal_evidence");
    expect(classifyBacklogAction(backlogItem({
      exactNextAction: "Run UI source coverage before optional visual reproduction.",
    }))).toBe("needs_refresh");
  });

  it("ranks P1/P2 by score impact and keeps P2 deferred while P1 remains", () => {
    const aiCritic = buildAiDebugCriticReport({
      changedFiles: ["src/lib/debug/ai-critic-p1-triage.ts"],
      proposedFixSummary: "Classifies formal evidence without clearing formal gates.",
      debugBacklog: [],
      betaScoreBlockers: [],
      evidenceStatus: { formalArtifacts: [], sourceOnlyClaims: [] },
    });
    const report = buildAiCriticP1TriageReport({
      backlog: [
        backlogItem({
          id: "manual-visual",
          scoreImpact: 51,
          exactNextAction: "Run UI source coverage before optional visual reproduction.",
        }),
        backlogItem({
          id: "source-route",
          scoreImpact: 2,
          fixClass: "route_fix",
          evidenceStatus: "source_backed",
          exactNextAction: "Fix route diagnostic mapping.",
        }),
        backlogItem({
          id: "p2-refresh",
          severity: "p2",
          scoreImpact: 4,
          exactNextAction: "Refresh stale evidence.",
        }),
      ],
      aiCritic,
      criticStatusBefore: "request_changes",
      scoreBefore: 65.8,
      scoreAfter: 65.8,
      currentHead: "test",
      formalEvidenceGates: ["Visual/manual smoke", "Runtime/provider smoke"],
      resolvedSourceFixes: [{
        id: "source-route",
        title: "Route diagnostic mapping fixed",
        owner: "admin_debug",
        surface: "admin_debug",
        severity: "p1",
        scoreImpact: 2,
        fixClass: "route_fix",
        exactNextAction: "Route diagnostic mapping no longer ingests admin truth warnings.",
        sourceFiles: ["scripts/agent/validate-debug-backlog-engine.ts"],
      }],
    });

    expect(report.criticStatusBefore).toBe("request_changes");
    expect(report.criticStatusAfter).toBe("pass");
    expect(report.p1Ranking[0]?.id).toBe("manual-visual");
    expect(report.p2DeferredCount).toBe(1);
    expect(report.fixedThisPass.map((item) => item.id)).toContain("source-route");
    expect(validateAiCriticP1TriageReport(report)).toEqual([]);
  });

  it("fails if critic still requests changes for evidence-only work", () => {
    const aiCritic = buildAiDebugCriticReport({
      changedFiles: ["src/lib/debug/ai-critic-p1-triage.ts"],
      proposedFixSummary: "Classifies formal evidence without clearing formal gates.",
      debugBacklog: [],
      betaScoreBlockers: [],
      evidenceStatus: { formalArtifacts: [], sourceOnlyClaims: [] },
    });
    const report = {
      ...buildAiCriticP1TriageReport({
        backlog: [],
        aiCritic,
        criticStatusBefore: "request_changes",
        scoreBefore: 65.8,
        scoreAfter: 65.8,
        currentHead: "test",
        formalEvidenceGates: ["Runtime/provider smoke"],
      }),
      criticStatusAfter: "request_changes" as const,
    };

    expect(validateAiCriticP1TriageReport(report)).toContain("aiCriticStatus remains request_changes after formal/manual evidence classification.");
  });
});
