import { describe, expect, it } from "vitest";

import { generateRecommendationCandidates } from "@/lib/recommendations/candidate-generation";
import { rankDeterministicRecommendations } from "@/lib/recommendations/deterministic-ranker";
import { getRecommendationModelFreshness, scoreRecommendationWithArtifact, type RecommendationModelArtifact } from "@/lib/recommendations/ml-ranker";
import type { RecommendationBehavioralProfileLike, RecommendationDropIntelligenceLike } from "@/lib/recommendations/ranking-features";
import type { Drop } from "@/types/db";

const nowMs = Date.UTC(2026, 4, 4);

function buildDrop(overrides: Partial<Drop>): Drop {
  return {
    id: "drop-1",
    title: "Test Drop",
    caption: "",
    contentUrl: "",
    contentUrls: [""],
    thumbnailUrl: "",
    creatorId: "creator-1",
    creatorUsername: "creator",
    creatorDisplayName: "Creator",
    creatorProfileImageUrl: "",
    creatorName: "Creator",
    creatorPhotoURL: "",
    unlockCost: 700,
    validFrom: nowMs - (2 * 60 * 60 * 1000),
    validUntil: nowMs + (24 * 60 * 60 * 1000),
    createdAt: nowMs - (3 * 60 * 60 * 1000),
    type: "glam",
    tags: ["glam", "night"],
    isSpotlighted: false,
    status: "active",
    likes: [],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    mediaCounts: { images: 1, videos: 0 },
    userLikeTimestamps: {},
    fileMetadata: { type: "image/jpeg", dimensions: "1080x1350" },
    ...overrides,
  } as Drop;
}

describe("recommendation-ranker", () => {
  it("retrieves ending soon and affinity candidates", () => {
    const drops = [
      buildDrop({ id: "ending", creatorId: "creator-1" }),
      buildDrop({ id: "fresh", creatorId: "creator-2", validUntil: nowMs + (7 * 24 * 60 * 60 * 1000) }),
    ];
    const profile: RecommendationBehavioralProfileLike = {
      creatorAffinity: { "creator-1": 4.2 },
      categoryAffinity: { glam: 1.5 },
      themeAffinity: { glam: 1.1 },
    };

    const candidates = generateRecommendationCandidates({
      drops,
      profile,
      nowMs,
      limit: 12,
    });

    expect(candidates[0]?.drop.id).toBe("ending");
    expect(candidates[0]?.sources).toContain("ending_soon");
    expect(candidates[0]?.sources).toContain("followed_creator");
  });

  it("keeps deterministic penalties from inflating repeated exposure", () => {
    const repeatedDrop = buildDrop({ id: "repeat", creatorId: "creator-1" });
    const newDrop = buildDrop({ id: "new", creatorId: "creator-2", tags: ["fresh"] });
    const profile: RecommendationBehavioralProfileLike = {
      confidenceScore: 0.8,
      creatorAffinity: { "creator-1": 5, "creator-2": 3 },
      categoryAffinity: { glam: 1.5 },
      themeAffinity: { night: 1.1, fresh: 0.9 },
      recentDropIds: ["repeat"],
      recentCreatorIds: ["creator-1"],
      fatigueScore: 0.7,
      walletOpenPropensity: 0.5,
      unlockPropensity: 0.4,
      purchaseCount: 2,
      viewerToUnlockConversion: 0.3,
    };
    const dropIntelligence = new Map<string, RecommendationDropIntelligenceLike>([
      ["repeat", { dropId: "repeat", completionRate: 0.7, viewerToUnlockRate: 0.6, freshnessDecayScore: 0.7 }],
      ["new", { dropId: "new", completionRate: 0.7, viewerToUnlockRate: 0.6, freshnessDecayScore: 0.7 }],
    ]);

    const ranked = rankDeterministicRecommendations({
      candidates: generateRecommendationCandidates({ drops: [repeatedDrop, newDrop], profile, dropIntelligence, nowMs, limit: 12 }),
      profile,
      dropIntelligence,
      nowMs,
    });

    expect(ranked.find((entry) => entry.drop.id === "new")?.score).toBeGreaterThan(
      ranked.find((entry) => entry.drop.id === "repeat")?.score || 0,
    );
  });

  it("requires explicit behavioral truth score before boosting recommendation truth", () => {
    const drop = buildDrop({ id: "truth", creatorId: "creator-1" });
    const profileWithoutTruth: RecommendationBehavioralProfileLike = {
      confidenceScore: 0.95,
      creatorAffinity: { "creator-1": 5 },
      categoryAffinity: { glam: 4 },
      themeAffinity: { night: 3 },
    };
    const profileWithTruth: RecommendationBehavioralProfileLike = {
      ...profileWithoutTruth,
      truthScore: 0.8,
    };

    const withoutTruth = rankDeterministicRecommendations({
      candidates: generateRecommendationCandidates({ drops: [drop], profile: profileWithoutTruth, nowMs, limit: 12 }),
      profile: profileWithoutTruth,
      nowMs,
    })[0];
    const withTruth = rankDeterministicRecommendations({
      candidates: generateRecommendationCandidates({ drops: [drop], profile: profileWithTruth, nowMs, limit: 12 }),
      profile: profileWithTruth,
      nowMs,
    })[0];

    expect(withoutTruth?.features.truthScore).toBe(0);
    expect(withTruth?.features.truthScore).toBe(0.8);
    expect(withTruth?.score ?? 0).toBeGreaterThan(withoutTruth?.score ?? 0);
  });

  it("keeps inactive or stale artifact predictions out of ranking", () => {
    const artifact: RecommendationModelArtifact = {
      version: 1,
      generatedAt: new Date(nowMs).toISOString(),
      staleAfterMs: 1000,
      trainingSource: "synthetic_bootstrap",
      sampleCount: 10,
      holdoutSampleCount: 2,
      featureNames: ["creatorAffinity"],
      blendWeight: 0.18,
      evaluation: { meanAccuracy: 0.6, meanPositiveRate: 0.4 },
      heads: {
        predictedPaidConversion: { intercept: 0, weights: { creatorAffinity: 1.4 }, trainingAccuracy: 0.6 },
        predictedUnlock: { intercept: 0, weights: { creatorAffinity: 1.2 }, trainingAccuracy: 0.6 },
        predictedWatchCompletion: { intercept: 0, weights: { creatorAffinity: 1.1 }, trainingAccuracy: 0.6 },
        predictedReturn: { intercept: 0, weights: { creatorAffinity: 1 }, trainingAccuracy: 0.6 },
      },
    };

    const ranked = rankDeterministicRecommendations({
      candidates: generateRecommendationCandidates({
        drops: [buildDrop({ id: "ml", creatorId: "creator-1" })],
        profile: { creatorAffinity: { "creator-1": 5 }, confidenceScore: 0.8 },
        nowMs,
        limit: 12,
      }),
      profile: { creatorAffinity: { "creator-1": 5 }, confidenceScore: 0.8 },
      nowMs,
    })[0];

    const fresh = scoreRecommendationWithArtifact({
      features: ranked.features,
      artifact,
      nowMs,
    });
    expect(getRecommendationModelFreshness(artifact, nowMs)).toBe("fresh");
    expect(fresh).toBeNull();

    expect(getRecommendationModelFreshness(artifact, nowMs + 2_000)).toBe("stale");
    expect(scoreRecommendationWithArtifact({
      features: ranked.features,
      artifact,
      nowMs: nowMs + 2_000,
    })).toBeNull();
  });
});
