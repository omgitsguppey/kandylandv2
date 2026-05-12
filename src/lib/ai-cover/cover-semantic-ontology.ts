export type CoverSemanticEnrichmentAxis =
  | "ingredients"
  | "garnish"
  | "texture"
  | "props"
  | "plating"
  | "palette"
  | "atmosphere";

export type CoverSemanticFamily = "beverage" | "bakery" | "candy" | "dessert" | "spread" | "neutral";

export type CoverSemanticOntologyEntry = {
  semanticCategory: string;
  family: CoverSemanticFamily;
  heroObject: string;
  requiredTokens: string[];
  allowedIngredientTokens: string[];
  allowedTextureTokens: string[];
  allowedPaletteTokens: string[];
  forbiddenTokens: string[];
  forbiddenCategories: string[];
  enrichmentAxes: CoverSemanticEnrichmentAxis[];
};

export type CoverSemanticOntologyResolution = {
  key: string;
  entry: CoverSemanticOntologyEntry;
  source: "ontology" | "fallback_parser";
};

const SHARED_AXES: CoverSemanticEnrichmentAxis[] = ["ingredients", "garnish", "texture", "props", "plating", "palette", "atmosphere"];

export const COVER_SEMANTIC_ONTOLOGY: Record<string, CoverSemanticOntologyEntry> = {
  pink_lemonade_beverage: {
    semanticCategory: "pink_lemonade_beverage",
    family: "beverage",
    heroObject: "pink lemonade with lemon slices and pink citrus sparkle",
    requiredTokens: ["pink lemonade", "lemon", "citrus", "pink"],
    allowedIngredientTokens: ["lemon slices", "lemonade", "pink citrus", "sugar crystals", "ice", "raspberries", "strawberries", "lemonade glass", "pitcher"],
    allowedTextureTokens: ["sparkle", "glow", "fresh", "bright", "cold condensation", "glistening"],
    allowedPaletteTokens: ["pink", "lemon yellow", "citrus cream", "ruby-pink highlight"],
    forbiddenTokens: ["cherry crush", "cherry", "chocolate", "fudge", "milk chocolate", "honeycomb", "apple pie", "muffin", "blueberry slush", "cake slice"],
    forbiddenCategories: ["chocolate", "bakery", "honey", "muffin", "pie", "slush"],
    enrichmentAxes: SHARED_AXES,
  },
  lemonade_beverage: {
    semanticCategory: "lemonade_beverage",
    family: "beverage",
    heroObject: "lemonade with lemon slices and citrus sparkle",
    requiredTokens: ["lemonade", "lemon", "citrus"],
    allowedIngredientTokens: ["lemon slices", "lemonade", "citrus zest", "sugar crystals", "ice", "mint", "lemonade glass", "pitcher"],
    allowedTextureTokens: ["sparkle", "glow", "fresh", "bright", "cold condensation"],
    allowedPaletteTokens: ["lemon yellow", "citrus cream", "bright white", "sunlit gold"],
    forbiddenTokens: ["chocolate", "fudge", "muffin", "pie", "slush", "soda", "cake slice", "coffee"],
    forbiddenCategories: ["chocolate", "bakery", "pie", "slush", "coffee"],
    enrichmentAxes: SHARED_AXES,
  },
  bakery_muffin: {
    semanticCategory: "bakery_muffin",
    family: "bakery",
    heroObject: "blueberry muffins with baked blueberries and muffin crumb texture",
    requiredTokens: ["blueberry muffins", "blueberry", "muffin", "bakery"],
    allowedIngredientTokens: ["blueberries", "muffin crumb", "paper liners", "butter", "berry garnish", "sugar dust"],
    allowedTextureTokens: ["crumbly", "soft baked top", "golden crumb", "warm bakery texture"],
    allowedPaletteTokens: ["blueberry", "golden crumb", "warm bakery brown", "powdered sugar"],
    forbiddenTokens: ["slush", "cup", "glass", "bottle", "cocktail", "soda", "cherry soda", "drink", "apple pie", "chocolate bar"],
    forbiddenCategories: ["beverage", "slush", "soda", "cocktail", "sundae"],
    enrichmentAxes: SHARED_AXES,
  },
  chocolate_bar: {
    semanticCategory: "chocolate_bar",
    family: "candy",
    heroObject: "glossy chocolate bar",
    requiredTokens: ["chocolate bar", "chocolate", "bar"],
    allowedIngredientTokens: ["cocoa", "caramel", "nuts", "wrapped segments", "chocolate squares"],
    allowedTextureTokens: ["snapped chocolate texture", "glossy shell", "silky", "smooth gloss"],
    allowedPaletteTokens: ["dark chocolate", "cocoa brown", "warm caramel", "milk chocolate"],
    forbiddenTokens: ["pie", "beverage", "slush", "soda", "cup", "glass", "fudge mountain", "apple pie"],
    forbiddenCategories: ["pie", "beverage", "slush"],
    enrichmentAxes: SHARED_AXES,
  },
  lemon_cake_spread: {
    semanticCategory: "lemon_cake_spread",
    family: "spread",
    heroObject: "lemon cake spread jar",
    requiredTokens: ["lemon cake spread", "lemon", "cake", "spread"],
    allowedIngredientTokens: ["lemon glaze", "zest curls", "soft sponge crumbs", "frosting", "citrus slices"],
    allowedTextureTokens: ["silky spread", "zest speckled", "soft", "glossy"],
    allowedPaletteTokens: ["lemon cream", "buttery yellow", "soft vanilla", "warm citrus"],
    forbiddenTokens: ["slush", "soda", "candy bar", "muffin"],
    forbiddenCategories: ["beverage", "slush", "candy"],
    enrichmentAxes: SHARED_AXES,
  },
  pink_skittles: {
    semanticCategory: "pink_skittles",
    family: "candy",
    heroObject: "pink skittles candy pile",
    requiredTokens: ["pink skittles", "skittles", "pink"],
    allowedIngredientTokens: ["glossy shells", "sugar sparkle", "pink fruit cues"],
    allowedTextureTokens: ["glossy shell", "sugar sparkle", "playful", "bright"],
    allowedPaletteTokens: ["pink candy", "bubblegum", "strawberry gloss", "white sugar"],
    forbiddenTokens: ["slush cup", "cake slice", "soda bottle", "muffin", "cherry crush"],
    forbiddenCategories: ["slush", "bakery", "beverage"],
    enrichmentAxes: SHARED_AXES,
  },
  blueberry_slush: {
    semanticCategory: "blueberry_slush",
    family: "beverage",
    heroObject: "blueberry slush cup",
    requiredTokens: ["blueberry slush", "blueberry", "slush"],
    allowedIngredientTokens: ["ice shards", "berry droplets", "blueberry syrup", "frozen crystals"],
    allowedTextureTokens: ["icy granules", "cold condensation", "frozen", "glossy frost"],
    allowedPaletteTokens: ["blueberry", "ice blue", "violet"],
    forbiddenTokens: ["apple pie", "cake slice", "orange popsicle", "muffin", "chocolate bar"],
    forbiddenCategories: ["bakery", "cake", "chocolate"],
    enrichmentAxes: SHARED_AXES,
  },
  apple_pie: {
    semanticCategory: "apple_pie",
    family: "bakery",
    heroObject: "apple pie slice",
    requiredTokens: ["apple pie", "apple", "pie"],
    allowedIngredientTokens: ["flaky crust", "cinnamon steam", "apple filling", "caramel drizzle"],
    allowedTextureTokens: ["flaky", "buttery crust", "warm", "baked"],
    allowedPaletteTokens: ["baked amber", "apple gold", "cinnamon brown"],
    forbiddenTokens: ["blueberry slush", "popsicle", "chocolate bar", "soda bottle"],
    forbiddenCategories: ["beverage", "slush", "candy"],
    enrichmentAxes: SHARED_AXES,
  },
  orange_popsicle: {
    semanticCategory: "orange_popsicle",
    family: "dessert",
    heroObject: "orange dreamsicle popsicle",
    requiredTokens: ["orange popsicle", "orange", "popsicle"],
    allowedIngredientTokens: ["frost crystals", "citrus zest swirl", "creamy vanilla edge"],
    allowedTextureTokens: ["frosted", "cold sheen", "glossy frost", "icy"],
    allowedPaletteTokens: ["orange", "cream", "frosted citrus", "warm gold"],
    forbiddenTokens: ["chocolate", "pie", "muffin", "soda", "cup"],
    forbiddenCategories: ["chocolate", "bakery", "beverage"],
    enrichmentAxes: SHARED_AXES,
  },
};

