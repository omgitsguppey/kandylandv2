import type { PrivacyClass, RetentionClass, ExportEligibility } from "./privacy-data-lifecycle-contract";

export interface DataExportSection {
  sectionKey: string;
  source: string;
  privacyClass: PrivacyClass;
  retentionClass: RetentionClass;
  exportEligibility: ExportEligibility;
  confidence: "exact_source" | "redacted_summary" | "legacy_unknown_review";
  redactionPolicy: string;
}

export const DATA_EXPORT_SECTIONS: readonly DataExportSection[] = [
  { sectionKey: "profile_account", source: "user profile contract", privacyClass: "user_private", retentionClass: "delete_on_account_delete", exportEligibility: "user_exportable", confidence: "exact_source", redactionPolicy: "Include account fields; redact internal admin notes." },
  { sectionKey: "creator_profile_settings", source: "creator settings contract", privacyClass: "creator_private", retentionClass: "delete_on_account_delete", exportEligibility: "user_exportable", confidence: "exact_source", redactionPolicy: "Include creator-owned settings; omit admin-only review notes." },
  { sectionKey: "wallet_gumdrop_ledger_summary", source: "GumDrop ledger/source-of-funds contracts", privacyClass: "payment_sensitive", retentionClass: "ledger_required", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Summarize balances and buckets; fingerprint provider/payment identifiers." },
  { sectionKey: "purchases_receipts_summaries", source: "commerce receipt summaries", privacyClass: "payment_sensitive", retentionClass: "ledger_required", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Provider identifiers are fingerprinted; payer data is redacted." },
  { sectionKey: "fan_pass_entitlements", source: "fan pass entitlement contracts", privacyClass: "user_private", retentionClass: "ledger_required", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Show entitlement state and dates; redact provider IDs." },
  { sectionKey: "drops_unlocks_watch_summaries", source: "drop/watch canonical summaries", privacyClass: "user_private", retentionClass: "analytics_90d", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Summarize unlock/watch facts; omit raw behavioral trail." },
  { sectionKey: "chat_metadata_summary", source: "chat thread metadata", privacyClass: "chat_private", retentionClass: "legal_hold_possible", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Export thread metadata summary; message bodies are excluded unless policy explicitly allows them." },
  { sectionKey: "support_report_issue_records", source: "support threads", privacyClass: "user_private", retentionClass: "legal_hold_possible", exportEligibility: "user_exportable", confidence: "redacted_summary", redactionPolicy: "Include user-visible support records; redact admin-only diagnostics." },
  { sectionKey: "notification_preferences_tokens_redacted", source: "notification preferences", privacyClass: "auth_sensitive", retentionClass: "delete_on_account_delete", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Preferences only; push tokens are excluded from export payloads." },
  { sectionKey: "consent_history", source: "privacy consent snapshot", privacyClass: "user_private", retentionClass: "operational_30d", exportEligibility: "user_exportable", confidence: "exact_source", redactionPolicy: "No tokens or provider identifiers." },
  { sectionKey: "telemetry_summary", source: "telemetry summaries", privacyClass: "telemetry_operational", retentionClass: "analytics_90d", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Aggregate only; no raw event stream." },
  { sectionKey: "behavioral_journey_summary", source: "behavioral journey summary", privacyClass: "telemetry_behavioral", retentionClass: "analytics_90d", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "Redacted journey summary; unknown legacy data marked legacy_unknown_review." },
  { sectionKey: "media_metadata_no_private_urls", source: "media access metadata", privacyClass: "media_private", retentionClass: "legal_hold_possible", exportEligibility: "redacted_only", confidence: "redacted_summary", redactionPolicy: "No private media URLs and no storage paths." },
  { sectionKey: "admin_debug_redacted_summary", source: "admin/debug evidence", privacyClass: "admin_private", retentionClass: "legal_hold_possible", exportEligibility: "admin_only_summary", confidence: "redacted_summary", redactionPolicy: "Admin debug internals excluded or redacted summary only." },
  { sectionKey: "legacy_unknown_review", source: "legacy records", privacyClass: "legacy_unknown", retentionClass: "archive_only_legacy", exportEligibility: "legacy_unknown_review", confidence: "legacy_unknown_review", redactionPolicy: "Unknown legacy included only as reviewed uncertain summary." },
];

export function validateDataExportCanonicalization(entries = DATA_EXPORT_SECTIONS) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (!entry.privacyClass) failures.push(`${entry.sectionKey} lacks privacy class.`);
    if (/raw provider|raw push token|raw storage path|raw private chat|legacy exact/iu.test(entry.redactionPolicy)) failures.push(`${entry.sectionKey} can leak raw sensitive data.`);
    if (entry.privacyClass === "legacy_unknown" && entry.exportEligibility !== "legacy_unknown_review") failures.push(`${entry.sectionKey} exports unknown legacy as exact.`);
    if (!entry.source || !entry.confidence || !entry.retentionClass) failures.push(`${entry.sectionKey} lacks source/confidence/retention.`);
  }
  return failures;
}

export function buildDataExportCanonicalizationReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateDataExportCanonicalization();
  return {
    reportKey: "data-export-canonicalization",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    exportSectionsMapped: DATA_EXPORT_SECTIONS.length,
    validationFailures,
  };
}
