function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function scoreCoverSemanticAccuracy(input: {
  titleFlavorMatch: number;
  objectCategoryMatch: number;
  requiredTokenCoverage: number;
  forbiddenTokenAvoidance: number;
  creatorBrandCorrect: number;
  paletteFit: number;
}) {
  return clamp01(
    0.30 * clamp01(input.titleFlavorMatch)
    + 0.25 * clamp01(input.objectCategoryMatch)
    + 0.15 * clamp01(input.requiredTokenCoverage)
    + 0.15 * clamp01(input.forbiddenTokenAvoidance)
    + 0.10 * clamp01(input.creatorBrandCorrect)
    + 0.05 * clamp01(input.paletteFit),
  );
}

export function scoreCoverLayoutPreservation(input: {
  topBrandPlacement: number;
  mainTitleHierarchy: number;
  heroObjectCentered: number;
  bottomCtaPreserved: number;
  squarePosterStyle: number;
}) {
  return clamp01(
    0.35 * clamp01(input.topBrandPlacement)
    + 0.25 * clamp01(input.mainTitleHierarchy)
    + 0.20 * clamp01(input.heroObjectCentered)
    + 0.10 * clamp01(input.bottomCtaPreserved)
    + 0.10 * clamp01(input.squarePosterStyle),
  );
}

export function scoreCoverLearningResponse(input: {
  dislikeDeltasApplied: number;
  previousFailureAvoided: number;
  forbiddenTokensRemoved: number;
  referencePoolCorrected: number;
}) {
  return clamp01(
    0.40 * clamp01(input.dislikeDeltasApplied)
    + 0.25 * clamp01(input.previousFailureAvoided)
    + 0.20 * clamp01(input.forbiddenTokensRemoved)
    + 0.15 * clamp01(input.referencePoolCorrected),
  );
}

export function scoreCoverPromptReadiness(input: {
  semanticAccuracyScore: number;
  layoutPreservationScore: number;
  learningResponseScore: number;
  modelAdapterFit: number;
}) {
  return clamp01(
    0.45 * clamp01(input.semanticAccuracyScore)
    + 0.25 * clamp01(input.layoutPreservationScore)
    + 0.20 * clamp01(input.learningResponseScore)
    + 0.10 * clamp01(input.modelAdapterFit),
  );
}

export function scoreCoverReferenceSemanticConflict(input: {
  categoryMismatch: number;
  forbiddenTokenOverlap: number;
  objectFamilyMismatch: number;
  paletteConflict: number;
  dislikedSimilarity: number;
}) {
  return clamp01(
    0.35 * clamp01(input.categoryMismatch)
    + 0.25 * clamp01(input.forbiddenTokenOverlap)
    + 0.20 * clamp01(input.objectFamilyMismatch)
    + 0.10 * clamp01(input.paletteConflict)
    + 0.10 * clamp01(input.dislikedSimilarity),
  );
}

export function scoreCoverImprovementAttempt(input: {
  titleFlavorMatch: number;
  objectCategoryMatch: number;
  requiredTokenCoverage: number;
  forbiddenTokenAvoidance: number;
  creatorBrandCorrect: number;
  paletteFit: number;
  topBrandPlacement: number;
  mainTitleHierarchy: number;
  heroObjectCentered: number;
  bottomCtaPreserved: number;
  squarePosterStyle: number;
  dislikeDeltasApplied: number;
  previousFailureAvoided: number;
  forbiddenTokensRemoved: number;
  referencePoolCorrected: number;
  modelAdapterFit: number;
}) {
  const semanticAccuracyScore = scoreCoverSemanticAccuracy({
    titleFlavorMatch: input.titleFlavorMatch,
    objectCategoryMatch: input.objectCategoryMatch,
    requiredTokenCoverage: input.requiredTokenCoverage,
    forbiddenTokenAvoidance: input.forbiddenTokenAvoidance,
    creatorBrandCorrect: input.creatorBrandCorrect,
    paletteFit: input.paletteFit,
  });
  const layoutPreservationScore = scoreCoverLayoutPreservation({
    topBrandPlacement: input.topBrandPlacement,
    mainTitleHierarchy: input.mainTitleHierarchy,
    heroObjectCentered: input.heroObjectCentered,
    bottomCtaPreserved: input.bottomCtaPreserved,
    squarePosterStyle: input.squarePosterStyle,
  });
  const learningResponseScore = scoreCoverLearningResponse({
    dislikeDeltasApplied: input.dislikeDeltasApplied,
    previousFailureAvoided: input.previousFailureAvoided,
    forbiddenTokensRemoved: input.forbiddenTokensRemoved,
    referencePoolCorrected: input.referencePoolCorrected,
  });
  const overallPromptReadinessScore = scoreCoverPromptReadiness({
    semanticAccuracyScore,
    layoutPreservationScore,
    learningResponseScore,
    modelAdapterFit: input.modelAdapterFit,
  });

  return {
    semanticAccuracyScore,
    layoutPreservationScore,
    learningResponseScore,
    overallPromptReadinessScore,
  };
}
