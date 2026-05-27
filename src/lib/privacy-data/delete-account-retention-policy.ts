import type { DeleteEligibility, PrivacyClass, RetentionClass } from "./privacy-data-lifecycle-contract";

export const DELETE_ACCOUNT_RETENTION_STAGES = [
  "requested",
  "verified",
  "scheduled",
  "immediate_deactivation",
  "data_delete_queue",
  "anonymize_analytics",
  "retain_ledger_required",
  "retain_security_required",
  "provider_external_required",
  "completed",
  "failed",
  "cancelled",
] as const;

export interface DeleteAccountRetentionTarget {
  targetKey: string;
  privacyClass: PrivacyClass;
  retentionClass: RetentionClass;
  deleteEligibility: DeleteEligibility;
  deleteAction: string;
  danglingReferencePolicy: string;
}

export const DELETE_ACCOUNT_RETENTION_TARGETS: readonly DeleteAccountRetentionTarget[] = [
  { targetKey: "user_private_profile", privacyClass: "user_private", retentionClass: "delete_on_account_delete", deleteEligibility: "delete", deleteAction: "delete or anonymize user profile fields", danglingReferencePolicy: "replace user display references with deleted account placeholder" },
  { targetKey: "creator_private_profile", privacyClass: "creator_private", retentionClass: "delete_on_account_delete", deleteEligibility: "delete", deleteAction: "deactivate creator profile and redact private settings", danglingReferencePolicy: "hide creator-private settings and keep public references only when policy allows" },
  { targetKey: "payment_ledger_summaries", privacyClass: "payment_sensitive", retentionClass: "ledger_required", deleteEligibility: "retain_ledger", deleteAction: "retain ledger-required summary and fingerprint provider links", danglingReferencePolicy: "keep ledger edge without raw user PII" },
  { targetKey: "behavioral_journey_records", privacyClass: "telemetry_behavioral", retentionClass: "anonymize_on_delete", deleteEligibility: "anonymize", deleteAction: "anonymize behavioral journey records or delete non-required rows", danglingReferencePolicy: "remove userId and retain only aggregate-safe facts" },
  { targetKey: "chat_private_content", privacyClass: "chat_private", retentionClass: "legal_hold_possible", deleteEligibility: "delete", deleteAction: "delete or redact private chat content unless legal/safety hold applies", danglingReferencePolicy: "replace sender identity with deleted account placeholder" },
  { targetKey: "media_private_assets", privacyClass: "media_private", retentionClass: "legal_hold_possible", deleteEligibility: "delete", deleteAction: "delete owned private media or revoke access unless legal/safety hold applies", danglingReferencePolicy: "remove private URLs and storage paths from visible records" },
  { targetKey: "notification_push_tokens", privacyClass: "auth_sensitive", retentionClass: "delete_on_account_delete", deleteEligibility: "delete", deleteAction: "revoke and delete push tokens", danglingReferencePolicy: "remove token references from notification fanout state" },
  { targetKey: "auth_security_diagnostics", privacyClass: "security_event", retentionClass: "legal_hold_possible", deleteEligibility: "retain_security", deleteAction: "retain security-required diagnostic summary with direct identifiers redacted", danglingReferencePolicy: "fingerprint actor and route for abuse prevention" },
  { targetKey: "support_legal_security_records", privacyClass: "security_event", retentionClass: "legal_hold_possible", deleteEligibility: "retain_legal", deleteAction: "retain legally required support/security summary with redaction", danglingReferencePolicy: "fingerprint actor and redact direct identifiers" },
  { targetKey: "admin_debug_references", privacyClass: "admin_private", retentionClass: "operational_30d", deleteEligibility: "anonymize", deleteAction: "redact admin debug references and remove raw user identifiers", danglingReferencePolicy: "admin summaries use anonymous subject fingerprint" },
  { targetKey: "provider_external_records", privacyClass: "payment_sensitive", retentionClass: "ledger_required", deleteEligibility: "provider_external", deleteAction: "record external provider action requirement without calling provider", danglingReferencePolicy: "do not imply provider deletion was completed by source-only code" },
];

export function validateDeleteAccountRetentionPolicy() {
  const failures: string[] = [];
  for (const stage of DELETE_ACCOUNT_RETENTION_STAGES) {
    if (!stage) failures.push("Delete flow has empty stage.");
  }
  if (!DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.deleteEligibility === "retain_ledger")) failures.push("Ledger retention missing.");
  if (!DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.targetKey === "notification_push_tokens" && /revoke|delete/iu.test(target.deleteAction))) failures.push("Push token removal missing.");
  if (!DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.privacyClass === "telemetry_behavioral" && target.deleteEligibility === "anonymize")) failures.push("Behavioral anonymization missing.");
  if (!DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => target.targetKey === "admin_debug_references" && /redact/iu.test(target.deleteAction))) failures.push("Admin/debug redaction missing.");
  if (DELETE_ACCOUNT_RETENTION_TARGETS.some((target) => !target.danglingReferencePolicy)) failures.push("Dangling profile references unclassified.");
  return failures;
}

export function buildDeleteAccountRetentionPolicyReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateDeleteAccountRetentionPolicy();
  return {
    reportKey: "delete-account-retention-policy",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    deleteRetentionStagesMapped: DELETE_ACCOUNT_RETENTION_STAGES.length,
    retentionTargetsMapped: DELETE_ACCOUNT_RETENTION_TARGETS.length,
    validationFailures,
  };
}
