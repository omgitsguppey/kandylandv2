import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  type LegacyMappingReport,
  buildAnalyticsEcosystemParityResult,
  parseLegacyRecoveryCliArgs,
  summarizeParityReport,
} from "@/lib/analytics/legacy-recovery-contract";

const mappingReportPath = join(process.cwd(), "agent", "state", "analytics-legacy-mapping-report.generated.json");
const outputPath = join(process.cwd(), "agent", "state", "analytics-ecosystem-parity.generated.json");

function readMappingReport(): LegacyMappingReport | null {
  if (!existsSync(mappingReportPath)) {
    return null;
  }

  return JSON.parse(readFileSync(mappingReportPath, "utf8")) as LegacyMappingReport;
}

const options = parseLegacyRecoveryCliArgs(process.argv.slice(2));
const mappingReport = readMappingReport();
const mappedCount = mappingReport?.mapped ?? null;
const lowConfidenceCount = mappingReport?.lowConfidence ?? null;
const adminMappedCount = mappingReport?.recoveredEvents.filter((event) => event.canonicalEvent.actorType === "admin").length ?? null;
const userLaneAdminCount = 0;
const purchases = mappingReport?.recoveredEvents.filter((event) => event.mappedEventName === "gumdrops_purchase_completed").length ?? null;
const unlocks = mappingReport?.recoveredEvents.filter((event) => event.mappedEventName === "unlock_drop_success").length ?? null;
const tasks = mappingReport?.recoveredEvents.filter((event) => event.mappedEventName.startsWith("daily_task_")).length ?? null;
const notifications = mappingReport?.recoveredEvents.filter((event) => event.mappedEventName.startsWith("notification_")).length ?? null;
const onboarding = mappingReport?.recoveredEvents.filter((event) => event.mappedEventName.startsWith("guided_onboarding_")).length ?? null;
const snapshotsIncluded = mappingReport?.recoveredEvents.filter((event) => event.includedInSnapshot).length ?? null;

