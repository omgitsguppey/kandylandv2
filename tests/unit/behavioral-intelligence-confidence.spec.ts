import { describe, expect, it } from "vitest";

import {
  BEHAVIORAL_PROFILE_EXPLANATION_THRESHOLD,
  BEHAVIORAL_PROFILE_MIN_SIGNAL_THRESHOLD,
  buildBehavioralRecommendationState,
} from "@/lib/server/behavioral-intelligence";

describe("behavioral intelligence confidence gate", () => {
  it("marks weak profiles as insufficient signal", () => {
    expect(buildBehavioralRecommendationState({
      recommendationState: "insufficient-signal",
      confidenceScore: 0.12,
      insufficientSignal: true,
      insufficientSignalReason: "Not enough verified behavior signal yet.",
    })).toMatchObject({
      recommendationState: "insufficient-signal",
      confidenceScore: 0.12,
      insufficientSignal: true,
      explanationEligible: false,
    });
  });

  it("requires threshold and profile-driven state before explanations render", () => {
    expect(buildBehavioralRecommendationState({
      recommendationState: "profile-driven",
      confidenceScore: BEHAVIORAL_PROFILE_EXPLANATION_THRESHOLD + 0.05,
      recommendationThresholdMet: true,
    })).toMatchObject({
      insufficientSignal: false,
      explanationEligible: true,
    });
  });

  it("keeps fallback mode from rendering explanation cards even with partial signal", () => {
    expect(buildBehavioralRecommendationState({
      recommendationState: "deterministic-fallback",
      confidenceScore: BEHAVIORAL_PROFILE_MIN_SIGNAL_THRESHOLD + 0.05,
      recommendationThresholdMet: false,
    })).toMatchObject({
      insufficientSignal: false,
      explanationEligible: false,
    });
  });
});
