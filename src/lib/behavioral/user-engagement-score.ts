import {
  computeEngagementScoreFromSignals,
  logNorm,
} from "@/lib/behavioral/behavioral-math-calibration";

export { logNorm };

export type UserEngagementTier = "dormant" | "light" | "active" | "engaged" | "power";

export type UserEngagementReasonCode =
  | "meaningful_actions"
  | "unwraps"
  | "valid_watch_time"
  | "purchases"
  | "repeat_visits"
  | "free_gd_intent";

export type UserEngagementScoreInput = {
  normalizedActionCount7d: number;
  unwrappedCount30d: number;
  validWatchMinutes30d: number;
  purchaseCount90d: number;
  activeDays7d: number;
  freeGdEarned30d: number;
};

export type UserEngagementActivityDay = {
  timestampMs: number;
  normalizedActionCount?: number;
  unwrappedCount?: number;
  validWatchMinutes?: number;
  purchaseCount?: number;
  freeGdEarned?: number;
  hadVisit?: boolean;
  hadAuth?: boolean;
};

export type UserEngagementReason = {
  code: UserEngagementReasonCode;
  label: string;
  contribution: number;
  value: number;
  summary: string;
};

export type UserEngagementScoreBreakdown = {
  actionComponent: number;
  unwrapComponent: number;
  watchComponent: number;
  purchaseComponent: number;
  returnComponent: number;
  freeIntentComponent: number;
};

export type UserEngagementScoreResult = {
  score: number;
  tier: UserEngagementTier;
  verdict: string;
  reasons: UserEngagementReason[];
  topReasons: UserEngagementReason[];
  breakdown: UserEngagementScoreBreakdown;
  inputs: UserEngagementScoreInput;
};

