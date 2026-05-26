import { resolveCreatorMonetizationSettings } from "@/lib/creator-monetization/creator-monetization-resolver";

export const ADMIN_CREATOR_MONETIZATION_DEBUG_LANE = "creator_monetization_admin_debug" as const;

export const ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS = [
  "admin_creator_monetization_summary_viewed",
  "admin_creator_monetization_issue_opened",
  "creator_monetization_mismatch_reviewed",
] as const;

export type AdminCreatorMonetizationDebugEvent = (typeof ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS)[number];
export type AdminCreatorMonetizationFreshnessState = "fresh" | "stale" | "missing" | "partial" | "unknown";
export type AdminCreatorMonetizationIssueSeverity = "info" | "review" | "error";

export type AdminCreatorMonetizationDebugLane = {
  laneId: typeof ADMIN_CREATOR_MONETIZATION_DEBUG_LANE;
  label: "Creator monetization admin debug";
  defaultReadPolicy: "summary_first_no_broad_default_reads";
  rawDetailsDefault: "drilldown_only";
  telemetryEvents: readonly AdminCreatorMonetizationDebugEvent[];
  scoreDimensions: readonly ["sourceHealth", "evidenceCompleteness", "runtimeHealth"];
  privacy: {
    rawPaymentProviderPayloadVisible: false;
    privateUserPiiVisible: false;
    rawUserIdsDefaultVisible: false;
  };
};

export type AdminCreatorMonetizationDebugSummaryInput = {
  creators?: Array<Record<string, unknown>>;
  entitlements?: Array<Record<string, unknown>>;
  transactions?: Array<Record<string, unknown>>;
  accessFailures?: Array<Record<string, unknown>>;
  nowMs?: number;
};

