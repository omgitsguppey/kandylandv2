import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import {
  LEGACY_RECOVERY_START_DATE,
  type LegacyCanonicalizationInput,
  type LegacyDuplicateRisk,
  type LegacyRecoveryAction,
  buildLegacyDedupeKey,
  canonicalizeLegacyEventName,
  classifyLegacyMetricConfidence,
} from "@/lib/math/legacy-metric-canonicalization";
import type { PersonMetricId } from "@/lib/analytics/person-metrics-contract";

export const recoveryStartDate = LEGACY_RECOVERY_START_DATE;
export const dryRunOnly = true as const;

export type LegacyRecoveryDryRunRecord = LegacyCanonicalizationInput & {
  legacySource: string;
};

export type LegacyRecoveryDryRunCandidate = {
  candidateId: string;
  legacySource: string;
  canonicalEventName: string;
  canonicalMetricId: PersonMetricId | null;
  confidenceWeight: number;
  identityConfidence: IdentityConfidence;
  duplicateRisk: LegacyDuplicateRisk;
  dedupeKey: string;
  action: LegacyRecoveryAction;
  reason: string;
  accuracyImpact: string;
  userVisibleImpact: string;
  dryRunOnly: true;
  canMutateProduction: false;
};

export type LegacyRecoveryDryRun = {
  mode: "dry_run_only";
  recoveryStartDate: typeof recoveryStartDate;
  readsProduction: false;
  mutationsAllowed: false;
  liveBackfill: false;
  candidates: LegacyRecoveryDryRunCandidate[];
  summary: {
    inputRecords: number;
    candidateCount: number;
    actionCounts: Record<LegacyRecoveryAction, number>;
    confidenceCounts: Record<IdentityConfidence, number>;
    duplicateRiskCounts: Record<LegacyDuplicateRisk, number>;
    canonicalMetricCount: number;
    archiveOnlyCount: number;
    manualReviewCount: number;
  };
  mutationPrevention: {
    productionMutationBlocked: true;
    blockedReason: "dry_run_only_no_production_reads_or_mutations";
  };
};

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function timestampMs(value: LegacyCanonicalizationInput["occurredAt"]) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function beforeRecoveryStart(input: LegacyCanonicalizationInput) {
  const occurredAtMs = timestampMs(input.occurredAt);
  return occurredAtMs > 0 && occurredAtMs < Date.parse(`${recoveryStartDate}T00:00:00.000Z`);
}

function duplicateRiskFor(input: LegacyCanonicalizationInput, action: LegacyRecoveryAction, identityConfidence: IdentityConfidence): LegacyDuplicateRisk {
  if (action === "archive_only" || action === "ignore" || identityConfidence === "unknown") return "high";
  if (action === "needs_manual_review") return "high";
  if (cleanString(input.eventId) && cleanString(input.userId) && cleanString(input.objectId)) return "medium";
  if (cleanString(input.sessionId) && cleanString(input.objectId)) return "medium";
  return "high";
}

function actionFor(input: LegacyCanonicalizationInput, baseAction: LegacyRecoveryAction, canonicalMetricId: PersonMetricId | null): LegacyRecoveryAction {
  if (beforeRecoveryStart(input)) return "ignore";
  if (!canonicalMetricId) return "archive_only";
  const mapping = canonicalizeLegacyEventName(input);
  if (mapping.aliasCategory === "wallet_payment") return "needs_manual_review";
  return baseAction;
}

function countBy<T extends string>(values: readonly T[], keys: readonly T[]) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const value of values) counts[value] += 1;
  return counts;
}

export function buildLegacyRecoveryCandidate(record: LegacyRecoveryDryRunRecord): LegacyRecoveryDryRunCandidate {
  const mapping = canonicalizeLegacyEventName(record);
  const confidence = classifyLegacyMetricConfidence(record);
  const action = actionFor(record, confidence.action, mapping.canonicalMetricId);
  const duplicateRisk = duplicateRiskFor(record, action, confidence.identityConfidence);
  const dedupeKey = buildLegacyDedupeKey({
    ...record,
    canonicalEventName: mapping.canonicalEventName,
    eventKind: mapping.eventKind,
  });
  const candidateId = [
    "legacy",
    cleanString(record.legacySource) || "unknown_source",
    mapping.canonicalEventName,
    dedupeKey,
  ].join(":");

  return {
    candidateId,
    legacySource: cleanString(record.legacySource) || "unknown_source",
    canonicalEventName: mapping.canonicalEventName,
    canonicalMetricId: action === "archive_only" ? null : mapping.canonicalMetricId,
    confidenceWeight: action === "archive_only" || action === "ignore" ? 0 : confidence.confidenceWeight,
    identityConfidence: action === "archive_only" ? "unknown" : confidence.identityConfidence,
    duplicateRisk,
    dedupeKey,
    action,
    reason: action === "ignore"
      ? `Record occurred before the ${recoveryStartDate} launch recovery boundary.`
      : action === "archive_only"
        ? "Unknown legacy cannot become exact and remains archive_only."
        : mapping.reason,
    accuracyImpact: action === "archive_only"
      ? "Preserves archive evidence without inflating current canonical metrics."
      : `Maps legacy ${eventNameFor(record)} into canonical ${mapping.canonicalEventName} metric evidence with confidence cap ${confidence.confidenceWeight}.`,
    userVisibleImpact: "No production data is changed; this is a dry-run candidate plan for future operator review.",
    dryRunOnly,
    canMutateProduction: false,
  };
}

function eventNameFor(record: LegacyCanonicalizationInput) {
  return cleanString(record.eventName) || cleanString(record.eventType) || cleanString(record.oldEvent) || "unknown_legacy";
}

export function buildLegacyRecoveryDryRun(input: { records: LegacyRecoveryDryRunRecord[] }): LegacyRecoveryDryRun {
  const candidates = input.records.map(buildLegacyRecoveryCandidate);
  return {
    mode: "dry_run_only",
    recoveryStartDate,
    readsProduction: false,
    mutationsAllowed: false,
    liveBackfill: false,
    candidates,
    summary: {
      inputRecords: input.records.length,
      candidateCount: candidates.length,
      actionCounts: countBy(candidates.map((candidate) => candidate.action), [
        "normalize_candidate",
        "link_candidate",
        "archive_only",
        "ignore",
        "needs_manual_review",
      ]),
      confidenceCounts: countBy(candidates.map((candidate) => candidate.identityConfidence), [
        "exact",
        "linked",
        "inferred",
        "weak",
        "unknown",
      ]),
      duplicateRiskCounts: countBy(candidates.map((candidate) => candidate.duplicateRisk), ["low", "medium", "high"]),
      canonicalMetricCount: candidates.filter((candidate) => candidate.canonicalMetricId).length,
      archiveOnlyCount: candidates.filter((candidate) => candidate.action === "archive_only").length,
      manualReviewCount: candidates.filter((candidate) => candidate.action === "needs_manual_review").length,
    },
    mutationPrevention: {
      productionMutationBlocked: true,
      blockedReason: "dry_run_only_no_production_reads_or_mutations",
    },
  };
}
