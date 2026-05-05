import { clamp01, clampScore, roundScore } from "@/lib/behavioral/behavioral-math-calibration";

export const DROP_MOMENTUM_MIN_STRONG_IMPRESSIONS = 20;
export const DROP_MOMENTUM_VERSION = 1;

export type DropMomentumSignals = {
  impressions1h: number;
  impressions6h: number;
  impressions24h: number;
  previewOpens1h: number;
  previewOpens6h: number;
  viewerOpens6h: number;
  viewerOpens24h: number;
  unlocks6h: number;
  validWatchCompletions6h: number;
  purchasesAfterView24h: number;
  negativeFeedbackCount: number;
  feedbackCount: number;
  creatorBaselineScore?: number;
};

export type DropMomentumScoreInput = DropMomentumSignals & {
  nowMs?: number;
};

export type DropMomentumVerdict =
  | "no_signal"
  | "early_signal"
  | "strong_positive"
  | "neutral"
  | "negative";

export type DropMomentumScoreResult = {
  version: typeof DROP_MOMENTUM_VERSION;
  momentumScore: number;
  verdict: DropMomentumVerdict;
  sampleLabel: "no signal" | "early signal" | "sampled";
  sampleImpressions: number;
  previewRate1h: number;
  unlockRate6h: number;
  watchCompletionRate6h: number;
  purchaseAfterViewRate24h: number;
  creatorBaselineLift: number;
  negativeFeedbackPenalty: number;
  creatorBaselineScore: number;
  reasons: string[];
};

function rate(numerator: number, denominator: number) {
  return clamp01(Math.max(0, numerator) / Math.max(1, denominator));
}

export function computeDropMomentumScore(input: DropMomentumScoreInput): DropMomentumScoreResult {
  const sampleImpressions = Math.max(0, Math.round(input.impressions24h || input.impressions6h || input.impressions1h || 0));
  const previewRate1h = rate(input.previewOpens1h, input.impressions1h);
  const unlockRate6h = rate(input.unlocks6h, input.previewOpens6h);
  const watchCompletionRate6h = rate(input.validWatchCompletions6h, input.viewerOpens6h);
  const purchaseAfterViewRate24h = rate(input.purchasesAfterView24h, input.viewerOpens24h);
  const negativeFeedbackRate = rate(input.negativeFeedbackCount, input.feedbackCount);
  const negativeFeedbackPenalty = roundScore(negativeFeedbackRate * 40);
  const creatorBaselineScore = clampScore(input.creatorBaselineScore ?? 0);
  const baseWithoutLift = 100 * (
    (0.25 * previewRate1h) +
    (0.25 * unlockRate6h) +
    (0.20 * watchCompletionRate6h) +
    (0.20 * purchaseAfterViewRate24h)
  );
  const creatorBaselineLift = clamp01((baseWithoutLift - creatorBaselineScore) / Math.max(20, 100 - creatorBaselineScore));
  const momentumScore = clampScore(
    baseWithoutLift +
    (100 * 0.10 * creatorBaselineLift) -
    negativeFeedbackPenalty,
  );
  const hasSignal = sampleImpressions > 0
    || input.previewOpens1h > 0
    || input.unlocks6h > 0
    || input.validWatchCompletions6h > 0
    || input.purchasesAfterView24h > 0;
  const sampleLabel = !hasSignal
    ? "no signal"
    : sampleImpressions < DROP_MOMENTUM_MIN_STRONG_IMPRESSIONS
      ? "early signal"
      : "sampled";
  let verdict: DropMomentumVerdict = "no_signal";
  const reasons: string[] = [];

  if (hasSignal && sampleImpressions < DROP_MOMENTUM_MIN_STRONG_IMPRESSIONS) {
    verdict = "early_signal";
    reasons.push("Early signal: under 20 impressions so verdict is tentative.");
  } else if (hasSignal && negativeFeedbackRate >= 0.25) {
    verdict = "negative";
    reasons.push("Momentum limited by negative feedback rate.");
  } else if (hasSignal && momentumScore >= 60) {
    verdict = "strong_positive";
    reasons.push("Boosted by early drop momentum.");
  } else if (hasSignal) {
    verdict = "neutral";
  }

  if (creatorBaselineLift > 0) {
    reasons.push("Outperforming this creator's baseline response.");
  }
  if (negativeFeedbackPenalty > 0 && !reasons.includes("Momentum limited by negative feedback rate.")) {
    reasons.push("Momentum limited by negative feedback rate.");
  }

  return {
    version: DROP_MOMENTUM_VERSION,
    momentumScore: roundScore(momentumScore),
    verdict,
    sampleLabel,
    sampleImpressions,
    previewRate1h: roundScore(previewRate1h),
    unlockRate6h: roundScore(unlockRate6h),
    watchCompletionRate6h: roundScore(watchCompletionRate6h),
    purchaseAfterViewRate24h: roundScore(purchaseAfterViewRate24h),
    creatorBaselineLift: roundScore(creatorBaselineLift),
    negativeFeedbackPenalty,
    creatorBaselineScore: roundScore(creatorBaselineScore),
    reasons: Array.from(new Set(reasons)),
  };
}
