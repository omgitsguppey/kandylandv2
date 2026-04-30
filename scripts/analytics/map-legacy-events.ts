import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  LEGACY_RECOVERED_EVENTS_COLLECTION,
  type LegacyMappingReport,
  buildRecoveredEventsFromMappings,
  parseLegacyRecoveryCliArgs,
} from "@/lib/analytics/legacy-recovery-contract";
import {
  type LegacyAnalyticsRecordInput,
  mapLegacyAnalyticsRecordToCanonical,
} from "@/lib/analytics/legacy-event-mapping";

const outputPath = join(process.cwd(), "agent", "state", "analytics-legacy-mapping-report.generated.json");

const FIXTURE_LEGACY_RECORDS: LegacyAnalyticsRecordInput[] = [
  {
    legacySource: "analytics_event_facts",
    legacyId: "fixture_evt_drop_click",
    sourcePath: "analytics_event_facts/fixture_evt_drop_click",
    record: {
      eventName: "drop_clicked",
      eventId: "fixture_evt_drop_click",
      timestamp: "2024-01-15T12:00:00.000Z",
      userId: "user_fixture_1",
      sessionId: "session_fixture_1",
      dropId: "drop_fixture_1",
      route: "/drops/drop_fixture_1",
    },
  },
  {
    legacySource: "analytics_guest_batches",
    legacyId: "fixture_guest_batch",
    sourcePath: "analytics_guest_batches/fixture_guest_batch",
    record: {
      batchId: "fixture_guest_batch",
      anonymousVisitorId: "anon_fixture_1",
      clientSessionId: "guest_session_fixture_1",
      pagePath: "/drops/drop_fixture_1",
      createdAt: "2024-01-15T12:02:00.000Z",
      consentState: "consented",
    },
  },
  {
    legacySource: "transactions",
    legacyId: "fixture_txn_completed",
    sourcePath: "transactions/fixture_txn_completed",
    record: {
      transactionId: "fixture_txn_completed",
      status: "completed",
      userId: "user_fixture_1",
      dropId: "drop_fixture_1",
      completedAt: "2024-01-15T12:05:00.000Z",
    },
  },
  {
    legacySource: "unlocks",
    legacyId: "fixture_unlock",
    sourcePath: "unlocks/fixture_unlock",
    record: {
      id: "fixture_unlock",
      userId: "user_fixture_1",
      dropId: "drop_fixture_1",
      createdAt: "2024-01-15T12:06:00.000Z",
    },
  },
  {
    legacySource: "daily_task_events",
    legacyId: "fixture_task_complete",
    sourcePath: "daily_task_events/fixture_task_complete",
    record: {
      taskId: "task_fixture_1",
      userId: "user_fixture_1",
      lifecycleState: "completed",
      completedAt: "2024-01-15T12:07:00.000Z",
    },
  },
  {
    legacySource: "task_lifecycle_logs",
    legacyId: "fixture_task_start",
    sourcePath: "task_lifecycle_logs/fixture_task_start",
    record: {
      taskId: "task_fixture_1",
      userId: "user_fixture_1",
      state: "started",
      timestamp: "2024-01-15T12:06:30.000Z",
    },
  },
  {
    legacySource: "notifications",
    legacyId: "fixture_notification_read",
    sourcePath: "notifications/fixture_notification_read",
    record: {
      notificationId: "fixture_notification_read",
      recipientId: "user_fixture_1",
      type: "drop_live",
      dropId: "drop_fixture_1",
      sentAt: "2024-01-15T12:08:00.000Z",
      readAt: "2024-01-15T12:09:00.000Z",
    },
  },
  {
    legacySource: "onboarding_steps",
    legacyId: "fixture_onboarding_step",
    sourcePath: "onboarding_steps/fixture_onboarding_step",
    record: {
      userId: "user_fixture_2",
      stepId: "flavor",
      state: "completed",
      completedAt: "2024-01-15T12:10:00.000Z",
    },
  },
  {
    legacySource: "admin_audit_logs",
    legacyId: "fixture_admin_action",
    sourcePath: "admin_audit_logs/fixture_admin_action",
    record: {
      adminId: "admin_fixture_1",
      route: "/admin/analytics",
      action: "opened_debug",
      createdAt: "2024-01-15T12:11:00.000Z",
    },
  },
  {
    legacySource: "ga4_intraday",
    legacyId: "fixture_ga_intraday",
    sourcePath: "bigquery/events_intraday_YYYYMMDD/fixture_ga_intraday",
    record: {
      event_name: "page_viewed",
      event_timestamp: "2024-01-15T12:12:00.000Z",
      user_pseudo_id: "ga_fixture_anon_1",
      page_path: "/drops/drop_fixture_1",
    },
  },
  {
    legacySource: "analytics_event_facts",
    legacyId: "fixture_evt_drop_click",
    sourcePath: "analytics_event_facts/fixture_evt_drop_click_duplicate",
    record: {
      eventName: "drop_clicked",
      eventId: "fixture_evt_drop_click",
      timestamp: "2024-01-15T12:00:00.000Z",
      userId: "user_fixture_1",
      sessionId: "session_fixture_1",
      dropId: "drop_fixture_1",
      route: "/drops/drop_fixture_1",
    },
  },
  {
    legacySource: "unknown",
    legacyId: "fixture_unmapped",
    sourcePath: "unknown/fixture_unmapped",
    record: {
      createdAt: "2024-01-15T12:13:00.000Z",
    },
  },
];

