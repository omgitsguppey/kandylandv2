import type { CoverSemanticBrief } from "./cover-semantic-brief";

export type CoverReferencePolicy = {
  modelId: string;
  maxReferences: number;
  requestedReferenceCount: number;
  selectedReferenceCount: number;
  trimmedReferenceCount: number;
  referencePoolTrimmed: boolean;
  note: string;
};

type CoverReferencePolicyInput = {
  modelId: string;
  maxReferences: number;
  requestedReferenceCount: number;
  selectedReferenceCount: number;
  brief: CoverSemanticBrief;
};

export function buildCoverReferencePolicy(input: CoverReferencePolicyInput): CoverReferencePolicy {
  const maxReferences = Math.max(0, Math.floor(input.maxReferences || 0));
  const requestedReferenceCount = Math.max(0, Math.floor(input.requestedReferenceCount || 0));
  const selectedReferenceCount = Math.max(0, Math.floor(input.selectedReferenceCount || 0));
  const trimmedReferenceCount = Math.max(0, requestedReferenceCount - selectedReferenceCount);
  const referencePoolTrimmed = trimmedReferenceCount > 0;
  const note = referencePoolTrimmed
    ? "Reference pool trimmed to model limit."
    : selectedReferenceCount > 0
      ? "Reference pool fits the model limit."
      : requestedReferenceCount > 0
        ? "No eligible references selected."
        : "Reference pool unavailable.";

  return {
    modelId: input.modelId,
    maxReferences,
    requestedReferenceCount,
    selectedReferenceCount,
    trimmedReferenceCount,
    referencePoolTrimmed,
    note,
  };
}

export function trimReferencePoolToModelLimit<T>(references: T[], maxReferences: number) {
  const normalizedMax = Math.max(0, Math.floor(maxReferences || 0));
  const selectedReferences = normalizedMax === 0 ? [] : references.slice(0, normalizedMax);
  return {
    selectedReferences,
    requestedReferenceCount: references.length,
    selectedReferenceCount: selectedReferences.length,
    trimmedReferenceCount: Math.max(0, references.length - selectedReferences.length),
    referencePoolTrimmed: references.length > selectedReferences.length,
  };
}
