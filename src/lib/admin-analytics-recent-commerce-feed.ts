import type {
  CommerceFeedItem,
  RangeOption,
  RecentCommerceFeedRow,
  RecentCommerceFeedState,
} from "@/types/admin-analytics";

const SOURCE_LABELS: Record<RecentCommerceFeedRow["sourceOfFunds"], string> = {
  reward_free: "Reward",
  paid: "Paid",
  paid_bonus: "Bonus",
  creator_spend: "Creator spend",
  drop_unwrap: "Unwrap",
  admin_adjustment: "Admin",
  unknown: "Unknown",
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

function inferSourceOfFunds(item: CommerceFeedItem): RecentCommerceFeedRow["sourceOfFunds"] {
  if (item.type === "unlock_content") return "drop_unwrap";
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
  return "unknown";
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
    const sourceOfFunds = inferSourceOfFunds(item);
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
      sourceLabel: SOURCE_LABELS[sourceOfFunds],
      status: normalizeStatus(item.status),
      createdAtUtc,
      ageLabel: formatAge(timestampMs, input.nowMs),
      sourceTruth: item.sourceTruth || "server_transactions",
      userPhoto: item.userPhoto,
      explanation: "Display language uses unwrap; backend entitlement fields may still use unlock.",
    };
  });
  const latestTimestampMs = Math.max(0, ...rows.map((row) => Date.parse(row.createdAtUtc) || 0));
  const ageMs = latestTimestampMs > 0 && input.nowMs > 0 ? input.nowMs - latestTimestampMs : Number.POSITIVE_INFINITY;
  const freshnessState: RecentCommerceFeedState["freshnessState"] = rows.length === 0
    ? "unknown"
    : ageMs <= 5 * 60_000
      ? "live"
      : ageMs <= 60 * 60_000
        ? "recent"
        : "stale";

  return {
    generatedAtUtc: input.generatedAtMs ? new Date(input.generatedAtMs).toISOString() : new Date(0).toISOString(),
    range: input.selectedRange,
    sourceTruth: rows.length > 0 ? "server_transactions" : "unknown",
    freshnessState,
    rowCount: rows.length,
    lastTransactionAtUtc: latestTimestampMs > 0 ? new Date(latestTimestampMs).toISOString() : null,
    rows,
    warnings: rows.length > 0
      ? ["Amounts are displayed in GD with signed credit/debit direction."]
      : ["No recent commerce feed entries were available for this range."],
  };
}
