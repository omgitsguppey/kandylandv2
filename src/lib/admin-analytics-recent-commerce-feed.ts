import type {
  CommerceFeedItem,
  RangeOption,
  RecentCommerceFeedRow,
  RecentCommerceFeedState,
} from "@/types/admin-analytics";
import {
  classifyTransactionSourceOfFunds,
  transactionSourceDisplayLabel,
  type TransactionSourceOfFundsClassification,
} from "@/lib/commerce/transaction-source-of-funds-contract";
import { buildRecoveredLaunchMetricState, type RecoveredLaunchMetricState } from "@/lib/analytics/recovery-timeline-spine";

const SOURCE_LABELS: Record<RecentCommerceFeedRow["sourceOfFunds"], string> = {
  reward_free: "Reward",
  paid: "Paid",
  paid_bonus: "Bonus",
  creator_spend: "Creator spend",
  "drop_unwrap": "Unwrap",
  admin_adjustment: "Admin",
  unknown: "Unknown",
  purchased_base: "Paid GumDrops",
  purchased_bonus: "Paid bonus GumDrops",
  purchased_mixed: "Paid bundle GumDrops",
  reward_check_in: "Reward check-in",
  reward_onboarding: "Reward onboarding",
  reward_task: "Reward task",
  reward_feedback: "Reward feedback",
  reward_referral: "Reward referral",
  admin_adjustment_positive: "Admin reward adjustment",
  admin_adjustment_negative: "Admin debit adjustment",
  unlock_reward_spend: "Reward unlock spend",
  unlock_purchased_spend: "Paid unlock spend",
  unlock_mixed_spend: "Mixed unlock spend",
  creator_paid_spend: "Creator paid spend",
  creator_reward_violation: "Creator reward violation",
  legacy_unknown: "Legacy unknown",
  unknown_missing_metadata: "Unknown missing metadata",
};

function shortId(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "unknown";
  return text.length > 10 ? `${text.slice(0, 4)}...${text.slice(-4)}` : text;
}

function normalizeTimestampMs(item: CommerceFeedItem) {
  const timestamp = typeof item.timestamp === "number" && Number.isFinite(item.timestamp) ? item.timestamp : 0;
  const timestampMs = typeof item.timestampMs === "number" && Number.isFinite(item.timestampMs) ? item.timestampMs : 0;
  return Math.max(timestamp, timestampMs);
}

function formatAge(timestampMs: number, nowMs: number) {
  if (timestampMs <= 0 || nowMs <= 0) return "time unavailable";
  const diffMs = Math.max(0, nowMs - timestampMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function titleCaseStatus(status: RecentCommerceFeedRow["status"]) {
  return status;
}

function normalizeStatus(status: unknown): RecentCommerceFeedRow["status"] {
  const normalized = typeof status === "string" ? status.toLowerCase() : "";
  if (normalized === "pending") return "pending";
  if (normalized === "failed") return "failed";
  if (normalized === "reversed" || normalized === "refunded") return "reversed";
  return "completed";
}

function normalizeDisplayTitle(item: CommerceFeedItem) {
  const username = item.username?.replace(/^@/u, "").trim();
  const rawDescription = (item.description || item.type || "Transaction")
    .replace(/^Unlocked:/iu, "Unwrapped:")
    .replace(/\bUnlocked\b/gu, "Unwrapped")
    .replace(/\bUnlocks\b/gu, "Unwraps")
    .replace(/\bUnlock\b/gu, "Unwrap")
    .trim();
  const lines = rawDescription
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (!username) return true;
      const normalizedLine = line.replace(/^@/u, "").toLowerCase();
      return normalizedLine !== username.toLowerCase();
    });

  if (lines.length > 0) return lines.join(" · ");

  if (item.type === "creator_message_text") return "Creator text message";
  if (item.type === "creator_message_image") return "Creator image message";
  if (item.type === "creator_message_video") return "Creator video message";
  if (item.type === "unlock_content") return "Unwrapped KandyDrop";
  return rawDescription || "Transaction";
}

function classifyFeedItemSourceOfFunds(item: CommerceFeedItem) {
  return classifyTransactionSourceOfFunds({
    transactionId: item.id,
    userId: item.userId,
    type: item.type,
    amount: item.amount,
    status: item.status,
    rewardSource: item.rewardSource,
    ledgerSource: item.ledgerSource,
    description: item.description,
    timestamp: item.timestamp,
    timestampMs: item.timestampMs,
    purchasedAmountSpent: "purchasedAmountSpent" in item ? (item as CommerceFeedItem & { purchasedAmountSpent?: number }).purchasedAmountSpent : undefined,
    rewardAmountSpent: "rewardAmountSpent" in item ? (item as CommerceFeedItem & { rewardAmountSpent?: number }).rewardAmountSpent : undefined,
    paidGumDrops: item.paidGumDrops,
    bonusGumDrops: item.bonusGumDrops,
    sourceTruth: item.sourceTruth,
  });
}

