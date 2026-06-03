import { describe, expect, it } from "vitest";

import {
  validateSourceTruthAuthorityMapReport,
  type SourceTruthAuthorityMapReport,
} from "../../scripts/agent/validate-source-truth-authority-map";

function reportFixture(overrides: Partial<SourceTruthAuthorityMapReport> = {}): SourceTruthAuthorityMapReport {
  const report: SourceTruthAuthorityMapReport = {
    generatedAtUtc: "2026-05-17T06:30:00.000Z",
    reportKey: "source-truth-authority-map",
    currentHead: "head",
    summary: {
      activeLanes: 12,
      supportingLanes: 6,
      retiredLanes: 3,
      archiveOnlyLanes: 2,
      staleLanes: 0,
      betaBlockingLanes: 8,
      costReadinessLanes: 4,
      retiredLaunchArtifacts: 3,
      sameCommitReleaseNotes: true,
      p0Count: 0,
      p1Count: 0,
      p2Count: 4,
    },
    lanes: [
      {
        id: "current-operator-doctrine",
        label: "Current operator doctrine",
        authorityDoc: "docs/agent-truth/current-operator-doctrine.md",
        generatedArtifact: "agent/state/source-truth-authority-map.generated.json",
        validator: "npm run check:source-truth-authority-map",
        status: "active",
        owner: "repo-doctrine",
        refreshCommand: "npm run check:source-truth-authority-map",
        betaBlocking: false,
        notes: ["Doctrine wins over stale generated reports."],
      },
      {
        id: "release-notes-same-commit",
        label: "Release notes same-commit doctrine",
        authorityDoc: "docs/agent-truth/public-beta-release-notes.md",
        generatedArtifact: "public/kandydrops-release-notes.json",
        validator: "npm run check:release-notes",
        status: "active",
        owner: "release-notes",
        refreshCommand: "npm run release:notes && npm run check:release-notes",
        betaBlocking: true,
        notes: ["Patch notes are same-commit artifacts."],
      },
      {
        id: "cloud-run-cost-readiness",
        label: "Cloud Run cost readiness",
        authorityDoc: "docs/agent-truth/beta-score-cleanup.md",
        generatedArtifact: "agent/state/beta-score-cleanup.generated.json",
        validator: "npm run check:beta-score-cleanup",
        status: "supporting",
        owner: "cost-readiness",
        refreshCommand: "npm run score:beta && npm run check:beta-score-cleanup",
        betaBlocking: false,
        notes: ["config_not_in_repo or cost_review_required is not a pass."],
      },
      {
        id: "cloud-sql-cost-readiness",
        label: "Cloud SQL cost readiness",
        authorityDoc: "docs/agent-truth/beta-score-cleanup.md",
        generatedArtifact: "agent/state/beta-score-cleanup.generated.json",
        validator: "npm run check:beta-score-cleanup",
        status: "supporting",
        owner: "cost-readiness",
        refreshCommand: "npm run score:beta && npm run check:beta-score-cleanup",
        betaBlocking: false,
        notes: ["not_detected_in_repo is source inventory, not pass."],
      },
      {
        id: "gemini-cloud-assist-cost-readiness",
        label: "Gemini and Cloud Assist cost readiness",
        authorityDoc: "docs/agent-truth/beta-score-cleanup.md",
        generatedArtifact: "agent/state/beta-score-cleanup.generated.json",
        validator: "npm run check:beta-score-cleanup",
        status: "supporting",
        owner: "cost-readiness",
        refreshCommand: "npm run score:beta && npm run check:beta-score-cleanup",
        betaBlocking: false,
        notes: ["Owner-review AI inventory is not a pass."],
      },
      {
        id: "route-4xx-readiness",
        label: "Route 4xx readiness",
        authorityDoc: "docs/agent-truth/beta-score-cleanup.md",
        generatedArtifact: "agent/state/beta-score-cleanup.generated.json",
        validator: "npm run check:beta-score-cleanup",
        status: "supporting",
        owner: "cost-readiness",
        refreshCommand: "npm run check:creator-dashboard-error-cost-inventory",
        betaBlocking: false,
        notes: ["Expected product 4xx is distinct from unexpected route errors."],
      },
    ],
    retiredArtifacts: [
      {
        artifact: "agent/state/final-launch-readiness-report.generated.json",
        status: "retired",
        reason: "Superseded by evidence capture and current beta exit status.",
        supersededBy: "agent/state/evidence-capture-status.generated.json",
        betaBlocking: false,
      },
      {
        artifact: "agent/state/launch-readiness-report.generated.json",
        status: "retired",
        reason: "Superseded by current beta exit status.",
        supersededBy: "agent/state/current-beta-exit-status.generated.json",
        betaBlocking: false,
      },
      {
        artifact: "agent/state/launch-pr-triage.generated.json",
        status: "retired",
        reason: "Legacy PR triage is archive evidence.",
        supersededBy: "docs/agent-truth/source-truth-authority-map.md",
        betaBlocking: false,
      },
    ],
    costReadiness: {
      cloudRunCostReadiness: "cost_review_required",
      cloudSqlCostReadiness: "not_detected_in_repo",
      geminiCloudAssistCostReadiness: "cost_review_required",
      route4xxReadiness: "source_inventory_complete",
    },
    memoryRules: [
      "Beta badge / patch notes must be included in the same commit as the real patch.",
      "Cloud Run, Cloud SQL, Gemini/Cloud Assist, and 4xx cost checks are evidence/inventory lanes unless source code proves active usage or P0/P1 risk.",
    ],
    currentHeadChecks: [
      {
        artifact: "agent/state/final-launch-readiness-report.generated.json",
        currentHead: "old",
        status: "not_required",
        action: "retired artifact does not block beta score.",
      },
    ],
    fixesApplied: ["Created source-truth authority map."],
    nextExactSteps: ["Keep evidence lanes current through their named validators."],
  };

  return {
    ...report,
    ...overrides,
    summary: {
      ...report.summary,
      ...overrides.summary,
    },
  };
}