export function recencyDecay(ageDays: number, halfLifeDays: number) {
  const safeAgeDays = Math.max(0, Number.isFinite(ageDays) ? ageDays : 0);
  const safeHalfLifeDays = Math.max(1, Number.isFinite(halfLifeDays) ? halfLifeDays : 1);
  return Math.pow(0.5, safeAgeDays / safeHalfLifeDays);
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function dayAgeMs(nowMs: number, timestampMs: number) {
  return Math.max(0, nowMs - Math.max(0, timestampMs));
}

export function buildUserEngagementScoreInputFromActivityDays(input: {
  days: UserEngagementActivityDay[];
  nowMs: number;
}): UserEngagementScoreInput {
  const last7dMs = 7 * 24 * 60 * 60 * 1000;
  const last30dMs = 30 * 24 * 60 * 60 * 1000;
  const last90dMs = 90 * 24 * 60 * 60 * 1000;

  let normalizedActionCount7d = 0;
  let unwrappedCount30d = 0;
  let validWatchMinutes30d = 0;
  let purchaseCount90d = 0;
  let freeGdEarned30d = 0;
  let activeDays7d = 0;

  input.days.forEach((day) => {
    const ageMs = dayAgeMs(input.nowMs, day.timestampMs);
    const normalizedActionCount = Math.max(0, Math.round(day.normalizedActionCount || 0));
    const unwrappedCount = Math.max(0, Math.round(day.unwrappedCount || 0));
    const validWatchMinutes = Math.max(0, Math.round(day.validWatchMinutes || 0));
    const purchaseCount = Math.max(0, Math.round(day.purchaseCount || 0));
    const freeGdEarned = Math.max(0, Math.round(day.freeGdEarned || 0));
    const active = Boolean(
      day.hadAuth ||
      day.hadVisit ||
      normalizedActionCount > 0 ||
      unwrappedCount > 0 ||
      validWatchMinutes > 0 ||
      purchaseCount > 0,
    );

    if (ageMs <= last7dMs) {
      normalizedActionCount7d += normalizedActionCount;
      if (active) {
        activeDays7d += 1;
      }
    }

    if (ageMs <= last30dMs) {
      unwrappedCount30d += unwrappedCount;
      validWatchMinutes30d += validWatchMinutes;
      freeGdEarned30d += freeGdEarned;
    }

    if (ageMs <= last90dMs) {
      purchaseCount90d += purchaseCount;
    }
  });

  return {
    normalizedActionCount7d,
    unwrappedCount30d,
    validWatchMinutes30d,
    purchaseCount90d,
    activeDays7d,
    freeGdEarned30d,
  };
}

function getTier(score: number): UserEngagementTier {
  if (score >= 80) return "power";
  if (score >= 60) return "engaged";
  if (score >= 40) return "active";
  if (score >= 20) return "light";
  return "dormant";
}

function getVerdict(tier: UserEngagementTier) {
  switch (tier) {
    case "power":
      return "Power user";
    case "engaged":
      return "Engaged";
    case "active":
      return "Active";
    case "light":
      return "Light engagement";
    default:
      return "Dormant";
  }
}

function roundContribution(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function computeUserEngagementScore(input: UserEngagementScoreInput): UserEngagementScoreResult {
  const normalizedInput: UserEngagementScoreInput = {
    normalizedActionCount7d: Math.max(0, Math.round(input.normalizedActionCount7d || 0)),
    unwrappedCount30d: Math.max(0, Math.round(input.unwrappedCount30d || 0)),
    validWatchMinutes30d: Math.max(0, Math.round(input.validWatchMinutes30d || 0)),
    purchaseCount90d: Math.max(0, Math.round(input.purchaseCount90d || 0)),
    activeDays7d: Math.max(0, Math.min(7, Math.round(input.activeDays7d || 0))),
    freeGdEarned30d: Math.max(0, Math.round(input.freeGdEarned30d || 0)),
  };

  const breakdown: UserEngagementScoreBreakdown = {
    actionComponent: logNorm(normalizedInput.normalizedActionCount7d, 100),
    unwrapComponent: logNorm(normalizedInput.unwrappedCount30d, 25),
    watchComponent: logNorm(normalizedInput.validWatchMinutes30d, 180),
    purchaseComponent: logNorm(normalizedInput.purchaseCount90d, 10),
    returnComponent: clampUnit(normalizedInput.activeDays7d / 7),
    freeIntentComponent: logNorm(normalizedInput.freeGdEarned30d, 1000),
  };

  const score = computeEngagementScoreFromSignals({
    purchaseSignal: breakdown.purchaseComponent,
    unwrapSignal: breakdown.unwrapComponent,
    validWatchSignal: breakdown.watchComponent,
    return7dSignal: breakdown.returnComponent,
    meaningfulActionSignal: breakdown.actionComponent,
    freeIntentSignal: breakdown.freeIntentComponent,
  });

  const tier = getTier(score);
  const reasons: UserEngagementReason[] = [
    {
      code: "meaningful_actions" as const,
      label: "Meaningful actions",
      contribution: roundContribution(0.10 * breakdown.actionComponent),
      value: normalizedInput.normalizedActionCount7d,
      summary: `${normalizedInput.normalizedActionCount7d} normalized actions in the last 7 days`,
    },
    {
      code: "unwraps" as const,
      label: "Unwraps",
      contribution: roundContribution(0.23 * breakdown.unwrapComponent),
      value: normalizedInput.unwrappedCount30d,
      summary: `${normalizedInput.unwrappedCount30d} unwraps in the last 30 days`,
    },
    {
      code: "valid_watch_time" as const,
      label: "Valid watch time",
      contribution: roundContribution(0.23 * breakdown.watchComponent),
      value: normalizedInput.validWatchMinutes30d,
      summary: `${normalizedInput.validWatchMinutes30d} valid watch minutes in the last 30 days`,
    },
    {
      code: "purchases" as const,
      label: "Purchases",
      contribution: roundContribution(0.24 * breakdown.purchaseComponent),
      value: normalizedInput.purchaseCount90d,
      summary: `${normalizedInput.purchaseCount90d} purchases in the last 90 days`,
    },
    {
      code: "repeat_visits" as const,
      label: "Repeat visits",
      contribution: roundContribution(0.13 * breakdown.returnComponent),
      value: normalizedInput.activeDays7d,
      summary: `${normalizedInput.activeDays7d} active days in the last 7 days`,
    },
    {
      code: "free_gd_intent" as const,
      label: "Free GD intent",
      contribution: roundContribution(0.07 * breakdown.freeIntentComponent),
      value: normalizedInput.freeGdEarned30d,
      summary: `${normalizedInput.freeGdEarned30d} free GD earned in the last 30 days`,
    },
  ].sort((left, right) => right.contribution - left.contribution || right.value - left.value || left.label.localeCompare(right.label));

  return {
    score,
    tier,
    verdict: getVerdict(tier),
    reasons,
    topReasons: reasons.slice(0, 3),
    breakdown,
    inputs: normalizedInput,
  };
}
