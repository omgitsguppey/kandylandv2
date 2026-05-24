import { describe, expect, it } from "vitest";

import { buildTransactionSequenceEvidence, buildTransactionSequenceJourneySummary } from "@/lib/behavioral/transaction-sequence-contract";

describe("transaction sequence journey contract", () => {
  it("builds redacted same-user sequence evidence without claiming causation", () => {
    const sequence = buildTransactionSequenceEvidence({
      previous: {
        id: "reward",
        userId: "tlove81-full-uid",
        type: "daily_reward",
        rewardSource: "check_in",
        amount: 50,
        timestamp: Date.parse("2026-05-24T12:00:00.000Z"),
      },
      current: {
        id: "unlock",
        userId: "tlove81-full-uid",
        type: "unlock_content",
        amount: -1000,
        purchasedAmountSpent: 0,
        rewardAmountSpent: 1000,
        timestamp: Date.parse("2026-05-24T12:00:30.000Z"),
      },
    });

    expect(sequence).toMatchObject({
      sequenceType: "checkin_to_unlock",
      userIdRedacted: "tlov...-uid",
      behavioralInputAllowed: true,
      costGuard: "bounded_compact_summary_only",
      causationClaimAllowed: false,
    });
    expect(sequence?.debugLabel).toContain("Reward unlock spend");
    expect(sequence?.drilldown.fullUserId).toBe("tlove81-full-uid");
  });

  it("feeds user journey with compact bounded summaries only", () => {
    const summary = buildTransactionSequenceJourneySummary({
      transactions: [
        { id: "onboarding", userId: "u123456789", type: "onboarding_reward", amount: 100, timestamp: 1000 },
        { id: "checkin", userId: "u123456789", type: "daily_reward", rewardSource: "check_in", amount: 50, timestamp: 2000 },
        { id: "unlock", userId: "u123456789", type: "unlock_content", amount: -100, rewardAmountSpent: 100, purchasedAmountSpent: 0, timestamp: 3000 },
      ],
    });

    expect(summary.compactOnly).toBe(true);
    expect(summary.rawTransactionFirehoseAllowed).toBe(false);
    expect(summary.sequences.map((entry) => entry.sequenceType)).toEqual(["onboarding_to_checkin", "checkin_to_unlock"]);
  });
});