const FALLBACK_CATEGORY_RULES: Array<{
  key: string;
  semanticCategory: string;
  family: CoverSemanticFamily;
  heroObject: string;
  requiredTokens: string[];
  allowedIngredientTokens: string[];
  allowedTextureTokens: string[];
  allowedPaletteTokens: string[];
  forbiddenTokens: string[];
  forbiddenCategories: string[];
}> = [
  {
    key: "pink_lemonade",
    semanticCategory: "pink_lemonade_beverage",
    family: "beverage",
    heroObject: "pink lemonade with lemon slices and pink citrus sparkle",
    requiredTokens: ["pink lemonade", "lemon", "citrus", "pink"],
    allowedIngredientTokens: ["lemon slices", "lemonade", "pink citrus", "sugar crystals", "ice", "raspberries", "strawberries", "lemonade glass", "pitcher"],
    allowedTextureTokens: ["sparkle", "glow", "fresh", "bright"],
    allowedPaletteTokens: ["pink", "lemon yellow", "citrus cream", "ruby-pink highlight"],
    forbiddenTokens: ["cherry crush", "chocolate", "fudge", "milk chocolate", "honeycomb", "apple pie", "muffin", "blueberry slush", "cake slice"],
    forbiddenCategories: ["chocolate", "bakery", "honey", "muffin", "pie", "slush"],
  },
  {
    key: "blueberry_muffin",
    semanticCategory: "bakery_muffin",
    family: "bakery",
    heroObject: "blueberry muffins with baked blueberries and muffin crumb texture",
    requiredTokens: ["blueberry muffins", "blueberry", "muffin", "bakery"],
    allowedIngredientTokens: ["blueberries", "muffin crumb", "paper liners", "butter", "berry garnish", "sugar dust"],
    allowedTextureTokens: ["crumbly", "soft baked top", "golden crumb", "warm bakery texture"],
    allowedPaletteTokens: ["blueberry", "golden crumb", "warm bakery brown", "powdered sugar"],
    forbiddenTokens: ["slush", "cup", "glass", "bottle", "cocktail", "soda", "drink", "apple pie", "chocolate bar"],
    forbiddenCategories: ["beverage", "slush", "soda", "cocktail", "sundae"],
  },
  {
    key: "chocolate_bar",
    semanticCategory: "chocolate_bar",
    family: "candy",
    heroObject: "glossy chocolate bar",
    requiredTokens: ["chocolate bar", "chocolate", "bar"],
    allowedIngredientTokens: ["cocoa", "caramel", "nuts", "wrapped segments", "chocolate squares"],
    allowedTextureTokens: ["snapped chocolate texture", "glossy shell", "silky", "smooth gloss"],
    allowedPaletteTokens: ["dark chocolate", "cocoa brown", "warm caramel", "milk chocolate"],
    forbiddenTokens: ["pie", "beverage", "slush", "soda", "cup", "glass"],
    forbiddenCategories: ["pie", "beverage", "slush"],
  },
  {
    key: "lemon_cake_spread",
    semanticCategory: "lemon_cake_spread",
    family: "spread",
    heroObject: "lemon cake spread jar",
    requiredTokens: ["lemon cake spread", "lemon", "cake", "spread"],
    allowedIngredientTokens: ["lemon glaze", "zest curls", "soft sponge crumbs", "frosting", "citrus slices"],
    allowedTextureTokens: ["silky spread", "zest speckled", "soft", "glossy"],
    allowedPaletteTokens: ["lemon cream", "buttery yellow", "soft vanilla", "warm citrus"],
    forbiddenTokens: ["slush", "soda", "candy bar", "muffin"],
    forbiddenCategories: ["beverage", "slush", "candy"],
  },
  {
    key: "pink_skittles",
    semanticCategory: "pink_skittles",
    family: "candy",
    heroObject: "pink skittles candy pile",
    requiredTokens: ["pink skittles", "skittles", "pink"],
    allowedIngredientTokens: ["glossy shells", "sugar sparkle", "pink fruit cues"],
    allowedTextureTokens: ["glossy shell", "sugar sparkle", "playful", "bright"],
    allowedPaletteTokens: ["pink candy", "bubblegum", "strawberry gloss", "white sugar"],
    forbiddenTokens: ["slush cup", "cake slice", "soda bottle", "muffin", "cherry crush"],
    forbiddenCategories: ["slush", "bakery", "beverage"],
  },
];

