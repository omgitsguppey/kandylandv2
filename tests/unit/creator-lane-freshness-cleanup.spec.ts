// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyCreatorLaneFreshness } from "../../src/lib/creator/creator-lane-freshness-status";
import { buildCreatorLaneFreshnessCleanupReport, validateCreatorLaneFreshnessCleanupReport } from "../../scripts/agent/debug-cockpit-batch14-shared";

import { DebugCreatorLane } from "@/app/admin/debug/components/DebugCreatorLane";
import { ADMIN_NO_SOURCE_LABEL } from "@/lib/admin-truth-state";
import { buildCreatorOnboardingDiagnostics } from "@/lib/server/creator-onboarding-diagnostics";

const provider = vi.hoisted(() => ({
  collection: vi.fn(() => { throw new Error("Creator source presentation tests must not read provider state."); }),
}));
vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: provider }));

function emptySource() {
  return buildCreatorOnboardingDiagnostics({
    users: [], onboardingRecords: [], queueRecords: [], historyRecords: [], creatorExperienceRecords: [],
  });
}
function dataWithIssue() {
  return buildCreatorOnboardingDiagnostics({
    users: [],
    onboardingRecords: [{
      userId: "controlled_creator", creatorDisplayName: "Controlled Creator", signupType: "creator",
      submissionStatus: "awaiting_manual_review", approvalStatus: "creator_pending",
    }],
    queueRecords: [], historyRecords: [], creatorExperienceRecords: [],
  });
}

