import { getDefaultCoverLayoutDna } from "./cover-layout-dna";
import { buildCoverSemanticBrief } from "./cover-semantic-brief";
import { applyCoverOptimizerGuard } from "./cover-optimizer-guard";
import { adaptCoverPromptForModel, mapCoverModelAdapter } from "./model-prompt-adapters";
import { DEFAULT_COVER_FEEDBACK_WEIGHTS, type CoverFeedbackWeights } from "./cover-feedback-weights";

export type CoverPromptCompileInput = {
  title: string;
  creatorSelectedName?: string | null;
  creatorBrandName?: string | null;
  creatorPublicName?: string | null;
  creatorDisplayName?: string | null;
  referenceCoverStyleId?: string | null;
  imageModel: string;
  feedbackWeights?: Partial<CoverFeedbackWeights>;
  optimizerPrompt?: string | null;
};

export type CoverPromptCompileOutput = {
  prompt: string;
  negativePrompt: string;
  debugBrief: Record<string, unknown>;
};

function compactTokens(tokens: string[]) {
  return Array.from(new Set(tokens.map((token) => token.trim().toLowerCase()).filter(Boolean)));
}

export function compileCoverPrompt(input: CoverPromptCompileInput): CoverPromptCompileOutput {
  const brief = buildCoverSemanticBrief({
    title: input.title,
    creatorSelectedName: input.creatorSelectedName,
    creatorBrandName: input.creatorBrandName,
    creatorPublicName: input.creatorPublicName,
    creatorDisplayName: input.creatorDisplayName,
  });
  const layout = getDefaultCoverLayoutDna();
  const feedbackWeights = { ...DEFAULT_COVER_FEEDBACK_WEIGHTS, ...(input.feedbackWeights || {}) };
  const optimizerGuard = applyCoverOptimizerGuard({
    brief,
    optimizerPrompt: input.optimizerPrompt || null,
  });
  const allowedRefinements = optimizerGuard.acceptedText.length > 0
    ? `Safe refinement from feedback: ${optimizerGuard.acceptedText}.`
    : "";

  const basePrompt = [
    `Keep the same square KandyDrops cover layout and typography hierarchy as the selected reference${input.referenceCoverStyleId ? ` (${input.referenceCoverStyleId})` : ""}.`,
    `Top brand text: ${brief.creatorBrand}.`,
    `Main title: ${brief.flavorTitle}.`,
    `Lock the semantic category to ${brief.semanticCategory.replace(/_/g, " ")} (${brief.semanticCategory}).`,
    `Hero object: ${brief.heroObject}.`,
    `Allow category-safe enrichment only within that semantic category using ingredients, garnish, texture, props, plating, palette, and atmosphere cues that match the title.`,
    `Use ${brief.allowedPaletteTokens.join(", ")}.`,
    `Allowed category-safe detail cues: ${compactTokens([...brief.allowedIngredientTokens, ...brief.allowedTextureTokens]).join(", ")}.`,
    `Keep all category drift out of the result and preserve the title-derived concept exactly.`,
    `Preserve bottom bar text: ${layout.bottomBarText}.`,
    `Do not add profile/display name unless it appears in the title.`,
    allowedRefinements,
  ].filter((line) => line.length > 0).join(" ");

  const adapter = mapCoverModelAdapter(input.imageModel);
  const adapted = adaptCoverPromptForModel(adapter, basePrompt, compactTokens(brief.forbiddenTokens));
  return {
    prompt: adapted.prompt,
    negativePrompt: adapted.negativePrompt,
    debugBrief: {
      title: brief.title,
      creatorBrandFromTitle: brief.source.creatorBrand === "title_prefix" ? brief.creatorBrand : null,
      creatorBrandResolved: brief.creatorBrand,
      flavorTitle: brief.flavorTitle,
      semanticCategory: brief.semanticCategory,
      heroObject: brief.heroObject,
      requiredTokens: brief.requiredTokens,
      allowedIngredientTokens: brief.allowedIngredientTokens,
      allowedTextureTokens: brief.allowedTextureTokens,
      allowedPaletteTokens: brief.allowedPaletteTokens,
      forbiddenTokens: brief.forbiddenTokens,
      forbiddenCategories: brief.forbiddenCategories,
      optimizerGuard,
      adapter,
      feedbackWeights,
      coverTitleSource: brief.source.creatorBrand === "title_prefix" ? "title-prefix" : "title",
      coverPromptSource: "deterministic-compiler",
      semanticBrief: brief,
    },
  };
}
