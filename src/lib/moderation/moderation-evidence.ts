export type {
    TheftRiskEvidenceSource as ModerationEvidenceSource,
    TheftRiskEvidenceConfidence as ModerationEvidenceConfidence,
    TheftRiskFalsePositiveRisk as ModerationFalsePositiveRisk,
    TheftRiskEvidence as ModerationEvidence,
} from "@/lib/moderation/theft-risk-evidence";

export { normalizeTheftRiskEvidence as normalizeModerationEvidence } from "@/lib/moderation/theft-risk-evidence";
