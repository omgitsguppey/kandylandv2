import { describe, expect, it } from "vitest";

import {
  LEGACY_NORMALIZATION_DOMAINS,
  type LegacyNormalizationDomain,
} from "@/lib/legacy/legacy-normalization-contract";
import {
  MARCH_FIRST_RECOVERY_START_DATE,
  buildMarchFirstLegacyNormalizationPlan,
} from "@/lib/legacy/march-first-recovery-plan";

describe("March 1 legacy normalization plan", () => {
  it("normalizes March 1+ legacy records with confidence, duplicate risk, and no current-truth promotion", () => {
    const plan = buildMarchFirstLegacyNormalizationPlan({
      records: [
        {
          legacyId: "before-start",
          legacyDomain: "behavior_events",
          legacySource: "analytics_event_facts",
          timestampMs: Date.parse("2026-02-28T23:59:59.000Z"),
          fields: { eventName: "page_view", session_id: "session-old" },
        },
        {
          legacyId: "guest-session",
          legacyDomain: "guest_sessions",
          legacySource: "analytics_guest_batches",
          timestampMs: Date.parse("2026-03-01T00:00:00.000Z"),
          fields: { session_id: "session-1", anonymous_visitor_id: "guest-1", route: "/drops" },
        },
        {
          legacyId: "linked-user",
          legacyDomain: "identity_links",
          legacySource: "analytics_identity_links",
          timestampMs: Date.parse("2026-03-02T00:00:00.000Z"),
          fields: { user_id: "user-1", anonymous_visitor_id: "guest-1", session_id: "session-1" },
        },
        {
          legacyId: "legacy-unknown",
          legacyDomain: "behavior_events",
          legacySource: "analytics_event_facts",
          timestampMs: Date.parse("2026-03-03T00:00:00.000Z"),
          fields: { eventName: "mystery_interaction" },
        },
        {
          legacyId: "purchase-ledger",
          legacyDomain: "purchases_gumdrop_ledger_references",
          legacySource: "transactions",
          timestampMs: Date.parse("2026-03-04T00:00:00.000Z"),
          fields: { transaction_id: "txn-1", user_id: "user-1", gumdrops_amount: 100 },
        },
      ],
    });

    expect(MARCH_FIRST_RECOVERY_START_DATE).toBe("2026-03-01");
    expect(plan.mode).toBe("dry_run_only");
    expect(plan.readsProduction).toBe(false);
    expect(plan.liveBackfill).toBe(false);
    expect(plan.mutationsAllowed).toBe(false);
    expect(plan.records).toHaveLength(4);

    expect(plan.records.find((record) => record.legacyId === "guest-session")).toMatchObject({
      currentCategory: "guest_session",
      confidence: "probable",
      duplicateRisk: "medium",
      action: "normalize_candidate",
      currentTruthEligible: false,
    });
    expect(plan.records.find((record) => record.legacyId === "linked-user")).toMatchObject({
      currentCategory: "identity_link",
      confidence: "probable",
      action: "link_candidate",
      currentTruthEligible: false,
    });
    expect(plan.records.find((record) => record.legacyId === "legacy-unknown")).toMatchObject({
      currentCategory: "unknown",
      confidence: "unknown",
      duplicateRisk: "high",
      action: "archive_only",
      currentTruthEligible: false,
    });
    expect(plan.records.find((record) => record.legacyId === "purchase-ledger")).toMatchObject({
      currentCategory: "purchase_ledger_reference",
      action: "needs_manual_review",
      readOnly: true,
      mutationBlockedReason: "purchase_gumdrop_ledger_read_only",
      currentTruthEligible: false,
    });
    expect(plan.summary.currentTruthEligibleCount).toBe(0);
    expect(plan.debugBacklogIssues).toContainEqual(expect.objectContaining({
      source: "evidence",
      fixClass: "evidence_refresh",
      sourceRoute: "legacy://march-first-normalization",
    }));
  });

  it("declares every requested legacy domain exactly once", () => {
    const expected: LegacyNormalizationDomain[] = [
      "guest_sessions",
      "user_sessions",
      "identity_links",
      "behavior_events",
      "watch_sessions",
      "drops",
      "creator_profile_views",
      "fan_pass_subscriptions",
      "creator_broadcasts",
      "purchases_gumdrop_ledger_references",
      "admin_truth_samples",
    ];

    expect(LEGACY_NORMALIZATION_DOMAINS).toEqual(expected);
  });
});
