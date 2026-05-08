export const DROP_DESCRIPTION_PATTERNS = {
  default: "{creatorBrand}'s {flavorTitle} is ready to unwrap before it disappears \ud83c\udf6c",
  urgency: "Unwrap {creatorBrand}'s {flavorTitle} before the timer runs out \ud83c\udf6c",
  sensory: "A {sensoryCue} treat from {creatorBrand}, {flavorTitle} is waiting \ud83c\udf6c",
} as const;

export const FLAVOR_SENSORY_CUES: Record<string, string> = {
  frozen_popsicle: "sweet, cold, and citrus-bright",
  slush_drink: "icy and candy-smooth",
  baked_pie: "warm and buttery",
  candy_bar: "rich and glossy",
  fruit_crush: "juicy and bright",
};
