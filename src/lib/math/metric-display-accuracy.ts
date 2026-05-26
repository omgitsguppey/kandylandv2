export const METRIC_DISPLAY_ACCURACY_VERSION = "2026.05.metric-display-accuracy.1";
export const METRIC_DISPLAY_ACCURACY_DEBUG_LANE = "Metric display accuracy" as const;
export const STALE_METRIC_THRESHOLD_MS = 60 * 60 * 1000;

export type MetricDisplayConfidence = "exact" | "linked" | "inferred" | "weak" | "unknown";
export type MetricDisplayAudience = "user" | "creator" | "admin";
export type MetricDisplayState =
  | "exact"
  | "linked"
  | "estimated"
  | "collecting"
  | "proven_zero"
  | "stale"
  | "not_connected"
  | "unavailable"
  | "hidden_by_permission";

export type MetricDisplayUnit = "count" | "currency_cents" | "gumdrops" | "percent" | "seconds";

export type WalletSourceBuckets = {
  paidGd?: number | null;
  paidBonusGd?: number | null;
  rewardGd?: number | null;
  taskRewardGd?: number | null;
  adminGrantGd?: number | null;
  legacyUnknownGd?: number | null;
};

export type MetricDisplayInput = {
  metricId: string;
  value?: number | null;
  unit?: MetricDisplayUnit | null;
  provenZero?: boolean | null;
  sourceConnected?: boolean | null;
  sourcePathExists?: boolean | null;
  producerConnected?: boolean | null;
  materializerConnected?: boolean | null;
  hiddenByPermission?: boolean | null;
  confidence?: MetricDisplayConfidence | null;
  audience?: MetricDisplayAudience | null;
  updatedAtMs?: number | null;
  nowMs?: number | null;
  sourceTruth?: string | null;
  walletSourceBuckets?: WalletSourceBuckets | null;
};