export function tokenizeSemanticText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 1);
}

function includesTokens(text: string, tokens: string[]) {
  const normalized = text.toLowerCase();
  return tokens.some((token) => normalized.includes(token.toLowerCase()));
}

function buildFallbackEntryFromTitle(title: string): CoverSemanticOntologyEntry {
  const normalized = tokenizeSemanticText(title);
  const normalizedText = normalized.join(" ");

  if (normalizedText.includes("blueberry") && normalizedText.includes("muffin")) {
    return { ...FALLBACK_CATEGORY_RULES[1], enrichmentAxes: SHARED_AXES };
  }
  if (normalizedText.includes("pink") && normalizedText.includes("lemonade")) {
    return { ...FALLBACK_CATEGORY_RULES[0], enrichmentAxes: SHARED_AXES };
  }
  if (normalizedText.includes("lemonade")) {
    return {
      semanticCategory: "lemonade_beverage",
      family: "beverage",
      heroObject: "lemonade with lemon slices and citrus sparkle",
      requiredTokens: ["lemonade", "lemon", "citrus"],
    allowedIngredientTokens: ["lemon slices", "lemonade", "citrus zest", "sugar crystals", "ice", "mint", "lemonade glass", "pitcher"],
      allowedTextureTokens: ["sparkle", "glow", "fresh", "bright"],
      allowedPaletteTokens: ["lemon yellow", "citrus cream", "bright white", "sunlit gold"],
      forbiddenTokens: ["chocolate", "fudge", "muffin", "pie", "slush", "soda", "cake slice", "coffee"],
      forbiddenCategories: ["chocolate", "bakery", "pie", "slush", "coffee"],
      enrichmentAxes: SHARED_AXES,
    };
  }
  if (normalizedText.includes("chocolate") && normalizedText.includes("bar")) {
    return { ...FALLBACK_CATEGORY_RULES[2], enrichmentAxes: SHARED_AXES };
  }
  if (normalizedText.includes("apple") && normalizedText.includes("pie")) {
    return {
      semanticCategory: "apple_pie",
      family: "bakery",
      heroObject: "apple pie slice",
      requiredTokens: ["apple pie", "apple", "pie"],
      allowedIngredientTokens: ["flaky crust", "cinnamon steam", "apple filling", "caramel drizzle"],
      allowedTextureTokens: ["flaky", "buttery crust", "warm", "baked"],
      allowedPaletteTokens: ["baked amber", "apple gold", "cinnamon brown"],
      forbiddenTokens: ["blueberry slush", "popsicle", "chocolate bar", "soda bottle"],
      forbiddenCategories: ["beverage", "slush", "candy"],
      enrichmentAxes: SHARED_AXES,
    };
  }
  if (normalizedText.includes("pink") && normalizedText.includes("skittles")) {
    return { ...FALLBACK_CATEGORY_RULES[4], enrichmentAxes: SHARED_AXES };
  }
  if (normalizedText.includes("blueberry") && normalizedText.includes("slush")) {
    return {
      semanticCategory: "blueberry_slush",
      family: "beverage",
      heroObject: "blueberry slush cup",
      requiredTokens: ["blueberry slush", "blueberry", "slush"],
      allowedIngredientTokens: ["ice shards", "berry droplets", "blueberry syrup", "frozen crystals"],
      allowedTextureTokens: ["icy granules", "cold condensation", "frozen", "glossy frost"],
      allowedPaletteTokens: ["blueberry", "ice blue", "violet"],
      forbiddenTokens: ["apple pie", "cake slice", "orange popsicle", "muffin", "chocolate bar"],
      forbiddenCategories: ["bakery", "cake", "chocolate"],
      enrichmentAxes: SHARED_AXES,
    };
  }

  const family: CoverSemanticFamily = normalizedText.includes("muffin") || normalizedText.includes("cake") || normalizedText.includes("pie")
    ? "bakery"
    : normalizedText.includes("chocolate") || normalizedText.includes("candy") || normalizedText.includes("gummy")
      ? "candy"
      : normalizedText.includes("drink") || normalizedText.includes("soda") || normalizedText.includes("juice") || normalizedText.includes("tea")
        ? "beverage"
        : "neutral";

  return {
    semanticCategory: family === "neutral" ? "title_based_poster" : `${family}_poster`,
    family,
    heroObject: title.trim().length > 0 ? title.trim().toLowerCase() : "title-based hero",
    requiredTokens: normalized.slice(0, 4),
    allowedIngredientTokens: normalized.slice(0, 6),
    allowedTextureTokens: ["clean", "polished", "glossy", "premium"],
    allowedPaletteTokens: normalized.slice(0, 4),
    forbiddenTokens: [],
    forbiddenCategories: [],
    enrichmentAxes: SHARED_AXES,
  };
}

