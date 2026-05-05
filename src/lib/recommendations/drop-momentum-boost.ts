import type { Drop } from "@/types/db";
import {
  computeDropMomentumScore,
  type DropMomentumScoreResult,
  type DropMomentumSignals,
} from "@/lib/behavioral/drop-momentum-score";
import { clamp01, roundScore } from "@/lib/behavioral/behavioral-math-calibration";

export type DropMomentumIntelligenceLike = Partial<DropMomentumSignals> & {
  dropId?: string;
  creatorId?: string;
  earlyMomentum?: Partial<DropMomentumSignals> & {
    creatorBaselineScore?: number;
    momentumScore?: number;
  };
  momentumScore?: number;
  creatorBaselineMomentumScore?: number;
  impressions?: number;
  previewOpens?: number;
  viewerOpens?: number;
  unlocks?: number;
  completionRate?: number;
  viewerToUnlockRate?: number;
  negativeFeedbackCount?: number;
  positiveFeedbackCount?: number;
  negativeSignalRate?: number;
};

export type DropMomentumBoostResult = {
  momentumScore: number;
  momentumBoost: number;
  sampleLabel: DropMomentumScoreResult["sampleLabel"];
  verdict: DropMomentumScoreResult["verdict"];
  reasons: string[];
  signals: DropMomentumScoreResult;
};

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resolveSignals(input: {
  intelligence?: DropMomentumIntelligenceLike | null;
  creatorBaselineScore?: number;
}): DropMomentumSignals {
  const intelligence = input.intelligence ?? null;
  const early = intelligence?.earlyMomentum ?? {};
  const impressions = readNumber(intelligence?.impressions);
  const previewOpens = readNumber(intelligence?.previewOpens);
  const viewerOpens = readNumber(intelligence?.viewerOpens);
  const unlocks = readNumber(intelligence?.unlocks);
  const feedbackCount = readNumber(intelligence?.positiveFeedbackCount) + readNumber(intelligence?.negativeFeedbackCount);
  const negativeFeedbackCount = readNumber(intelligence?.negativeFeedbackCount)
    || Math.round(readNumber(intelligence?.negativeSignalRate) * Math.max(1, feedbackCount));

  return {
    impressions1h: readNumber(early.impressions1h) || readNumber(intelligence?.impressions1h),
    impressions6h: readNumber(early.impressions6h) || readNumber(intelligence?.impressions6h),
    impressions24h: readNumber(early.impressions24h) || readNumber(intelligence?.impressions24h) || impressions,
    previewOpens1h: readNumber(early.previewOpens1h) || readNumber(intelligence?.previewOpens1h),
    previewOpens6h: readNumber(early.previewOpens6h) || readNumber(intelligence?.previewOpens6h) || previewOpens,
    viewerOpens6h: readNumber(early.viewerOpens6h) || readNumber(intelligence?.viewerOpens6h) || viewerOpens,
    viewerOpens24h: readNumber(early.viewerOpens24h) || readNumber(intelligence?.viewerOpens24h) || viewerOpens,
    unlocks6h: readNumber(early.unlocks6h) || readNumber(intelligence?.unlocks6h) || unlocks,
    validWatchCompletions6h: readNumber(early.validWatchCompletions6h)
      || readNumber(intelligence?.validWatchCompletions6h)
      || Math.round(readNumber(intelligence?.completionRate) * Math.max(1, viewerOpens)),
    purchasesAfterView24h: readNumber(early.purchasesAfterView24h) || readNumber(intelligence?.purchasesAfterView24h),
    negativeFeedbackCount,
    feedbackCount,
    creatorBaselineScore: readNumber(input.creatorBaselineScore)
      || readNumber(early.creatorBaselineScore)
      || readNumber(intelligence?.creatorBaselineMomentumScore),
  };
}

function buildBoost(score: DropMomentumScoreResult) {
  if (score.verdict === "no_signal" || score.verdict === "negative") {
    return 0;
  }

  const confidenceMultiplier = score.sampleImpressions < 20
    ? Math.max(0.35, clamp01(score.sampleImpressions / 20))
    : 1;
  return roundScore(Math.min(10, (score.momentumScore / 100) * 10 * confidenceMultiplier));
}

export function buildDropMomentumBoost(input: {
  drop: Drop;
  intelligence?: DropMomentumIntelligenceLike | null;
  creatorBaselineScore?: number;
}): DropMomentumBoostResult {
  const signals = resolveSignals({
    intelligence: input.intelligence,
    creatorBaselineScore: input.creatorBaselineScore,
  });
  const score = computeDropMomentumScore(signals);
  const reasons = [...score.reasons];
  const momentumBoost = buildBoost(score);

  if (momentumBoost > 0 && !reasons.includes("Boosted by early drop momentum.")) {
    reasons.unshift("Boosted by early drop momentum.");
  }

  return {
    momentumScore: score.momentumScore,
    momentumBoost,
    sampleLabel: score.sampleLabel,
    verdict: score.verdict,
    reasons: Array.from(new Set(reasons)),
    signals: score,
  };
}
