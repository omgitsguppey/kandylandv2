import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  UI_VISUAL_SMOKE_REQUIRED_SURFACES,
  buildUiVisualSmokeMinimalReport,
  summarizeUiVisualSmokeEvidenceForScore,
  validateUiVisualSmokeMinimalReport,
  type UiVisualSmokeMinimalReport,
} from "@/lib/evidence/ui-visual-smoke-contract";

describe("UI visual smoke minimal evidence lane", () => {
  it("requires only the targeted layout-sensitive UI surfaces by default", () => {
    const report = buildUiVisualSmokeMinimalReport({
      currentHead: "abc123",
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
    });

    expect(report.surfaces).toHaveLength(UI_VISUAL_SMOKE_REQUIRED_SURFACES.length);
    expect(report.summary.requiredSurfaceCount).toBe(9);
    expect(report.summary.surfaceGroupCount).toBe(8);
    expect(report.summary.statusCounts.missing).toBe(9);
    expect(report.passed).toBe(false);
    expect(report.status).toBe("missing");
    expect(report.nonUiLanesBlocked).toBe(false);
    expect(report.surfaces.every((surface) => surface.blocksScoreForUiOnly)).toBe(true);
    expect(report.surfaces.map((surface) => surface.surfaceId)).toEqual([
      "user_dashboard_mobile",
      "wallet_mobile",
      "creator_dashboard_mobile",
      "creator_settings_mobile",
      "creator_drop_manager_mobile",
      "creator_profile_mobile",
      "admin_debug_summary_mobile",
      "admin_debug_summary_desktop",
      "drops_user_library_mobile",
    ]);
    expect(validateUiVisualSmokeMinimalReport(report, { templateExists: true })).toEqual([]);
  });

  it("keeps chat and navigation out of the default visual smoke lane", () => {
    const report = buildUiVisualSmokeMinimalReport();
    const serializedSurfaces = JSON.stringify(report.surfaces).toLowerCase();

    expect(serializedSurfaces).not.toContain("chat");
    expect(serializedSurfaces).not.toContain("top_nav");
    expect(serializedSurfaces).not.toContain("bottom_nav");
    expect(serializedSurfaces).not.toContain("navbar");
  });

  it("does not pass visual smoke without screenshot or operator confirmation artifacts", () => {
    const report = buildUiVisualSmokeMinimalReport();
    const scoreEvidence = summarizeUiVisualSmokeEvidenceForScore(report);

    expect(scoreEvidence.passed).toBe(false);
    expect(scoreEvidence.status).toBe("missing");
    expect(scoreEvidence.detail).toContain("UI-only");
    expect(scoreEvidence.detail).toContain("user_dashboard_mobile");
    expect(scoreEvidence.evidence).toEqual(expect.arrayContaining([
      "uiVisualSmoke.nonUiLanesBlocked=false",
      "uiVisualSmoke.blocksScoreForUiOnly=true",
    ]));
  });

  it("rejects overclaims, non-UI lanes, and protected chat or navigation surfaces", () => {
    const report = buildUiVisualSmokeMinimalReport();
    const invalid: UiVisualSmokeMinimalReport = {
      ...report,
      passed: true,
      surfaces: [
        {
          ...report.surfaces[0],
          status: "operator_confirmed",
          operatorConfirmed: false,
        },
        {
          ...report.surfaces[1],
          status: "screenshot_attached",
          screenshotArtifactPath: undefined,
        },
        {
          ...report.surfaces[2],
          surfaceId: "telemetry_pipeline",
          route: "agent/state/final-telemetry-closure-lock.generated.json",
        },
        {
          ...report.surfaces[3],
          surfaceId: "chat_mobile",
          route: "/chat",
        },
      ],
    };

    expect(validateUiVisualSmokeMinimalReport(invalid, { templateExists: false })).toEqual(
      expect.arrayContaining([
        expect.stringContaining("cannot pass without every required surface"),
        expect.stringContaining("operator_confirmed but lacks operator confirmation"),
        expect.stringContaining("screenshot_attached but lacks screenshotArtifactPath"),
        expect.stringContaining("non-UI lane"),
        expect.stringContaining("protected chat/nav surface"),
        expect.stringContaining("template.json is missing"),
      ]),
    );
  });

  it("ships the evidence template as a local schema starter, not as proof", () => {
    expect(existsSync("agent/evidence/ui-visual-smoke/template.json")).toBe(true);
  });
});
