export const CREATOR_ENTITLEMENT_TYPES = [
  "fan_pass_access",
  "paid_chat_message",
  "drop_unlock",
  "creator_experience_access",
  "broadcast_access",
  "system_grant",
  "unknown_legacy",
] as const;

export const CREATOR_ENTITLEMENT_STATUSES = [
  "granted",
  "active",
  "expired",
  "revoked",
  "denied",
  "mismatch",
  "unknown_legacy",
] as const;

export const CREATOR_ENTITLEMENT_SOURCE_FEATURES = [
  "fan_pass",
  "chat",
  "drop_unlock",
  "creator_experience",
  "broadcast",
  "system",
  "unknown_legacy",
] as const;

export const CREATOR_ENTITLEMENT_SOURCE_OF_FUNDS = [
  "paid_gumdrops",
  "reward_gumdrops",
  "mixed_gumdrops",
  "subscription_access",
  "system_grant",
  "unknown",
] as const;

export const CREATOR_ENTITLEMENT_REVENUE_CONFIDENCE = [
  "verified",
  "estimated",
  "unavailable",
  "unknown_legacy",
] as const;

export const CREATOR_ENTITLEMENT_DEBUG_LANE = "Creator entitlement ledger" as const;

export type CreatorEntitlementType = (typeof CREATOR_ENTITLEMENT_TYPES)[number];
export type CreatorEntitlementStatus = (typeof CREATOR_ENTITLEMENT_STATUSES)[number];
export type CreatorEntitlementSourceFeature = (typeof CREATOR_ENTITLEMENT_SOURCE_FEATURES)[number];
export type CreatorEntitlementSourceOfFunds = (typeof CREATOR_ENTITLEMENT_SOURCE_OF_FUNDS)[number];
export type CreatorEntitlementRevenueConfidence = (typeof CREATOR_ENTITLEMENT_REVENUE_CONFIDENCE)[number];
export type CreatorEntitlementConfidence = "verified" | "inferred" | "legacy" | "missing";
export type CreatorEntitlementSourceTruth =
  | "server_transaction"
  | "creator_subscription"
  | "server_unlock"
  | "creator_accrual"
  | "creator_settings"
  | "system_grant"
  | "legacy_unknown"
  | "missing";

export type CreatorEntitlementDebugVisibility = {
  lane: typeof CREATOR_ENTITLEMENT_DEBUG_LANE;
  status: "debug_visible" | "review" | "blocked";
  reason: string;
  rawPaymentProviderDumpDefault: false;
};

export type CreatorEntitlementRecord = {
  entitlementId: string;
  entitlementType: CreatorEntitlementType;
  creatorId: string;
  userId: string;
  sourceFeature: CreatorEntitlementSourceFeature;
  sourceTransactionId?: string;
  sourceEventId?: string;
  sourceOfFunds: CreatorEntitlementSourceOfFunds;
  gdAmount: number;
  revenueCents: number | null;
  accessStartAt: number | null;
  accessEndAt: number | null;
  status: CreatorEntitlementStatus;
  confidence: CreatorEntitlementConfidence;
  revenueConfidence: CreatorEntitlementRevenueConfidence;
  sourceTruth: CreatorEntitlementSourceTruth;
  debugVisibility: CreatorEntitlementDebugVisibility;
  mismatchReasons: string[];
};

export type CreatorEntitlementContractShape = {
  entitlementTypes: readonly CreatorEntitlementType[];
  requiredFields: readonly (keyof CreatorEntitlementRecord)[];
  metricsMapped: readonly string[];
  debugLane: typeof CREATOR_ENTITLEMENT_DEBUG_LANE;
  paymentRuntimeTouched: false;
  payoutMathTouched: false;
  gumdropMathTouched: false;
};

export function buildCreatorEntitlementDebugVisibility(input: {
  status?: CreatorEntitlementDebugVisibility["status"];
  reason?: string;
} = {}): CreatorEntitlementDebugVisibility {
  return {
    lane: CREATOR_ENTITLEMENT_DEBUG_LANE,
    status: input.status ?? "debug_visible",
    reason: input.reason ?? "creator entitlement source truth is visible in debug evidence",
    rawPaymentProviderDumpDefault: false,
  };
}

export function buildCreatorEntitlementContractShape(): CreatorEntitlementContractShape {
  return {
    entitlementTypes: CREATOR_ENTITLEMENT_TYPES,
    requiredFields: [
      "entitlementId",
      "creatorId",
      "userId",
      "sourceFeature",
      "sourceOfFunds",
      "gdAmount",
      "revenueCents",
      "accessStartAt",
      "accessEndAt",
      "status",
      "confidence",
      "debugVisibility",
    ],
    metricsMapped: [
      "creator-level entitlements granted",
      "fan pass active users",
      "paid chat messages",
      "drop unlocks",
      "revenue confidence",
      "access denied/mismatch count",
    ],
    debugLane: CREATOR_ENTITLEMENT_DEBUG_LANE,
    paymentRuntimeTouched: false,
    payoutMathTouched: false,
    gumdropMathTouched: false,
  };
}

export function validateCreatorEntitlementShape(shape: CreatorEntitlementContractShape) {
  const failures: string[] = [];
  for (const type of CREATOR_ENTITLEMENT_TYPES) {
    if (!shape.entitlementTypes.includes(type)) failures.push(`Missing entitlement type: ${type}`);
  }
  for (const field of [
    "entitlementId",
    "creatorId",
    "userId",
    "sourceFeature",
    "sourceOfFunds",
    "gdAmount",
    "revenueCents",
    "accessStartAt",
    "accessEndAt",
    "status",
    "confidence",
    "debugVisibility",
  ] as const) {
    if (!shape.requiredFields.includes(field)) failures.push(`Missing required field: ${field}`);
  }
  if (shape.debugLane !== CREATOR_ENTITLEMENT_DEBUG_LANE) failures.push("Creator entitlement debug lane mismatch.");
  if (shape.paymentRuntimeTouched) failures.push("Creator entitlement contract must not touch payment runtime.");
  if (shape.payoutMathTouched) failures.push("Creator entitlement contract must not touch payout math.");
  if (shape.gumdropMathTouched) failures.push("Creator entitlement contract must not touch GumDrop math.");
  return failures;
}
