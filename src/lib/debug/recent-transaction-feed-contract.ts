import { classifyTransactionSourceOfFunds, type TransactionSourceClass } from "@/lib/commerce/transaction-source-of-funds-contract";

export type RecentTransactionFeedInput = {
  id?: string;
  transactionId?: string;
  userId?: string;
  username?: string;
  type?: string;
  amount?: number;
  status?: string;
  rewardSource?: string;
  ledgerSource?: string;
  description?: string;
  timestamp?: number;
  timestampMs?: number;
  purchasedAmountSpent?: number;
  rewardAmountSpent?: number;
  paidGumDrops?: number;
  bonusGumDrops?: number;
  sourceTruth?: string;
};

export type RecentTransactionFeedItem = {
  transactionId: string;
  userIdRedacted: string;
  defaultVisibleUserId: string;
  fullUidDefaultVisible: false;
  username?: string;
  amount: number;
  type: string;
  sourceClass: TransactionSourceClass;
  sourceLabel: string;
  sourceConfidence: string;
  identityConfidence: "resolved" | "fallback_uid" | "missing";
  boundedFeedOnly: true;
  rawProviderPayloadVisible: false;
  drilldown: {
    fullUserId?: string;
    drilldownOnly: true;
  };
};

export type RecentTransactionFeedSummary = {
  boundedFeedWindow: string;
  loadedCount: number;
  fullUidDefaultVisible: false;
  rawProviderPayloadVisible: false;
  items: RecentTransactionFeedItem[];
  unknownMissingMetadataCount: number;
  legacyUnknownCount: number;
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function buildRecentTransactionFeedItem(input: RecentTransactionFeedInput & { nowMs?: number }): RecentTransactionFeedItem {
  const classification = classifyTransactionSourceOfFunds({
    ...input,
    transactionId: input.transactionId ?? input.id,
  });
  const username = cleanText(input.username);
  const userId = cleanText(input.userId);
  return {
    transactionId: cleanText(input.transactionId ?? input.id, "unknown_transaction"),
    userIdRedacted: classification.userIdRedacted,
    defaultVisibleUserId: classification.userIdRedacted,
    fullUidDefaultVisible: false,
    username: username || undefined,
    amount: typeof input.amount === "number" && Number.isFinite(input.amount) ? input.amount : 0,
    type: cleanText(input.type, "unknown"),
    sourceClass: classification.sourceClass,
    sourceLabel: classification.displayLabel,
    sourceConfidence: classification.sourceConfidence,
    identityConfidence: username ? "resolved" : userId ? "fallback_uid" : "missing",
    boundedFeedOnly: true,
    rawProviderPayloadVisible: false,
    drilldown: {
      fullUserId: userId || undefined,
      drilldownOnly: true,
    },
  };
}

export function buildRecentTransactionFeedSummary(input: {
  transactions: RecentTransactionFeedInput[];
  feedWindowLabel: string;
  nowMs: number;
}): RecentTransactionFeedSummary {
  const items = input.transactions.map((transaction) => buildRecentTransactionFeedItem({ ...transaction, nowMs: input.nowMs }));
  return {
    boundedFeedWindow: input.feedWindowLabel,
    loadedCount: items.length,
    fullUidDefaultVisible: false,
    rawProviderPayloadVisible: false,
    items,
    unknownMissingMetadataCount: items.filter((item) => item.sourceClass === "unknown_missing_metadata").length,
    legacyUnknownCount: items.filter((item) => item.sourceClass === "legacy_unknown").length,
  };
}
