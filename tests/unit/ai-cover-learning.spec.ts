import { describe, expect, it } from "vitest";

import { buildCoverSemanticBrief } from "@/lib/ai-cover/cover-semantic-brief";
import { buildCoverFeedbackNormalization } from "@/lib/ai-cover/cover-feedback-normalizer";
import { buildCoverNegativeMemory } from "@/lib/ai-cover/cover-negative-memory";
import { buildCoverPromptDeltaEngine } from "@/lib/ai-cover/cover-prompt-delta-engine";
import { buildCoverGenerationPreflight } from "@/lib/ai-cover/cover-generation-preflight";
import { selectDeterministicCoverReferences } from "@/lib/ai-cover/cover-reference-selector";
import { scoreCoverImprovementAttempt } from "@/lib/ai-cover/cover-improvement-score";
import { scoreCoverReferenceSemanticConflict } from "@/lib/ai-cover/cover-reference-eligibility";
import type { CoverLearningRecord } from "@/lib/ai-cover/cover-learning-contract";

function makeRecord(overrides: Partial<CoverLearningRecord>): CoverLearningRecord {
  return {
    id: overrides.id || "record-1",
    creatorId: overrides.creatorId || "creator-1",
    title: overrides.title || "Jessi Ray's Pink Lemonade",
    creatorBrand: overrides.creatorBrand || "Jessi Ray's",
    flavorTitle: overrides.flavorTitle || "Pink Lemonade",
    semanticCategory: overrides.semanticCategory || "pink_lemonade_beverage",
    modelId: overrides.modelId || "image_2_5",
    modelFamily: overrides.modelFamily || "standard",
    referenceIds: overrides.referenceIds || ["ref-1"],
    promptCompilerVersion: overrides.promptCompilerVersion || "hard-cutover-v2",
    semanticBriefVersion: overrides.semanticBriefVersion || "hard-cutover-v2",
    feedbackKind: overrides.feedbackKind || "disliked",
    referenceEligibility: overrides.referenceEligibility || "negative_constraint",
    failureTags: overrides.failureTags || ["optimizer_contamination"],
    positiveTags: overrides.positiveTags || [],
    acceptedAt: overrides.acceptedAt,
    dislikedAt: overrides.dislikedAt || Date.now(),
    usedAsCoverAt: overrides.usedAsCoverAt,
    createdAt: overrides.createdAt || Date.now(),
    promptHash: overrides.promptHash || "prompt-hash",
    semanticBriefHash: overrides.semanticBriefHash || "brief-hash",
  };
}

