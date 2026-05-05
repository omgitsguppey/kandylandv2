export type CreatorSupplyQualitySignals = {
  activeDropsCount?: number;
  latestDropAtMs?: number;
  recentDropsFreshness?: number;
  fulfillmentResponseHealth?: number;
  responseReliability?: number;
  fanPassAvailable?: boolean;
  bookingAvailable?: boolean;
  supportIssueCount?: number;
  moderationIssueCount?: number;
  positiveSatisfaction?: number;
  positiveSatisfactionRate?: number;
  satisfactionSampleCount?: number;
  refundRisk?: number;
  negativeFeedbackRisk?: number;
  profileCompleteness?: number;
  creatorAgeDays?: number;
  sampleCount?: number;
  nowMs?: number;
};

export type CreatorSupplyQualityComponentScores = {
  activeInventory: number;
  freshness: number;
  satisfaction: number;
  responseReliability: number;
  monetizationReadiness: number;
  lowIssueRate: number;
  profileCompleteness: number;
};

export type CreatorSupplyQualityScoreResult = {
  version: 1;
  creatorSupplyScore: number;
  components: CreatorSupplyQualityComponentScores;
  dataConfidence: number;
  confidenceLabel: "low_data" | "developing" | "established";
  isNewCreator: boolean;
  missingOperationalPieces: string[];
  adminReasons: string[];
};

export const CREATOR_SUPPLY_SCORE_VERSION = 1;
export const CREATOR_SUPPLY_LOW_DATA_ACTIVE_FLOOR = 0.55;
export const CREATOR_SUPPLY_NEW_CREATOR_DAYS = 30;
export const CREATOR_SUPPLY_LOW_DATA_SAMPLE_COUNT = 5;
export const CREATOR_SUPPLY_ADMIN_CONFIDENCE_REASON = "Low creator supply score reduced confidence, not visibility.";
export const CREATOR_SUPPLY_NEW_CREATOR_REASON = "New creator supply score is data-limited; visibility is not buried for low data.";

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** digits;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function readCount(value: number | undefined) {
  return Math.max(0, Number.isFinite(value || 0) ? value || 0 : 0);
}

function isNewOrLowData(input: CreatorSupplyQualitySignals) {
  const sampleCount = readCount(input.sampleCount) + readCount(input.satisfactionSampleCount);
  const creatorAgeDays = Number.isFinite(input.creatorAgeDays || Number.NaN) ? input.creatorAgeDays || 0 : Number.POSITIVE_INFINITY;

  return creatorAgeDays <= CREATOR_SUPPLY_NEW_CREATOR_DAYS || sampleCount < CREATOR_SUPPLY_LOW_DATA_SAMPLE_COUNT;
}

function neutralWhenMissing(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? clamp01(value) : fallback;
}

function resolveFreshness(input: CreatorSupplyQualitySignals, isLowData: boolean) {
  if (typeof input.recentDropsFreshness === "number") {
    return clamp01(input.recentDropsFreshness);
  }

  const latestDropAtMs = readCount(input.latestDropAtMs);
  const nowMs = input.nowMs ?? Date.now();
  if (latestDropAtMs > 0) {
    const ageDays = Math.max(0, (nowMs - latestDropAtMs) / (24 * 60 * 60 * 1000));
    return clamp01(1 - (ageDays / 45));
  }

  return isLowData ? CREATOR_SUPPLY_LOW_DATA_ACTIVE_FLOOR : 0.35;
}

function resolveSatisfaction(input: CreatorSupplyQualitySignals, isLowData: boolean) {
  const satisfaction = input.positiveSatisfactionRate ?? input.positiveSatisfaction;
  if (typeof satisfaction === "number" && Number.isFinite(satisfaction)) {
    return clamp01(satisfaction);
  }

  return isLowData ? CREATOR_SUPPLY_LOW_DATA_ACTIVE_FLOOR : 0.5;
}

function resolveResponseReliability(input: CreatorSupplyQualitySignals, isLowData: boolean) {
  const responseReliability = input.responseReliability ?? input.fulfillmentResponseHealth;
  if (typeof responseReliability === "number" && Number.isFinite(responseReliability)) {
    return clamp01(responseReliability);
  }

  return isLowData ? CREATOR_SUPPLY_LOW_DATA_ACTIVE_FLOOR : 0.5;
}

function resolveMonetizationReadiness(input: CreatorSupplyQualitySignals, isLowData: boolean) {
  const signals = [
    typeof input.fanPassAvailable === "boolean" ? (input.fanPassAvailable ? 1 : 0) : null,
    typeof input.bookingAvailable === "boolean" ? (input.bookingAvailable ? 1 : 0) : null,
  ].filter((value): value is number => value !== null);

  if (signals.length === 0) {
    return isLowData ? 0.5 : 0.35;
  }

  return clamp01(signals.reduce((sum, value) => sum + value, 0) / signals.length);
}