function inferSourceOfFunds(
  item: CommerceFeedItem,
  classification: TransactionSourceOfFundsClassification,
): RecentCommerceFeedRow["sourceOfFunds"] {
  if (classification.sourceClass !== "unknown_missing_metadata" && classification.sourceClass !== "legacy_unknown") {
    return classification.sourceClass;
  }
  if (item.type === "unlock_content") return classification.sourceClass;
  if (item.type === "purchase_currency") {
    return (item.bonusGumDrops ?? 0) > 0 ? "paid_bonus" : "paid";
  }
  if (
    item.type === "creator_message_text"
    || item.type === "creator_message_image"
    || item.type === "creator_message_video"
    || item.type === "creator_subscription"
    || item.type === "creator_subscription_renewal"
    || item.type === "creator_custom_request"
    || item.type === "creator_booking_phone"
    || item.type === "creator_booking_video"
  ) {
    return "creator_spend";
  }
  if (item.type === "admin_adjustment") return "admin_adjustment";
  if (item.type === "daily_reward" || item.type === "referral_bonus" || item.type === "onboarding_reward") {
    return "reward_free";
  }
  if (item.ledgerSource === "purchased") return "paid";
  if (item.ledgerSource === "reward") return "reward_free";
  return classification.sourceClass;
}

function recoveryEventNameForSourceClass(sourceClass: RecentCommerceFeedRow["sourceOfFunds"]) {
  switch (sourceClass) {
    case "paid":
    case "paid_bonus":
    case "purchased_base":
    case "purchased_bonus":
    case "purchased_mixed":
      return "gumdrops_purchase_completed";
    case "drop_unwrap":
    case "unlock_reward_spend":
    case "unlock_purchased_spend":
    case "unlock_mixed_spend":
      return "drop_unlocked";
    case "creator_spend":
    case "creator_paid_spend":
    case "creator_reward_violation":
      return "creator_spend";
    case "admin_adjustment":
    case "admin_adjustment_positive":
    case "admin_adjustment_negative":
      return "admin_adjustment";
    case "reward_free":
    case "reward_check_in":
    case "reward_onboarding":
    case "reward_task":
    case "reward_feedback":
    case "reward_referral":
      return "reward_granted";
    case "legacy_unknown":
      return "legacy_commerce_transaction";
    case "unknown":
    case "unknown_missing_metadata":
    default:
      return "commerce_transaction";
  }
}

function recoverySourceTruthForClassification(
  classification: TransactionSourceOfFundsClassification,
): RecoveredLaunchMetricState["sourceTruth"] {
  if (classification.sourceClass === "unknown_missing_metadata") return "source_missing";
  if (classification.sourceClass === "legacy_unknown" || classification.sourceTruth === "legacy_missing_split") {
    return "legacy_directional_only";
  }
  if (classification.sourceClass === "admin_adjustment_positive" || classification.sourceClass === "admin_adjustment_negative") {
    return "admin_action_fact";
  }
  return "server_ledger";
}

function buildCommerceFeedRecoveryMetadata(input: {
  item: CommerceFeedItem;
  sourceOfFunds: RecentCommerceFeedRow["sourceOfFunds"];
  classification: TransactionSourceOfFundsClassification;
  timestampMs: number;
}) {
  const sourceTruth = recoverySourceTruthForClassification(input.classification);
  const sourceObserved = sourceTruth !== "source_missing";
  return buildRecoveredLaunchMetricState({
    eventName: recoveryEventNameForSourceClass(input.sourceOfFunds),
    sourceObserved,
    sourceTruth,
    evidenceKind: sourceTruth === "legacy_directional_only"
      ? "inferred"
      : sourceObserved
        ? "observed"
        : "missing",
    eventId: input.item.id,
    userId: input.item.userId,
    route: "admin_analytics_recent_commerce_feed",
    objectId: input.item.id,
    timestampMs: input.timestampMs,
  });
}

function resolveAmountGd(item: CommerceFeedItem) {
  if (typeof item.amount === "number" && Number.isFinite(item.amount)) return item.amount;
  if (typeof item.deliveredGumDrops === "number" && Number.isFinite(item.deliveredGumDrops)) {
    return item.deliveredGumDrops;
  }
  return 0;
}

