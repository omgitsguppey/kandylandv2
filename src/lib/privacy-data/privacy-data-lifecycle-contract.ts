export const PRIVACY_CLASS_VALUES = [
  "public",
  "internal",
  "user_private",
  "creator_private",
  "admin_private",
  "payment_sensitive",
  "auth_sensitive",
  "chat_private",
  "media_private",
  "telemetry_operational",
  "telemetry_behavioral",
  "security_event",
  "legacy_unknown",
] as const;

export type PrivacyClass = (typeof PRIVACY_CLASS_VALUES)[number];

export const CONSENT_CLASS_VALUES = [
  "consent_not_required_security",
  "consent_not_required_operational",
  "minimal_analytics_allowed",
  "behavioral_tracking_allowed",
  "marketing_notifications_allowed",
  "denied",
  "unknown",
] as const;

export type PrivacyConsentClass = (typeof CONSENT_CLASS_VALUES)[number];

export const RETENTION_CLASS_VALUES = [
  "session_only",
  "short_lived_24h",
  "operational_30d",
  "analytics_90d",
  "ledger_required",
  "legal_hold_possible",
  "delete_on_account_delete",
  "anonymize_on_delete",
  "archive_only_legacy",
] as const;

export type RetentionClass = (typeof RETENTION_CLASS_VALUES)[number];

export const EXPORT_ELIGIBILITY_VALUES = [
  "user_exportable",
  "admin_only_summary",
  "redacted_only",
  "not_exportable_sensitive",
  "provider_external",
  "legacy_unknown_review",
] as const;

export type ExportEligibility = (typeof EXPORT_ELIGIBILITY_VALUES)[number];

export const DELETE_ELIGIBILITY_VALUES = [
  "delete",
  "anonymize",
  "retain_ledger",
  "retain_security",
  "retain_legal",
  "provider_external",
  "legacy_unknown_review",
] as const;

export type DeleteEligibility = (typeof DELETE_ELIGIBILITY_VALUES)[number];
export type AdminVisibility = "hidden" | "redacted_summary" | "audit_required_drilldown";

export interface PrivacyDataLifecycleObject {
  objectKey: string;
  ownerSystem: string;
  privacyClass: PrivacyClass;
  consentClass: PrivacyConsentClass;
  retentionClass: RetentionClass;
  exportEligibility: ExportEligibility;
  deleteEligibility: DeleteEligibility;
  retentionPolicy: string;
  redactionPolicy: string;
  canShowToUser: boolean | "redacted_summary";
  canShowInAdmin: AdminVisibility;
}

export interface PrivacyDataLifecycleDecisionInput {
  objectKey: string;
  consentClass?: PrivacyConsentClass;
}

export interface PrivacyDataLifecycleDecision {
  canCollect: boolean;
  canStore: boolean;
  canExport: boolean;
  canDelete: boolean;
  canShowInAdmin: AdminVisibility;
  canShowToUser: boolean | "redacted_summary";
  canUseForBehavioralIntelligence: boolean;
  retentionPolicy: string;
  redactionPolicy: string;
}