describe("source truth authority map validator", () => {
  it("accepts a report with required authority, retired launch, release-note, and cost lanes", () => {
    expect(validateSourceTruthAuthorityMapReport(reportFixture(), "head")).toEqual([]);
  });

  it("fails when an active lane lacks required authority fields", () => {
    const report = reportFixture({
      lanes: [
        {
          ...reportFixture().lanes[0],
          authorityDoc: "",
        },
      ],
    });

    expect(validateSourceTruthAuthorityMapReport(report, "head")).toContain(
      "active lane current-operator-doctrine lacks authorityDoc/generatedArtifact/validator.",
    );
  });

  it("fails when retired launch artifacts still block beta score", () => {
    const report = reportFixture({
      retiredArtifacts: [
        {
          ...reportFixture().retiredArtifacts[0],
          betaBlocking: true,
        },
      ],
    });

    expect(validateSourceTruthAuthorityMapReport(report, "head")).toContain(
      "retired artifact agent/state/final-launch-readiness-report.generated.json must not block beta score.",
    );
  });

  it("fails when same-commit release-note doctrine is missing", () => {
    const report = reportFixture({
      summary: {
        ...reportFixture().summary,
        sameCommitReleaseNotes: false,
      },
      memoryRules: ["Release-note-only recovery commits must use [skip release-notes]."],
    });

    expect(validateSourceTruthAuthorityMapReport(report, "head")).toContain(
      "same-commit release note rule missing.",
    );
  });

  it("fails when cost readiness lanes are missing", () => {
    const report = reportFixture({
      lanes: reportFixture().lanes.filter((lane) => lane.id !== "cloud-sql-cost-readiness"),
    });

    expect(validateSourceTruthAuthorityMapReport(report, "head")).toContain(
      "cost readiness lanes missing.",
    );
  });

  it("fails when currentHead mismatch is unreported", () => {
    const report = reportFixture({
      currentHeadChecks: [],
    });

    expect(validateSourceTruthAuthorityMapReport(report, "head")).toContain(
      "currentHead mismatch inventory must be represented.",
    );
  });
});
