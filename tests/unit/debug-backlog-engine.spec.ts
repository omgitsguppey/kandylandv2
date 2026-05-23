import { describe, expect, it } from "vitest";

import {
  buildDebugBacklog,
  summarizeDebugBacklog,
  validateDebugBacklog,
} from "../../src/lib/debug/debug-backlog-builder";
import type { DebugBacklogItem } from "../../src/lib/debug/debug-backlog-contract";

const baseItem: DebugBacklogItem = {
  id: "base",
  title: "Base issue",
  owner: "admin_debug",
  surface: "admin_debug",
  severity: "p2",
  source: "debug_panel",
  status: "open",
  fixClass: "evidence_refresh",
  scoreDimensionImpact: ["freshness"],
  scoreImpact: 1,
  actionability: "evidence_required",
  estimatedPointImpact: 1,
  defaultVisible: true,
  dedupeKey: "base",
  duplicateChildren: [],
  sourceFiles: ["agent/state/debug-panel-output-triage.generated.json"],
  sourceRoute: "/admin/debug",
  evidenceStatus: "source_backed",
  evidenceReason: "Debug panel output is source-backed.",
  exactNextAction: "Refresh the owning artifact.",
  sourceMessage: "Debug panel output needs review.",
};

describe("debug backlog engine", () => {
  it("normalizes beta score caps, score-80 drag, debug runtime unknowns, stale artifacts, and route diagnostics", () => {
    const backlog = buildDebugBacklog({
      publicBetaScore: {
        overallScore: 63.33,
        runtimeHealthScore: 18.33,
        evidenceCompletenessScore: 51,
        freshnessScore: 76.43,
        costRiskScore: 40,
        regressionRiskScore: 90,
        launchBlockers: [
          "Visual/manual smoke: Visual QA required",
          "Runtime/provider smoke: Runtime unverified",
        ],
        evidenceCapDetails: [
          "Runtime unverified: Runtime/provider smoke - Run formal deployed runtime smoke later; do not treat local static validators as runtime smoke.",
          "Ready with smoke required: Admin truth/sample evidence - Attach a redacted production admin truth sample before clearing the formal admin truth evidence gate.",
        ],
      },
      score80PathLock: {
        remainingScoreDrag: [
          {
            dimension: "runtimeHealthScore",
            weightedPointImpact: 16.33,
            reason: "Source-backed runtime confidence helps, but deployed runtime smoke remains missing.",
          },
        ],
        artifactsBlocking80: [
          {
            id: "agent/state/beta-evidence-gap-map.generated.json",
            status: "stale_source_version",
            pointImpact: 1.8,
            refreshCommand: "npm run check:beta-evidence-gap-map",
            nextAction: "Refresh this report from the latest code version.",
          },
        ],
      },
      debugRuntimeEvidence: {
        unknownEvidenceCount: 1,
        nextAction: "Use this as source-backed debug/runtime evidence only; attach deployed runtime smoke before clearing runtime gates.",
      },
      adminTruthSample: {
        status: "source_ready_admin_truth_sample",
        productionSampleAttached: false,
        formalAdminTruthSamplePassed: false,
      },
      routeDiagnostics: [
        {
          context: "admin/debug:GET",
          severity: "warn",
          message: "Debug route degraded",
          route: "/api/admin/debug",
          sourceFile: "src/app/api/admin/debug/route.ts",
          owner: "admin_debug",
        },
      ],
      staleArtifacts: [
        {
          artifactPath: "agent/state/repo-spring-cleaning-rewire.generated.json",
          status: "archive_candidate",
          message: "Historical cleanup snapshot is stale and evidence-only.",
          nextAction: "Retire this stale snapshot from the active debug backlog.",
        },
      ],
    });

    expect(backlog.some((item) => item.source === "beta_score" && item.fixClass === "manual_required")).toBe(true);
    expect(backlog.some((item) => item.source === "admin_truth" && item.fixClass === "manual_required")).toBe(true);
    expect(backlog.some((item) => item.source === "evidence" && item.status === "stale_retired")).toBe(true);
    expect(backlog.some((item) => item.source === "route_diagnostics" && item.fixClass === "route_fix")).toBe(true);
    expect(backlog.every((item) => item.owner && item.surface && item.sourceFiles.length > 0 && item.scoreDimensionImpact.length > 0)).toBe(true);
    expect(validateDebugBacklog(backlog)).toEqual([]);

    const summary = summarizeDebugBacklog(backlog);
    expect(summary.total).toBe(backlog.length);
    expect(summary.bySeverity.p1).toBeGreaterThan(0);
    expect(summary.staleRetired).toBe(1);
  });

  it("fails validation for unmapped warnings, unknown evidence without reason, stale issues without action, and p1 items without next action", () => {
    const failures = validateDebugBacklog([
      {
        ...baseItem,
        owner: "",
        evidenceStatus: "unknown",
        evidenceReason: "",
        exactNextAction: "",
        severity: "p1",
      },
      {
        ...baseItem,
        id: "stale",
        status: "open",
        evidenceStatus: "stale",
        evidenceReason: "stale",
        fixClass: "manual_required",
        exactNextAction: "Review manually.",
      },
    ]);

    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining("lacks owner"),
      expect.stringContaining("unknown evidence lacks reason"),
      expect.stringContaining("p0/p1 issue lacks exact next action"),
      expect.stringContaining("stale issue lacks refresh/retire action"),
    ]));
  });
});
