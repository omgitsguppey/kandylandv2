import type {
  LegacyNormalizationAction,
  LegacyNormalizationConfidence,
  LegacyNormalizationDuplicateRisk,
  PrivacyBehaviorLegacyClass,
} from "@/lib/legacy/legacy-normalization-contract";
import { PRIVACY_BEHAVIOR_LEGACY_CLASSES } from "@/lib/legacy/legacy-normalization-contract";
import type { ConsentMode, ConsentSource } from "@/lib/privacy/consent-tracking-contract";

export const PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE = "2026-03-01";

export type PrivacyBehaviorNormalizedCategory =
  | "legacy_consent_unknown"
  | "legacy_cookie_banner_state"
  | "guest_behavior_unknown"
  | "user_behavior_candidate"
  | "guest_session"
  | "behavior_event"
  | "orphaned_materialized_metric"
  | "profile_drop_interaction"
  | "unknown";

export type PrivacyBehaviorConsentAssumption =
  | "unknown_consent_treat_as_necessary_only"
  | "explicit_legacy_banner_state_review_required"
  | "minimal_or_full_consent_required_before_behavior_use"
  | "consent_not_proven_archive_only";

export type PrivacyBehaviorAllowedUsage =
  | "debug_visibility"
  | "dry_run_review"
  | "archive_recovery"
  | "local_evidence_mapping";

export type PrivacyBehaviorForbiddenUsage =
  | "current_truth"
  | "full_behavioral_tracking"
  | "person_level_behavior"
  | "personalization"
  | "production_backfill"
  | "mutation";

export type PrivacyBehaviorLegacyRecordInput = {
  legacyId: string;
  legacyClass: PrivacyBehaviorLegacyClass;
  legacySource: string;
  timestampMs: number;
  fields: Record<string, unknown>;
};

export type PrivacyBehaviorLegacyRecoveryRecord = PrivacyBehaviorLegacyRecordInput & {
  normalizedCategory: PrivacyBehaviorNormalizedCategory;
  candidateNormalizedRecord: Record<string, string | number | boolean | null>;
  confidence: LegacyNormalizationConfidence;
  duplicateRisk: LegacyNormalizationDuplicateRisk;
  consentAssumption: PrivacyBehaviorConsentAssumption;
  allowedUsage: PrivacyBehaviorAllowedUsage[];
  forbiddenUsage: PrivacyBehaviorForbiddenUsage[];
  requiresUserConfirmation: boolean;
  action: LegacyNormalizationAction;
  currentTruthEligible: false;
  readOnly: true;
  dryRunOnly: true;
  mutationBlockedReason: "dry_run_only" | "unknown_legacy_not_current_truth" | "orphaned_metric_archive_only";
  evidenceReason: string;
};

export type PrivacyBehaviorLegacyRecoveryPlan = {
  mode: "dry_run_only";
  recoveryStartDate: typeof PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE;
  readsProduction: false;
  liveBackfill: false;
  mutationsAllowed: false;
  records: PrivacyBehaviorLegacyRecoveryRecord[];
  adminDebugVisibility: {
    recoveryReadiness: "ready_for_dry_run_review";
    reportPath: "agent/state/privacy-behavior-legacy-recovery.generated.json";
    orphanCountsByClass: Partial<Record<PrivacyBehaviorLegacyClass, number>>;
    cannotSafelyRecover: PrivacyBehaviorLegacyClass[];
    unsafeRecoveryReason: string;
  };
  debugBacklogIssues: Array<{
    id: string;
    sourceRoute: "legacy://privacy-behavior-recovery";
    source: "evidence" | "telemetry" | "admin_truth";
    fixClass: "evidence_refresh" | "stale_retire" | "manual_required";
    owner: "analytics";
    severity: "p1" | "p2" | "p3";
    exactNextAction: string;
  }>;
  summary: {
    inputRecords: number;
    inWindowRecords: number;
    confidenceCounts: Record<LegacyNormalizationConfidence, number>;
    duplicateRiskCounts: Record<LegacyNormalizationDuplicateRisk, number>;
    currentTruthEligibleCount: 0;
    requiresUserConfirmationCount: number;
    archiveOnlyCount: number;
    orphanCountsByClass: Partial<Record<PrivacyBehaviorLegacyClass, number>>;
    cannotSafelyRecoverCount: number;
  };
};

