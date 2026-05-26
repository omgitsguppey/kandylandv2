export const CREATOR_REVENUE_MATH_DEBUG_LANE = "Creator revenue math" as const;

export const CREATOR_REVENUE_CONFIDENCE_LEVELS = ["exact", "linked", "inferred", "weak", "unknown"] as const;
export type CreatorRevenueConfidence = (typeof CREATOR_REVENUE_CONFIDENCE_LEVELS)[number];

export type CreatorRevenueStatus =
  | "confirmed"
  | "succeeded"
  | "success"
  | "pending"
  | "refunded"
  | "reversed"
  | "cancelled"
  | "canceled"
  | "failed"
  | "unknown_legacy";

export type CreatorEntitlementMathStatus =
  | "active"
  | "granted"
  | "expired"
  | "refunded"
  | "cancelled"
  | "canceled"
  | "revoked"
  | "denied"
  | "mismatch"
  | "unknown_legacy";

export type CreatorRevenueConfidenceInput = {
  revenueConfidence?: CreatorRevenueConfidence | null;
  providerPaymentArtifact?: boolean | null;
  internalLedgerLinkedToSuccessfulPayment?: boolean | null;
  operatorConfirmedRevenue?: boolean | null;
  legacyTransaction?: boolean | null;
  revenueCents?: number | null;
};

export type FanPassActiveInput = {
  enabledByCreator: boolean;
  activeForUser: boolean;
  entitlementStatus: CreatorEntitlementMathStatus;
  accessStartAt?: number | null;
  accessEndAt?: number | null;
  lifetime?: boolean | null;
  nowMs?: number | null;
};

export type FanPassActiveResult = {
  active: boolean;
  reason:
    | "fan_pass_active"
    | "creator_disabled"
    | "entitlement_not_active"
    | "outside_access_window"
    | "reversed_entitlement"
    | "missing_access_window";
  debugReason: string;
};

export type EntitlementAccessInput = {
  creatorId?: string | null;
  userId?: string | null;
  sourceTruth?: string | null;
  status: CreatorEntitlementMathStatus;
  accessStartAt?: number | null;
  accessEndAt?: number | null;
  lifetime?: boolean | null;
  nowMs?: number | null;
};

export type EntitlementAccessResult = {
  accessGranted: boolean;
  reason:
    | "active_entitlement"
    | "identity_missing"
    | "source_truth_missing"
    | "legacy_access_window_missing"
    | "reversed_entitlement"
    | "expired"
    | "outside_access_window"
    | "not_active";
  debugReason: string;
};

export type PaidChatBypassInput = {
  fanPassResolverResult?: {
    activeForUser?: boolean | null;
    state?: string | null;
  } | null;
  actorRole?: "creator" | "fan" | "admin" | "system" | string | null;
  creatorReplyBypass?: boolean | null;
  rawFanPassActive?: boolean | null;
};

export type PaidChatBypassResult = {
  bypassAllowed: boolean;
  source: "fan_pass_resolver" | "creator_reply_bypass" | "none";
  reason: "fan_pass_active" | "creator_reply" | "fan_pass_resolver_required" | "not_allowed";
  debugReason: string;
};

export type CreatorRevenueEntry = CreatorRevenueConfidenceInput & {
  revenueCents?: number | null;
  status?: CreatorRevenueStatus | null;
  metricId?: string | null;
};

export type CreatorDashboardRevenueMetric = {
  metricId: "confirmedRevenue" | "inferredRevenue" | "pendingRevenue" | "reversedRevenue" | "unknownLegacyRevenue";
  revenueCents: number;
  confidence: CreatorRevenueConfidence;
  sourceTruth: "provider_or_linked_ledger" | "operator_confirmed" | "pending_internal" | "reversal" | "legacy_or_unknown";
};

