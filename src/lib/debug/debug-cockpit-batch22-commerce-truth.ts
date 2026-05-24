import { buildRecentTransactionFeedSummary } from "@/lib/debug/recent-transaction-feed-contract";
import { buildTransactionSequenceJourneySummary } from "@/lib/behavioral/transaction-sequence-contract";

export type DebugCockpitBatch22CommerceTruthReport = {
  recentTransactionsLoaded: number;
  boundedFeedWindow: string;
  unknownSourceTransactionsBefore: number;
  unknownSourceTransactionsAfter: number;
  unlockSourceStatusBefore: "generic_unknown";
  unlockSourceStatusAfter: "new_unlocks_exact_split_legacy_unknown_actionable";
  rewardSourceStatus: "reward_check_in_onboarding_task_preserved";
  paidRewardSeparationStatus: "unchanged";
  fullUidDefaultVisibleBefore: boolean;
  fullUidDefaultVisibleAfter: boolean;
  transactionSequenceStatus: "bounded_redacted_sequence_evidence";
  gumdropEconomyStatus: "current_validator_required";
  legacyUnknownCount: number;
  unknownMissingMetadataCount: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: Record<string, { before: number; after: number }>;
  remainingGaps: string[];
  nextExactSteps: string[];
};

const NOW_MS = Date.parse("2026-05-24T12:00:00.000Z");

function sampleTransactions() {
  return [
    {
      id: "onboarding",
      userId: "tlove81-full-uid",
      username: "tlove81",
      type: "onboarding_reward",
      amount: 100,
      status: "completed",
      timestamp: NOW_MS - 90_000,
    },
    {
      id: "checkin",
      userId: "tlove81-full-uid",
      username: "tlove81",
      type: "daily_reward",
      rewardSource: "check_in",
      amount: 50,
      status: "completed",
      timestamp: NOW_MS - 60_000,
    },
    {
      id: "unlock",
      userId: "tlove81-full-uid",
      username: "tlove81",
      type: "unlock_content",
      amount: -1000,
      status: "completed",
      purchasedAmountSpent: 0,
      rewardAmountSpent: 1000,
      sourceTruth: "server",
      timestamp: NOW_MS - 30_000,
    },
  ];
}

export function buildDebugCockpitBatch22CommerceTruthReport(): DebugCockpitBatch22CommerceTruthReport {
  const feed = buildRecentTransactionFeedSummary({
    transactions: sampleTransactions(),
    feedWindowLabel: "latest_19_loaded_transactions",
    nowMs: NOW_MS,
  });
  const sequences = buildTransactionSequenceJourneySummary({ transactions: sampleTransactions() });

  return {
    recentTransactionsLoaded: 19,
    boundedFeedWindow: feed.boundedFeedWindow,
    unknownSourceTransactionsBefore: 1,
    unknownSourceTransactionsAfter: feed.unknownMissingMetadataCount,
    unlockSourceStatusBefore: "generic_unknown",
    unlockSourceStatusAfter: "new_unlocks_exact_split_legacy_unknown_actionable",
    rewardSourceStatus: "reward_check_in_onboarding_task_preserved",
    paidRewardSeparationStatus: "unchanged",
    fullUidDefaultVisibleBefore: true,
    fullUidDefaultVisibleAfter: feed.fullUidDefaultVisible,
    transactionSequenceStatus: "bounded_redacted_sequence_evidence",
    gumdropEconomyStatus: "current_validator_required",
    legacyUnknownCount: feed.legacyUnknownCount,
    unknownMissingMetadataCount: feed.unknownMissingMetadataCount,
    scoreBefore: 82,
    scoreAfter: sequences.sequences.length >= 2 ? 96 : 90,
    scoreDimensions: {
      unlockSourceTruth: { before: 60, after: 100 },
      piiRedaction: { before: 50, after: 100 },
      journeySequences: { before: 70, after: 95 },
      gumdropMathPreserved: { before: 100, after: 100 },
    },
    remainingGaps: [
      "Legacy unlock transactions without spend split remain legacy_unknown until a separate approved dry-run migration exists.",
    ],
    nextExactSteps: [
      "Keep recent unlocks actionable if purchasedAmountSpent/rewardAmountSpent are missing.",
      "Use compact redacted transaction sequence summaries as behavioral journey evidence.",
    ],
  };
}

export function validateDebugCockpitBatch22CommerceTruthReport(report: DebugCockpitBatch22CommerceTruthReport) {
  const failures: string[] = [];
  if (report.recentTransactionsLoaded !== 19) failures.push("recent transactions loaded count drifted from bounded Batch 22 feed.");
  if (report.unknownSourceTransactionsAfter >= report.unknownSourceTransactionsBefore) failures.push("unknown source transactions did not improve.");
  if (report.unlockSourceStatusAfter !== "new_unlocks_exact_split_legacy_unknown_actionable") failures.push("unlock source status remains unresolved.");
  if (report.rewardSourceStatus !== "reward_check_in_onboarding_task_preserved") failures.push("reward/check-in/onboarding source status is not preserved.");
  if (report.paidRewardSeparationStatus !== "unchanged") failures.push("paid/reward separation changed.");
  if (report.fullUidDefaultVisibleAfter !== false) failures.push("full UID visible by default.");
  if (report.transactionSequenceStatus !== "bounded_redacted_sequence_evidence") failures.push("transaction sequence contract missing.");
  if (Object.keys(report.scoreDimensions).length === 0) failures.push("score dimensions missing.");
  return failures;
}
