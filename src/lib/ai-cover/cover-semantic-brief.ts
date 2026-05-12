import { resolveCreatorBrand } from "./creator-brand-resolver";
import {
  buildSemanticAllowList,
  buildSemanticForbiddenList,
  resolveCoverSemanticOntologyEntry,
  tokenizeSemanticText,
  type CoverSemanticFamily,
  type CoverSemanticOntologyEntry,
} from "./cover-semantic-ontology";

export type CoverSemanticBrief = {
  title: string;
  creatorBrand: string;
  flavorTitle: string;
  semanticCategory: string;
  heroObject: string;
  requiredTokens: string[];
  allowedIngredientTokens: string[];
  allowedTextureTokens: string[];
  allowedPaletteTokens: string[];
  forbiddenTokens: string[];
  forbiddenCategories: string[];
  source: {
    creatorBrand: "title_prefix" | "creator_brand" | "creator_public_name" | "display_name";
    flavor: "title";
    category: "ontology" | "fallback_parser";
  };
};

type CoverSemanticBriefInput = {
  title: string;
  creatorSelectedName?: string | null;
  creatorBrandName?: string | null;
  creatorPublicName?: string | null;
  creatorDisplayName?: string | null;
};

function parseTitlePrefix(title: string) {
  const trimmed = title.trim();
  const possessiveMatch = trimmed.match(/^([^|]+?['’]s)\s+(.+)$/u);
  return {
    creatorBrandFromTitle: possessiveMatch ? possessiveMatch[1].trim() : null,
    flavorTitle: possessiveMatch ? possessiveMatch[2].trim() : trimmed,
  };
}

function resolveCreatorSource(input: CoverSemanticBriefInput, creatorBrandFromTitle: string | null): CoverSemanticBrief["source"]["creatorBrand"] {
  if (creatorBrandFromTitle) {
    return "title_prefix";
  }
  if (input.creatorBrandName?.trim()) {
    return "creator_brand";
  }
  if (input.creatorPublicName?.trim()) {
    return "creator_public_name";
  }
  return "display_name";
}

export function buildCoverSemanticBrief(input: CoverSemanticBriefInput): CoverSemanticBrief {
  const title = input.title.trim();
  const titleParts = parseTitlePrefix(title);
  const resolvedBrand = resolveCreatorBrand({
    titlePrefixBrand: titleParts.creatorBrandFromTitle,
    creatorBrandName: input.creatorBrandName,
    creatorPublicName: input.creatorPublicName,
    creatorDisplayName: input.creatorDisplayName || input.creatorSelectedName,
    creatorProfileFallback: input.creatorSelectedName,
  });
  const resolved = resolveCoverSemanticOntologyEntry(titleParts.flavorTitle);
  const requiredTokens = Array.from(new Set([
    ...resolved.entry.requiredTokens,
    ...tokenizeSemanticText(titleParts.flavorTitle).slice(0, 4),
  ]));

  return {
    title,
    creatorBrand: resolvedBrand,
    flavorTitle: titleParts.flavorTitle || title,
    semanticCategory: resolved.entry.semanticCategory,
    heroObject: resolved.entry.heroObject,
    requiredTokens,
    allowedIngredientTokens: [...resolved.entry.allowedIngredientTokens],
    allowedTextureTokens: [...resolved.entry.allowedTextureTokens],
    allowedPaletteTokens: [...resolved.entry.allowedPaletteTokens],
    forbiddenTokens: buildSemanticForbiddenList(resolved.entry),
    forbiddenCategories: [...resolved.entry.forbiddenCategories],
    source: {
      creatorBrand: resolveCreatorSource(input, titleParts.creatorBrandFromTitle),
      flavor: "title",
      category: resolved.source,
    },
  };
}

export function buildCoverSemanticAllowList(brief: CoverSemanticBrief) {
  return buildSemanticAllowList({
    semanticCategory: brief.semanticCategory,
    family: "neutral" as CoverSemanticFamily,
    heroObject: brief.heroObject,
    requiredTokens: brief.requiredTokens,
    allowedIngredientTokens: brief.allowedIngredientTokens,
    allowedTextureTokens: brief.allowedTextureTokens,
    allowedPaletteTokens: brief.allowedPaletteTokens,
    forbiddenTokens: brief.forbiddenTokens,
    forbiddenCategories: brief.forbiddenCategories,
    enrichmentAxes: ["ingredients", "garnish", "texture", "props", "plating", "palette", "atmosphere"],
  });
}
