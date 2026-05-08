export type CoverFeedbackWeightTag =
  | "wrong_creator_name"
  | "duplicate_creator_name"
  | "wrong_flavor_object"
  | "source_object_bleed"
  | "layout_drift"
  | "bad_text"
  | "bad_palette"
  | "too_much_fusion"
  | "cta_changed"
  | "creator_brand_correct"
  | "title_correct"
  | "hero_object_correct"
  | "palette_correct"
  | "layout_preserved"
  | "cta_preserved"
  | "flavor_world_correct";

export type CoverFeedbackWeights = {
  titleParserConfidence: number;
  flavorMappingWeight: number;
  avoidObjectWeight: number;
  layoutPreservationWeight: number;
  modelAdapterPreferenceWeight: number;
  creatorBrandCorrectionWeight: number;
};

export const DEFAULT_COVER_FEEDBACK_WEIGHTS: CoverFeedbackWeights = {
  titleParserConfidence: 1,
  flavorMappingWeight: 1,
  avoidObjectWeight: 1,
  layoutPreservationWeight: 1,
  modelAdapterPreferenceWeight: 1,
  creatorBrandCorrectionWeight: 1,
};
