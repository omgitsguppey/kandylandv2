import type { CoverFeedbackWeightTag } from "./cover-feedback-weights";
import type { CoverFeedbackKind, CoverFailureTag, CoverReferenceEligibility } from "./cover-learning-contract";
import { buildCoverSemanticBrief, type CoverSemanticBrief } from "./cover-semantic-brief";

type CoverReferenceAssetLike = {
  title?: string | null;
  creatorName?: string | null;
  feedback?: string | null;
  retentionReason?: string | null;
  accepted?: boolean | null;
};

export type CoverFeedbackNormalizationInput = {
  action: "like" | "dislike" | "accept" | "link_drop";
  title: string;
  creatorId?: string | null;
  creatorName?: string | null;
  dropId?: string | null;
  feedback?: string | null;
  accepted?: boolean | null;
  acceptedForDropId?: string | null;
  workingPrompt?: string | null;
  optimizerAdjustedPrompt?: string | null;
  providerEnhancedPrompt?: string | null;
  referenceAssets?: CoverReferenceAssetLike[] | null;
  semanticBrief?: CoverSemanticBrief | null;
};

export type CoverFeedbackNormalization = {
  feedbackKind: CoverFeedbackKind;
  referenceEligibility: CoverReferenceEligibility;
  failureTags: CoverFailureTag[];
  positiveTags: CoverFeedbackWeightTag[];
  inferredCategoryLabel: string;
  nextToastMessage: string;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[â€™']/g, "'");
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function includesTerm(text: string, term: string) {
  const normalizedTerm = normalizeText(term).trim();
  if (!normalizedTerm) {
    return false;
  }
  if (normalizedTerm.includes(" ")) {
    return normalizeText(text).includes(normalizedTerm);
  }
  return tokenize(text).includes(normalizedTerm);
}

function readPromptText(input: CoverFeedbackNormalizationInput) {
  return [
    input.workingPrompt,
    input.optimizerAdjustedPrompt,
    input.providerEnhancedPrompt,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join("\n");
}

function inferCategoryLabel(brief: CoverSemanticBrief) {
  if (brief.semanticCategory.includes("pink_lemonade")) {
    return "pink lemonade";
  }
  if (brief.semanticCategory.includes("muffin")) {
    return "muffin/bakery";
  }
  if (brief.semanticCategory.includes("chocolate_bar")) {
    return "chocolate bar";
  }
  return brief.semanticCategory.replace(/_/g, " ");
}

function inferFailureTags(input: CoverFeedbackNormalizationInput, brief: CoverSemanticBrief) {
  const prompt = readPromptText(input);
  const referenceText = (input.referenceAssets || [])
    .map((asset) => [asset.title, asset.creatorName].filter(Boolean).join(" "))
    .join(" ")
    .trim();
  const targetText = [brief.creatorBrand, brief.flavorTitle, brief.semanticCategory.replace(/_/g, " "), brief.heroObject].join(" ");
  const promptText = `${prompt}\n${referenceText}\n${targetText}`;
  const failures = new Set<CoverFailureTag>();

  if (!includesTerm(promptText, brief.creatorBrand)) {
    failures.add("wrong_creator_brand");
  }
  if (!includesTerm(promptText, brief.flavorTitle)) {
    failures.add("wrong_title_text");
  }
  if (!includesTerm(promptText, brief.heroObject)) {
    failures.add("wrong_flavor_object");
  }
  if (brief.forbiddenTokens.some((token) => includesTerm(promptText, token))) {
    failures.add("category_conflict");
  }
  if (brief.forbiddenCategories.some((token) => includesTerm(promptText, token))) {
    failures.add("wrong_object_category");
  }

  const promptHasReferenceBleed = (input.referenceAssets || []).some((asset) => {
    const assetText = [asset.title, asset.creatorName].filter(Boolean).join(" ");
    if (!assetText) {
      return false;
    }
    const assetTokens = tokenize(assetText);
    const targetTokens = tokenize(targetText);
    const overlap = assetTokens.filter((token) => !targetTokens.includes(token));
    return overlap.length >= 2 && !assetText.toLowerCase().includes(brief.flavorTitle.toLowerCase());
  });

  if (promptHasReferenceBleed) {
    failures.add("reference_contamination");
  }

  if (input.optimizerAdjustedPrompt && brief.forbiddenTokens.some((token) => includesTerm(input.optimizerAdjustedPrompt || "", token))) {
    failures.add("optimizer_contamination");
  }

  if (includesTerm(promptText, "layout") && !includesTerm(promptText, "square")) {
    failures.add("layout_drift");
  }

  if (includesTerm(promptText, "cta") && !includesTerm(promptText, "unwrap")) {
    failures.add("cta_changed");
  }

  if (promptText.trim().length < 20) {
    failures.add("low_quality");
  }

  return Array.from(failures);
}

function inferPositiveTags(input: CoverFeedbackNormalizationInput, brief: CoverSemanticBrief) {
  const prompt = readPromptText(input);
  const positive: CoverFeedbackWeightTag[] = [];

  if (includesTerm(prompt, brief.creatorBrand)) {
    positive.push("creator_brand_correct");
  }
  if (includesTerm(prompt, brief.flavorTitle)) {
    positive.push("title_correct");
  }
  if (includesTerm(prompt, brief.heroObject)) {
    positive.push("hero_object_correct");
  }
  if (brief.allowedPaletteTokens.some((token) => includesTerm(prompt, token))) {
    positive.push("palette_correct");
  }
  if (includesTerm(prompt, "square") && includesTerm(prompt, "poster")) {
    positive.push("layout_preserved");
  }
  if (includesTerm(prompt, "unwrap")) {
    positive.push("cta_preserved");
  }
  if (brief.allowedIngredientTokens.some((token) => includesTerm(prompt, token))) {
    positive.push("flavor_world_correct");
  }

  return Array.from(new Set(positive));
}

export function normalizeCoverFeedback(input: CoverFeedbackNormalizationInput): CoverFeedbackNormalization {
  const semanticBrief = input.semanticBrief || buildCoverSemanticBrief({
    title: input.title,
    creatorSelectedName: input.creatorName,
    creatorDisplayName: input.creatorName,
  });

  const feedbackKind: CoverFeedbackKind = input.action === "like"
    ? "liked"
    : input.action === "dislike"
      ? "disliked"
      : input.action === "accept"
        ? "accepted_as_cover"
        : "used_as_cover";

  const referenceEligibility: CoverReferenceEligibility = feedbackKind === "accepted_as_cover" || feedbackKind === "used_as_cover"
    ? "positive_reference"
    : feedbackKind === "liked"
      ? "positive_reference"
      : feedbackKind === "disliked"
        ? "negative_constraint"
        : feedbackKind === "failed" || feedbackKind === "blocked"
          ? "blocked_reference"
          : feedbackKind === "generated" || feedbackKind === "ignored"
            ? "neutral_history"
            : "debug_only";

  const failureTags = feedbackKind === "disliked"
    ? inferFailureTags(input, semanticBrief)
    : [];
  const positiveTags = inferPositiveTags(input, semanticBrief);

  const inferredCategoryLabel = inferCategoryLabel(semanticBrief);
  const nextToastMessage = feedbackKind === "disliked"
    ? `Got it. Next version will avoid ${inferredCategoryLabel}.`
    : feedbackKind === "liked"
      ? "Generation liked."
      : "Cover accepted.";

  return {
    feedbackKind,
    referenceEligibility,
    failureTags,
    positiveTags,
    inferredCategoryLabel,
    nextToastMessage,
  };
}

export const buildCoverFeedbackNormalization = normalizeCoverFeedback;