function resolveLowIssueRate(input: CreatorSupplyQualitySignals) {
  const issueCount = readCount(input.supportIssueCount) + readCount(input.moderationIssueCount);
  const issuePenalty = clamp01(issueCount / 5);
  const refundRisk = clamp01(input.refundRisk || 0);
  const negativeFeedbackRisk = clamp01(input.negativeFeedbackRisk || 0);

  return clamp01(1 - Math.max(issuePenalty, refundRisk, negativeFeedbackRisk));
}

function buildMissingOperationalPieces(input: CreatorSupplyQualitySignals, components: CreatorSupplyQualityComponentScores) {
  const missing: string[] = [];

  if (readCount(input.activeDropsCount) <= 0) {
    missing.push("Add at least one active approved drop.");
  }
  if (components.freshness < 0.45) {
    missing.push("Refresh creator inventory with a newer drop.");
  }
  if (components.responseReliability < 0.55) {
    missing.push("Improve fulfillment and response reliability.");
  }
  if (typeof input.fanPassAvailable === "boolean" && !input.fanPassAvailable) {
    missing.push("Enable Fan Pass availability if this creator offers subscriptions.");
  }
  if (typeof input.bookingAvailable === "boolean" && !input.bookingAvailable) {
    missing.push("Open booking availability if this creator offers live requests.");
  }
  if (components.lowIssueRate < 0.7) {
    missing.push("Resolve support, moderation, refund, or negative feedback risk.");
  }
  if (components.profileCompleteness < 0.6) {
    missing.push("Complete creator profile basics.");
  }
  if (readCount(input.satisfactionSampleCount) < CREATOR_SUPPLY_LOW_DATA_SAMPLE_COUNT) {
    missing.push("Collect more creator satisfaction signal.");
  }

  return missing;
}

export function computeCreatorSupplyQualityScore(input: CreatorSupplyQualitySignals): CreatorSupplyQualityScoreResult {
  const isLowData = isNewOrLowData(input);
  const activeDropsCount = readCount(input.activeDropsCount);
  const activeInventory = activeDropsCount > 0
    ? Math.max(CREATOR_SUPPLY_LOW_DATA_ACTIVE_FLOOR, clamp01(activeDropsCount / 4))
    : 0;
  const components: CreatorSupplyQualityComponentScores = {
    activeInventory,
    freshness: resolveFreshness(input, isLowData),
    satisfaction: resolveSatisfaction(input, isLowData),
    responseReliability: resolveResponseReliability(input, isLowData),
    monetizationReadiness: resolveMonetizationReadiness(input, isLowData),
    lowIssueRate: resolveLowIssueRate(input),
    profileCompleteness: neutralWhenMissing(input.profileCompleteness, isLowData ? CREATOR_SUPPLY_LOW_DATA_ACTIVE_FLOOR : 0.5),
  };
  const creatorSupplyScore = round(100 * (
    (0.20 * components.activeInventory) +
    (0.20 * components.freshness) +
    (0.20 * components.satisfaction) +
    (0.15 * components.responseReliability) +
    (0.10 * components.monetizationReadiness) +
    (0.10 * components.lowIssueRate) +
    (0.05 * components.profileCompleteness)
  ), 3);
  const sampleCount = readCount(input.sampleCount) + readCount(input.satisfactionSampleCount) + activeDropsCount;
  const dataConfidence = round(clamp01(sampleCount / 20), 4);
  const isNewCreator = (input.creatorAgeDays || Number.POSITIVE_INFINITY) <= CREATOR_SUPPLY_NEW_CREATOR_DAYS;
  const confidenceLabel = dataConfidence < 0.35
    ? "low_data"
    : dataConfidence < 0.7
      ? "developing"
      : "established";
  const missingOperationalPieces = buildMissingOperationalPieces(input, components);
  const adminReasons = [
    creatorSupplyScore < 65 ? CREATOR_SUPPLY_ADMIN_CONFIDENCE_REASON : "Creator supply is operationally healthy.",
    ...(isLowData ? [CREATOR_SUPPLY_NEW_CREATOR_REASON] : []),
    ...missingOperationalPieces,
  ];

  return {
    version: CREATOR_SUPPLY_SCORE_VERSION,
    creatorSupplyScore,
    components,
    dataConfidence,
    confidenceLabel,
    isNewCreator,
    missingOperationalPieces,
    adminReasons: Array.from(new Set(adminReasons)),
  };
}
