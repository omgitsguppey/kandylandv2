import { buildCoverSemanticAllowList, type CoverSemanticBrief } from "./cover-semantic-brief";
import { buildCoverNegativePromptLine, type CoverNegativeMemory } from "./cover-negative-memory";
import type { CoverFeedbackNormalization } from "./cover-feedback-normalizer";

export type CoverPromptDeltaEngineInput = {
  brief: CoverSemanticBrief;
  negativeMemory: CoverNegativeMemory;
  feedback: CoverFeedbackNormalization;
  optimizerSuggestion?: string | null;
};

export type CoverPromptDeltaEngineOutput = {
  promptInstruction: string;
  acceptedSuggestions: string[];
  rejectedSuggestions: string[];
  allowlist: string[];
  blockGeneration: boolean;
  blockReason: string | null;
  dislikeDeltasApplied: number;
  previousFailureAvoided: number;
  forbiddenTokensRemoved: number;
  referencePoolCorrected: number;
};

const CONTROL_TOKENS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "for",
  "with",
  "within",
  "only",
  "keep",
  "make",
  "use",
  "allow",
  "treat",
  "force",
  "title",
  "brief",
  "category",
  "layout",
  "reference",
  "references",
  "safe",
  "enrichment",
  "prompt",
  "style",
  "preserve",
  "same",
  "current",
  "explicitly",
  "unless",
  "avoid",
  "do",
  "not",
  "from",
  "into",
  "by",
  "as",
  "is",
  "are",
  "be",
  "this",
  "that",
  "new",
  "next",
  "version",
  "versions",
  "good",
  "bad",
  "candidate",
  "deterministic",
  "learning",
]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[â€™']/g, "'");
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function containsForbiddenToken(text: string, tokens: string[]) {
  const textTokens = new Set(tokenize(text));
  return tokens.some((token) => {
    const phraseTokens = tokenize(token);
    if (phraseTokens.length === 1) {
      return textTokens.has(phraseTokens[0]);
    }
    return normalizeText(text).includes(normalizeText(token));
  });
}

function lineHasOnlyAllowlistedTokens(line: string, allowlist: string[]) {
  const allowset = new Set(allowlist.map((token) => normalizeText(token).trim()));
  for (const token of tokenize(line)) {
    if (allowset.has(token) || CONTROL_TOKENS.has(token)) {
      continue;
    }
    return false;
  }
  return true;
}

function buildRequiredLine(brief: CoverSemanticBrief) {
  return `Force the title semantics exactly: creator brand ${brief.creatorBrand}; flavor title ${brief.flavorTitle}; semantic category ${brief.semanticCategory}; hero object ${brief.heroObject}.`;
}

function buildForbiddenLine(brief: CoverSemanticBrief, negativeMemory: CoverNegativeMemory) {
  const topForbidden = Array.from(new Set([
    ...brief.forbiddenTokens,
    ...negativeMemory.forbiddenTokens,
  ])).slice(0, 10);
  return topForbidden.length > 0
    ? `Forbid semantic drift toward: ${topForbidden.join(", ")}.`
    : "Forbid semantic drift away from the title-defined category.";
}

function buildCategorySafeEnrichmentLine(brief: CoverSemanticBrief) {
  return `Allow enrichment only within the same category using ingredients, garnish, texture, props, plating, palette, and atmosphere cues from: ${Array.from(new Set([
    ...brief.allowedIngredientTokens,
    ...brief.allowedTextureTokens,
    ...brief.allowedPaletteTokens,
  ])).slice(0, 12).join(", ")}.`;
}

function buildReferenceLine() {
  return "Treat references as layout-only unless a reference is explicitly accepted for style and still remains category-safe.";
}

export function buildCoverPromptDeltaEngine(input: CoverPromptDeltaEngineInput): CoverPromptDeltaEngineOutput {
  const allowlist = Array.from(new Set([
    ...buildCoverSemanticAllowList(input.brief),
    "layout",
    "typography",
    "square",
    "poster",
    "reference",
    "brand",
    "title",
    "hero",
    "object",
    "category",
    "palette",
    "enrichment",
    "ingredients",
    "garnish",
    "texture",
    "props",
    "plating",
    "atmosphere",
  ]));

  const acceptedSuggestions: string[] = [
    buildRequiredLine(input.brief),
    buildCategorySafeEnrichmentLine(input.brief),
    buildReferenceLine(),
  ];
  const blockedConstraintLine = buildForbiddenLine(input.brief, input.negativeMemory);

  const rejectedSuggestions: string[] = [];
  const optimizerSuggestion = (input.optimizerSuggestion || "").trim();
  if (optimizerSuggestion.length > 0) {
    for (const line of optimizerSuggestion.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      if (containsForbiddenToken(line, input.brief.forbiddenTokens) || containsForbiddenToken(line, input.negativeMemory.forbiddenTokens)) {
        rejectedSuggestions.push(line);
        continue;
      }
      if (containsForbiddenToken(line, input.brief.forbiddenCategories)) {
        rejectedSuggestions.push(line);
        continue;
      }
      if (!lineHasOnlyAllowlistedTokens(line, allowlist)) {
        rejectedSuggestions.push(line);
        continue;
      }
      acceptedSuggestions.push(line);
    }
  }

  const promptInstruction = acceptedSuggestions.join(" ");
  const blockGeneration = input.feedback.feedbackKind === "disliked" && input.negativeMemory.blockStrength >= 0.85;

  return {
    promptInstruction,
    acceptedSuggestions,
    rejectedSuggestions: rejectedSuggestions.concat(blockedConstraintLine.length > 0 ? [blockedConstraintLine] : []),
    allowlist,
    blockGeneration,
    blockReason: blockGeneration ? "Repeated dislike escalation blocked prompt generation." : null,
    dislikeDeltasApplied: input.feedback.feedbackKind === "disliked" ? Math.min(1, input.feedback.failureTags.length / 4 || 0.5) : 0,
    previousFailureAvoided: input.negativeMemory.repeatedFailureTags.length > 0 ? Math.min(1, input.negativeMemory.repeatedFailureTags[0].count / 3) : 0,
    forbiddenTokensRemoved: input.negativeMemory.forbiddenTokens.length > 0 ? 1 : 0,
    referencePoolCorrected: input.negativeMemory.blockedReferenceIds.length > 0 ? 1 : 0,
  };
}
