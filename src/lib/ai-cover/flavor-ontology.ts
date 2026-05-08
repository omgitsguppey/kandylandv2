export type FlavorOntologyEntry = {
  category: string;
  heroObject: string;
  supportingProps: string[];
  palette: string[];
  forbiddenSourceObjects: string[];
  textureWords: string[];
  lightingWords: string[];
};

const BASE_FORBIDDEN = [
  "blueberry slush",
  "apple pie",
  "cake slice",
  "random fruit bowl",
];

export const FLAVOR_ONTOLOGY: Record<string, FlavorOntologyEntry> = {
  chocolate_bar: {
    category: "candy_bar",
    heroObject: "glossy chocolate bar",
    supportingProps: ["cocoa dust", "clean wrapper folds"],
    palette: ["dark chocolate", "cocoa brown", "warm caramel"],
    forbiddenSourceObjects: BASE_FORBIDDEN,
    textureWords: ["snapped chocolate texture", "glossy shell"],
    lightingWords: ["studio highlight", "soft contrast"],
  },
  white_chocolate: {
    category: "candy_bar",
    heroObject: "white chocolate bar",
    supportingProps: ["cream shards", "vanilla dust"],
    palette: ["ivory", "vanilla cream", "golden beige"],
    forbiddenSourceObjects: BASE_FORBIDDEN,
    textureWords: ["silky", "smooth gloss"],
    lightingWords: ["warm diffusion", "soft bloom"],
  },
  orange_popsicle: {
    category: "frozen_popsicle",
    heroObject: "orange dreamsicle popsicle",
    supportingProps: ["frost crystals", "citrus zest swirl"],
    palette: ["orange", "cream", "frosted citrus", "warm gold"],
    forbiddenSourceObjects: BASE_FORBIDDEN,
    textureWords: ["frosted", "cold sheen"],
    lightingWords: ["sunlit glow", "cool rim light"],
  },
  blueberry_slush: {
    category: "slush_drink",
    heroObject: "blueberry slush cup",
    supportingProps: ["ice shards", "berry droplets"],
    palette: ["blueberry", "ice blue", "violet"],
    forbiddenSourceObjects: ["apple pie", "cake slice", "orange popsicle"],
    textureWords: ["icy granules", "cold condensation"],
    lightingWords: ["cool neon", "high contrast"],
  },
  apple_pie: {
    category: "baked_pie",
    heroObject: "apple pie slice",
    supportingProps: ["flaky crust", "cinnamon steam"],
    palette: ["baked amber", "apple gold", "cinnamon brown"],
    forbiddenSourceObjects: ["blueberry slush", "popsicle", "chocolate bar"],
    textureWords: ["flaky", "buttery crust"],
    lightingWords: ["warm bakery light", "soft shadow"],
  },
  cherry_crush: {
    category: "fruit_crush",
    heroObject: "cherry crush candy drink",
    supportingProps: ["cherry gloss drops", "sparkle sugar"],
    palette: ["cherry red", "ruby", "pink highlight"],
    forbiddenSourceObjects: BASE_FORBIDDEN,
    textureWords: ["juicy gloss", "syrup shine"],
    lightingWords: ["pop highlight", "warm punch"],
  },
};

export function normalizeFlavorKey(tokens: string[]) {
  const joined = tokens.join(" ");
  if (joined.includes("white chocolate")) return "white_chocolate";
  if (joined.includes("orange") && (joined.includes("popsicle") || joined.includes("dreamsicle"))) return "orange_popsicle";
  if (joined.includes("blueberry") && joined.includes("slush")) return "blueberry_slush";
  if (joined.includes("apple") && joined.includes("pie")) return "apple_pie";
  if (joined.includes("chocolate") && joined.includes("bar")) return "chocolate_bar";
  if (joined.includes("cherry") && joined.includes("crush")) return "cherry_crush";
  if (joined.includes("white") && joined.includes("chocolate")) return "white_chocolate";
  if (joined.includes("slush")) return "blueberry_slush";
  if (joined.includes("popsicle")) return "orange_popsicle";
  if (joined.includes("pie")) return "apple_pie";
  if (joined.includes("chocolate")) return "chocolate_bar";
  return "cherry_crush";
}
