import { describe, expect, it } from "vitest";

import {
  buildFreshnessActionList,
  getRefreshCommandForReport,
} from "@/lib/agent-score/freshness-actions";
import {
  describeCommitFreshness,
  describeEvidenceRefreshAction,
  describeFreshnessState,
  describeReportFreshness,
  normalizeTechnicalFreshnessTerms,
} from "@/lib/agent-score/freshness-language";

describe("beta freshness language", () => {
  it("describes source version mismatches without user-facing HEAD language", () => {
    const message = describeCommitFreshness({
      currentHead: "new",
      sourceCommit: "old",
      reportPath: "agent/state/public-beta-score.generated.json",
    });

    expect(message.userTitle).toBe("Evidence needs refresh");
    expect(message.userMessage).toContain("before the latest code changes");
    expect(message.userMessage).toContain("beta source evidence");
    expect(message.userMessage).not.toMatch(/\bHEAD\b|currentHead|sourceCommit/u);
    expect(message.operatorMessage).toContain("latest code version");
    expect(message.operatorMessage).not.toMatch(/\bHEAD\b|currentHead|sourceCommit/u);
    expect(message.technicalDetails.currentHead).toBe("new");
    expect(message.technicalDetails.sourceCommit).toBe("old");
  });

  it("describes stale evidence as outdated evidence", () => {
    const message = describeReportFreshness({
      freshness: "stale",
      ageHours: 48,
      reportPath: "agent/state/current-beta-exit-status.generated.json",
    });

    expect(message.userTitle).toBe("Evidence is outdated");
    expect(message.userMessage).toContain("older than the freshness window");
    expect(message.userMessage).toContain("beta source evidence");
    expect(message.actionLabel).toBe("Refresh evidence");
  });

  it("describes fresh evidence as current", () => {
    const message = describeFreshnessState({
      freshness: "fresh",
      reportPath: "agent/state/evidence-capture-status.generated.json",
    });

    expect(message.userTitle).toBe("Evidence is current");
    expect(message.userMessage).toContain("latest code version");
  });

  it("translates runtime code drift into plain language", () => {
    const message = describeFreshnessState({
      runtimeCodeChangedSinceReport: true,
      reportPath: "agent/state/current-beta-exit-status.generated.json",
    });

    expect(message.userMessage).toContain("new runtime code landed after this report");
    expect(message.userMessage).not.toContain("runtimeCodeChangedSinceReport");
  });

  it("normalizes technical freshness terms in score explanations", () => {
    expect(
      normalizeTechnicalFreshnessTerms(
        "Stale or HEAD-mismatched evidence should regenerate stale generated reports from current HEAD because of a sourceCommit mismatch.",
      ),
    ).toBe(
      "Outdated evidence should refresh outdated generated reports from the latest code version because this report was generated before the latest code changes.",
    );
  });

  it("builds refresh guidance for known reports", () => {
    expect(getRefreshCommandForReport("agent/state/public-beta-score.generated.json")).toEqual({
      reportPath: "agent/state/public-beta-score.generated.json",
      command: "npm run score:beta && npm run check:beta-score",
      actionLabel: "Refresh report",
      actionDetail: "Run npm run score:beta && npm run check:beta-score from the latest code version.",
    });
    expect(buildFreshnessActionList(["agent/state/public-beta-score.generated.json"])[0]?.command)
      .toBe("npm run score:beta && npm run check:beta-score");
  });

  it("returns a safe fallback when no refresh command is registered", () => {
    expect(describeEvidenceRefreshAction({ reportPath: "agent/state/unknown.generated.json" }).actionLabel)
      .toBe("Refresh report");
    expect(getRefreshCommandForReport("agent/state/unknown.generated.json")).toMatchObject({
      actionLabel: "Find validator",
      actionDetail: "No refresh command is registered for this report yet.",
    });
  });
});
