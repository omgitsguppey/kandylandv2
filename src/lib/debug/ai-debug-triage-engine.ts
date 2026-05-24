import type {
  AiDebugApplyEligibility,
  AiDebugContextPacket,
  AiDebugContaminationRisk,
  AiDebugRepairProposalMode,
  AiDebugWorkItem,
} from "./ai-debug-orchestration-contract";

export type AiDebugScoringInput = {
  severityScore: number;
  scoreImpactNormalized: number;
  blastRadiusScore: number;
  confidenceScore: number;
  freshnessScore: number;
  sourceCompletenessScore: number;
  repairabilityScore: number;
  contaminationRiskScore: number;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function scoreAiDebugWorkItem(input: AiDebugScoringInput) {
  const scores = {
    severityScore: clampScore(input.severityScore),
    scoreImpactNormalized: clampScore(input.scoreImpactNormalized),
    blastRadiusScore: clampScore(input.blastRadiusScore),
    confidenceScore: clampScore(input.confidenceScore),
    freshnessScore: clampScore(input.freshnessScore),
    sourceCompletenessScore: clampScore(input.sourceCompletenessScore),
    repairabilityScore: clampScore(input.repairabilityScore),
    contaminationRiskScore: clampScore(input.contaminationRiskScore),
  };
  const priorityScore = clampScore(
    0.25 * scores.severityScore
    + 0.20 * scores.scoreImpactNormalized
    + 0.15 * scores.blastRadiusScore
    + 0.15 * scores.sourceCompletenessScore
    + 0.10 * scores.freshnessScore
    + 0.10 * scores.repairabilityScore
    - 0.15 * scores.contaminationRiskScore,
  );
  return { ...scores, priorityScore: Number(priorityScore.toFixed(2)) };
}

export function classifyContaminationRisk(input: { privacyClass?: string; sourceRefs?: string[]; rawBodyPresent?: boolean }): AiDebugContaminationRisk {
  if (input.rawBodyPresent || input.privacyClass === "restricted") return "high";
  if (input.privacyClass === "sensitive") return "medium";
  if ((input.sourceRefs ?? []).some((ref) => /support|chat|payment|creator/i.test(ref))) return "medium";
  return "low";
}

export function classifyRepairMode(input: { sourceState: string; currentSampleLoaded: boolean; sourcePatchCandidate?: boolean; formalEvidenceOnly?: boolean }): AiDebugRepairProposalMode {
  if (input.formalEvidenceOnly) return "formal_evidence_request";
  if (!input.currentSampleLoaded || /unknown|degraded|missing|no_sample|unavailable/i.test(input.sourceState)) return "inspect_only";
  return input.sourcePatchCandidate ? "source_patch_candidate" : "artifact_refresh";
}

export function classifyApplyEligibility(input: { deterministicAllowlist?: boolean; humanApproved?: boolean; mode: AiDebugRepairProposalMode }): AiDebugApplyEligibility {
  if (input.mode === "inspect_only" || input.mode === "formal_evidence_request" || input.mode === "manual_operator_action") return "inspect_only";
  if (input.deterministicAllowlist && input.humanApproved) return "deterministic_allowlist_only";
  return "human_approval_required";
}

export function buildDeterministicNextAction(input: { status: string; owner?: string; command?: string }) {
  if (/no_sample|unavailable|missing/i.test(input.status)) {
    return `Load or refresh the ${input.owner || "AI debug"} sample before treating zero rows as healthy.`;
  }
  if (input.command) return `Run ${input.command} and keep the result attached to the repair proposal.`;
  return `Inspect the ${input.owner || "AI debug"} evidence and keep the proposal human-reviewed.`;
}

export function groupDuplicateWorkItems(items: AiDebugWorkItem[]) {
  const seen = new Map<string, AiDebugWorkItem>();
  const duplicates: AiDebugWorkItem[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.owner}:${item.nextAction.toLowerCase()}`;
    if (seen.has(key)) {
      duplicates.push(item);
    } else {
      seen.set(key, item);
    }
  }
  return {
    items: [...seen.values()],
    duplicatesCollapsed: duplicates.length,
  };
}

export function selectContextPacket(input: { packets: AiDebugContextPacket[]; maxTokenBudget: number }) {
  return input.packets.find((packet) => packet.tokenEstimate <= input.maxTokenBudget && packet.deterministicPreflight.status === "pass") ?? null;
}
