export interface AdminRedactionDrilldownRule {
  dataClass: string;
  defaultAdminView: "redacted_summary";
  rawDefaultAllowed: boolean;
  summaryRedaction: string;
  rawDrilldownRequires: {
    adminRole: true;
    auditReason: true;
    supportOrSafetyNeed: boolean;
  };
  linkedAdminTruthPacket: "admin-truth-redaction-packet";
}

export const ADMIN_REDACTION_DRILLDOWN_RULES: readonly AdminRedactionDrilldownRule[] = [
  { dataClass: "payment_provider_ids", defaultAdminView: "redacted_summary", rawDefaultAllowed: false, summaryRedaction: "fingerprint provider/payment IDs", rawDrilldownRequires: { adminRole: true, auditReason: true, supportOrSafetyNeed: true }, linkedAdminTruthPacket: "admin-truth-redaction-packet" },
  { dataClass: "emails_user_ids", defaultAdminView: "redacted_summary", rawDefaultAllowed: false, summaryRedaction: "hide or fingerprint emails/user IDs unless support need exists", rawDrilldownRequires: { adminRole: true, auditReason: true, supportOrSafetyNeed: true }, linkedAdminTruthPacket: "admin-truth-redaction-packet" },
  { dataClass: "chat_content", defaultAdminView: "redacted_summary", rawDefaultAllowed: false, summaryRedaction: "hide chat content by default", rawDrilldownRequires: { adminRole: true, auditReason: true, supportOrSafetyNeed: true }, linkedAdminTruthPacket: "admin-truth-redaction-packet" },
  { dataClass: "private_media_urls", defaultAdminView: "redacted_summary", rawDefaultAllowed: false, summaryRedaction: "hide private media URLs", rawDrilldownRequires: { adminRole: true, auditReason: true, supportOrSafetyNeed: true }, linkedAdminTruthPacket: "admin-truth-redaction-packet" },
  { dataClass: "push_tokens", defaultAdminView: "redacted_summary", rawDefaultAllowed: false, summaryRedaction: "redact push tokens completely", rawDrilldownRequires: { adminRole: true, auditReason: true, supportOrSafetyNeed: false }, linkedAdminTruthPacket: "admin-truth-redaction-packet" },
  { dataClass: "storage_paths", defaultAdminView: "redacted_summary", rawDefaultAllowed: false, summaryRedaction: "fingerprint storage paths", rawDrilldownRequires: { adminRole: true, auditReason: true, supportOrSafetyNeed: true }, linkedAdminTruthPacket: "admin-truth-redaction-packet" },
  { dataClass: "debug_artifacts", defaultAdminView: "redacted_summary", rawDefaultAllowed: false, summaryRedaction: "redact sensitive raw fields before serialization", rawDrilldownRequires: { adminRole: true, auditReason: true, supportOrSafetyNeed: true }, linkedAdminTruthPacket: "admin-truth-redaction-packet" },
];

export function validateAdminRedactionDrilldownPolicy(entries = ADMIN_REDACTION_DRILLDOWN_RULES) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.defaultAdminView !== "redacted_summary") failures.push(`${entry.dataClass} exposes raw admin summary.`);
    if (entry.rawDefaultAllowed) failures.push(`${entry.dataClass} raw default allowed.`);
    if (!entry.rawDrilldownRequires.adminRole || !entry.rawDrilldownRequires.auditReason) failures.push(`${entry.dataClass} raw drilldown lacks admin role or audit reason.`);
    if (!/redact|fingerprint|hide/iu.test(entry.summaryRedaction)) failures.push(`${entry.dataClass} lacks redaction policy.`);
    if (entry.linkedAdminTruthPacket !== "admin-truth-redaction-packet") failures.push(`${entry.dataClass} not linked to admin truth packet.`);
  }
  return failures;
}

export function buildAdminRedactionDrilldownPolicyReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateAdminRedactionDrilldownPolicy();
  return {
    reportKey: "admin-redaction-drilldown-policy",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    adminRedactionRulesAdded: ADMIN_REDACTION_DRILLDOWN_RULES.length,
    validationFailures,
  };
}
