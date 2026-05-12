import { buildCoverSemanticBrief, type CoverSemanticBrief } from "./cover-semantic-brief";
import { compileCoverPrompt } from "./cover-prompt-compiler";
import { buildCoverDebugSummary, type CoverDebugSummary } from "./cover-debug-summary";
import { applyCoverOptimizerGuard, type CoverOptimizerGuardResult } from "./cover-optimizer-guard";
import { buildCoverReferencePolicy, type CoverReferencePolicy } from "./cover-reference-policy";
import { scoreCoverImprovementAttempt } from "./cover-improvement-score";

export type CoverGenerationPreflightInput = {
  title: string;
  creatorSelectedName?: string | null;
  creatorBrandName?: string | null;
  creatorPublicName?: string | null;
  creatorDisplayName?: string | null;
  imageModel: string;
  optimizerPrompt?: string | null;
  requestedReferenceCount?: number;
  selectedReferenceCount?: number;
  maxReferenceCount?: number;
};

export type CoverGenerationPreflightResult = {
  ok: boolean;
  blockedReason: string | null;
  semanticBrief: CoverSemanticBrief;
  prompt: {
    prompt: string;
    negativePrompt: string;
    debugBrief: Record<string, unknown>;
  };
  optimizerGuard: CoverOptimizerGuardResult;
  referencePolicy: CoverReferencePolicy;
  debugSummary: CoverDebugSummary;
  readinessScore: number;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[’']/g, "'");
}

function tokenize(text: string) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function includesTerm(text: string, phrase: string) {
  const normalizedPhrase = normalizeText(phrase).trim();
  if (normalizedPhrase.length === 0) {
    return false;
  }
  if (normalizedPhrase.includes(" ")) {
    return normalizeText(text).includes(normalizedPhrase);
  }
  return tokenize(text).includes(normalizedPhrase);
}

function coverageScore(text: string, tokens: string[]) {
  if (tokens.length === 0) {
    return 1;
  }
  const matches = tokens.filter((token) => includesTerm(text, token));
  return matches.length / tokens.length;
}

function buildMissingRequiredTokenReason(prompt: string, requiredTokens: string[]) {
  const missing = requiredTokens.filter((token) => !includesTerm(prompt, token));
  return missing.length > 0 ? `Missing required title-safe tokens: ${missing.slice(0, 4).join(", ")}.` : null;
}

function buildForbiddenTokenReason(prompt: string, forbiddenTokens: string[]) {
  const found = forbiddenTokens.find((token) => includesTerm(prompt, token));
  return found ? `Forbidden token detected: ${found}.` : null;
}

export function validateCoverPromptAgainstSemanticBrief(prompt: string, brief: CoverSemanticBrief) {
  const forbiddenTokenReason = buildForbiddenTokenReason(prompt, brief.forbiddenTokens);
  if (forbiddenTokenReason) {
    return forbiddenTokenReason;
  }

  const missingRequiredTokenReason = buildMissingRequiredTokenReason(prompt, brief.requiredTokens);
  if (missingRequiredTokenReason) {
    return missingRequiredTokenReason;
  }

  if (!includesTerm(prompt, brief.creatorBrand)) {
    return "Creator brand text does not match the title-derived brand.";
  }

  if (!includesTerm(prompt, brief.flavorTitle)) {
    return "Main title text does not match the requested flavor title.";
  }

  if (!includesTerm(prompt, brief.semanticCategory.replace(/_/g, " "))) {
    return "Semantic category was not locked into the prompt.";
  }

  if (!includesTerm(prompt, brief.heroObject)) {
    return "Hero object conflicts with the title-derived semantic brief.";
  }

  return null;
}

export function buildCoverGenerationPreflight(input: CoverGenerationPreflightInput): CoverGenerationPreflightResult {
  const semanticBrief = buildCoverSemanticBrief({
    title: input.title,
    creatorSelectedName: input.creatorSelectedName,
    creatorBrandName: input.creatorBrandName,
    creatorPublicName: input.creatorPublicName,
    creatorDisplayName: input.creatorDisplayName,
  });

  const prompt = compileCoverPrompt({
    title: input.title,
    creatorSelectedName: input.creatorSelectedName,
    creatorBrandName: input.creatorBrandName,
    creatorPublicName: input.creatorPublicName,
    creatorDisplayName: input.creatorDisplayName,
    imageModel: input.imageModel,
    optimizerPrompt: input.optimizerPrompt || null,
  });

  const optimizerGuard = applyCoverOptimizerGuard({
    brief: semanticBrief,
    optimizerPrompt: input.optimizerPrompt || null,
  });
  const referencePolicy = buildCoverReferencePolicy({
    modelId: input.imageModel,
    maxReferences: input.maxReferenceCount ?? 0,
    requestedReferenceCount: input.requestedReferenceCount ?? 0,
    selectedReferenceCount: input.selectedReferenceCount ?? 0,
    brief: semanticBrief,
  });
  const debugSummary = buildCoverDebugSummary({
    brief: semanticBrief,
    optimizerGuard,
    referencePolicy,
    modelId: input.imageModel,
  });
  const baseReadinessScore = scoreCoverImprovementAttempt({
    titleFlavorMatch: includesTerm(prompt.prompt, semanticBrief.flavorTitle) ? 1 : 0,
    objectCategoryMatch: includesTerm(prompt.prompt, semanticBrief.semanticCategory.replace(/_/g, " ")) ? 1 : 0,
    requiredTokenCoverage: coverageScore(prompt.prompt, semanticBrief.requiredTokens),
    forbiddenTokenAvoidance: semanticBrief.forbiddenTokens.some((token) => includesTerm(prompt.prompt, token)) ? 0 : 1,
    creatorBrandCorrect: includesTerm(prompt.prompt, semanticBrief.creatorBrand) ? 1 : 0,
    paletteFit: coverageScore(prompt.prompt, semanticBrief.allowedPaletteTokens),
    topBrandPlacement: includesTerm(prompt.prompt, "Top brand text") ? 1 : 0,
    mainTitleHierarchy: includesTerm(prompt.prompt, "Main title") ? 1 : 0,
    heroObjectCentered: includesTerm(prompt.prompt, "Hero object") ? 1 : 0,
    bottomCtaPreserved: includesTerm(prompt.prompt, "bottom bar text") ? 1 : 0,
    squarePosterStyle: includesTerm(prompt.prompt, "square KandyDrops cover layout") ? 1 : 0,
    dislikeDeltasApplied: optimizerGuard.acceptedText.length > 0 ? 1 : 0,
    previousFailureAvoided: optimizerGuard.rejectedText.length > 0 ? 1 : 0,
    forbiddenTokensRemoved: optimizerGuard.rejectedText.length > 0 ? 1 : 0,
    referencePoolCorrected: referencePolicy.referencePoolTrimmed ? 1 : 0,
    modelAdapterFit: 1,
  });
  const readinessScore = optimizerGuard.rejectedText.length > 0
    ? Math.max(0, Number((baseReadinessScore.overallPromptReadinessScore - 0.35).toFixed(4)))
    : baseReadinessScore.overallPromptReadinessScore;

  if (referencePolicy.selectedReferenceCount > referencePolicy.maxReferences) {
    return {
      ok: false,
      blockedReason: "Reference selection exceeded the selected model limit.",
      semanticBrief,
      prompt,
      optimizerGuard,
      referencePolicy,
      debugSummary,
      readinessScore,
    };
  }

  if (readinessScore < 0.78) {
    return {
      ok: false,
      blockedReason: "Prompt blocked before generation because it still conflicts with the title.",
      semanticBrief,
      prompt,
      optimizerGuard,
      referencePolicy,
      debugSummary,
      readinessScore,
    };
  }

  const validationReason = validateCoverPromptAgainstSemanticBrief(prompt.prompt, semanticBrief);
  if (validationReason) {
    return {
      ok: false,
      blockedReason: validationReason,
      semanticBrief,
      prompt,
      optimizerGuard,
      referencePolicy,
      debugSummary,
      readinessScore,
    };
  }

  return {
    ok: true,
    blockedReason: null,
    semanticBrief,
    prompt,
    optimizerGuard,
    referencePolicy,
    debugSummary,
    readinessScore,
  };
}
