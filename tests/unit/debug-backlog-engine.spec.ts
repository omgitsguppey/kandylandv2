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
          "Runtime unverified: Runtime/provider smoke - Attach deployed route evidence; do not treat local static validators as route evidence.",
          "Ready with smoke required: Admin truth/sample evidence - Attach a redacted admin source sample before clearing the admin source sample gate.",
          "UI source coverage required: Source coverage - Run deterministic UI source checks before optional visual reproduction.",
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
        nextAction: "Use this as source-backed debug/runtime evidence only; attach deployed route evidence before clearing runtime gates.",
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

    expect(backlog.some((item) => item.title === "UI source coverage required" && item.fixClass === "manual_required")).toBe(false);
    expect(backlog.some((item) => item.source === "admin_truth" && item.fixClass === "manual_required")).toBe(true);
    expect(backlog.some((item) => item.source === "evidence" && item.status === "stale_retired")).toBe(true);
    expect(backlog.some((item) => item.source === "route_diagnostics" && item.fixClass === "route_fix")).toBe(true);
    expect(backlog.every((item) => item.owner && item.surface && item.sourceFiles.length > 0 && item.scoreDimensionImpact.length > 0)).toBe(true);
    expect(backlog.map((item) => item.title)).toEqual(expect.arrayContaining([
      "Provider and route evidence required",
      "Admin source sample required",
      "UI source coverage required",
    ]));
    expect(JSON.stringify(backlog)).not.toContain("Unknown evidence:");
    expect(JSON.stringify(backlog)).not.toContain("Stale evidence:");
    expect(validateDebugBacklog(backlog)).toEqual([]);

    const summary = summarizeDebugBacklog(backlog);
    expect(summary.total).toBe(backlog.length);
    expect(summary.bySeverity.p1).toBeGreaterThan(0);
    expect(summary.staleRetired).toBe(1);
    expect(summary.sourceTruthStates.runtime_proof_required).toBeGreaterThan(0);
    expect(summary.sourceTruthStates.admin_truth_source_required).toBeGreaterThan(0);
    expect(summary.sourceTruthStates.source_refresh_required).toBeGreaterThan(0);
    expect(Object.values(summary.sourceTruthStates).reduce((total, count) => total + count, 0)).toBe(backlog.length);
    expect(summary).not.toHaveProperty("manualRequired");
  });

  it("keeps passed targeted behavior checks source-only instead of unknown proof", () => {
    const backlog = buildDebugBacklog({
      publicBetaScore: {
        evidenceCompletenessScore: 80,
        evidenceCapDetails: [
          "Unknown evidence: Targeted behavior tests - Current implemented source behavior validators passed. This is targeted behavior evidence only and does not prove provider smoke, runtime smoke, or admin truth sample evidence.",
        ],
      },
    });

    expect(backlog).toHaveLength(1);
    expect(backlog[0]).toMatchObject({
      title: "Source-only behavior evidence",
      severity: "info",
      status: "not_applicable",
      fixClass: "no_action",
      evidenceStatus: "source_backed",
    });
    expect(backlog[0].evidenceReason).toContain("does not prove runtime");
    expect(backlog[0].evidenceReason).not.toContain("screenshot");
    expect(JSON.stringify(backlog)).not.toContain("Unknown evidence:");
    expect(validateDebugBacklog(backlog)).toEqual([]);
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