describe("ai cover learning cutover", () => {
  it("treats dislikes as negative constraints and returns an honest toast message", () => {
    const brief = buildCoverSemanticBrief({ title: "Jessi Ray's Pink Lemonade", creatorSelectedName: "Jessi Ray" });
    const normalization = buildCoverFeedbackNormalization({
      action: "dislike",
      title: brief.title,
      creatorName: "Jessi Ray",
      workingPrompt: "Jessi Ray's Pink Lemonade cherry crush chocolate fudge",
      referenceAssets: [{ title: "Cherry Crush", creatorName: "Other Creator" }],
    });

    expect(normalization.feedbackKind).toBe("disliked");
    expect(normalization.referenceEligibility).toBe("negative_constraint");
    expect(normalization.failureTags).toContain("category_conflict");
    expect(normalization.nextToastMessage).toContain("avoid pink lemonade");
  });

  it("rejects neutral and disliked references while preferring accepted references", () => {
    const brief = buildCoverSemanticBrief({ title: "Jessi Ray's Pink Lemonade", creatorSelectedName: "Jessi Ray" });
    const selection = selectDeterministicCoverReferences({
      brief,
      modelId: "image_2_5",
      maxReferenceCount: 2,
      requestedReferenceCount: 4,
      candidates: [
        { id: "primary", title: "Template Layout", selectedAsPrimaryLayout: true, feedbackKind: "ignored" },
        { id: "accepted", title: "Pink Lemonade", creatorName: "Jessi Ray", feedbackKind: "accepted_as_cover" },
        { id: "liked", title: "Pink Lemonade", creatorName: "Jessi Ray", feedbackKind: "liked" },
        { id: "neutral", title: "Blueberry Muffins", feedbackKind: "generated" },
        { id: "disliked", title: "Cherry Crush", feedbackKind: "disliked" },
      ],
    });

    expect(selection.selectedReferences.map((entry) => entry.candidate.id)).toContain("primary");
    expect(selection.selectedReferences.map((entry) => entry.candidate.id)).toContain("accepted");
    expect(selection.selectedReferences.map((entry) => entry.candidate.id)).not.toContain("neutral");
    expect(selection.rejectedReferences.map((entry) => entry.candidate.id)).toContain("disliked");
    expect(selection.selectedReferences[0]?.role).toBe("primary_layout_reference");
  });

  it("keeps accepted references ahead of liked references when both are eligible", () => {
    const brief = buildCoverSemanticBrief({ title: "Jessi Ray's Pink Lemonade", creatorSelectedName: "Jessi Ray" });
    const selection = selectDeterministicCoverReferences({
      brief,
      modelId: "image_2_5",
      maxReferenceCount: 3,
      requestedReferenceCount: 3,
      candidates: [
        { id: "primary", title: "Template Layout", selectedAsPrimaryLayout: true, feedbackKind: "ignored" },
        { id: "accepted", title: "Pink Lemonade", creatorName: "Jessi Ray", feedbackKind: "accepted_as_cover" },
        { id: "liked", title: "Pink Lemonade", creatorName: "Jessi Ray", feedbackKind: "liked" },
      ],
    });

    expect(selection.selectedReferences.map((entry) => entry.candidate.id)).toEqual(["primary", "accepted", "liked"]);
  });

  it("blocks beverage references from influencing blueberry muffin covers", () => {
    const target = buildCoverSemanticBrief({ title: "Bloomytrip's Blueberry Muffins", creatorSelectedName: "Bloomytrip" });
    const conflict = scoreCoverReferenceSemanticConflict(target, {
      id: "drink-ref",
      title: "Pink Lemonade",
      creatorName: "Other Creator",
      feedbackKind: "liked",
      referenceEligibility: "positive_reference",
    });

    expect(conflict.score).toBeGreaterThan(0.45);
    expect(conflict.categoryMismatch).toBe(1);
  });

  it("rejects cross-category optimizer suggestions and keeps category-safe deltas", () => {
    const brief = buildCoverSemanticBrief({ title: "Jessi Ray's Pink Lemonade", creatorSelectedName: "Jessi Ray" });
    const negativeMemory = buildCoverNegativeMemory({
      brief,
      records: [makeRecord({ failureTags: ["optimizer_contamination", "source_object_bleed"] })],
    });
    const delta = buildCoverPromptDeltaEngine({
      brief,
      negativeMemory,
      feedback: buildCoverFeedbackNormalization({
        action: "dislike",
        title: brief.title,
        creatorName: "Jessi Ray",
        workingPrompt: "Pink Lemonade cherry crush chocolate fudge",
      }),
      optimizerSuggestion: "Use chocolate mountain peaks and copper serving pedestal with cherry crush candy drink.",
    });

    expect(delta.rejectedSuggestions).toHaveLength(2);
    expect(delta.rejectedSuggestions).toContain("Use chocolate mountain peaks and copper serving pedestal with cherry crush candy drink.");
    expect(delta.rejectedSuggestions.some((line) => line.startsWith("Forbid semantic drift toward:"))).toBe(true);
    expect(delta.promptInstruction).toContain("Force the title semantics exactly");
    expect(delta.promptInstruction).toContain("pink lemonade");
    expect(delta.promptInstruction).toContain("lemon slices");
  });

  it("escalates repeated dislikes into stronger block strength", () => {
    const brief = buildCoverSemanticBrief({ title: "Jessi Ray's Pink Lemonade", creatorSelectedName: "Jessi Ray" });
    const memory = buildCoverNegativeMemory({
      brief,
      records: [
        makeRecord({ id: "r1", failureTags: ["optimizer_contamination"], dislikedAt: Date.now() }),
        makeRecord({ id: "r2", failureTags: ["optimizer_contamination"], dislikedAt: Date.now() }),
      ],
    });

    expect(memory.blockStrength).toBeGreaterThan(0.3);
    expect(memory.repeatedFailureTags[0]?.tag).toBe("optimizer_contamination");
    expect(memory.repeatedFailureTags[0]?.count).toBe(2);
  });

  it("scores prompt readiness and blocks bad prompts before generation", () => {
    const score = scoreCoverImprovementAttempt({
      titleFlavorMatch: 1,
      objectCategoryMatch: 1,
      requiredTokenCoverage: 1,
      forbiddenTokenAvoidance: 1,
      creatorBrandCorrect: 1,
      paletteFit: 1,
      topBrandPlacement: 1,
      mainTitleHierarchy: 1,
      heroObjectCentered: 1,
      bottomCtaPreserved: 1,
      squarePosterStyle: 1,
      dislikeDeltasApplied: 1,
      previousFailureAvoided: 1,
      forbiddenTokensRemoved: 1,
      referencePoolCorrected: 1,
      modelAdapterFit: 1,
    });

    expect(score.overallPromptReadinessScore).toBeGreaterThan(0.78);

    const preflight = buildCoverGenerationPreflight({
      title: "Jessi Ray's Pink Lemonade",
      creatorSelectedName: "Jessi Ray",
      imageModel: "image_2_5",
      optimizerPrompt: "Add cherry crush chocolate fudge and copper serving pedestal.",
      requestedReferenceCount: 17,
      selectedReferenceCount: 2,
      maxReferenceCount: 2,
    });

    expect(preflight.ok).toBe(false);
    expect(preflight.blockedReason).toBeTruthy();
    expect(preflight.readinessScore).toBeLessThan(0.78);
  });
});
