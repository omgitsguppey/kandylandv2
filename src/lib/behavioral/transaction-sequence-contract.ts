import { classifyTransactionSourceOfFunds } from "@/lib/commerce/transaction-source-of-funds-contract";
import type { RecentTransactionFeedInput } from "@/lib/debug/recent-transaction-feed-contract";

export type TransactionSequenceType =
  | "onboarding_to_checkin"
  | "checkin_to_unlock"
  | "reward_to_unlock"
  | "unlock_to_checkin"
  | "reward_to_feedback"
  | "purchase_to_unlock"
  | "unlock_to_watch"
  | "unknown_sequence";

export type TransactionSequenceEvidence = {
  userIdRedacted: string;
  sequenceId: string;
  sequenceType: TransactionSequenceType;
  previousTransactionType: string;
  currentTransactionType: string;
  deltaSeconds: number;
  sourceClasses: string[];
  journeyMeaning: string;
  confidence: "high" | "medium" | "low";
  debugLabel: string;
  behavioralInputAllowed: true;
  causationClaimAllowed: false;
  costGuard: "bounded_compact_summary_only";
  drilldown: {
    fullUserId?: string;
    drilldownOnly: true;
  };
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function timestampMs(input: RecentTransactionFeedInput) {
  const timestamp = typeof input.timestamp === "number" && Number.isFinite(input.timestamp) ? input.timestamp : 0;
  const timestampMs = typeof input.timestampMs === "number" && Number.isFinite(input.timestampMs) ? input.timestampMs : 0;
  return Math.max(timestamp, timestampMs);
}

function isCheckIn(input: RecentTransactionFeedInput) {
  return input.type === "daily_reward" && input.rewardSource === "check_in";
}

function isReward(input: RecentTransactionFeedInput) {
  return input.type === "daily_reward" || input.type === "onboarding_reward" || input.type === "referral_bonus";
}

function classifySequence(previous: RecentTransactionFeedInput, current: RecentTransactionFeedInput): TransactionSequenceType {
  if (previous.type === "onboarding_reward" && isCheckIn(current)) return "onboarding_to_checkin";
  if (isCheckIn(previous) && current.type === "unlock_content") return "checkin_to_unlock";
  if (isReward(previous) && current.type === "unlock_content") return "reward_to_unlock";
  if (previous.type === "unlock_content" && isCheckIn(current)) return "unlock_to_checkin";
  if (isReward(previous) && cleanText(current.description).toLowerCase().includes("feedback")) return "reward_to_feedback";
  if (previous.type === "purchase_currency" && current.type === "unlock_content") return "purchase_to_unlock";
  return "unknown_sequence";
}

export function buildTransactionSequenceEvidence(input: {
  previous: RecentTransactionFeedInput;
  current: RecentTransactionFeedInput;
}): TransactionSequenceEvidence | null {
  const previousUser = cleanText(input.previous.userId);
  const currentUser = cleanText(input.current.userId);
  if (!previousUser || previousUser !== currentUser) return null;

  const previousAt = timestampMs(input.previous);
  const currentAt = timestampMs(input.current);
  const deltaSeconds = previousAt > 0 && currentAt > 0 ? Math.max(0, Math.round((currentAt - previousAt) / 1000)) : 0;
  const previousSource = classifyTransactionSourceOfFunds({ ...input.previous, transactionId: input.previous.transactionId ?? input.previous.id });
  const currentSource = classifyTransactionSourceOfFunds({ ...input.current, transactionId: input.current.transactionId ?? input.current.id });
  const sequenceType = classifySequence(input.previous, input.current);
  const confidence = sequenceType === "unknown_sequence" ? "low" : deltaSeconds <= 600 ? "high" : "medium";

  return {
    userIdRedacted: currentSource.userIdRedacted,
    sequenceId: `${cleanText(input.previous.id ?? input.previous.transactionId, "previous")}__${cleanText(input.current.id ?? input.current.transactionId, "current")}`,
    sequenceType,
    previousTransactionType: cleanText(input.previous.type, "unknown"),
    currentTransactionType: cleanText(input.current.type, "unknown"),
    deltaSeconds,
    sourceClasses: [previousSource.sourceClass, currentSource.sourceClass],
    journeyMeaning: sequenceType === "unknown_sequence" ? "Same-user commerce sequence; no canonical journey meaning assigned." : "Same-user commerce sequence for bounded journey evidence.",
    confidence,
    debugLabel: `${previousSource.displayLabel} -> ${currentSource.displayLabel}`,
    behavioralInputAllowed: true,
    causationClaimAllowed: false,
    costGuard: "bounded_compact_summary_only",
    drilldown: {
      fullUserId: currentUser,
      drilldownOnly: true,
    },
  };
}

export function buildTransactionSequenceJourneySummary(input: {
  transactions: RecentTransactionFeedInput[];
}) {
  const ordered = [...input.transactions].sort((left, right) => timestampMs(left) - timestampMs(right));
  const sequences: TransactionSequenceEvidence[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const sequence = buildTransactionSequenceEvidence({
      previous: ordered[index - 1]!,
      current: ordered[index]!,
    });
    if (sequence) sequences.push(sequence);
  }
  return {
    compactOnly: true,
    rawTransactionFirehoseAllowed: false,
    sequences,
  };
}
