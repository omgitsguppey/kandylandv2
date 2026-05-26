import {
  buildCreatorEntitlementDebugVisibility,
  type CreatorEntitlementConfidence,
  type CreatorEntitlementRecord,
  type CreatorEntitlementRevenueConfidence,
  type CreatorEntitlementSourceFeature,
  type CreatorEntitlementSourceOfFunds,
  type CreatorEntitlementSourceTruth,
  type CreatorEntitlementStatus,
  type CreatorEntitlementType,
} from "@/lib/creator-monetization/creator-entitlement-contract";

export type CreatorEntitlementInput = Partial<Omit<CreatorEntitlementRecord, "debugVisibility" | "mismatchReasons">> & {
  debugVisibility?: CreatorEntitlementRecord["debugVisibility"];
  mismatchReasons?: string[];
};

export type CreatorEntitlementSourceInput = {
  id?: string;
  transactionId?: string;
  eventId?: string;
  type?: string;
  creatorId?: string | null;
  userId?: string | null;
  amount?: number;
  cost?: number;
  purchasedAmountSpent?: number;
  rewardAmountSpent?: number;
  ledgerSource?: string;
  sourceOfFunds?: string;
  sourceTruth?: string;
  unlockSource?: string;
  creatorAccrualId?: string;
  creatorExperienceRecordId?: string;
  creatorRevenueShareGd?: number;
  creatorRevenueShareUsd?: number;
  revenueCents?: number | null;
  accessStartAt?: number | null;
  accessEndAt?: number | null;
};

export type CreatorEntitlementSourceClassification = {
  entitlementType: CreatorEntitlementType;
  sourceFeature: CreatorEntitlementSourceFeature;
  sourceOfFunds: CreatorEntitlementSourceOfFunds;
  sourceTruth: CreatorEntitlementSourceTruth;
  confidence: CreatorEntitlementConfidence;
  revenueConfidence: CreatorEntitlementRevenueConfidence;
  sourceTransactionId?: string;
  sourceEventId?: string;
  gdAmount: number;
  revenueCents: number | null;
  mismatchReasons: string[];
};

export type CreatorEntitlementAccessResult = {
  accessGranted: boolean;
  status: CreatorEntitlementStatus;
  failureReason:
    | "none"
    | "source_truth_missing"
    | "creator_or_user_missing"
    | "paid_source_required"
    | "expired"
    | "revoked"
    | "denied"
    | "unknown_legacy";
  humanReason: string;
  debugReason: string;
};

const PAID_SOURCE_REQUIRED = new Set<CreatorEntitlementType>([
  "fan_pass_access",
  "paid_chat_message",
  "creator_experience_access",
]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null;
}

function normalizeStatus(value: unknown): CreatorEntitlementStatus {
  const text = cleanText(value);
  if (
    text === "granted"
    || text === "active"
    || text === "expired"
    || text === "revoked"
    || text === "denied"
    || text === "mismatch"
    || text === "unknown_legacy"
  ) {
    return text;
  }
  return "granted";
}

function normalizeConfidence(value: unknown): CreatorEntitlementConfidence {
  const text = cleanText(value);
  if (text === "verified" || text === "inferred" || text === "legacy" || text === "missing") return text;
  return "missing";
}

function normalizeRevenueConfidence(value: unknown): CreatorEntitlementRevenueConfidence {
  const text = cleanText(value);
  if (text === "verified" || text === "estimated" || text === "unavailable" || text === "unknown_legacy") return text;
  return "unavailable";
}

function normalizeSourceTruth(value: unknown): CreatorEntitlementSourceTruth {
  const text = cleanText(value);
  if (
    text === "server_transaction"
    || text === "creator_subscription"
    || text === "server_unlock"
    || text === "creator_accrual"
    || text === "creator_settings"
    || text === "system_grant"
    || text === "legacy_unknown"
    || text === "missing"
  ) {
    return text;
  }
  return "missing";
}

function normalizeSourceOfFunds(value: unknown): CreatorEntitlementSourceOfFunds {
  const text = cleanText(value);
  if (
    text === "paid_gumdrops"
    || text === "reward_gumdrops"
    || text === "mixed_gumdrops"
    || text === "subscription_access"
    || text === "system_grant"
    || text === "unknown"
  ) {
    return text;
  }
  if (text === "purchased" || text === "paid") return "paid_gumdrops";
  if (text === "reward") return "reward_gumdrops";
  if (text === "mixed") return "mixed_gumdrops";
  return "unknown";
}

function typeFromSourceFeature(feature: CreatorEntitlementSourceFeature): CreatorEntitlementType {
  if (feature === "fan_pass") return "fan_pass_access";
  if (feature === "chat") return "paid_chat_message";
  if (feature === "drop_unlock") return "drop_unlock";
  if (feature === "creator_experience") return "creator_experience_access";
  if (feature === "broadcast") return "broadcast_access";
  if (feature === "system") return "system_grant";
  return "unknown_legacy";
}

