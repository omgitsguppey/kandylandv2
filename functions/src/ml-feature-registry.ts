/**
 * ML Feature Registry
 * Defines the canonical non-economic ML features that the profile builder computes.
 */

export interface FeatureDefinition {
  id: string;
  type: "float" | "int" | "boolean" | "string";
  sourceLevel: "timeline" | "fact";
  staleAfterMs: number;
}

export const ML_FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  churn_risk_score: {
    id: "churn_risk_score",
    type: "float",
    sourceLevel: "timeline",
    staleAfterMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  days_since_last_active: {
    id: "days_since_last_active",
    type: "int",
    sourceLevel: "fact",
    staleAfterMs: 24 * 60 * 60 * 1000, // 1 day
  },
  creator_affinity_score: {
    id: "creator_affinity_score",
    type: "float",
    sourceLevel: "timeline",
    staleAfterMs: 3 * 24 * 60 * 60 * 1000, // 3 days
  },
  drop_interest_score: {
    id: "drop_interest_score",
    type: "float",
    sourceLevel: "timeline",
    staleAfterMs: 24 * 60 * 60 * 1000, // 1 day
  }
};
