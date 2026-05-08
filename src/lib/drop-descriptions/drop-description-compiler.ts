import { parseCoverTitle } from "@/lib/ai-cover/cover-title-parser";
import { resolveCreatorBrand } from "@/lib/ai-cover/creator-brand-resolver";
import { DROP_DESCRIPTION_PATTERNS, FLAVOR_SENSORY_CUES } from "./drop-description-patterns";
import { trimDescriptionExamples, type DropDescriptionMemory } from "./drop-description-memory";

export type DropDescriptionCompilerInput = {
  title: string;
  creatorSelectedName?: string | null;
  creatorBrandName?: string | null;
  creatorPublicName?: string | null;
  creatorDisplayName?: string | null;
  acceptedPriorDescriptions?: string[];
  creatorVoicePreferences?: string[];
};

export type DropDescriptionCompilerOutput = {
  options: [string, string, string];
  source: "deterministic-patterns";
  memoryExamples: string[];
  debug: Record<string, unknown>;
};

function applyPattern(template: string, values: Record<string, string>) {
  return template.replace(/\{([^}]+)\}/gu, (_, key: string) => values[key] ?? "");
}

export function compileDropDescriptionOptions(input: DropDescriptionCompilerInput): DropDescriptionCompilerOutput {
  const parsed = parseCoverTitle(input.title);
  const creatorBrand = resolveCreatorBrand({
    titlePrefixBrand: parsed.creatorBrandFromTitle,
    creatorBrandName: input.creatorBrandName,
    creatorPublicName: input.creatorPublicName,
    creatorDisplayName: input.creatorDisplayName || input.creatorSelectedName,
    creatorProfileFallback: input.creatorSelectedName,
  });
  const sensoryCue = FLAVOR_SENSORY_CUES[parsed.primaryFlavorCategory] ?? "sweet and bold";
  const values = {
    creatorBrand,
    flavorTitle: parsed.flavorTitle,
    sensoryCue,
  };
  const memory: DropDescriptionMemory = {
    acceptedExamples: trimDescriptionExamples(input.acceptedPriorDescriptions || []),
    creatorVoicePreferences: (input.creatorVoicePreferences || []).slice(0, 5),
  };
  const options: [string, string, string] = [
    applyPattern(DROP_DESCRIPTION_PATTERNS.default, values),
    applyPattern(DROP_DESCRIPTION_PATTERNS.urgency, values),
    applyPattern(DROP_DESCRIPTION_PATTERNS.sensory, values),
  ];
  return {
    options,
    source: "deterministic-patterns",
    memoryExamples: memory.acceptedExamples,
    debug: {
      creatorBrand,
      flavorTitle: parsed.flavorTitle,
      flavorCategory: parsed.primaryFlavorCategory,
      seedTextRequired: false,
      descriptionAiPolish: "optional",
    },
  };
}
