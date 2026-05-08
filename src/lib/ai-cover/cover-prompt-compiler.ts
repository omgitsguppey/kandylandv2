import { resolveCreatorBrand } from "./creator-brand-resolver";
import { getDefaultCoverLayoutDna } from "./cover-layout-dna";
import { parseCoverTitle } from "./cover-title-parser";
import { DEFAULT_COVER_FEEDBACK_WEIGHTS, type CoverFeedbackWeights } from "./cover-feedback-weights";
import { adaptCoverPromptForModel, mapCoverModelAdapter } from "./model-prompt-adapters";

export type CoverPromptCompileInput = {
  title: string;
  creatorSelectedName?: string | null;
  creatorBrandName?: string | null;
  creatorPublicName?: string | null;
  creatorDisplayName?: string | null;
  referenceCoverStyleId?: string | null;
  imageModel: string;
  feedbackWeights?: Partial<CoverFeedbackWeights>;
};

export type CoverPromptCompileOutput = {
  prompt: string;
  negativePrompt: string;
  debugBrief: Record<string, unknown>;
};

export function compileCoverPrompt(input: CoverPromptCompileInput): CoverPromptCompileOutput {
  const parsed = parseCoverTitle(input.title);
  const creatorBrand = resolveCreatorBrand({
    titlePrefixBrand: parsed.creatorBrandFromTitle,
    creatorBrandName: input.creatorBrandName,
    creatorPublicName: input.creatorPublicName,
    creatorDisplayName: input.creatorDisplayName || input.creatorSelectedName,
    creatorProfileFallback: input.creatorSelectedName,
  });
  const layout = getDefaultCoverLayoutDna();
  const feedbackWeights = { ...DEFAULT_COVER_FEEDBACK_WEIGHTS, ...(input.feedbackWeights || {}) };
  const basePrompt = [
    `Keep the same square KandyDrops cover layout and typography hierarchy as the selected reference${input.referenceCoverStyleId ? ` (${input.referenceCoverStyleId})` : ""}.`,
    `Top brand text: ${creatorBrand}.`,
    `Main title: ${parsed.flavorTitle}.`,
    `Replace the hero object with ${parsed.heroObject}.`,
    `Use ${parsed.palette.join(", ")}.`,
    `Preserve bottom bar text: ${layout.bottomBarText}.`,
    `Do not add profile/display name unless it appears in the title.`,
  ].join(" ");

  const adapter = mapCoverModelAdapter(input.imageModel);
  const adapted = adaptCoverPromptForModel(adapter, basePrompt, parsed.avoidObjects);
  return {
    prompt: adapted.prompt,
    negativePrompt: adapted.negativePrompt,
    debugBrief: {
      creatorBrandFromTitle: parsed.creatorBrandFromTitle,
      creatorBrandResolved: creatorBrand,
      flavorTitle: parsed.flavorTitle,
      primaryFlavorCategory: parsed.primaryFlavorCategory,
      heroObject: parsed.heroObject,
      palette: parsed.palette,
      avoidObjects: parsed.avoidObjects,
      adapter,
      feedbackWeights,
      coverTitleSource: "title-prefix",
      coverPromptSource: "deterministic-compiler",
    },
  };
}
