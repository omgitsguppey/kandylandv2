import type { PrivacyClass, RetentionClass } from "./privacy-data-lifecycle-contract";

export type SupportAccountSafetyCategory =
  | "bug_report"
  | "account_delete_request"
  | "data_export_request"
  | "payment_issue"
  | "GumDrop_issue"
  | "creator_access_issue"
  | "chat_issue"
  | "media_issue"
  | "auth_issue"
  | "safety/security_issue"
  | "privacy_request"
  | "unknown";

export interface SupportAccountSafetyEntry {
  category: SupportAccountSafetyCategory;
  privacyClass: PrivacyClass;
  retentionClass: RetentionClass;
  adminVisibility: "redacted_summary" | "audit_required_drilldown";
  redaction: string;
  routeActionOwner: string;
  telemetry: string;
  debug: string;
  userCopy: string;
  nextAction: string;
}

export const SUPPORT_ACCOUNT_SAFETY_CATEGORIES: readonly SupportAccountSafetyEntry[] = [
  { category: "bug_report", privacyClass: "telemetry_operational", retentionClass: "operational_30d", adminVisibility: "redacted_summary", redaction: "redact user identifiers and route details as needed", routeActionOwner: "support/report issue", telemetry: "support_bug_report_submitted", debug: "support", userCopy: "Thanks, the issue was sent to support.", nextAction: "Triage by category/severity." },
  { category: "account_delete_request", privacyClass: "user_private", retentionClass: "legal_hold_possible", adminVisibility: "redacted_summary", redaction: "hide raw email by default", routeActionOwner: "account safety/delete", telemetry: "privacy_delete_requested", debug: "account_safety", userCopy: "Your delete request was received.", nextAction: "Verify identity and schedule delete flow." },
  { category: "data_export_request", privacyClass: "user_private", retentionClass: "operational_30d", adminVisibility: "redacted_summary", redaction: "export through canonical policy only", routeActionOwner: "privacy/export", telemetry: "privacy_export_requested", debug: "privacy", userCopy: "Your data export request was received.", nextAction: "Build redacted export package." },
  { category: "payment_issue", privacyClass: "payment_sensitive", retentionClass: "ledger_required", adminVisibility: "redacted_summary", redaction: "fingerprint provider/payment identifiers", routeActionOwner: "support/payment", telemetry: "support_payment_issue_submitted", debug: "payments", userCopy: "Your payment issue was sent to support.", nextAction: "Review ledger summary without raw provider IDs." },
  { category: "GumDrop_issue", privacyClass: "payment_sensitive", retentionClass: "ledger_required", adminVisibility: "redacted_summary", redaction: "show source bucket summary only", routeActionOwner: "support/gumdrops", telemetry: "support_gumdrop_issue_submitted", debug: "wallet", userCopy: "Your GumDrop issue was sent to support.", nextAction: "Review canonical ledger bucket summary." },
  { category: "creator_access_issue", privacyClass: "creator_private", retentionClass: "operational_30d", adminVisibility: "redacted_summary", redaction: "redact private creator settings", routeActionOwner: "support/creator access", telemetry: "support_creator_access_issue", debug: "creator", userCopy: "Your creator access issue was sent to support.", nextAction: "Review entitlement/access state." },
  { category: "chat_issue", privacyClass: "chat_private", retentionClass: "legal_hold_possible", adminVisibility: "redacted_summary", redaction: "hide chat content unless audited drilldown is approved", routeActionOwner: "support/chat", telemetry: "support_chat_issue_submitted", debug: "chat", userCopy: "Your chat issue was sent to support.", nextAction: "Review metadata summary first." },
  { category: "media_issue", privacyClass: "media_private", retentionClass: "legal_hold_possible", adminVisibility: "redacted_summary", redaction: "hide private URLs and storage paths", routeActionOwner: "support/media", telemetry: "support_media_issue_submitted", debug: "media", userCopy: "Your media issue was sent to support.", nextAction: "Review access metadata summary." },
  { category: "auth_issue", privacyClass: "auth_sensitive", retentionClass: "short_lived_24h", adminVisibility: "redacted_summary", redaction: "never include raw auth tokens", routeActionOwner: "support/auth", telemetry: "support_auth_issue_submitted", debug: "auth", userCopy: "Your sign-in issue was sent to support.", nextAction: "Review auth-safe diagnostics." },
  { category: "safety/security_issue", privacyClass: "security_event", retentionClass: "legal_hold_possible", adminVisibility: "redacted_summary", redaction: "fingerprint actor and redact sensitive payloads", routeActionOwner: "support/safety", telemetry: "support_security_issue_submitted", debug: "security", userCopy: "Your safety report was sent to support.", nextAction: "Escalate through account safety review." },
  { category: "privacy_request", privacyClass: "user_private", retentionClass: "legal_hold_possible", adminVisibility: "redacted_summary", redaction: "privacy requests use canonical redaction policy", routeActionOwner: "privacy/support", telemetry: "privacy_request_submitted", debug: "privacy", userCopy: "Your privacy request was sent to support.", nextAction: "Handle through privacy lifecycle policy." },
  { category: "unknown", privacyClass: "legacy_unknown", retentionClass: "archive_only_legacy", adminVisibility: "redacted_summary", redaction: "treat as legacy unknown review", routeActionOwner: "support/unknown", telemetry: "support_unknown_submitted", debug: "support", userCopy: "Your request was sent to support.", nextAction: "Classify before action." },
];

export function validateSupportAccountSafetyConsolidation(entries = SUPPORT_ACCOUNT_SAFETY_CATEGORIES) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (!entry.privacyClass || !entry.retentionClass) failures.push(`${entry.category} lacks privacy/retention.`);
    if (!entry.redaction || /raw token|raw provider|raw payment/iu.test(entry.redaction)) failures.push(`${entry.category} can expose raw sensitive data.`);
    if (!entry.userCopy || /internal server error/iu.test(entry.userCopy)) failures.push(`${entry.category} lacks human error copy.`);
    if (!entry.telemetry || !entry.debug || !entry.routeActionOwner) failures.push(`${entry.category} lacks route/telemetry/debug owner.`);
    if (["payment_issue", "auth_issue", "privacy_request"].includes(entry.category) && entry.adminVisibility !== "redacted_summary") failures.push(`${entry.category} admin summary lacks redaction.`);
  }
  return failures;
}

export function buildSupportAccountSafetyConsolidationReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateSupportAccountSafetyConsolidation();
  return {
    reportKey: "support-account-safety-consolidation",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    supportCategoriesMapped: SUPPORT_ACCOUNT_SAFETY_CATEGORIES.length,
    validationFailures,
  };
}