export const PRIVACY_DATA_LIFECYCLE_OBJECTS: readonly PrivacyDataLifecycleObject[] = [
  { objectKey: "public_drop_metadata", ownerSystem: "drops", privacyClass: "public", consentClass: "consent_not_required_operational", retentionClass: "operational_30d", exportEligibility: "user_exportable", deleteEligibility: "delete", retentionPolicy: "Operational metadata follows drop lifecycle.", redactionPolicy: "No sensitive fields.", canShowToUser: true, canShowInAdmin: "redacted_summary" },
  { objectKey: "user_profile_private", ownerSystem: "auth/profile", privacyClass: "user_private", consentClass: "consent_not_required_operational", retentionClass: "delete_on_account_delete", exportEligibility: "user_exportable", deleteEligibility: "delete", retentionPolicy: "Retain while account exists, then delete or anonymize references.", redactionPolicy: "Hide raw email from default admin summaries.", canShowToUser: true, canShowInAdmin: "audit_required_drilldown" },
  { objectKey: "creator_private_settings", ownerSystem: "creator", privacyClass: "creator_private", consentClass: "consent_not_required_operational", retentionClass: "delete_on_account_delete", exportEligibility: "user_exportable", deleteEligibility: "delete", retentionPolicy: "Retain while creator account exists.", redactionPolicy: "Show setting labels, not private notes, by default.", canShowToUser: true, canShowInAdmin: "audit_required_drilldown" },
  { objectKey: "payment_receipt_summary", ownerSystem: "payments", privacyClass: "payment_sensitive", consentClass: "consent_not_required_operational", retentionClass: "ledger_required", exportEligibility: "redacted_only", deleteEligibility: "retain_ledger", retentionPolicy: "Retain ledger summaries required for payment, tax, and dispute records.", redactionPolicy: "fingerprint provider/payment identifiers; redact payer details.", canShowToUser: "redacted_summary", canShowInAdmin: "redacted_summary" },
  { objectKey: "gumdrop_ledger_entry", ownerSystem: "wallet/gumdrops", privacyClass: "payment_sensitive", consentClass: "consent_not_required_operational", retentionClass: "ledger_required", exportEligibility: "redacted_only", deleteEligibility: "retain_ledger", retentionPolicy: "Retain balance-affecting ledger edge with source bucket.", redactionPolicy: "Provider IDs remain hidden; show source bucket summary only.", canShowToUser: "redacted_summary", canShowInAdmin: "redacted_summary" },
  { objectKey: "auth_session_event", ownerSystem: "auth", privacyClass: "auth_sensitive", consentClass: "consent_not_required_security", retentionClass: "short_lived_24h", exportEligibility: "not_exportable_sensitive", deleteEligibility: "retain_security", retentionPolicy: "Short lived security record.", redactionPolicy: "Never serialize auth tokens.", canShowToUser: false, canShowInAdmin: "redacted_summary" },
  { objectKey: "chat_message_content", ownerSystem: "chat", privacyClass: "chat_private", consentClass: "consent_not_required_operational", retentionClass: "legal_hold_possible", exportEligibility: "redacted_only", deleteEligibility: "delete", retentionPolicy: "Retain for user communication unless legal/safety hold applies.", redactionPolicy: "Hide chat content in default admin; raw access requires support/safety audit reason.", canShowToUser: true, canShowInAdmin: "audit_required_drilldown" },
  { objectKey: "private_media_reference", ownerSystem: "media", privacyClass: "media_private", consentClass: "consent_not_required_operational", retentionClass: "legal_hold_possible", exportEligibility: "redacted_only", deleteEligibility: "delete", retentionPolicy: "Retain while media entitlement or support/safety case requires it.", redactionPolicy: "Never expose private URLs or storage paths.", canShowToUser: "redacted_summary", canShowInAdmin: "redacted_summary" },
  { objectKey: "notification_push_token", ownerSystem: "notifications", privacyClass: "auth_sensitive", consentClass: "marketing_notifications_allowed", retentionClass: "delete_on_account_delete", exportEligibility: "not_exportable_sensitive", deleteEligibility: "delete", retentionPolicy: "Retain only for opted-in notification delivery.", redactionPolicy: "Never show raw push tokens.", canShowToUser: false, canShowInAdmin: "hidden" },
  { objectKey: "operational_telemetry_event", ownerSystem: "telemetry", privacyClass: "telemetry_operational", consentClass: "minimal_analytics_allowed", retentionClass: "analytics_90d", exportEligibility: "redacted_only", deleteEligibility: "anonymize", retentionPolicy: "Retain aggregate operational analytics for 90 days.", redactionPolicy: "Drop direct identifiers and route through safe event envelope.", canShowToUser: "redacted_summary", canShowInAdmin: "redacted_summary" },
  { objectKey: "behavioral_journey_event", ownerSystem: "behavioral", privacyClass: "telemetry_behavioral", consentClass: "behavioral_tracking_allowed", retentionClass: "analytics_90d", exportEligibility: "redacted_only", deleteEligibility: "anonymize", retentionPolicy: "Retain only when behavioral consent allows; anonymize on delete.", redactionPolicy: "Export as redacted journey summary, never exact legacy truth.", canShowToUser: "redacted_summary", canShowInAdmin: "redacted_summary" },
  { objectKey: "security_debug_finding", ownerSystem: "debug/security", privacyClass: "security_event", consentClass: "consent_not_required_security", retentionClass: "legal_hold_possible", exportEligibility: "admin_only_summary", deleteEligibility: "retain_security", retentionPolicy: "Retain grouped security evidence while relevant to abuse prevention.", redactionPolicy: "Fingerprint actor and route; tokens, provider IDs, and private media URLs stay hidden.", canShowToUser: false, canShowInAdmin: "redacted_summary" },
  { objectKey: "support_thread_record", ownerSystem: "support", privacyClass: "user_private", consentClass: "consent_not_required_operational", retentionClass: "legal_hold_possible", exportEligibility: "user_exportable", deleteEligibility: "delete", retentionPolicy: "Retain for support case lifecycle and safety/legal holds.", redactionPolicy: "Admin default shows category/status/preview only.", canShowToUser: true, canShowInAdmin: "redacted_summary" },
  { objectKey: "legacy_behavior_record", ownerSystem: "legacy", privacyClass: "legacy_unknown", consentClass: "unknown", retentionClass: "archive_only_legacy", exportEligibility: "legacy_unknown_review", deleteEligibility: "legacy_unknown_review", retentionPolicy: "Review before export, delete, scoring, or display.", redactionPolicy: "Unknown legacy data must not be exported as exact user truth.", canShowToUser: "redacted_summary", canShowInAdmin: "redacted_summary" },
];