function sourceFundsFromSplit(input: CreatorEntitlementSourceInput): CreatorEntitlementSourceOfFunds {
  const purchased = normalizedNumber(input.purchasedAmountSpent);
  const reward = normalizedNumber(input.rewardAmountSpent);
  if (purchased > 0 && reward > 0) return "mixed_gumdrops";
  if (purchased > 0) return "paid_gumdrops";
  if (reward > 0) return "reward_gumdrops";
  if (input.unlockSource === "creator_subscription") return "subscription_access";
  return normalizeSourceOfFunds(input.sourceOfFunds ?? input.ledgerSource);
}

export function classifyEntitlementSource(input: CreatorEntitlementSourceInput): CreatorEntitlementSourceClassification {
  const type = cleanText(input.type);
  const sourceOfFunds = sourceFundsFromSplit(input);
  const gdAmount = Math.max(normalizedNumber(input.amount), normalizedNumber(input.cost), normalizedNumber(input.purchasedAmountSpent) + normalizedNumber(input.rewardAmountSpent));
  const revenueCents = normalizeNullableNumber(input.revenueCents);
  const hasCreatorAccrual = cleanText(input.creatorAccrualId).length > 0 || normalizedNumber(input.creatorRevenueShareGd) > 0 || normalizedNumber(input.creatorRevenueShareUsd) > 0;
  const revenueConfidence: CreatorEntitlementRevenueConfidence = revenueCents !== null || hasCreatorAccrual ? "verified" : "unavailable";
  const sourceTransactionId = cleanText(input.transactionId ?? input.id) || undefined;
  const sourceEventId = cleanText(input.eventId ?? input.creatorExperienceRecordId) || undefined;

  if (type === "creator_subscription" || type === "creator_subscription_renewal") {
    return {
      entitlementType: "fan_pass_access",
      sourceFeature: "fan_pass",
      sourceOfFunds,
      sourceTruth: "creator_subscription",
      confidence: "verified",
      revenueConfidence,
      sourceTransactionId,
      sourceEventId,
      gdAmount,
      revenueCents,
      mismatchReasons: sourceOfFunds === "reward_gumdrops" || sourceOfFunds === "mixed_gumdrops" ? ["paid_source_required"] : [],
    };
  }

  if (type === "creator_message_text" || type === "creator_message_image" || type === "creator_message_video") {
    return {
      entitlementType: "paid_chat_message",
      sourceFeature: "chat",
      sourceOfFunds,
      sourceTruth: "server_transaction",
      confidence: sourceOfFunds === "unknown" ? "inferred" : "verified",
      revenueConfidence,
      sourceTransactionId,
      sourceEventId,
      gdAmount,
      revenueCents,
      mismatchReasons: sourceOfFunds === "reward_gumdrops" || sourceOfFunds === "mixed_gumdrops" ? ["paid_source_required"] : [],
    };
  }

  if (type === "creator_custom_request" || type === "creator_booking_phone" || type === "creator_booking_video") {
    return {
      entitlementType: "creator_experience_access",
      sourceFeature: "creator_experience",
      sourceOfFunds,
      sourceTruth: "server_transaction",
      confidence: sourceOfFunds === "unknown" ? "inferred" : "verified",
      revenueConfidence,
      sourceTransactionId,
      sourceEventId,
      gdAmount,
      revenueCents,
      mismatchReasons: sourceOfFunds === "reward_gumdrops" || sourceOfFunds === "mixed_gumdrops" ? ["paid_source_required"] : [],
    };
  }

  if (type === "unlock_content") {
    return {
      entitlementType: "drop_unlock",
      sourceFeature: "drop_unlock",
      sourceOfFunds,
      sourceTruth: input.unlockSource === "creator_subscription" ? "creator_subscription" : "server_unlock",
      confidence: sourceOfFunds === "unknown" ? "inferred" : "verified",
      revenueConfidence,
      sourceTransactionId,
      sourceEventId,
      gdAmount,
      revenueCents,
      mismatchReasons: [],
    };
  }

  return {
    entitlementType: "unknown_legacy",
    sourceFeature: "unknown_legacy",
    sourceOfFunds,
    sourceTruth: normalizeSourceTruth(input.sourceTruth) === "missing" ? "legacy_unknown" : normalizeSourceTruth(input.sourceTruth),
    confidence: "legacy",
    revenueConfidence: "unknown_legacy",
    sourceTransactionId,
    sourceEventId,
    gdAmount,
    revenueCents,
    mismatchReasons: ["unknown_legacy"],
  };
}

