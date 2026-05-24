import { describe, expect, it } from "vitest";

import { resolveControlTowerCanonicalSource } from "@/lib/debug/control-tower-canonical-source";

describe("control tower canonical source", () => {
  it("uses the current public beta score and retires stale score-80 locks from the active queue", () => {
    const result = resolveControlTowerCanonicalSource({
      currentHead: "head-current",
      publicBetaScore: {
        path: "agent/state/public-beta-score.generated.json",
        currentHead: "head-current",
        generatedAtUtc: "2026-05-24T17:10:15.346Z",
        overallScore: 79,
        evidenceScore: 65.7,
      },
      legacyScoreLocks: [{
        path: "agent/state/score-80-path-lock.generated.json",
        currentHead: "old-head",
        generatedAtUtc: "2026-05-23T17:10:15.346Z",
        status: "stale",
      }],
      latestDebugCockpitLock: {
        path: "agent/state/debug-cockpit-batch6-cleanup.generated.json",
        currentHead: "head-current",
        generatedAtUtc: "2026-05-24T17:11:15.346Z",
      },
    });

    expect(result.canonicalScoreSource).toBe("agent/state/public-beta-score.generated.json");
    expect(result.headMatchesMain).toBe(true);
    expect(result.score).toBe(79);
    expect(result.evidenceScore).toBe(65.7);
    expect(result.staleSourceCount).toBe(1);
    expect(result.supersededSources).toContain("agent/state/score-80-path-lock.generated.json");
    expect(result.fixFirstQueueArtifacts).not.toContain("agent/state/score-80-path-lock.generated.json");
  });
});
