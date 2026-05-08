import { FLAVOR_ONTOLOGY, normalizeFlavorKey } from "./flavor-ontology";

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

export function parseCoverTitle(inputTitle: string): ParsedCoverTitle {
  const title = inputTitle.trim();
  const possessiveMatch = title.match(/^([^|]+?['’]s)\s+(.+)$/u);
  const creatorBrandFromTitle = possessiveMatch ? possessiveMatch[1].trim() : null;
  const flavorTitle = possessiveMatch ? possessiveMatch[2].trim() : title;
  const normalizedFlavorTokens = tokenizeFlavor(flavorTitle);
  const flavorKey = normalizeFlavorKey(normalizedFlavorTokens);
  const ontology = FLAVOR_ONTOLOGY[flavorKey] ?? FLAVOR_ONTOLOGY.cherry_crush;

  return {
    creatorBrandFromTitle,
    flavorTitle,
    normalizedFlavorTokens,
    primaryFlavorCategory: ontology.category,
    heroObject: ontology.heroObject,
    supportingProps: ontology.supportingProps,
    palette: ontology.palette,
    avoidObjects: ontology.forbiddenSourceObjects,
  };
}