function summarizeBySource(report: Pick<LegacyMappingReport, "recoveredEvents" | "unmappedRecords">, scannedBySource: Record<string, number>) {
  const sources = new Set<string>([
    ...Object.keys(scannedBySource),
    ...report.recoveredEvents.map((event) => event.legacySource),
    ...report.unmappedRecords.map((record) => record.legacySource),
  ]);

  return [...sources].sort().map((sourceName) => {
    const recovered = report.recoveredEvents.filter((event) => event.legacySource === sourceName);
    const unmapped = report.unmappedRecords.filter((record) => record.legacySource === sourceName);
    const warnings = [...new Set([
      ...recovered.flatMap((event) => event.mappingWarnings),
      ...unmapped.flatMap((record) => record.warnings),
    ])];

    return {
      sourceName,
      scanned: scannedBySource[sourceName] ?? 0,
      mapped: recovered.length,
      skipped: unmapped.length,
      duplicate: 0,
      failed: 0,
      lowConfidence: recovered.filter((event) => ["low", "directional", "unknown"].includes(event.mappingConfidence)).length,
      warnings,
    };
  });
}

const options = parseLegacyRecoveryCliArgs(process.argv.slice(2));
const writeModeEnabled = options.write && process.env.ANALYTICS_LEGACY_WRITE_ENABLED === "true";
const selectedRecords = FIXTURE_LEGACY_RECORDS
  .filter((record) => !options.source || record.legacySource === options.source)
  .map((record) => ({
    ...record,
    selectedRange: options.range,
  }));
const scannedBySource = selectedRecords.reduce<Record<string, number>>((summary, record) => {
  summary[record.legacySource] = (summary[record.legacySource] ?? 0) + 1;
  return summary;
}, {});
const mappings = selectedRecords.map(mapLegacyAnalyticsRecordToCanonical);
const { recoveredEvents, duplicateKeys, unmappedRecords } = buildRecoveredEventsFromMappings(mappings);
const sourceSummaries = summarizeBySource({ recoveredEvents, unmappedRecords }, scannedBySource);
const warningsBySource = sourceSummaries.reduce<Record<string, string[]>>((summary, source) => {
  summary[source.sourceName] = source.warnings;
  return summary;
}, {});

for (const source of sourceSummaries) {
  source.duplicate = recoveredEvents.filter((event) => event.legacySource === source.sourceName && duplicateKeys.includes(event.duplicateKey)).length;
}

const lowConfidence = recoveredEvents.filter((event) => ["low", "directional", "unknown"].includes(event.mappingConfidence)).length;
const report: LegacyMappingReport = {
  generatedAt: new Date().toISOString(),
  dryRun: !writeModeEnabled,
  writeModeRequested: options.write,
  writeModeEnabled,
  targetCollection: LEGACY_RECOVERED_EVENTS_COLLECTION,
  sourceFilter: options.source,
  range: options.range,
  scanned: selectedRecords.length,
  mapped: recoveredEvents.length,
  skipped: unmappedRecords.length,
  duplicate: duplicateKeys.length,
  failed: options.write && !writeModeEnabled ? 1 : 0,
  lowConfidence,
  warningsBySource,
  sourceSummaries,
  recoveredEvents,
  unmappedRecords,
  writePolicy: {
    writeTargetImplemented: false,
    writeRequiresExplicitFlag: true,
    writeRequiresEnvironmentFlag: "ANALYTICS_LEGACY_WRITE_ENABLED",
    writeTarget: LEGACY_RECOVERED_EVENTS_COLLECTION,
    reason: "Phase 4 defines the typed recovery collection and dry-run report only. Production writes stay disabled until a reviewed backfill plan enables them.",
  },
};

if (options.write && !writeModeEnabled) {
  report.warningsBySource.write_guard = [
    "Write mode was requested but ANALYTICS_LEGACY_WRITE_ENABLED was not true; no records were written.",
  ];
}

if (!existsSync(dirname(outputPath))) {
  mkdirSync(dirname(outputPath), { recursive: true });
}

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote legacy mapping ${report.dryRun ? "dry-run " : ""}report to ${outputPath}`);
