import type { CoverSemanticBrief } from "./cover-semantic-brief";
import type { CoverOptimizerGuardResult } from "./cover-optimizer-guard";
import type { CoverReferencePolicy } from "./cover-reference-policy";

export type CoverDebugSummary = {
  title: string;
  creatorBrand: string;
  semanticCategory: string;
  heroObject: string;
  promptSource: "deterministic-compiler";
  optimizerState: "clean" | "trimmed" | "blocked";
  optimizerNote: string;
  referenceNote: string;
  modelId: string;
  compactNote: string;
};

type CoverDebugSummaryInput = {
  brief: CoverSemanticBrief;
  optimizerGuard: CoverOptimizerGuardResult;
  referencePolicy: CoverReferencePolicy;
  modelId: string;
};

export function buildCoverDebugSummary(input: CoverDebugSummaryInput): CoverDebugSummary {
  const optimizerState = input.optimizerGuard.conflictDetected
    ? "blocked"
    : input.optimizerGuard.rejectedText.length > 0
      ? "trimmed"
      : "clean";
  const optimizerNote = optimizerState === "blocked"
    ? "Unsafe optimizer suggestions were discarded."
    : optimizerState === "trimmed"
      ? "Optimizer suggestions were trimmed to category-safe lines."
      : "Optimizer suggestions matched the title brief.";
  const referenceNote = input.referencePolicy.referencePoolTrimmed
    ? input.referencePolicy.note
    : input.referencePolicy.note;

  return {
    title: input.brief.flavorTitle,
    creatorBrand: input.brief.creatorBrand,
    semanticCategory: input.brief.semanticCategory,
    heroObject: input.brief.heroObject,
    promptSource: "deterministic-compiler",
    optimizerState,
    optimizerNote,
    referenceNote,
    modelId: input.modelId,
    compactNote: `${input.brief.semanticCategory} | ${referenceNote}`,
  };
}
