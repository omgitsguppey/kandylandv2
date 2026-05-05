import type { Drop } from "@/types/db";
import {
  computeCreatorSupplyQualityScore,
  CREATOR_SUPPLY_ADMIN_CONFIDENCE_REASON,
  CREATOR_SUPPLY_NEW_CREATOR_REASON,
  type CreatorSupplyQualityScoreResult,
  type CreatorSupplyQualitySignals,
} from "@/lib/creator/creator-supply-quality-score";

export type CreatorQualityDropIntelligenceLike = {
  dropId?: string;
  creatorId?: string;
  freshnessDecayScore?: number;
  previewOpens?: number;
  viewerOpens?: number;
  positiveFeedbackCount?: number;
  negativeFeedbackCount?: number;
  satisfactionScore?: number;
  satisfactionSampleCount?: number;
};

export type CreatorQualityAdjustment = {
  creatorSupplyScore: number;
  confidenceMultiplier: number;
  scoreAdjustment: number;
  visibilityAdjustment: 0;
  missingOperationalPieces: string[];
  adminReasons: string[];
  quality: CreatorSupplyQualityScoreResult | null;
};

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

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isActiveApprovedDrop(drop: Drop, nowMs: number) {
  const approvalStatus = normalizeStatus(drop.approvalStatus || "approved");
  return drop.status === "active"
    && (!drop.validUntil || drop.validUntil > nowMs)
    && approvalStatus !== "rejected"
    && approvalStatus !== "pending_review";
}

export function buildCreatorQualityAdjustment(input: {
  creatorSupplyQuality?: CreatorSupplyQualityScoreResult | null;
}): CreatorQualityAdjustment {
  const quality = input.creatorSupplyQuality ?? null;
  if (!quality) {
    return {
      creatorSupplyScore: 50,
      confidenceMultiplier: 1,
      scoreAdjustment: 0,
      visibilityAdjustment: 0,
      missingOperationalPieces: [],
      adminReasons: [],
      quality: null,
    };
  }

  const normalizedSupply = clamp01(quality.creatorSupplyScore / 100);
  const confidenceFloor = quality.isNewCreator || quality.confidenceLabel === "low_data" ? 0.85 : 0.65;
  const confidenceMultiplier = round(Math.max(confidenceFloor, 0.65 + (normalizedSupply * 0.35)), 4);
  const adminReasons = [
    ...(quality.creatorSupplyScore < 65 ? [CREATOR_SUPPLY_ADMIN_CONFIDENCE_REASON] : []),
    ...(quality.isNewCreator || quality.confidenceLabel === "low_data" ? [CREATOR_SUPPLY_NEW_CREATOR_REASON] : []),
    ...quality.adminReasons,
  ];

  return {
    creatorSupplyScore: quality.creatorSupplyScore,
    confidenceMultiplier,
    scoreAdjustment: 0,
    visibilityAdjustment: 0,
    missingOperationalPieces: quality.missingOperationalPieces,
    adminReasons: Array.from(new Set(adminReasons)),
    quality,
  };
}

export function applyCreatorQualityAdjustment(baseScore: number, adjustment: CreatorQualityAdjustment) {
  const adjustedScore = Math.max(0, Math.min(100, baseScore + adjustment.scoreAdjustment));

  return {
    adjustedScore: round(adjustedScore, 3),
    confidenceMultiplier: adjustment.confidenceMultiplier,
    visibilityAdjustment: adjustment.visibilityAdjustment,
    reasons: adjustment.adminReasons,
  };
}

export function buildCreatorSupplyQualityMap(input: {
  drops: Drop[];
  dropIntelligence?: Map<string, CreatorQualityDropIntelligenceLike>;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const grouped = new Map<string, {
    drops: Drop[];
    activeDrops: Drop[];
    intelligenceRows: CreatorQualityDropIntelligenceLike[];
  }>();

  input.drops.forEach((drop) => {
    const creatorId = drop.creatorId || "";
    if (!creatorId) {
      return;
    }

    const existing = grouped.get(creatorId) || { drops: [], activeDrops: [], intelligenceRows: [] };
    existing.drops.push(drop);
    if (isActiveApprovedDrop(drop, nowMs)) {
      existing.activeDrops.push(drop);
    }
    const intelligence = input.dropIntelligence?.get(drop.id);
    if (intelligence) {
      existing.intelligenceRows.push(intelligence);
    }
    grouped.set(creatorId, existing);
  });

  return new Map(Array.from(grouped.entries()).map(([creatorId, group]) => {
    const latestDropAtMs = Math.max(0, ...group.activeDrops.map((drop) => drop.validFrom || 0));
    const oldestDropAtMs = Math.min(...group.drops.map((drop) => drop.validFrom || nowMs));
    const freshnessScores = group.intelligenceRows
      .map((row) => row.freshnessDecayScore)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const satisfactionSamples = group.intelligenceRows.reduce((sum, row) => sum + Math.max(0, row.satisfactionSampleCount || 0), 0);
    const satisfactionTotal = group.intelligenceRows.reduce((sum, row) => {
      const samples = Math.max(0, row.satisfactionSampleCount || 0);
      return sum + ((typeof row.satisfactionScore === "number" ? row.satisfactionScore : 0.5) * samples);
    }, 0);
    const positiveFeedbackCount = group.intelligenceRows.reduce((sum, row) => sum + Math.max(0, row.positiveFeedbackCount || 0), 0);
    const negativeFeedbackCount = group.intelligenceRows.reduce((sum, row) => sum + Math.max(0, row.negativeFeedbackCount || 0), 0);
    const totalFeedbackCount = positiveFeedbackCount + negativeFeedbackCount;
    const viewerSamples = group.intelligenceRows.reduce((sum, row) => sum + Math.max(0, row.viewerOpens || 0) + Math.max(0, row.previewOpens || 0), 0);
    const signals: CreatorSupplyQualitySignals = {
      activeDropsCount: group.activeDrops.length,
      latestDropAtMs,
      recentDropsFreshness: freshnessScores.length > 0
        ? freshnessScores.reduce((sum, value) => sum + value, 0) / freshnessScores.length
        : undefined,
      positiveSatisfactionRate: satisfactionSamples > 0 ? satisfactionTotal / satisfactionSamples : undefined,
      satisfactionSampleCount: satisfactionSamples,
      negativeFeedbackRisk: totalFeedbackCount > 0 ? negativeFeedbackCount / totalFeedbackCount : 0,
      profileCompleteness: creatorId ? 0.75 : 0,
      creatorAgeDays: Number.isFinite(oldestDropAtMs)
        ? Math.max(0, (nowMs - oldestDropAtMs) / (24 * 60 * 60 * 1000))
        : undefined,
      sampleCount: viewerSamples + totalFeedbackCount,
      nowMs,
    };

    return [creatorId, computeCreatorSupplyQualityScore(signals)];
  }));
}