export function buildCreatorEntitlement(input: CreatorEntitlementInput): CreatorEntitlementRecord {
  const creatorId = cleanText(input.creatorId);
  const userId = cleanText(input.userId);
  const sourceFeature = cleanText(input.sourceFeature) as CreatorEntitlementSourceFeature || "unknown_legacy";
  const entitlementType = (cleanText(input.entitlementType) as CreatorEntitlementType) || typeFromSourceFeature(sourceFeature);
  const sourceOfFunds = normalizeSourceOfFunds(input.sourceOfFunds);
  const sourceTruth = normalizeSourceTruth(input.sourceTruth);
  const mismatchReasons = [...(input.mismatchReasons ?? [])];

  if (!creatorId) mismatchReasons.push("creatorId_missing");
  if (!userId) mismatchReasons.push("userId_missing");
  if (sourceFeature === "unknown_legacy") mismatchReasons.push("sourceFeature_missing");
  if (sourceTruth === "missing" || sourceTruth === "legacy_unknown") mismatchReasons.push("source_truth_missing");
  if (sourceOfFunds === "unknown") mismatchReasons.push("source_of_funds_missing");
  if (PAID_SOURCE_REQUIRED.has(entitlementType) && sourceOfFunds !== "paid_gumdrops") mismatchReasons.push("paid_source_required");

  const status = mismatchReasons.length > 0 ? "mismatch" : normalizeStatus(input.status);
  const confidence = mismatchReasons.includes("source_truth_missing") || mismatchReasons.includes("source_of_funds_missing")
    ? "missing"
    : normalizeConfidence(input.confidence) === "missing"
      ? "inferred"
      : normalizeConfidence(input.confidence);

  return {
    entitlementId: cleanText(input.entitlementId) || `${entitlementType}:${userId || "missing_user"}:${creatorId || "missing_creator"}`,
    entitlementType,
    creatorId,
    userId,
    sourceFeature,
    sourceTransactionId: cleanText(input.sourceTransactionId) || undefined,
    sourceEventId: cleanText(input.sourceEventId) || undefined,
    sourceOfFunds,
    gdAmount: normalizedNumber(input.gdAmount),
    revenueCents: normalizeNullableNumber(input.revenueCents),
    accessStartAt: normalizeNullableNumber(input.accessStartAt),
    accessEndAt: normalizeNullableNumber(input.accessEndAt),
    status,
    confidence,
    revenueConfidence: normalizeRevenueConfidence(input.revenueConfidence),
    sourceTruth,
    debugVisibility: input.debugVisibility ?? buildCreatorEntitlementDebugVisibility({
      status: mismatchReasons.length > 0 ? "review" : "debug_visible",
      reason: mismatchReasons.length > 0 ? mismatchReasons.join(", ") : "creator entitlement source truth verified",
    }),
    mismatchReasons: [...new Set(mismatchReasons)],
  };
}

export function resolveCreatorEntitlementAccess(input: CreatorEntitlementRecord): CreatorEntitlementAccessResult {
  if (!input.creatorId || !input.userId) {
    return {
      accessGranted: false,
      status: "mismatch",
      failureReason: "creator_or_user_missing",
      humanReason: "Creator access could not be verified.",
      debugReason: "creatorId or userId missing from entitlement record",
    };
  }
  if (input.sourceTruth === "missing" || input.sourceTruth === "legacy_unknown" || input.sourceOfFunds === "unknown") {
    return {
      accessGranted: false,
      status: "mismatch",
      failureReason: "source_truth_missing",
      humanReason: "Creator access needs source verification.",
      debugReason: "source truth or source-of-funds missing from entitlement record",
    };
  }
  if (PAID_SOURCE_REQUIRED.has(input.entitlementType) && input.sourceOfFunds !== "paid_gumdrops") {
    return {
      accessGranted: false,
      status: "mismatch",
      failureReason: "paid_source_required",
      humanReason: "This creator feature requires paid-source GumDrops.",
      debugReason: `${input.entitlementType} cannot be granted from ${input.sourceOfFunds}`,
    };
  }
  if (input.status === "expired") {
    return { accessGranted: false, status: input.status, failureReason: "expired", humanReason: "Creator access has expired.", debugReason: "entitlement status is expired" };
  }
  if (input.status === "revoked") {
    return { accessGranted: false, status: input.status, failureReason: "revoked", humanReason: "Creator access is no longer active.", debugReason: "entitlement status is revoked" };
  }
  if (input.status === "denied") {
    return { accessGranted: false, status: input.status, failureReason: "denied", humanReason: "Creator access is not available.", debugReason: "entitlement status is denied" };
  }
  if (input.status === "unknown_legacy") {
    return { accessGranted: false, status: input.status, failureReason: "unknown_legacy", humanReason: "Creator access needs review.", debugReason: "legacy entitlement cannot grant access automatically" };
  }

  const grantsAccess = input.status === "active" || input.status === "granted";
  return {
    accessGranted: grantsAccess,
    status: input.status,
    failureReason: grantsAccess ? "none" : "denied",
    humanReason: grantsAccess ? "Creator access is active." : "Creator access is not active.",
    debugReason: grantsAccess ? "entitlement has source truth and active/granted status" : "entitlement status does not grant access",
  };
}

export function explainEntitlementMismatch(input: CreatorEntitlementRecord) {
  const access = resolveCreatorEntitlementAccess(input);
  if (access.accessGranted) return "No entitlement mismatch detected.";
  if (access.failureReason === "paid_source_required") return "Paid creator entitlements require paid-source GumDrops; reward-only or mixed funding cannot grant access.";
  if (access.failureReason === "source_truth_missing") return "Entitlement access lacks source truth or source-of-funds evidence.";
  if (access.failureReason === "creator_or_user_missing") return "Entitlement access lacks creator or user identity.";
  return access.debugReason;
}