export type AdminCreatorMonetizationDebugSummary = {
  laneId: typeof ADMIN_CREATOR_MONETIZATION_DEBUG_LANE;
  label: "Creator monetization admin debug";
  defaultReadPolicy: AdminCreatorMonetizationDebugLane["defaultReadPolicy"];
  rawDetailsDefault: AdminCreatorMonetizationDebugLane["rawDetailsDefault"];
  generatedAtUtc: string;
  freshnessState: AdminCreatorMonetizationFreshnessState;
  configuredCreators: number;
  fanPass: {
    enabled: number;
    disabled: number;
    notConfigured: number;
  };
  activeUsersOrEntitlements: number;
  chatPricingHealth: {
    state: "ok" | "review" | "error";
    checkedCreators: number;
    invalidPricingCount: number;
    staleConfigurationCount: number;
  };
  paidChat: {
    attempted: number;
    succeeded: number;
    failed: number;
  };
  accessDenied: {
    total: number;
    byReason: Array<{ reason: string; count: number }>;
  };
  sourceOfFundsMismatch: {
    count: number;
    reasons: string[];
  };
  userFacingConsumerStatus: Array<{
    consumer: string;
    configuredCreators: number;
    issueCount: number;
  }>;
  issues: Array<{
    id: string;
    severity: AdminCreatorMonetizationIssueSeverity;
    reason: string;
    nextAction: string;
  }>;
  privacy: AdminCreatorMonetizationDebugLane["privacy"] & {
    summaryOnly: true;
    privateContentPayloadVisible: false;
  };
  drilldown: {
    route: "/admin/debug";
    rawDetailsDefault: "collapsed";
    containsRawPaymentProviderPayload: false;
    containsPrivateUserPii: false;
  };
  sourceTruth: "creator_settings+creator_entitlements+creator_transactions_summary";
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function timestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function creatorId(record: Record<string, unknown>) {
  return text(record.creatorId) || text(record.uid) || text(record.id) || "unknown_creator";
}

function isPaidChatType(type: string) {
  return type === "paid_chat_message" || type.startsWith("creator_message");
}

function isSuccessStatus(status: string) {
  return status === "completed" || status === "succeeded" || status === "success" || status === "granted" || status === "active";
}

function isFailureStatus(status: string) {
  return status === "failed" || status === "denied" || status === "blocked" || status === "error" || status === "mismatch";
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sourceOfFunds(record: Record<string, unknown>) {
  return text(record.sourceOfFunds) || text(record.source_of_funds) || text(record.ledgerSource);
}

function mismatchReasons(record: Record<string, unknown>) {
  const raw = record.mismatchReasons;
  if (Array.isArray(raw)) return raw.map(text).filter(Boolean);
  const reason = text(record.failureReason) || text(record.errorCode) || text(record.reason);
  return reason ? [reason] : [];
}

export function buildCreatorMonetizationAdminDebugLane(): AdminCreatorMonetizationDebugLane {
  return {
    laneId: ADMIN_CREATOR_MONETIZATION_DEBUG_LANE,
    label: "Creator monetization admin debug",
    defaultReadPolicy: "summary_first_no_broad_default_reads",
    rawDetailsDefault: "drilldown_only",
    telemetryEvents: ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS,
    scoreDimensions: ["sourceHealth", "evidenceCompleteness", "runtimeHealth"],
    privacy: {
      rawPaymentProviderPayloadVisible: false,
      privateUserPiiVisible: false,
      rawUserIdsDefaultVisible: false,
    },
  };
}

export function buildCreatorMonetizationAdminDebugSummary(input: AdminCreatorMonetizationDebugSummaryInput = {}): AdminCreatorMonetizationDebugSummary {
  const nowMs = input.nowMs ?? Date.now();
  const creators = input.creators ?? [];
  const entitlements = input.entitlements ?? [];
  const transactions = input.transactions ?? [];
  const accessFailures = input.accessFailures ?? [];
  const lane = buildCreatorMonetizationAdminDebugLane();
  const accessReasons = new Map<string, number>();
  const sourceMismatchReasons = new Set<string>();
  const consumerIssueCounts = new Map<string, number>();
  const consumerConfiguredCounts = new Map<string, number>();
  let fanPassEnabled = 0;
  let fanPassDisabled = 0;
  let fanPassNotConfigured = 0;
  let invalidPricingCount = 0;
  let staleConfigurationCount = 0;

  for (const creator of creators.map(asRecord)) {
    const rawSettings = asRecord(creator.creatorSettings);
    const settingsConfigured = Object.keys(rawSettings).length > 0;
    const monetization = resolveCreatorMonetizationSettings({
      creatorId: creatorId(creator),
      rawSettings,
      rawRestrictions: creator.creatorRestrictions,
      settingsConfigured,
      updatedAt: timestamp(creator.creatorSettingsUpdatedAt ?? creator.updatedAt),
      profileHidden: creator.profileHidden === true,
    });
    if (!settingsConfigured) fanPassNotConfigured += 1;
    if (monetization.fanPassEnabled) fanPassEnabled += 1;
    else fanPassDisabled += 1;
    if (monetization.validation.invalidPricing || monetization.validation.status === "invalid") invalidPricingCount += 1;
    if (!monetization.updatedAt || nowMs - monetization.updatedAt > 30 * 24 * 60 * 60 * 1000) staleConfigurationCount += 1;
    for (const consumer of monetization.userFacingConsumers) {
      increment(consumerConfiguredCounts, consumer);
      if (monetization.validation.status !== "valid") increment(consumerIssueCounts, consumer);
    }
  }

  let activeUsersOrEntitlements = 0;
  for (const entitlement of entitlements.map(asRecord)) {
    const status = text(entitlement.status);
    const type = text(entitlement.entitlementType) || text(entitlement.type);
    if ((type === "fan_pass_access" || type === "creator_subscription") && isSuccessStatus(status)) {
      activeUsersOrEntitlements += 1;
    }
    const funds = sourceOfFunds(entitlement);
    const feature = text(entitlement.sourceFeature) || type;
    if ((feature === "fan_pass" || feature === "chat" || feature === "creator_experience") && (funds === "reward_gumdrops" || funds === "mixed_gumdrops" || funds === "reward" || funds === "mixed")) {
      sourceMismatchReasons.add("paid_source_required");
    }
    for (const reason of mismatchReasons(entitlement)) {
      if (reason.includes("paid_source") || reason.includes("source")) sourceMismatchReasons.add(reason);
    }
  }

  let paidChatAttempted = 0;
  let paidChatSucceeded = 0;
  let paidChatFailed = 0;
  for (const transaction of transactions.map(asRecord)) {
    const type = text(transaction.type) || text(transaction.entitlementType);
    const status = text(transaction.status);
    if (!isPaidChatType(type)) continue;
    paidChatAttempted += 1;
    if (isSuccessStatus(status)) paidChatSucceeded += 1;
    if (isFailureStatus(status) || text(transaction.errorCode)) paidChatFailed += 1;
    if (number(transaction.rewardAmountSpent) > 0 || text(transaction.ledgerSource) === "reward" || text(transaction.ledgerSource) === "mixed") {
      sourceMismatchReasons.add("paid_chat_reward_source_detected");
    }
  }

  for (const failure of accessFailures.map(asRecord)) {
    increment(accessReasons, text(failure.reason) || text(failure.errorCode) || "access_denied");
  }

  const accessDeniedByReason = Array.from(accessReasons.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
  const sourceReasons = Array.from(sourceMismatchReasons).sort();
  const issues: AdminCreatorMonetizationDebugSummary["issues"] = [
    invalidPricingCount > 0 ? {
      id: "creator_monetization_invalid_pricing",
      severity: "error" as const,
      reason: `${invalidPricingCount} creator monetization configuration(s) have invalid pricing.`,
      nextAction: "Open creator settings source truth and repair invalid pricing through creator-safe controls.",
    } : null,
    sourceReasons.length > 0 ? {
      id: "creator_monetization_source_of_funds_mismatch",
      severity: "error" as const,
      reason: "Creator monetization detected reward or mixed-source funding where paid source is required.",
      nextAction: "Review source-of-funds truth before approving creator access or revenue confidence.",
    } : null,
    accessDeniedByReason.length > 0 ? {
      id: "creator_monetization_access_denied",
      severity: "review" as const,
      reason: `${accessDeniedByReason.reduce((sum, entry) => sum + entry.count, 0)} access denial(s) need review by reason.`,
      nextAction: "Open the drilldown lane and inspect the safe reason summary before looking at raw records.",
    } : null,
  ].filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));

  return {
    laneId: ADMIN_CREATOR_MONETIZATION_DEBUG_LANE,
    label: lane.label,
    defaultReadPolicy: lane.defaultReadPolicy,
    rawDetailsDefault: lane.rawDetailsDefault,
    generatedAtUtc: new Date(nowMs).toISOString(),
    freshnessState: creators.length > 0 || entitlements.length > 0 || transactions.length > 0 ? "fresh" : "missing",
    configuredCreators: creators.length,
    fanPass: {
      enabled: fanPassEnabled,
      disabled: fanPassDisabled,
      notConfigured: fanPassNotConfigured,
    },
    activeUsersOrEntitlements,
    chatPricingHealth: {
      state: invalidPricingCount > 0 ? "error" : staleConfigurationCount > 0 ? "review" : "ok",
      checkedCreators: creators.length,
      invalidPricingCount,
      staleConfigurationCount,
    },
    paidChat: {
      attempted: paidChatAttempted,
      succeeded: paidChatSucceeded,
      failed: paidChatFailed,
    },
    accessDenied: {
      total: accessDeniedByReason.reduce((sum, entry) => sum + entry.count, 0),
      byReason: accessDeniedByReason,
    },
    sourceOfFundsMismatch: {
      count: sourceReasons.length,
      reasons: sourceReasons,
    },
    userFacingConsumerStatus: Array.from(consumerConfiguredCounts.entries()).map(([consumer, configuredCount]) => ({
      consumer,
      configuredCreators: configuredCount,
      issueCount: consumerIssueCounts.get(consumer) ?? 0,
    })),
    issues,
    privacy: {
      ...lane.privacy,
      summaryOnly: true,
      privateContentPayloadVisible: false,
    },
    drilldown: {
      route: "/admin/debug",
      rawDetailsDefault: "collapsed",
      containsRawPaymentProviderPayload: false,
      containsPrivateUserPii: false,
    },
    sourceTruth: "creator_settings+creator_entitlements+creator_transactions_summary",
  };
}

export function validateCreatorMonetizationAdminDebugSummary(summary: AdminCreatorMonetizationDebugSummary) {
  const failures: string[] = [];
  if (summary.laneId !== ADMIN_CREATOR_MONETIZATION_DEBUG_LANE) failures.push("Creator monetization admin debug lane missing.");
  if (summary.privacy.rawPaymentProviderPayloadVisible) failures.push("Admin creator monetization summary exposes raw payment provider payloads.");
  if (summary.privacy.privateUserPiiVisible) failures.push("Admin creator monetization summary exposes private user PII.");
  if (summary.drilldown.containsRawPaymentProviderPayload) failures.push("Creator monetization drilldown exposes raw payment provider payloads by default.");
  if (summary.drilldown.containsPrivateUserPii) failures.push("Creator monetization drilldown exposes private user PII by default.");
  if (summary.defaultReadPolicy !== "summary_first_no_broad_default_reads") failures.push("Creator monetization admin summary is not summary-first.");
  if (summary.rawDetailsDefault !== "drilldown_only") failures.push("Creator monetization raw details are not drilldown-only.");
  if (!summary.sourceTruth.includes("creator_settings") || !summary.sourceTruth.includes("creator_entitlements")) failures.push("Creator monetization admin summary lacks source truth.");
  if (summary.userFacingConsumerStatus.length === 0 && summary.configuredCreators > 0) failures.push("Creator monetization user-facing consumer status missing.");
  return failures;
}
