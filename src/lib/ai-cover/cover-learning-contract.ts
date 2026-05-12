import type { CoverFeedbackWeightTag } from "./cover-feedback-weights";

export type CoverFeedbackKind =
  | "liked"
  | "disliked"
  | "accepted_as_cover"
  | "used_as_cover"
  | "ignored"
  | "generated"
  | "blocked"
  | "failed";

export type CoverReferenceEligibility =
  | "positive_reference"
  | "negative_constraint"
  | "neutral_history"
  | "blocked_reference"
  | "debug_only";

export type CoverFailureTag =
  | "wrong_creator_brand"
  | "duplicate_creator_brand"
  | "wrong_title_text"
  | "wrong_object_category"
  | "wrong_flavor_object"
  | "source_object_bleed"
  | "wrong_palette"
  | "layout_drift"
  | "cta_changed"
  | "bad_text_rendering"
  | "too_much_fusion"
  | "model_ignored_constraints"
  | "reference_contamination"
  | "optimizer_contamination"
  | "category_conflict"
  | "low_quality";

export type CoverLearningRecord = {
  id: string;
  creatorId: string;
  title: string;
  creatorBrand: string;
  flavorTitle: string;
  semanticCategory: string;
  modelId: string;
  modelFamily: string;
  referenceIds: string[];
  promptCompilerVersion: string;
  semanticBriefVersion: string;
  feedbackKind: CoverFeedbackKind;
  referenceEligibility: CoverReferenceEligibility;
  failureTags: CoverFailureTag[];
  positiveTags: CoverFeedbackWeightTag[];
  acceptedAt?: number;
  dislikedAt?: number;
  usedAsCoverAt?: number;
  createdAt: number;
  promptHash: string;
  semanticBriefHash: string;
};

export type CoverReferenceRole =
  | "primary_layout_reference"
  | "accepted_style_reference"
  | "creator_style_reference"
  | "blocked_negative_reference"
  | "ignored_neutral_history";

export const COVER_LEARNING_COLLECTION = "admin_ai_drop_cover_learning";
export const COVER_PROMPT_COMPILER_VERSION = "hard-cutover-v2";
export const COVER_SEMANTIC_BRIEF_VERSION = "hard-cutover-v2";