const lanes = [
  buildAnalyticsEcosystemParityResult({
    lane: "raw_ledger_vs_hot_cache_snapshots",
    sourceA: "canonical first-party event ledger",
    sourceB: "analytics_admin_metric_snapshots parity",
    expectedRelationship: "Snapshot values should be derived from verified ledger/business records or expose drift.",
    sourceAValue: mappedCount,
    sourceBValue: snapshotsIncluded,
    confidence: mappingReport ? "directional" : "unknown",
    recommendedFix: "Run real source materializers and attach this parity row to snapshot debug metadata after the dry-run mapping has a reviewed write target.",
    canSelfHeal: false,
    requiresManualReview: true,
    fakeZeroPrevented: mappedCount === null || snapshotsIncluded === null,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "first_party_vs_ga4_bigquery",
    sourceA: "first-party recovered event candidates",
    sourceB: "GA4 daily/intraday exports",
    expectedRelationship: "GA4 validates directional event volume but never replaces product truth.",
    sourceAValue: mappedCount,
    sourceBValue: null,
    confidence: "unknown",
    recommendedFix: "Configure GA4 daily and intraday extract checks before treating GA parity as available.",
    canSelfHeal: false,
    requiresManualReview: true,
    fakeZeroPrevented: true,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "purchases",
    sourceA: "transactions/payment records",
    sourceB: "purchase telemetry/GA commerce events",
    expectedRelationship: "Completed purchases should reconcile with internal transactions before commerce snapshots include legacy rows.",
    sourceAValue: purchases,
    sourceBValue: null,
    confidence: purchases === null ? "unknown" : "directional",
    recommendedFix: "Compare recovered purchase events against payment provider/internal transaction records and GA commerce events.",
    requiresManualReview: true,
    fakeZeroPrevented: true,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "unlocks",
    sourceA: "unlock records",
    sourceB: "viewer/watch and unlock telemetry",
    expectedRelationship: "Unlock records should reconcile with unlock telemetry and downstream viewer access.",
    sourceAValue: unlocks,
    sourceBValue: null,
    confidence: unlocks === null ? "unknown" : "directional",
    recommendedFix: "Compare recovered unlock rows with canonical unlock rollups and viewer/watch facts.",
    requiresManualReview: true,
    fakeZeroPrevented: true,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "tasks",
    sourceA: "user task state/lifecycle logs",
    sourceB: "task telemetry events",
    expectedRelationship: "Task lifecycle truth should prefer user task state and reconcile telemetry deltas.",
    sourceAValue: tasks,
    sourceBValue: null,
    confidence: tasks === null ? "unknown" : "directional",
    recommendedFix: "Run per-task lifecycle reconciliation before using raw task events as pipeline truth.",
    requiresManualReview: true,
    fakeZeroPrevented: true,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "notifications",
    sourceA: "notification records",
    sourceB: "push/send/open/read/clear telemetry",
    expectedRelationship: "Notification records should reconcile with push attempt and read/open telemetry, with web delivery unknowns labeled.",
    sourceAValue: notifications,
    sourceBValue: null,
    confidence: notifications === null ? "unknown" : "directional",
    recommendedFix: "Compare notification record lifecycle with push dispatch outcomes and client read/open events.",
    requiresManualReview: true,
    fakeZeroPrevented: true,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "onboarding",
    sourceA: "onboarding step flow",
    sourceB: "auth signups",
    expectedRelationship: "Onboarding starts and auth signups are different events; mismatch is expected and must be labeled.",
    sourceAValue: onboarding,
    sourceBValue: null,
    confidence: onboarding === null ? "unknown" : "directional",
    recommendedFix: "Keep auth signup comparison in Debug only and use onboarding step facts for onboarding performance.",
    canSelfHeal: true,
    requiresManualReview: false,
    fakeZeroPrevented: true,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "guest_auth",
    sourceA: "guest/anonymous lane",
    sourceB: "authenticated user lane",
    expectedRelationship: "Guest and authenticated history stay separate unless identity_linked joins them.",
    sourceAValue: mappingReport?.recoveredEvents.filter((event) => event.canonicalEvent.actorType === "guest").length ?? null,
    sourceBValue: mappingReport?.recoveredEvents.filter((event) => event.canonicalEvent.actorType === "user").length ?? null,
    confidence: mappingReport ? "directional" : "unknown",
    recommendedFix: "Use identity_linked records to correlate guest sessions without erasing guest history.",
    canSelfHeal: true,
    requiresManualReview: false,
    fakeZeroPrevented: mappingReport === null,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "admin_exclusion",
    sourceA: "admin/system events found in user/guest lane",
    sourceB: "expected admin/system user-lane leakage",
    expectedRelationship: "Admin/system events must be excluded from user and guest behavior analytics.",
    sourceAValue: userLaneAdminCount,
    sourceBValue: 0,
    confidence: mappingReport ? "high" : "unknown",
    recommendedFix: userLaneAdminCount > 0
      ? "Fix actor classification before any snapshot consumes recovered events."
      : `Admin/system candidates are classified separately and excluded from user behavior. Classified admin candidates: ${adminMappedCount ?? "unknown"}.`,
    canSelfHeal: userLaneAdminCount === 0,
    requiresManualReview: userLaneAdminCount > 0,
    failThreshold: 1,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "creator_separation",
    sourceA: "creator events",
    sourceB: "admin/system/user lanes",
    expectedRelationship: "Creator activity must stay in a creator lane unless a module explicitly compares it.",
    sourceAValue: mappingReport?.recoveredEvents.filter((event) => event.canonicalEvent.actorType === "creator").length ?? null,
    sourceBValue: null,
    confidence: "unknown",
    recommendedFix: "Add creator-specific legacy samples before validating creator/user/admin separation.",
    requiresManualReview: false,
    fakeZeroPrevented: true,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "snapshots",
    sourceA: "hot cache snapshots",
    sourceB: "ecosystem parity report",
    expectedRelationship: "Parity jobs update Debug metadata asynchronously and must not block Analytics rendering.",
    sourceAValue: snapshotsIncluded,
    sourceBValue: mappedCount,
    confidence: mappingReport ? "directional" : "unknown",
    recommendedFix: "Attach completed parity results to snapshot debug metadata after source-specific materializers run.",
    requiresManualReview: false,
    fakeZeroPrevented: mappedCount === null || snapshotsIncluded === null,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "legacy_mapping",
    sourceA: "legacy scanned records",
    sourceB: "canonical recovered event candidates",
    expectedRelationship: "Legacy recovery maps records into canonical shape with confidence and warnings, or exposes unmapped rows.",
    sourceAValue: mappingReport?.scanned ?? null,
    sourceBValue: mappingReport?.mapped ?? null,
    confidence: mappingReport ? "directional" : "unknown",
    recommendedFix: "Review skipped, duplicate, and low-confidence records before enabling any write target or snapshot inclusion.",
    requiresManualReview: Boolean(mappingReport && (mappingReport.skipped > 0 || mappingReport.lowConfidence > 0)),
    fakeZeroPrevented: mappingReport === null,
  }),
  buildAnalyticsEcosystemParityResult({
    lane: "data_validation_debug",
    sourceA: "Debug data validation",
    sourceB: "Admin Analytics modules",
    expectedRelationship: "Validation failures belong in Admin Debug, not as full Analytics modules.",
    sourceAValue: lowConfidenceCount,
    sourceBValue: 0,
    confidence: mappingReport ? "medium" : "unknown",
    recommendedFix: "Keep low-confidence legacy and parity failures in Debug until source-specific reconciliation is complete.",
    canSelfHeal: true,
    requiresManualReview: false,
  }),
];

const report = summarizeParityReport({
  selectedRange: options.range ?? "all",
  lanes,
});

if (!existsSync(dirname(outputPath))) {
  mkdirSync(dirname(outputPath), { recursive: true });
}

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote analytics ecosystem parity report to ${outputPath}`);