function readString(fields: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function readNumber(fields: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function normalizedCategoryFor(legacyClass: PrivacyBehaviorLegacyClass): PrivacyBehaviorNormalizedCategory {
  switch (legacyClass) {
    case "legacy_consent_unknown":
      return "legacy_consent_unknown";
    case "legacy_cookie_banner_state":
      return "legacy_cookie_banner_state";
    case "legacy_guest_behavior_unknown":
      return "guest_behavior_unknown";
    case "legacy_user_behavior_probable":
      return "behavior_event";
    case "orphaned_guest_session":
      return "guest_session";
    case "orphaned_user_event":
      return "behavior_event";
    case "orphaned_materialized_metric":
      return "orphaned_materialized_metric";
    case "orphaned_profile_drop_interaction":
      return "profile_drop_interaction";
    default:
      return "unknown";
  }
}

function confidenceFor(record: PrivacyBehaviorLegacyRecordInput): LegacyNormalizationConfidence {
  if (record.legacyClass === "legacy_consent_unknown" || record.legacyClass === "legacy_guest_behavior_unknown") return "unknown";
  if (record.legacyClass === "legacy_user_behavior_probable") {
    return readString(record.fields, "userId", "user_id") && readString(record.fields, "eventName", "event_name") ? "probable" : "weak";
  }
  if (record.legacyClass === "orphaned_materialized_metric") return "weak";
  if (record.legacyClass === "legacy_cookie_banner_state") {
    return readString(record.fields, "consentMode", "consent_mode") ? "weak" : "unknown";
  }
  if (record.legacyClass === "orphaned_guest_session") {
    return readString(record.fields, "sessionId", "session_id") && readString(record.fields, "anonymousVisitorId", "anonymous_visitor_id") ? "weak" : "unknown";
  }
  if (record.legacyClass === "orphaned_user_event") {
    return readString(record.fields, "eventName", "event_name") && readString(record.fields, "userId", "user_id") ? "weak" : "unknown";
  }
  if (record.legacyClass === "orphaned_profile_drop_interaction") {
    return readString(record.fields, "targetCreatorId", "creatorId", "creator_id", "dropId", "drop_id") ? "weak" : "unknown";
  }
  return "unknown";
}

function duplicateRiskFor(record: PrivacyBehaviorLegacyRecordInput, confidence: LegacyNormalizationConfidence): LegacyNormalizationDuplicateRisk {
  if (confidence === "unknown") return "high";
  if (record.legacyClass === "orphaned_materialized_metric") return "high";
  if (record.legacyClass.startsWith("orphaned_")) return "medium";
  return confidence === "probable" ? "medium" : "high";
}

function actionFor(record: PrivacyBehaviorLegacyRecordInput, confidence: LegacyNormalizationConfidence): LegacyNormalizationAction {
  if (record.legacyClass === "legacy_consent_unknown" || confidence === "unknown") return "archive_only";
  if (record.legacyClass === "orphaned_materialized_metric") return "archive_only";
  if (record.legacyClass === "legacy_cookie_banner_state") return "needs_manual_review";
  return "normalize_candidate";
}

function consentAssumptionFor(record: PrivacyBehaviorLegacyRecordInput): PrivacyBehaviorConsentAssumption {
  if (record.legacyClass === "legacy_consent_unknown") return "unknown_consent_treat_as_necessary_only";
  if (record.legacyClass === "legacy_cookie_banner_state") return "explicit_legacy_banner_state_review_required";
  if (record.legacyClass === "legacy_user_behavior_probable" || record.legacyClass === "orphaned_user_event") {
    return "minimal_or_full_consent_required_before_behavior_use";
  }
  return "consent_not_proven_archive_only";
}

function candidateRecordFor(record: PrivacyBehaviorLegacyRecordInput, normalizedCategory: PrivacyBehaviorNormalizedCategory) {
  const candidate: Record<string, string | number | boolean | null> = {
    legacyId: record.legacyId,
    legacySource: record.legacySource,
    normalizedCategory,
  };
  const eventName = readString(record.fields, "eventName", "event_name");
  const userId = readString(record.fields, "userId", "user_id");
  const anonymousVisitorId = readString(record.fields, "anonymousVisitorId", "anonymous_visitor_id", "guestId", "guest_id");
  const sessionId = readString(record.fields, "sessionId", "session_id");
  const targetCreatorId = readString(record.fields, "targetCreatorId", "target_creator_id", "creatorId", "creator_id");
  const dropId = readString(record.fields, "dropId", "drop_id");
  const metricId = readString(record.fields, "metricId", "metric_id");
  const count = readNumber(record.fields, "count", "value", "total");

  if (eventName) candidate.eventName = eventName;
  if (userId) candidate.userId = userId;
  if (anonymousVisitorId) candidate.anonymousVisitorId = anonymousVisitorId;
  if (sessionId) candidate.sessionId = sessionId;
  if (targetCreatorId) candidate.targetCreatorId = targetCreatorId;
  if (dropId) candidate.dropId = dropId;
  if (metricId) candidate.metricId = metricId;
  if (count !== null) candidate.count = count;
  if (record.legacyClass === "legacy_consent_unknown") {
    candidate.consentMode = "necessary_only" satisfies ConsentMode;
    candidate.consentSource = "legacy_default" satisfies ConsentSource;
  }
  return candidate;
}

function mutationBlockedReasonFor(record: PrivacyBehaviorLegacyRecordInput, action: LegacyNormalizationAction): PrivacyBehaviorLegacyRecoveryRecord["mutationBlockedReason"] {
  if (record.legacyClass === "orphaned_materialized_metric") return "orphaned_metric_archive_only";
  if (action === "archive_only") return "unknown_legacy_not_current_truth";
  return "dry_run_only";
}

function evidenceReasonFor(record: PrivacyBehaviorLegacyRecordInput, action: LegacyNormalizationAction) {
  if (record.legacyClass === "legacy_consent_unknown") {
    return "Unknown legacy consent is treated as necessary-only archive evidence and cannot become full behavioral tracking.";
  }
  if (record.legacyClass === "orphaned_materialized_metric") {
    return "Orphaned materialized metrics lack a source producer and remain archive-only until source facts are found.";
  }
  if (action === "archive_only") {
    return "Unknown or orphaned legacy data cannot count as current truth.";
  }
  return "Dry-run candidate only; confidence, duplicate risk, and consent assumptions must be reviewed before any future migration plan.";
}

function isCannotSafelyRecover(record: PrivacyBehaviorLegacyRecoveryRecord) {
  return record.action === "archive_only" || record.confidence === "unknown" || record.duplicateRisk === "high";
}

export function buildPrivacyBehaviorLegacyRecoveryPlan(input: {
  records: PrivacyBehaviorLegacyRecordInput[];
}): PrivacyBehaviorLegacyRecoveryPlan {
  const startMs = Date.parse(`${PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE}T00:00:00.000Z`);
  const records = input.records
    .filter((record) => record.timestampMs >= startMs)
    .map((record): PrivacyBehaviorLegacyRecoveryRecord => {
      const normalizedCategory = normalizedCategoryFor(record.legacyClass);
      const confidence = confidenceFor(record);
      const duplicateRisk = duplicateRiskFor(record, confidence);
      const action = actionFor(record, confidence);
      const forbiddenUsage: PrivacyBehaviorForbiddenUsage[] = [
        "current_truth",
        "production_backfill",
        "mutation",
      ];
      if (record.legacyClass === "legacy_consent_unknown" || record.legacyClass.includes("behavior")) {
        forbiddenUsage.push("full_behavioral_tracking", "person_level_behavior", "personalization");
      }

      return {
        ...record,
        normalizedCategory,
        candidateNormalizedRecord: candidateRecordFor(record, normalizedCategory),
        confidence,
        duplicateRisk,
        consentAssumption: consentAssumptionFor(record),
        allowedUsage: ["debug_visibility", "dry_run_review", "archive_recovery", "local_evidence_mapping"],
        forbiddenUsage: Array.from(new Set(forbiddenUsage)),
        requiresUserConfirmation: record.legacyClass === "legacy_consent_unknown" || record.legacyClass === "legacy_cookie_banner_state",
        action,
        currentTruthEligible: false,
        readOnly: true,
        dryRunOnly: true,
        mutationBlockedReason: mutationBlockedReasonFor(record, action),
        evidenceReason: evidenceReasonFor(record, action),
      };
    });

  const confidenceCounts: Record<LegacyNormalizationConfidence, number> = { exact: 0, probable: 0, weak: 0, unknown: 0 };
  const duplicateRiskCounts: Record<LegacyNormalizationDuplicateRisk, number> = { low: 0, medium: 0, high: 0 };
  const orphanCountsByClass: Partial<Record<PrivacyBehaviorLegacyClass, number>> = {};
  for (const record of records) {
    confidenceCounts[record.confidence] += 1;
    duplicateRiskCounts[record.duplicateRisk] += 1;
    if (record.legacyClass.startsWith("orphaned_")) {
      orphanCountsByClass[record.legacyClass] = (orphanCountsByClass[record.legacyClass] ?? 0) + 1;
    }
  }

  const cannotSafelyRecover = Array.from(new Set(records.filter(isCannotSafelyRecover).map((record) => record.legacyClass))).sort() as PrivacyBehaviorLegacyClass[];

  return {
    mode: "dry_run_only",
    recoveryStartDate: PRIVACY_BEHAVIOR_LEGACY_RECOVERY_START_DATE,
    readsProduction: false,
    liveBackfill: false,
    mutationsAllowed: false,
    records,
    adminDebugVisibility: {
      recoveryReadiness: "ready_for_dry_run_review",
      reportPath: "agent/state/privacy-behavior-legacy-recovery.generated.json",
      orphanCountsByClass,
      cannotSafelyRecover,
      unsafeRecoveryReason: "Unknown consent, orphaned metrics, and high-duplicate-risk rows stay archive-only and visible to debug/admin truth.",
    },
    debugBacklogIssues: [
      {
        id: "privacy-behavior-legacy-unknown-consent",
        sourceRoute: "legacy://privacy-behavior-recovery",
        source: "evidence",
        fixClass: "manual_required",
        owner: "analytics",
        severity: cannotSafelyRecover.includes("legacy_consent_unknown") ? "p1" : "p3",
        exactNextAction: "Keep unknown legacy consent necessary-only unless a user or account-level consent artifact confirms a stronger mode.",
      },
      {
        id: "privacy-behavior-orphaned-data-archive",
        sourceRoute: "legacy://privacy-behavior-recovery",
        source: "telemetry",
        fixClass: "evidence_refresh",
        owner: "analytics",
        severity: Object.keys(orphanCountsByClass).length > 0 ? "p2" : "p3",
        exactNextAction: "Use this dry-run mapping to locate source facts for orphaned behavior rows; otherwise keep them archive-only.",
      },
    ],
    summary: {
      inputRecords: input.records.length,
      inWindowRecords: records.length,
      confidenceCounts,
      duplicateRiskCounts,
      currentTruthEligibleCount: 0,
      requiresUserConfirmationCount: records.filter((record) => record.requiresUserConfirmation).length,
      archiveOnlyCount: records.filter((record) => record.action === "archive_only").length,
      orphanCountsByClass,
      cannotSafelyRecoverCount: cannotSafelyRecover.length,
    },
  };
}

export function listPrivacyBehaviorLegacyClasses() {
  return [...PRIVACY_BEHAVIOR_LEGACY_CLASSES];
}
