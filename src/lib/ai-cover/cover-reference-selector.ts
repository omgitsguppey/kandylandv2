import type { CoverSemanticBrief } from "./cover-semantic-brief";
import type { CoverReferenceCandidate, CoverReferenceSelectionResult } from "./cover-reference-eligibility";
import {
  isPositiveCoverReference,
  resolveCoverReferenceSelectionRole,
  scoreCoverReferenceSemanticConflict,
} from "./cover-reference-eligibility";

export type CoverReferenceSelectorInput = {
  brief: CoverSemanticBrief;
  modelId: string;
  maxReferenceCount: number;
  requestedReferenceCount?: number;
  candidates: CoverReferenceCandidate[];
  explicitPrimaryLayoutReferenceId?: string | null;
};

export type CoverReferenceSelectorOutput = {
  selectedReferences: CoverReferenceSelectionResult[];
  rejectedReferences: CoverReferenceSelectionResult[];
  requestedReferenceCount: number;
  usedReferenceCount: number;
  maxReferenceCount: number;
  droppedReferenceCount: number;
  referenceLimitApplied: boolean;
};

function stableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function scoreCandidatePriority(target: CoverSemanticBrief, candidate: CoverReferenceCandidate, conflict: number) {
  const eligibility = candidate.referenceEligibility || null;
  const positiveWeight = candidate.feedbackKind === "used_as_cover" || candidate.feedbackKind === "accepted_as_cover" || candidate.accepted
    ? 2
    : candidate.feedbackKind === "liked" || candidate.liked
      ? 1
      : 0;
  const creatorMatch = candidate.creatorName && candidate.creatorName.trim().toLowerCase() === target.creatorBrand.trim().toLowerCase() ? 1 : 0;
  return (
    100 * positiveWeight
    + 20 * creatorMatch
    - 80 * conflict
    + (eligibility === "positive_reference" ? 10 : 0)
    + stableNumber(candidate.selectionScore)
  );
}

export function selectDeterministicCoverReferences(input: CoverReferenceSelectorInput): CoverReferenceSelectorOutput {
  const normalizedMax = Math.max(0, Math.floor(input.maxReferenceCount || 0));
  const explicitPrimaryLayoutReferenceId = input.explicitPrimaryLayoutReferenceId?.trim() || null;
  const evaluated = input.candidates.map((candidate) => {
    const semanticConflict = scoreCoverReferenceSemanticConflict(input.brief, candidate);
    const role = resolveCoverReferenceSelectionRole(input.brief, candidate, semanticConflict.score);
    return {
      candidate,
      role,
      semanticConflictScore: semanticConflict.score,
      reasons: [
        role,
        semanticConflict.score >= 0.70
          ? "semantic conflict too high"
          : semanticConflict.score >= 0.45
            ? "layout-only reference"
            : "eligible positive reference",
      ],
      priority: scoreCandidatePriority(input.brief, candidate, semanticConflict.score),
    };
  });

  const explicitPrimary = explicitPrimaryLayoutReferenceId
    ? evaluated.find((entry) => entry.candidate.id === explicitPrimaryLayoutReferenceId)
    : null;
  const primaryLayout = explicitPrimary
    || evaluated.find((entry) => entry.role === "primary_layout_reference")
    || null;

  const positiveEligible = evaluated
    .filter((entry) => isPositiveCoverReference(entry.candidate, input.brief, entry.semanticConflictScore))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }
      return (left.candidate.title || "").localeCompare(right.candidate.title || "");
    });

  const selectedReferences: CoverReferenceSelectionResult[] = [];
  const rejectedReferences: CoverReferenceSelectionResult[] = [];
  const selectedIds = new Set<string>();

  if (primaryLayout && normalizedMax > 0) {
    selectedReferences.push({
      candidate: primaryLayout.candidate,
      role: "primary_layout_reference",
      semanticConflictScore: primaryLayout.semanticConflictScore,
      reasons: primaryLayout.reasons,
    });
    selectedIds.add(primaryLayout.candidate.id);
  }

  for (const entry of positiveEligible) {
    if (selectedIds.has(entry.candidate.id)) {
      continue;
    }
    if (selectedReferences.length >= normalizedMax) {
      rejectedReferences.push({
        candidate: entry.candidate,
        role: entry.role === "primary_layout_reference" ? "primary_layout_reference" : "blocked_negative_reference",
        semanticConflictScore: entry.semanticConflictScore,
        reasons: ["model cap reached before request"],
      });
      selectedIds.add(entry.candidate.id);
      continue;
    }

    const role = entry.candidate.creatorName && entry.candidate.creatorName.trim().toLowerCase() === input.brief.creatorBrand.trim().toLowerCase()
      ? "creator_style_reference"
      : "accepted_style_reference";

    selectedReferences.push({
      candidate: entry.candidate,
      role,
      semanticConflictScore: entry.semanticConflictScore,
      reasons: entry.reasons,
    });
    selectedIds.add(entry.candidate.id);
  }

  for (const entry of evaluated) {
    if (selectedIds.has(entry.candidate.id)) {
      continue;
    }
    rejectedReferences.push({
      candidate: entry.candidate,
      role: entry.role,
      semanticConflictScore: entry.semanticConflictScore,
      reasons: entry.reasons,
    });
  }

  const trimmedSelectedReferences = selectedReferences.slice(0, normalizedMax);

  return {
    selectedReferences: trimmedSelectedReferences,
    rejectedReferences,
    requestedReferenceCount: input.requestedReferenceCount ?? input.candidates.length,
    usedReferenceCount: trimmedSelectedReferences.length,
    maxReferenceCount: normalizedMax,
    droppedReferenceCount: Math.max(0, (input.requestedReferenceCount ?? input.candidates.length) - trimmedSelectedReferences.length),
    referenceLimitApplied: (input.requestedReferenceCount ?? input.candidates.length) > trimmedSelectedReferences.length,
  };
}