export type MetricDisplayResult = {
  metricId: string;
  state: MetricDisplayState;
  displayValue: string;
  qualifier: string | null;
  userFacingLabel: string;
  adminConfidenceLabel: string | null;
  sourceTruthLabel: string | null;
  freshnessLabel: string | null;
  updatedAtMs: number | null;
  exactLooking: boolean;
  sourceBucketLabels: string[];
  explanation: string;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function integer(value: unknown) {
  const numeric = finiteNumber(value);
  return numeric === null ? 0 : Math.max(0, Math.trunc(numeric));
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function confidence(input: MetricDisplayInput): MetricDisplayConfidence {
  return input.confidence ?? "unknown";
}

function audience(input: MetricDisplayInput): MetricDisplayAudience {
  return input.audience ?? "user";
}

function hasValue(input: MetricDisplayInput) {
  return finiteNumber(input.value) !== null;
}

function sourceAvailable(input: MetricDisplayInput) {
  return input.sourceConnected !== false
    && input.sourcePathExists !== false
    && input.producerConnected !== false
    && input.materializerConnected !== false;
}

export function shouldShowZero(input: Pick<MetricDisplayInput, "value" | "provenZero" | "sourceConnected">) {
  return finiteNumber(input.value) === 0 && input.provenZero === true && input.sourceConnected !== false;
}

export function shouldShowCollecting(input: Pick<MetricDisplayInput, "value" | "sourceConnected" | "sourcePathExists" | "provenZero">) {
  return (input.value === null || input.value === undefined || finiteNumber(input.value) === 0)
    && input.provenZero !== true
    && input.sourceConnected !== false
    && input.sourcePathExists !== false;
}

export function shouldShowEstimated(input: Pick<MetricDisplayInput, "confidence">) {
  const level = input.confidence ?? "unknown";
  return level === "inferred" || level === "weak";
}

export function shouldShowStale(input: Pick<MetricDisplayInput, "updatedAtMs" | "nowMs" | "audience">) {
  const updatedAtMs = finiteNumber(input.updatedAtMs);
  const nowMs = finiteNumber(input.nowMs) ?? Date.now();
  if (updatedAtMs === null) return false;
  if (input.audience !== "creator" && input.audience !== "admin") return false;
  return nowMs - updatedAtMs > STALE_METRIC_THRESHOLD_MS;
}

function relativeFreshness(input: MetricDisplayInput) {
  const updatedAtMs = finiteNumber(input.updatedAtMs);
  const nowMs = finiteNumber(input.nowMs) ?? Date.now();
  if (updatedAtMs === null) return null;
  const ageMs = Math.max(0, nowMs - updatedAtMs);
  const hours = Math.floor(ageMs / STALE_METRIC_THRESHOLD_MS);
  if (hours >= 1) return `Updated ${hours}h ago`;
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  return `Updated ${minutes}m ago`;
}

function formatNumber(value: number, unit: MetricDisplayUnit) {
  if (unit === "currency_cents") return `$${(value / 100).toFixed(2)}`;
  if (unit === "gumdrops") return `${Math.trunc(value).toLocaleString()} GD`;
  if (unit === "percent") return `${Number(value.toFixed(1))}%`;
  if (unit === "seconds") return `${Math.trunc(value).toLocaleString()}s`;
  return Math.trunc(value).toLocaleString();
}

function walletLabels(input: MetricDisplayInput) {
  const buckets = input.walletSourceBuckets;
  if (!buckets) return [];
  const labels: string[] = [];
  const paidGd = integer(buckets.paidGd);
  const paidBonusGd = integer(buckets.paidBonusGd);
  const rewardGd = integer(buckets.rewardGd) + integer(buckets.taskRewardGd) + integer(buckets.adminGrantGd);
  const legacyUnknownGd = integer(buckets.legacyUnknownGd);
  if (paidGd > 0) labels.push(`paid GD: ${paidGd.toLocaleString()}`);
  if (paidBonusGd > 0) labels.push(`bonus GD: ${paidBonusGd.toLocaleString()}`);
  if (rewardGd > 0) labels.push(`reward GD: ${rewardGd.toLocaleString()}`);
  if (legacyUnknownGd > 0) labels.push(`unknown GD: ${legacyUnknownGd.toLocaleString()}`);
  return labels;
}

export function classifyMetricDisplayState(input: MetricDisplayInput): MetricDisplayState {
  if (input.hiddenByPermission === true) return "hidden_by_permission";
  if (!sourceAvailable(input)) return "not_connected";
  if (!hasValue(input)) return input.sourcePathExists === true ? "collecting" : "unavailable";
  if (shouldShowZero(input)) return "proven_zero";
  if (finiteNumber(input.value) === 0 && !input.provenZero) return "collecting";
  if (shouldShowStale(input)) return "stale";
  if (shouldShowEstimated(input)) return "estimated";
  if (confidence(input) === "linked") return "linked";
  if (confidence(input) === "exact") return "exact";
  return "unavailable";
}

export function buildMetricDisplayExplanation(input: Pick<MetricDisplayInput, "metricId">) {
  const metricId = clean(input.metricId);
  if (metricId === "creator_fans") return "Creator fans use the followers/fans canonical count, not unrelated subscribers.";
  if (metricId === "creator_drops") return "Creator drops use creator-owned or assigned-to-creator drops, not all drops.";
  if (metricId === "creator_views" || metricId === "creator_clicks" || metricId === "creator_unwraps") {
    return "Creator views, clicks, and unwraps use canonical event facts with confidence.";
  }
  if (metricId === "creator_revenue") return "Creator revenue displays exact, linked, inferred, pending, reversed, and unknown legacy buckets separately.";
  if (metricId === "wallet_balance") return "Wallet balance displays paid GD, bonus GD, and reward GD source buckets from ledger truth.";
  return "Metric display uses canonical math, source truth, freshness, and confidence before showing a number.";
}

export function formatMetricValue(input: MetricDisplayInput): MetricDisplayResult {
  const state = classifyMetricDisplayState(input);
  const value = finiteNumber(input.value);
  const unit = input.unit ?? "count";
  const adminAudience = audience(input) === "admin";
  const sourceTruthLabel = adminAudience ? clean(input.sourceTruth) || null : null;
  const adminConfidenceLabel = adminAudience ? `${confidence(input)} confidence` : null;
  const freshnessLabel = shouldShowStale(input) ? relativeFreshness(input) : null;
  const sourceBucketLabels = input.metricId === "wallet_balance" ? walletLabels(input) : [];
  let displayValue = value === null ? "" : formatNumber(value, unit);
  let qualifier: string | null = null;
  let userFacingLabel = "";
  let exactLooking = confidence(input) === "exact" || confidence(input) === "linked";

  if (state === "hidden_by_permission") {
    displayValue = "Hidden";
    userFacingLabel = "Hidden by permission";
    exactLooking = false;
  } else if (state === "not_connected") {
    displayValue = "Not connected";
    userFacingLabel = "Not connected";
    exactLooking = false;
  } else if (state === "unavailable") {
    displayValue = "Unavailable";
    userFacingLabel = "Unavailable";
    exactLooking = false;
  } else if (state === "collecting") {
    displayValue = "Collecting";
    userFacingLabel = "Not enough activity yet";
    exactLooking = false;
  } else if (state === "estimated") {
    qualifier = "Estimated";
    userFacingLabel = "Estimated";
    exactLooking = false;
  } else if (state === "stale") {
    userFacingLabel = freshnessLabel ?? "Updated over 1h ago";
  } else if (state === "proven_zero") {
    userFacingLabel = "0";
    exactLooking = true;
  } else {
    userFacingLabel = displayValue;
  }

  return {
    metricId: input.metricId,
    state,
    displayValue,
    qualifier,
    userFacingLabel,
    adminConfidenceLabel,
    sourceTruthLabel,
    freshnessLabel,
    updatedAtMs: finiteNumber(input.updatedAtMs),
    exactLooking,
    sourceBucketLabels,
    explanation: buildMetricDisplayExplanation(input),
  };
}