export function resolveCoverSemanticOntologyEntry(title: string): CoverSemanticOntologyResolution {
  const normalizedTitle = title.trim().toLowerCase().replace(/[’']/g, "'");
  for (const [key, entry] of Object.entries(COVER_SEMANTIC_ONTOLOGY)) {
    if (includesTokens(normalizedTitle, entry.requiredTokens) || includesTokens(normalizedTitle, entry.semanticCategory.split("_"))) {
      return { key, entry, source: "ontology" };
    }
  }

  for (const rule of FALLBACK_CATEGORY_RULES) {
    if (normalizedTitle.includes(rule.key.replace(/_/g, " ")) || includesTokens(normalizedTitle, rule.requiredTokens)) {
      return { key: rule.key, entry: { ...rule, enrichmentAxes: SHARED_AXES }, source: "ontology" };
    }
  }

  return {
    key: "fallback",
    entry: buildFallbackEntryFromTitle(title),
    source: "fallback_parser",
  };
}

export function buildSemanticAllowList(entry: CoverSemanticOntologyEntry) {
  return Array.from(new Set([
    ...entry.requiredTokens,
    ...entry.allowedIngredientTokens,
    ...entry.allowedTextureTokens,
    ...entry.allowedPaletteTokens,
  ]));
}

export function buildSemanticForbiddenList(entry: CoverSemanticOntologyEntry) {
  return Array.from(new Set([
    ...entry.forbiddenTokens,
    ...entry.forbiddenCategories,
  ]));
}