function formatAmountDisplay(amountGd: number) {
  if (amountGd > 0) return `+${amountGd.toLocaleString()} GD`;
  if (amountGd < 0) return `${amountGd.toLocaleString()} GD`;
  return "0 GD";
}

function amountDirection(amountGd: number): RecentCommerceFeedRow["direction"] {
  if (amountGd > 0) return "credit";
  if (amountGd < 0) return "debit";
  return "neutral";
}

export function buildAdminAnalyticsRecentCommerceFeedState(input: {
  items: CommerceFeedItem[];
  selectedRange: RangeOption;
  generatedAtMs?: number | null;
  nowMs: number;
}): RecentCommerceFeedState {
  const rows = input.items.slice(0, 10).map((item): RecentCommerceFeedRow => {
    const timestampMs = normalizeTimestampMs(item);
    const sourceClassification = classifyFeedItemSourceOfFunds(item);
    const sourceOfFunds = inferSourceOfFunds(item, sourceClassification);
    const recoveryMetadata = buildCommerceFeedRecoveryMetadata({
      item,
      sourceOfFunds,
      classification: sourceClassification,
      timestampMs,
    });
    const amountGd = resolveAmountGd(item);
    const createdAtUtc = timestampMs > 0 ? new Date(timestampMs).toISOString() : new Date(0).toISOString();
    return {
      transactionId: item.id,
      displayTitle: normalizeDisplayTitle(item),
      actorDisplayName: item.username ? `@${item.username.replace(/^@/u, "")}` : `user ${shortId(item.userId || item.id)}`,
      username: item.username?.replace(/^@/u, ""),
      shortUserId: shortId(item.userId || item.id),
      amountGd,
      amountDisplay: formatAmountDisplay(amountGd),
      direction: amountDirection(amountGd),
      sourceOfFunds,
      sourceLabel: SOURCE_LABELS[sourceOfFunds] ?? transactionSourceDisplayLabel(sourceClassification.sourceClass),
      status: normalizeStatus(item.status),
      createdAtUtc,
      ageLabel: formatAge(timestampMs, input.nowMs),
      sourceTruth: recoveryMetadata.sourceTruth,
      freshnessState: recoveryMetadata.freshnessState,
      confidenceScore: recoveryMetadata.confidenceScore,
      confidenceBand: recoveryMetadata.confidenceBand,
      evidenceKind: recoveryMetadata.evidenceKind,
      dedupeKey: recoveryMetadata.dedupeKey,
      dedupeDimensions: recoveryMetadata.dedupeDimensions,
      lateArrivalWindowDays: recoveryMetadata.lateArrivalWindowDays,
      productTruthEligible: recoveryMetadata.productTruthEligible,
      missingVsZeroState: recoveryMetadata.missingVsZeroState,
      mathReason: recoveryMetadata.mathReason,
      userPhoto: item.userPhoto,
      explanation: "Display language uses unwrap; backend entitlement fields may still use unlock.",
    };
  });
  const latestTimestampMs = Math.max(0, ...rows.map((row) => Date.parse(row.createdAtUtc) || 0));
  const sourceTruths = new Set(rows.map((row) => row.sourceTruth));
  const sourceTruth: RecentCommerceFeedState["sourceTruth"] = rows.length === 0
    ? "source_missing"
    : sourceTruths.size === 1
      ? rows[0]?.sourceTruth ?? "source_missing"
      : "mixed";
  const freshnessState: RecentCommerceFeedState["freshnessState"] = rows.length === 0
    ? "source_missing"
    : rows.some((row) => row.freshnessState === "source_missing")
      ? "source_missing"
      : rows.some((row) => row.freshnessState === "external_evidence_required")
        ? "external_evidence_required"
        : rows.some((row) => row.freshnessState === "cached" || row.freshnessState === "refresh_due")
          ? "refresh_due"
          : "source_current";

  return {
    generatedAtUtc: input.generatedAtMs ? new Date(input.generatedAtMs).toISOString() : new Date(0).toISOString(),
    range: input.selectedRange,
    sourceTruth,
    freshnessState,
    rowCount: rows.length,
    lastTransactionAtUtc: latestTimestampMs > 0 ? new Date(latestTimestampMs).toISOString() : null,
    rows,
    warnings: rows.length > 0
      ? ["Amounts are displayed in GD with signed credit/debit direction."]
      : ["No recent commerce feed entries were available for this range."],
  };
}