export type CreatorRevenueSummary = {
  confirmedRevenueCents: number;
  inferredRevenueCents: number;
  pendingRevenueCents: number;
  reversedRevenueCents: number;
  unknownLegacyRevenueCents: number;
  fanPassViews: number;
  fanPassAttempts: number;
  fanPassActiveUsers: number;
  paidChatAttempts: number;
  paidChatMessages: number;
  dropUnlocks: number;
  dashboardMetrics: CreatorDashboardRevenueMetric[];
  confidenceDistribution: Record<CreatorRevenueConfidence, number>;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCents(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizeTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function now(input?: number | null) {
  return typeof input === "number" && Number.isFinite(input) ? input : Date.now();
}

function isReversedStatus(status: unknown) {
  const normalized = cleanText(status);
  return normalized === "refunded" || normalized === "reversed" || normalized === "cancelled" || normalized === "canceled" || normalized === "revoked";
}

function isActiveStatus(status: unknown) {
  const normalized = cleanText(status);
  return normalized === "active" || normalized === "granted";
}

function inAccessWindow(input: { accessStartAt?: number | null; accessEndAt?: number | null; lifetime?: boolean | null; nowMs?: number | null }) {
  const nowMs = now(input.nowMs);
  const start = normalizeTimestamp(input.accessStartAt);
  const end = normalizeTimestamp(input.accessEndAt);
  if (start !== null && nowMs < start) return false;
  if (end !== null) return nowMs <= end;
  return input.lifetime === true;
}

function hasAccessWindowProof(input: { accessStartAt?: number | null; accessEndAt?: number | null; lifetime?: boolean | null }) {
  return normalizeTimestamp(input.accessStartAt) !== null && (normalizeTimestamp(input.accessEndAt) !== null || input.lifetime === true);
}

export function classifyRevenueConfidence(input: CreatorRevenueConfidenceInput): CreatorRevenueConfidence {
  if (input.revenueConfidence && CREATOR_REVENUE_CONFIDENCE_LEVELS.includes(input.revenueConfidence)) {
    return input.revenueConfidence;
  }
  if (input.providerPaymentArtifact === true) return "exact";
  if (input.internalLedgerLinkedToSuccessfulPayment === true) return "linked";
  if (input.operatorConfirmedRevenue === true) return "inferred";
  if (input.legacyTransaction === true) return normalizeCents(input.revenueCents) > 0 ? "weak" : "unknown";
  return "unknown";
}

export function calculateFanPassActive(input: FanPassActiveInput): FanPassActiveResult {
  if (!input.enabledByCreator) {
    return { active: false, reason: "creator_disabled", debugReason: "Fan Pass cannot be active when the creator has not enabled it." };
  }
  if (isReversedStatus(input.entitlementStatus)) {
    return { active: false, reason: "reversed_entitlement", debugReason: `Fan Pass entitlement is ${input.entitlementStatus}.` };
  }
  if (!input.activeForUser || !isActiveStatus(input.entitlementStatus)) {
    return { active: false, reason: "entitlement_not_active", debugReason: "Fan Pass resolver did not confirm an active user entitlement." };
  }
  if (!hasAccessWindowProof(input)) {
    return { active: false, reason: "missing_access_window", debugReason: "Fan Pass active access needs an access window or explicit lifetime entitlement." };
  }
  if (!inAccessWindow(input)) {
    return { active: false, reason: "outside_access_window", debugReason: "Fan Pass entitlement is outside the active access window." };
  }
  return { active: true, reason: "fan_pass_active", debugReason: "Creator enabled Fan Pass and user entitlement is active inside the access window." };
}

export function calculateEntitlementAccess(input: EntitlementAccessInput): EntitlementAccessResult {
  if (!cleanText(input.creatorId) || !cleanText(input.userId)) {
    return { accessGranted: false, reason: "identity_missing", debugReason: "Creator entitlement access requires creatorId and userId." };
  }
  const sourceTruth = cleanText(input.sourceTruth);
  if (!sourceTruth || sourceTruth === "missing") {
    return { accessGranted: false, reason: "source_truth_missing", debugReason: "Creator entitlement access requires source truth." };
  }
  if (sourceTruth === "legacy_unknown" && !hasAccessWindowProof(input)) {
    return { accessGranted: false, reason: "legacy_access_window_missing", debugReason: "Legacy entitlement cannot grant access without access date proof." };
  }
  if (isReversedStatus(input.status)) {
    return { accessGranted: false, reason: "reversed_entitlement", debugReason: `Entitlement status is ${input.status}.` };
  }
  if (input.status === "expired") {
    return { accessGranted: false, reason: "expired", debugReason: "Entitlement status is expired." };
  }
  if (!isActiveStatus(input.status)) {
    return { accessGranted: false, reason: "not_active", debugReason: `Entitlement status ${input.status} does not grant access.` };
  }
  if (!hasAccessWindowProof(input) || !inAccessWindow(input)) {
    return { accessGranted: false, reason: "outside_access_window", debugReason: "Entitlement is not inside a proven active access window." };
  }
  return { accessGranted: true, reason: "active_entitlement", debugReason: "Entitlement has source truth, identity, active status, and valid access window." };
}

export function calculatePaidChatBypass(input: PaidChatBypassInput): PaidChatBypassResult {
  const fanPassState = cleanText(input.fanPassResolverResult?.state);
  if (input.fanPassResolverResult?.activeForUser === true && (fanPassState === "access_granted" || fanPassState === "active")) {
    return { bypassAllowed: true, source: "fan_pass_resolver", reason: "fan_pass_active", debugReason: "Paid chat bypass is granted by Fan Pass resolver output." };
  }
  if (input.creatorReplyBypass === true && cleanText(input.actorRole) === "creator") {
    return { bypassAllowed: true, source: "creator_reply_bypass", reason: "creator_reply", debugReason: "Paid chat bypass is granted for the creator reply path." };
  }
  if (input.rawFanPassActive === true && !input.fanPassResolverResult) {
    return { bypassAllowed: false, source: "none", reason: "fan_pass_resolver_required", debugReason: "Raw Fan Pass flags do not grant paid chat bypass without resolver output." };
  }
  return { bypassAllowed: false, source: "none", reason: "not_allowed", debugReason: "Paid chat bypass requires active Fan Pass resolver output or creator reply bypass." };
}

export function calculateCreatorRevenueSummary(entries: readonly CreatorRevenueEntry[]): CreatorRevenueSummary {
  let confirmedRevenueCents = 0;
  let inferredRevenueCents = 0;
  let pendingRevenueCents = 0;
  let reversedRevenueCents = 0;
  let unknownLegacyRevenueCents = 0;
  const confidenceDistribution: Record<CreatorRevenueConfidence, number> = {
    exact: 0,
    linked: 0,
    inferred: 0,
    weak: 0,
    unknown: 0,
  };

  for (const entry of entries) {
    const cents = normalizeCents(entry.revenueCents);
    const status = cleanText(entry.status);
    const confidence = classifyRevenueConfidence(entry);
    confidenceDistribution[confidence] += 1;

    if (status === "pending") {
      pendingRevenueCents += cents;
    } else if (isReversedStatus(status)) {
      reversedRevenueCents += cents;
    } else if (confidence === "exact" || confidence === "linked") {
      confirmedRevenueCents += cents;
    } else if (confidence === "inferred") {
      inferredRevenueCents += cents;
    } else {
      unknownLegacyRevenueCents += cents;
    }
  }

  const dashboardMetrics: CreatorDashboardRevenueMetric[] = [
    { metricId: "confirmedRevenue", revenueCents: confirmedRevenueCents, confidence: confirmedRevenueCents > 0 ? "linked" : "unknown", sourceTruth: "provider_or_linked_ledger" },
    { metricId: "inferredRevenue", revenueCents: inferredRevenueCents, confidence: inferredRevenueCents > 0 ? "inferred" : "unknown", sourceTruth: "operator_confirmed" },
    { metricId: "pendingRevenue", revenueCents: pendingRevenueCents, confidence: pendingRevenueCents > 0 ? "linked" : "unknown", sourceTruth: "pending_internal" },
    { metricId: "reversedRevenue", revenueCents: reversedRevenueCents, confidence: reversedRevenueCents > 0 ? "linked" : "unknown", sourceTruth: "reversal" },
    { metricId: "unknownLegacyRevenue", revenueCents: unknownLegacyRevenueCents, confidence: unknownLegacyRevenueCents > 0 ? "weak" : "unknown", sourceTruth: "legacy_or_unknown" },
  ];

  return {
    confirmedRevenueCents,
    inferredRevenueCents,
    pendingRevenueCents,
    reversedRevenueCents,
    unknownLegacyRevenueCents,
    fanPassViews: 0,
    fanPassAttempts: 0,
    fanPassActiveUsers: 0,
    paidChatAttempts: 0,
    paidChatMessages: 0,
    dropUnlocks: 0,
    dashboardMetrics,
    confidenceDistribution,
  };
}

export function explainCreatorRevenueMath() {
  return {
    debugLane: CREATOR_REVENUE_MATH_DEBUG_LANE,
    paymentRuntimeTouched: false,
    payoutMathTouched: false,
    gumdropMathTouched: false,
    rules: [
      "Entitlement is access truth, not payment truth.",
      "Provider/payment artifact revenue is exact.",
      "Internal ledger linked to successful payment is linked.",
      "Operator-confirmed revenue is inferred.",
      "Legacy revenue without provider/source truth is weak or unknown.",
      "Fan Pass is active only when creator settings, entitlement status, access window, and reversal state all allow it.",
      "Paid chat bypass uses Fan Pass resolver output or creator reply bypass.",
      "Creator dashboard revenue separates confirmed, inferred, pending, reversed, and unknown legacy buckets.",
    ],
  };
}
