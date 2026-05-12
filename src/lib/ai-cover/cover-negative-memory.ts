import type { CoverFailureTag, CoverLearningRecord } from "./cover-learning-contract";
import type { CoverSemanticBrief } from "./cover-semantic-brief";

export type CoverNegativeMemory = {
  repeatedFailureTags: Array<{ tag: CoverFailureTag; count: number }>;
  blockedReferenceIds: string[];
  forbiddenTokens: string[];
  forbiddenCategories: string[];
  similarityPenalty: number;
  blockStrength: number;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[â€™']/g, "'");
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function addUnique(target: string[], values: string[]) {
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}

function failureTagTokens(tag: CoverFailureTag): string[] {
  switch (tag) {
    case "wrong_creator_brand":
    case "duplicate_creator_brand":
      return ["creator name", "display name"];
    case "wrong_title_text":
      return ["title", "main title"];
    case "wrong_object_category":
      return ["category", "drink", "beverage", "bakery", "candy"];
    case "wrong_flavor_object":
      return ["hero object", "flavor object"];
    case "source_object_bleed":
      return ["reference bleed", "source object"];
    case "wrong_palette":
      return ["palette", "color"];
    case "layout_drift":
      return ["layout", "typography", "cta"];
    case "cta_changed":
      return ["cta", "ribbon", "unwrap"];
    case "bad_text_rendering":
      return ["text rendering", "legibility"];
    case "too_much_fusion":
      return ["fusion", "blend"];
    case "model_ignored_constraints":
      return ["constraints", "instructions"];
    case "reference_contamination":
      return ["reference contamination", "reference bleed"];
    case "optimizer_contamination":
      return ["optimizer contamination", "prompt contamination"];
    case "category_conflict":
      return ["category conflict"];
    case "low_quality":
      return ["low quality", "weak result"];
    default:
      return [];
  }
}

function tokenOverlapScore(source: string, targetTerms: string[]) {
  if (targetTerms.length === 0) {
    return 0;
  }
  const sourceTokens = new Set(tokenize(source));
  const matches = targetTerms.filter((term) => {
    const tokens = tokenize(term);
    return tokens.some((token) => sourceTokens.has(token));
  });
  return matches.length / targetTerms.length;
}

export function buildCoverNegativeMemory(input: {
  brief: CoverSemanticBrief;
  records: CoverLearningRecord[];
}): CoverNegativeMemory {
  const repeatedCounts = new Map<CoverFailureTag, number>();
  const blockedReferenceIds = new Set<string>();
  const forbiddenTokens: string[] = [];
  const forbiddenCategories: string[] = [];
  let blockedCount = 0;
  let dislikedCount = 0;

  for (const record of input.records) {
    if (record.referenceEligibility === "blocked_reference") {
      blockedCount += 1;
      blockedReferenceIds.add(record.id);
      continue;
    }

    if (record.referenceEligibility === "negative_constraint" || record.feedbackKind === "disliked") {
      dislikedCount += 1;
      blockedReferenceIds.add(record.id);
      for (const tag of record.failureTags) {
        repeatedCounts.set(tag, (repeatedCounts.get(tag) || 0) + 1);
        addUnique(forbiddenTokens, failureTagTokens(tag));
      }
    }
  }

  addUnique(forbiddenTokens, input.brief.forbiddenTokens);
  addUnique(forbiddenCategories, input.brief.forbiddenCategories);

  const repeatedFailureTags = Array.from(repeatedCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([tag, count]) => ({ tag, count }));

  const repeatedScore = repeatedFailureTags.reduce((total, entry) => total + Math.max(0, entry.count - 1) * 0.08, 0);
  const similarityPenalty = Number(Math.min(0.6, dislikedCount * 0.1 + repeatedScore).toFixed(4));
  const blockStrength = Number(Math.min(1, 0.25 + (blockedCount * 0.15) + (dislikedCount * 0.1) + repeatedScore).toFixed(4));

  return {
    repeatedFailureTags,
    blockedReferenceIds: Array.from(blockedReferenceIds),
    forbiddenTokens: Array.from(new Set(forbiddenTokens)),
    forbiddenCategories: Array.from(new Set(forbiddenCategories)),
    similarityPenalty,
    blockStrength,
  };
}

export function buildCoverNegativePromptLine(memory: CoverNegativeMemory) {
  const topFailureTags = memory.repeatedFailureTags.slice(0, 4).map((entry) => entry.tag.replace(/_/g, " "));
  const tokenSummary = memory.forbiddenTokens.slice(0, 8).join(", ");
  const categorySummary = memory.forbiddenCategories.slice(0, 6).join(", ");
  return [
    topFailureTags.length > 0 ? `Avoid repeated failure themes: ${topFailureTags.join(", ")}.` : "",
    tokenSummary.length > 0 ? `Hard-forbid: ${tokenSummary}.` : "",
    categorySummary.length > 0 ? `Keep out blocked categories: ${categorySummary}.` : "",
    memory.blockStrength >= 0.7 ? "Block semantic drift aggressively before generation." : "",
  ].filter(Boolean).join(" ");
}
