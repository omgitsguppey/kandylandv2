import { buildCoverSemanticBrief } from "./cover-semantic-brief";

export type ParsedCoverTitle = {
  creatorBrandFromTitle: string | null;
  flavorTitle: string;
  normalizedFlavorTokens: string[];
  primaryFlavorCategory: string;
  heroObject: string;
  supportingProps: string[];
  palette: string[];
  avoidObjects: string[];
};

function tokenizeFlavor(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length >= 2);
}

function parseCreatorBrandFromTitle(inputTitle: string) {
  const title = inputTitle.trim();
  const possessiveMatch = title.match(/^([^|]+?['’]s)\s+(.+)$/u);
  return possessiveMatch ? possessiveMatch[1].trim() : null;
}

export function parseCoverTitle(inputTitle: string): ParsedCoverTitle {
  const brief = buildCoverSemanticBrief({ title: inputTitle });
  return {
    creatorBrandFromTitle: parseCreatorBrandFromTitle(inputTitle),
    flavorTitle: brief.flavorTitle,
    normalizedFlavorTokens: tokenizeFlavor(brief.flavorTitle),
    primaryFlavorCategory: brief.semanticCategory,
    heroObject: brief.heroObject,
    supportingProps: [...brief.allowedIngredientTokens, ...brief.allowedTextureTokens].slice(0, 4),
    palette: brief.allowedPaletteTokens,
    avoidObjects: brief.forbiddenTokens,
  };
}
