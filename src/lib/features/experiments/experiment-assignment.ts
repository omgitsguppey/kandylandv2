import {
  resolveBehavioralExperimentTraffic,
} from "@/lib/features/experiments/behavioral-experiment-contract";

export type BehavioralExperimentUnitType = "userId" | "anonymousVisitorId" | "sessionId";
export type BehavioralExperimentAssignedVariant = "control" | "variant";
export type BehavioralExperimentRankingMode = "deterministic_baseline_holdout" | "experiment_variant";

export type BehavioralExperimentAssignmentInput = {
  experimentId: string;
  userId?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  riskyRankingChange?: boolean;
  variantTrafficPercent?: number;
};

export type BehavioralExperimentUnit = {
  unitType: BehavioralExperimentUnitType;
  unitId: string;
};

export type BehavioralExperimentAssignment = {
  experimentId: string;
  unitType: BehavioralExperimentUnitType | "missing";
  unitId: string;
  assignmentKey: string;
  bucket: number;
  variant: BehavioralExperimentAssignedVariant;
  variantTrafficPercent: number;
  controlTrafficPercent: number;
  holdout: boolean;
  rankingMode: BehavioralExperimentRankingMode;
  reason: "assigned" | "holdout" | "missing_unit";
};

function cleanId(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function resolveBehavioralExperimentUnit(input: Pick<BehavioralExperimentAssignmentInput, "userId" | "anonymousVisitorId" | "sessionId">): BehavioralExperimentUnit | null {
  const userId = cleanId(input.userId);
  if (userId) {
    return { unitType: "userId", unitId: userId };
  }

  const anonymousVisitorId = cleanId(input.anonymousVisitorId);
  if (anonymousVisitorId) {
    return { unitType: "anonymousVisitorId", unitId: anonymousVisitorId };
  }

  const sessionId = cleanId(input.sessionId);
  if (sessionId) {
    return { unitType: "sessionId", unitId: sessionId };
  }

  return null;
}

export function hashExperimentAssignmentKey(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function assignBehavioralExperiment(input: BehavioralExperimentAssignmentInput): BehavioralExperimentAssignment {
  const traffic = resolveBehavioralExperimentTraffic({
    riskyRankingChange: input.riskyRankingChange ?? true,
    variantTrafficPercent: input.variantTrafficPercent,
  });
  const unit = resolveBehavioralExperimentUnit(input);

  if (!unit) {
    return {
      experimentId: input.experimentId,
      unitType: "missing",
      unitId: "",
      assignmentKey: `${input.experimentId}:missing`,
      bucket: 99,
      variant: "control",
      variantTrafficPercent: traffic.variantTrafficPercent,
      controlTrafficPercent: traffic.controlTrafficPercent,
      holdout: true,
      rankingMode: "deterministic_baseline_holdout",
      reason: "missing_unit",
    };
  }

  const assignmentKey = `${unit.unitType}:${unit.unitId}:${input.experimentId}`;
  const variant = hashExperimentAssignmentKey(`${unit.unitId}${input.experimentId}`) % 100;
  const assignedVariant = variant < traffic.variantTrafficPercent ? "variant" : "control";
  const holdout = assignedVariant === "control";

  return {
    experimentId: input.experimentId,
    unitType: unit.unitType,
    unitId: unit.unitId,
    assignmentKey,
    bucket: variant,
    variant: assignedVariant,
    variantTrafficPercent: traffic.variantTrafficPercent,
    controlTrafficPercent: traffic.controlTrafficPercent,
    holdout,
    rankingMode: holdout ? "deterministic_baseline_holdout" : "experiment_variant",
    reason: holdout ? "holdout" : "assigned",
  };
}