describe("Creator Lane loaded source admission", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    provider.collection.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    expect(provider.collection).not.toHaveBeenCalled();
  });
  function render(data: unknown) {
    act(() => root.render(createElement(DebugCreatorLane, { data })));
  }
  function assertMissing() {
    expect(container.textContent).toContain(ADMIN_NO_SOURCE_LABEL);
    expect(container.querySelector("[data-creator-lane-status='source_missing']")).not.toBeNull();
    expect(container.querySelector("[data-admin-truth-state='unavailable']")).not.toBeNull();
    expect(container.querySelector("[data-admin-truth-state='live']")).toBeNull();
    expect(container.textContent).not.toContain("No action needed.");
    expect(container.textContent).not.toContain("No creator onboarding anomalies are currently detected.");
    expect(container.textContent).not.toContain("Source snapshots loaded");
    expect(container.querySelector("[data-creator-lane-generated-at-utc]")).toBeNull();
    expect(container.querySelector("[data-creator-lane-mismatch-count]")).toBeNull();
  }

  it.each([
    ["initial read has no data", () => undefined],
    ["explicit missing response", () => null],
    ["successful default summary defers Creator diagnostics", () => ({
      success: true, section: "summary", truthState: "deferred", deferredSections: ["onboarding history"],
    })],
    ["diagnostics group is absent", () => ({ creatorOnboardingDiagnostics: {} })],
    ["source snapshots are absent", () => {
      const diagnostics = emptySource();
      return { creatorOnboardingDiagnostics: { ...diagnostics, creatorLaneDebug: { ...diagnostics.creatorLaneDebug, sourceSnapshots: undefined } } };
    }],
    ["issue total is absent", () => {
      const diagnostics = emptySource();
      return { creatorOnboardingDiagnostics: { ...diagnostics, summary: { ...diagnostics.summary, totalIssues: undefined } } };
    }],
    ["issues source is absent", () => ({ creatorOnboardingDiagnostics: { ...emptySource(), issues: undefined } })],
    ["parity classification is absent", () => {
      const diagnostics = emptySource();
      return { creatorOnboardingDiagnostics: { ...diagnostics, creatorLaneDebug: { ...diagnostics.creatorLaneDebug, parityStatus: undefined } } };
    }],
    ["history count is absent from both canonical fields", () => {
      const diagnostics = emptySource();
      return { creatorOnboardingDiagnostics: {
        ...diagnostics,
        summary: { ...diagnostics.summary, historyCoverageIssueCount: undefined },
        creatorLaneDebug: { ...diagnostics.creatorLaneDebug, report: { ...diagnostics.creatorLaneDebug.report, historyGapCount: undefined } },
      } };
    }],
    ["a visible source count has the wrong type", () => {
      const diagnostics = emptySource();
      return { creatorOnboardingDiagnostics: { ...diagnostics, creatorLaneDebug: { ...diagnostics.creatorLaneDebug, sourceSnapshots: { ...diagnostics.creatorLaneDebug.sourceSnapshots, onboardingCount: "0" } } } };
    }],
    ["a visible source count is negative", () => {
      const diagnostics = emptySource();
      return { creatorOnboardingDiagnostics: { ...diagnostics, creatorLaneDebug: { ...diagnostics.creatorLaneDebug, sourceSnapshots: { ...diagnostics.creatorLaneDebug.sourceSnapshots, reviewQueueCount: -1 } } } };
    }],
  ] as const)("does not invent healthy zeroes when %s", (_title, makeData) => {
    render(makeData());
    assertMissing();
  });

  it("preserves producer-backed empty source counts and missing materializer status", () => {
    const diagnostics = emptySource();
    expect(diagnostics.summary.totalIssues).toBe(0);
    expect(diagnostics.creatorLaneDebug.report.status).toBe("review");
    render({ creatorOnboardingDiagnostics: diagnostics });
    expect(container.querySelector("[data-creator-lane-status='source_missing']")).toBeNull();
    expect(container.querySelector("[data-creator-lane-status]")?.getAttribute("data-creator-lane-status")).toBe(diagnostics.creatorLaneDebug.report.status);
    expect(container.querySelector("[data-creator-lane-mismatch-count]")?.getAttribute("data-creator-lane-mismatch-count")).toBe("0");
    expect(container.textContent).toContain("0 queue entries, 0 user projections.");
    expect(container.textContent).toContain("Materializer has no recorded completion timestamp.");
    expect(container.textContent).toContain("No creator onboarding anomalies are currently detected.");
  });

  it("keeps actual produced issue count, evidence and linked repair action", () => {
    const diagnostics = dataWithIssue();
    expect(diagnostics.summary.totalIssues).toBeGreaterThan(0);
    render({ creatorOnboardingDiagnostics: diagnostics });
    expect(container.querySelector("[data-creator-lane-status='source_missing']")).toBeNull();
    expect(container.querySelector("[data-creator-lane-status]")?.getAttribute("data-creator-lane-status")).toBe(diagnostics.creatorLaneDebug.report.status);
    expect(container.querySelector("[data-creator-lane-mismatch-count]")?.getAttribute("data-creator-lane-mismatch-count")).toBe(String(diagnostics.creatorLaneDebug.report.mismatches.length));
    for (const issue of diagnostics.issues.slice(0, 12)) {
      expect(container.textContent).toContain(issue.message);
      expect(container.textContent).toContain(issue.detail);
      expect(Array.from(container.querySelectorAll("a")).some(link => link.getAttribute("href") === issue.link)).toBe(true);
    }
    expect(container.querySelector("details")).not.toBeNull();
  });

  it("restores actual data after missing source and removes it again when the source is absent", () => {
    render({ success: true, section: "summary", truthState: "deferred" });
    assertMissing();
    const diagnostics = dataWithIssue();
    render({ creatorOnboardingDiagnostics: diagnostics });
    expect(container.textContent).toContain(diagnostics.issues[0].message);
    expect(container.querySelector("[data-creator-lane-status='source_missing']")).toBeNull();
    render(undefined);
    assertMissing();
    expect(container.textContent).not.toContain(diagnostics.issues[0].message);
    render({ creatorOnboardingDiagnostics: diagnostics });
    expect(container.textContent).toContain(diagnostics.issues[0].message);
  });
});

describe("creator lane freshness cleanup", () => {
  it("keeps parity separate from missing materializer freshness", () => {
    const status = classifyCreatorLaneFreshness({
      parityStatus: "ok",
      issueCount: 0,
      historyGapCount: 0,
      freshness: "not_recorded",
      sourceSnapshotCount: 0,
      lastMaterializedAtUtc: null,
      sourceWindowProvesZero: false,
    });

    expect(status.freshnessStatus).toBe("source_ready_no_sample_loaded");
    expect(status.materializerStatus).toBe("materializer_completion_missing");
    expect(status.displayAsNoActionNeeded).toBe(false);
    expect(status.nextAction).toContain("materializer");
  });

  it("writes a report that does not claim full freshness without a timestamp", () => {
    const report = buildCreatorLaneFreshnessCleanupReport();

    expect(report.creatorLaneFreshnessAfter).toBe("source_ready_no_sample_loaded");
    expect(report.creatorLaneMaterializerStatus).toBe("materializer_completion_missing");
    expect(validateCreatorLaneFreshnessCleanupReport(report)).toEqual([]);
  });
});
