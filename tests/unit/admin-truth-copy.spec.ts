import { describe, expect, it } from "vitest";

import {
  ADMIN_OPERATOR_BADGE_LABELS,
} from "@/lib/admin/copy/admin-copy-registry";
import {
  buildAdminDebugExplanation,
  buildDeveloperDebugCopy,
  buildOperatorStatusCopy,
  getAdminStatusBadgeLabel,
  summarizeAdminIssueForOperator,
} from "@/lib/admin/copy/admin-truth-copy";

const BANNED_MAIN_COPY = [
  "failed closed",
  "polled route snapshot",
  "realtime lane",
  "observer",
  "canonical rollup",
  "canonical authenticated events",
  "canonical event samples",
  "analytics_aggregate",
  "truth score",
  "pipeline health fail",
  "module coverage fail",
  "stale validated backend cache",
];

function expectOperatorCopyIsPlain(...values: string[]) {
  const combined = values.join(" ").toLowerCase();
  for (const phrase of BANNED_MAIN_COPY) {
    expect(combined).not.toContain(phrase);
  }
}

describe("admin truth copy", () => {
  it("translates realtime failures into operator copy", () => {
    const copy = buildOperatorStatusCopy({
      moduleKey: "admin_analytics",
      technicalState: "realtime_listener_failed",
      sourceName: "analytics_aggregate_stats/realtime_summary",
    });

    expect(copy.headline).toBe("Live updates are delayed.");
    expect(copy.shortBody).toBe("Verified snapshot shown.");
    expect(copy.technicalDetails).toContain("analytics_aggregate_stats/realtime_summary");
    expectOperatorCopyIsPlain(copy.headline, copy.shortBody);
  });

  it("translates snapshot and stale states into last verified data copy", () => {
    const copy = buildOperatorStatusCopy({
      sourceMode: "fallback",
      truthState: "stale",
      staleReason: "stale validated backend cache",
    });

    expect(copy.headline).toBe("Verified snapshot shown.");
    expect(copy.shortBody).toContain("next refresh");
    expectOperatorCopyIsPlain(copy.headline, copy.shortBody);
  });

  it("translates guest estimates without exposing batch jargon in the headline", () => {
    const copy = buildOperatorStatusCopy({
      sourceMode: "estimated",
      estimatedReason: "anonymous guest batches missing",
    });

    expect(copy.headline).toBe("Guest traffic is estimated.");
    expect(copy.badgeLabel).toBe("EST");
    expectOperatorCopyIsPlain(copy.headline);
  });

  it("maps purchase and unlock parity mismatches to review copy", () => {
    expect(buildOperatorStatusCopy({ technicalState: "purchase_parity_mismatch" }).headline)
      .toBe("Purchase tracking needs review.");
    expect(buildOperatorStatusCopy({ technicalState: "unlock_parity_mismatch" }).headline)
      .toBe("Unlock tracking needs review.");
  });

  it("summarizes missing samples in plain English", () => {
    expect(summarizeAdminIssueForOperator("0 canonical event samples missing for range"))
      .toBe("No sample is available for this range.");
  });

  it("uses plain review copy for unclassified admin issues", () => {
    expect(summarizeAdminIssueForOperator("unclassified source issue"))
      .toBe("Needs review.");
  });

  it("preserves developer details for Debug", () => {
    const debug = buildDeveloperDebugCopy({
      technicalState: "purchase_parity_mismatch",
      collectionName: "analytics_aggregate_stats",
      debugDetails: { transactions: 19, telemetry: 1, confidence: 43 },
    });

    expect(debug).toContain("purchase_parity_mismatch");
    expect(debug).toContain("analytics_aggregate_stats");
    expect(debug).toContain("transactions");
  });

  it("builds deterministic Debug explanation fields", () => {
    const explanation = buildAdminDebugExplanation({
      technicalState: "purchase_parity_mismatch",
      sourceName: "transactions + commerce_rollups + telemetry_purchase_events",
      recommendedAction: "Check purchase event emission after PayPal confirmation.",
    });

    expect(explanation.operatorSummary).toContain("Purchase tracking needs review.");
    expect(explanation.technicalEvidence).toContain("purchase_parity_mismatch");
    expect(explanation.recommendedNextCheck).toContain("purchase event emission");
  });

  it("keeps badge labels on the approved operator set", () => {
    const labels = [
      getAdminStatusBadgeLabel({ technicalState: "realtime_listener_failed" }),
      getAdminStatusBadgeLabel({ technicalState: "purchase_parity_mismatch" }),
      getAdminStatusBadgeLabel({ sourceMode: "estimated" }),
      getAdminStatusBadgeLabel("fallback"),
      getAdminStatusBadgeLabel("stale"),
    ];

    for (const label of labels) {
      expect(ADMIN_OPERATOR_BADGE_LABELS).toContain(label);
    }
  });

  it("shortens long technical reasons for operator copy", () => {
    const copy = buildOperatorStatusCopy({
      technicalState: "debug_only",
      operatorImpact: "Realtime analytics observers failed closed because analytics_aggregate_stats/realtime_summary could not be opened and the polled route snapshot had a stale validated backend cache.",
    });

    expect(copy.headline.length).toBeLessThanOrEqual(90);
    expectOperatorCopyIsPlain(copy.shortBody);
  });
});