const OBJECTS_BY_KEY = new Map(PRIVACY_DATA_LIFECYCLE_OBJECTS.map((entry) => [entry.objectKey, entry]));
const SENSITIVE_PRIVACY_CLASSES = new Set<PrivacyClass>(["payment_sensitive", "auth_sensitive", "chat_private", "media_private"]);

export function resolvePrivacyDataLifecycleDecision(input: PrivacyDataLifecycleDecisionInput): PrivacyDataLifecycleDecision {
  const object = OBJECTS_BY_KEY.get(input.objectKey) ?? OBJECTS_BY_KEY.get("legacy_behavior_record")!;
  const consentClass = input.consentClass ?? object.consentClass;
  const deniedBehavioral = consentClass === "denied" && object.privacyClass === "telemetry_behavioral";
  const legacyUnknown = object.privacyClass === "legacy_unknown";
  const canExport = object.exportEligibility === "user_exportable" || object.exportEligibility === "redacted_only";
  return {
    canCollect: !deniedBehavioral && !legacyUnknown,
    canStore: !deniedBehavioral && !legacyUnknown,
    canExport,
    canDelete: object.deleteEligibility === "delete" || object.deleteEligibility === "anonymize",
    canShowInAdmin: object.canShowInAdmin,
    canShowToUser: object.canShowToUser,
    canUseForBehavioralIntelligence: object.privacyClass === "telemetry_behavioral" && consentClass === "behavioral_tracking_allowed",
    retentionPolicy: object.retentionPolicy,
    redactionPolicy: object.redactionPolicy,
  };
}

export function validatePrivacyDataLifecycleContract(entries = PRIVACY_DATA_LIFECYCLE_OBJECTS) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (!entry.privacyClass) failures.push(`${entry.objectKey} missing privacy class.`);
    if (!entry.consentClass) failures.push(`${entry.objectKey} missing consent class.`);
    if (!entry.retentionClass || !entry.retentionPolicy) failures.push(`${entry.objectKey} missing retention policy.`);
    if (!entry.exportEligibility || !entry.deleteEligibility) failures.push(`${entry.objectKey} missing export/delete policy.`);
    if (!entry.redactionPolicy) failures.push(`${entry.objectKey} missing redaction policy.`);
    if (entry.privacyClass === "telemetry_behavioral" && resolvePrivacyDataLifecycleDecision({ objectKey: entry.objectKey, consentClass: "denied" }).canUseForBehavioralIntelligence) {
      failures.push(`${entry.objectKey} permits behavioral data under denied consent.`);
    }
    if (SENSITIVE_PRIVACY_CLASSES.has(entry.privacyClass) && entry.exportEligibility === "user_exportable" && !/redact|summary|fingerprint|hide/iu.test(entry.redactionPolicy)) {
      failures.push(`${entry.objectKey} can export raw sensitive data.`);
    }
    if (entry.privacyClass === "legacy_unknown" && entry.exportEligibility !== "legacy_unknown_review") failures.push(`${entry.objectKey} treats legacy unknown as exact.`);
  }
  return failures;
}

export function buildPrivacyDataLifecycleContractReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validatePrivacyDataLifecycleContract();
  return {
    reportKey: "privacy-data-lifecycle-contract",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    privacyClassesMapped: PRIVACY_CLASS_VALUES.length,
    objectsMapped: PRIVACY_DATA_LIFECYCLE_OBJECTS.length,
    behavioralDataPoliciesMapped: PRIVACY_DATA_LIFECYCLE_OBJECTS.filter((entry) => entry.privacyClass === "telemetry_behavioral").length,
    rawSensitiveLeaksPrevented: PRIVACY_DATA_LIFECYCLE_OBJECTS.filter((entry) => SENSITIVE_PRIVACY_CLASSES.has(entry.privacyClass)).length,
    validationFailures,
  };
}
