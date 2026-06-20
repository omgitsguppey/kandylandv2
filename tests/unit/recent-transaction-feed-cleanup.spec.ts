import { describe, expect, it } from "vitest";

import { buildRecentTransactionFeedItem, buildRecentTransactionFeedSummary } from "@/lib/debug/recent-transaction-feed-contract";
import { buildAdminAnalyticsRecentCommerceFeedState } from "@/lib/admin-analytics-recent-commerce-feed";

describe("recent transaction feed cleanup", () => {
  it("redacts full UID by default and keeps full UID drilldown-only", () => {
    const item = buildRecentTransactionFeedItem({
      id: "tx1",
      userId: "tlove81-full-uid",
      username: "tlove81",
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      purchasedAmountSpent: 0,
      rewardAmountSpent: 1000,
      sourceTruth: "server",
      timestamp: Date.parse("2026-05-24T12:00:00.000Z"),
    });

    expect(item.userIdRedacted).toBe("tlov...-uid");
    expect(item.defaultVisibleUserId).toBe("tlov...-uid");
    expect(item.fullUidDefaultVisible).toBe(false);
    expect(item.drilldown.fullUserId).toBe("tlove81-full-uid");
    expect(item.sourceClass).toBe("unlock_reward_spend");
  });

  it("shows bounded feed window and source confidence", () => {
    const summary = buildRecentTransactionFeedSummary({
      transactions: [{
        id: "tx1",
        userId: "u1",
        type: "daily_reward",
        rewardSource: "check_in",
        amount: 50,
        status: "completed",
        timestamp: Date.parse("2026-05-24T12:00:00.000Z"),
      }],
      feedWindowLabel: "latest_19_loaded_transactions",
      nowMs: Date.parse("2026-05-24T12:01:00.000Z"),
    });

    expect(summary.loadedCount).toBe(1);
    expect(summary.boundedFeedWindow).toBe("latest_19_loaded_transactions");
    expect(summary.items[0]?.sourceClass).toBe("reward_check_in");
    expect(summary.items[0]?.identityConfidence).toBe("fallback_uid");
  });

  it("keeps analytics commerce rows from displaying generic unknown for exact unlock split", () => {
    const state = buildAdminAnalyticsRecentCommerceFeedState({
      selectedRange: "7d",
      nowMs: Date.parse("2026-05-24T12:00:00.000Z"),
      items: [{
        id: "tx_unlock",
        userId: "tlove81-full-uid",
        username: "tlove81",
        type: "unlock_content",
        amount: -1000,
        status: "completed",
        purchasedAmountSpent: 0,
        rewardAmountSpent: 1000,
        sourceTruth: "server",
        timestamp: Date.parse("2026-05-24T11:59:00.000Z"),
      }],
    });

    expect(state.rows[0]?.sourceOfFunds).toBe("unlock_reward_spend");
    expect(state.rows[0]?.sourceLabel).toBe("Reward unlock spend");
    expect(state.rows[0]?.shortUserId).toBe("tlov...-uid");
    expect(state.rows[0]?.sourceTruth).toBe("server_ledger");
    expect(state.rows[0]?.freshnessState).toBe("source_current");
    expect(state.rows[0]?.evidenceKind).toBe("observed");
    expect(state.rows[0]?.productTruthEligible).toBe(true);
    expect(state.rows[0]?.missingVsZeroState).toBe("source_present");
    expect(state.sourceTruth).toBe("server_ledger");
    expect(state.freshnessState).toBe("source_current");
  });

  it("keeps missing commerce source metadata distinct from zero or healthy server truth", () => {
    const state = buildAdminAnalyticsRecentCommerceFeedState({
      selectedRange: "7d",
      nowMs: Date.parse("2026-05-24T12:00:00.000Z"),
      items: [{
        id: "tx_unknown",
        userId: "tlove81-full-uid",
        username: "tlove81",
        type: "unlock_content",
        amount: -1000,
        status: "completed",
        sourceTruth: "server",
        timestamp: Date.parse("2026-05-24T11:59:00.000Z"),
      }],
    });

    expect(state.rows[0]?.sourceOfFunds).toBe("unknown_missing_metadata");
    expect(state.rows[0]?.sourceTruth).toBe("source_missing");
    expect(state.rows[0]?.freshnessState).toBe("source_missing");
    expect(state.rows[0]?.evidenceKind).toBe("missing");
    expect(state.rows[0]?.productTruthEligible).toBe(false);
    expect(state.rows[0]?.missingVsZeroState).toBe("source_missing");
    expect(state.sourceTruth).toBe("source_missing");
    expect(state.freshnessState).toBe("source_missing");
  });
});
