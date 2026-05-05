import type { Drop } from "@/types/db";
import type {
  IntegrityRiskAssessment,
  IntegrityRiskComponents,
} from "@/lib/moderation/integrity-risk-map";

export type IntegrityDemotionAction = "allow" | "demote" | "remove";

export type IntegrityDemotionDiagnostics = {
  action: IntegrityDemotionAction;
  tier: IntegrityRiskAssessment["tier"];
  integrityMultiplier: number;
  originalScore: number;
  finalScore: number;
  components: IntegrityRiskComponents;
  reasons: string[];
};

export type IntegrityDemotionCandidate = {
  drop: Drop;
  score: number;
};

export const INTEGRITY_DEMOTION_ADMIN_REASON = "demoted by integrity risk";

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** digits;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function computeIntegrityMultiplier(components: IntegrityRiskComponents) {
  const risk = clamp01(
    (0.35 * components.moderationRisk) +
    (0.20 * components.supportComplaintRate) +
    (0.20 * components.negativeSatisfactionRate) +
    (0.15 * components.verificationRisk) +
    (0.10 * components.metadataRisk),
  );

  return round(1 - risk, 4);
}

export function applyIntegrityDemotion<T extends IntegrityDemotionCandidate>(input: {
  entry: T;
  risk: IntegrityRiskAssessment;
}) : T & { integrity: IntegrityDemotionDiagnostics } {
  const integrityMultiplier = computeIntegrityMultiplier(input.risk.components);
  const remove = input.risk.criticalPolicyFailure || input.risk.contentProtectionFailure;
  const finalScore = remove ? 0 : round(input.entry.score * integrityMultiplier, 3);
  const action: IntegrityDemotionAction = remove
    ? "remove"
    : integrityMultiplier < 0.94
      ? "demote"
      : "allow";
  const reasons = action === "demote"
    ? [INTEGRITY_DEMOTION_ADMIN_REASON, ...input.risk.reasons]
    : input.risk.reasons;

  return {
    ...input.entry,
    score: finalScore,
    integrity: {
      action,
      tier: input.risk.tier,
      integrityMultiplier,
      originalScore: round(input.entry.score, 3),
      finalScore,
      components: input.risk.components,
      reasons: Array.from(new Set(reasons)),
    },
  };
}

export function applyIntegrityDemotions<T extends IntegrityDemotionCandidate>(input: {
  entries: T[];
  integrityRiskMap: Map<string, IntegrityRiskAssessment>;
}) : Array<T & { integrity: IntegrityDemotionDiagnostics }> {
  return input.entries
    .map((entry) => {
      const risk = input.integrityRiskMap.get(entry.drop.id) || {
        tier: "clear" as const,
        components: {
          moderationRisk: 0,
          supportComplaintRate: 0,
          negativeSatisfactionRate: 0,
          verificationRisk: 0,
          metadataRisk: 0,
        },
        criticalPolicyFailure: false,
        contentProtectionFailure: false,
        reasons: [],
      };

      return applyIntegrityDemotion({ entry, risk });
    })
    .filter((entry) => entry.integrity.action !== "remove")
    .sort((left, right) => right.score - left.score || right.drop.validFrom - left.drop.validFrom);
}
