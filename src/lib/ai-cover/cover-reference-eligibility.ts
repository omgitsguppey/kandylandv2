import { buildCoverSemanticBrief, type CoverSemanticBrief } from "./cover-semantic-brief";
import type { CoverFeedbackKind, CoverReferenceEligibility, CoverReferenceRole } from "./cover-learning-contract";

export type CoverReferenceCandidate = {
  id: string;
  title?: string | null;
  creatorId?: string | null;
  creatorName?: string | null;
  semanticCategory?: string | null;
  semanticFamily?: string | null;
  feedbackKind?: CoverFeedbackKind | null;
  referenceEligibility?: CoverReferenceEligibility | null;
  retentionReason?: string | null;
  accepted?: boolean | null;
  liked?: boolean | null;
  selectedAsPrimaryLayout?: boolean | null;
  selectionOrder?: number | null;
  selectionScore?: number | null;
};

export type CoverReferenceSelectionResult = {
  candidate: CoverReferenceCandidate;
  role: CoverReferenceRole;
  semanticConflictScore: number;
  reasons: string[];
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[â€™']/g, "'");
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
}

function termOverlapScore(text: string, terms: string[]) {
  if (terms.length === 0) {
    return 0;
  }

  const tokens = new Set(tokenize(text));
  const matches = terms.filter((term) => {
    const normalized = normalizeText(term);
    return normalized.includes(" ")
      ? normalizeText(text).includes(normalized)
      : tokens.has(normalized);
  });

  return matches.length / terms.length;
}

export function resolveCoverReferenceEligibility(
  feedbackKind?: CoverFeedbackKind | null,
  candidate?: Pick<CoverReferenceCandidate, "accepted" | "liked" | "referenceEligibility"> | null,
): CoverReferenceEligibility {
  if (candidate?.referenceEligibility) {
    return candidate.referenceEligibility;
  }

  if (feedbackKind === "accepted_as_cover" || feedbackKind === "used_as_cover") {
    return "positive_reference";
  }
  if (feedbackKind === "liked") {
    return "positive_reference";
  }
  if (feedbackKind === "disliked") {
    return "negative_constraint";
  }
  if (feedbackKind === "blocked" || feedbackKind === "failed") {
    return "blocked_reference";
  }
  return "neutral_history";
}

function buildCandidateSemanticBrief(candidate: CoverReferenceCandidate): CoverSemanticBrief | null {
  const title = candidate.title?.trim();
  if (!title) {
    return null;
  }

  return buildCoverSemanticBrief({
    title,
    creatorSelectedName: candidate.creatorName || candidate.creatorId || null,
    creatorBrandName: candidate.creatorName || null,
    creatorPublicName: candidate.creatorName || null,
    creatorDisplayName: candidate.creatorName || null,
  });
}

export function scoreCoverReferenceSemanticConflict(target: CoverSemanticBrief, candidate: CoverReferenceCandidate) {
  const candidateBrief = candidate.semanticCategory || candidate.semanticFamily || candidate.title
    ? buildCandidateSemanticBrief(candidate)
    : null;
  const candidateText = [
    candidate.title,
    candidate.creatorName,
    candidate.semanticCategory,
    candidate.semanticFamily,
  ].filter(Boolean).join(" ");

  const categoryMismatch = candidateBrief
    ? (candidateBrief.semanticCategory === target.semanticCategory ? 0 : 1)
    : candidate.semanticCategory && candidate.semanticCategory !== target.semanticCategory
      ? 1
      : 0;

  const targetForbiddenOverlap = termOverlapScore(candidateText, target.forbiddenTokens);
  const objectFamilyMismatch = candidateBrief
    ? (candidateBrief.semanticCategory.split("_")[0] === target.semanticCategory.split("_")[0] ? 0 : 1)
    : 0;

  const paletteConflict = termOverlapScore(candidateText, target.allowedPaletteTokens) > 0.5 ? 0 : 0.25;
  const dislikedSimilarity = resolveCoverReferenceEligibility(candidate.feedbackKind, candidate) === "negative_constraint" ? 1 : 0;

  const score = (
    0.35 * categoryMismatch
    + 0.25 * targetForbiddenOverlap
    + 0.20 * objectFamilyMismatch
    + 0.10 * paletteConflict
    + 0.10 * dislikedSimilarity
  );

  return {
    categoryMismatch,
    forbiddenTokenOverlap: targetForbiddenOverlap,
    objectFamilyMismatch,
    paletteConflict,
    dislikedSimilarity,
    score: Number(score.toFixed(4)),
  };
}

export function resolveCoverReferenceSelectionRole(
  target: CoverSemanticBrief,
  candidate: CoverReferenceCandidate,
  semanticConflictScore: number,
): CoverReferenceRole {
  if (candidate.selectedAsPrimaryLayout || candidate.selectionOrder === 0) {
    return "primary_layout_reference";
  }

  const eligibility = resolveCoverReferenceEligibility(candidate.feedbackKind, candidate);
  if (eligibility === "negative_constraint") {
    return "blocked_negative_reference";
  }
  if (eligibility === "blocked_reference") {
    return "blocked_negative_reference";
  }
  if (eligibility === "neutral_history") {
    return "ignored_neutral_history";
  }

  if (semanticConflictScore >= 0.45) {
    return "creator_style_reference";
  }

  if (candidate.creatorName && candidate.creatorName.trim().toLowerCase() === target.creatorBrand.trim().toLowerCase()) {
    return "creator_style_reference";
  }

  return "accepted_style_reference";
}

export function isPositiveCoverReference(
  candidate: CoverReferenceCandidate,
  target: CoverSemanticBrief,
  semanticConflictScore: number,
) {
  const eligibility = resolveCoverReferenceEligibility(candidate.feedbackKind, candidate);
  if (eligibility !== "positive_reference") {
    return false;
  }

  return semanticConflictScore < 0.45 || candidate.selectedAsPrimaryLayout === true;
}
