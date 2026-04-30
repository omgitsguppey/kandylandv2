import { describe, expect, it } from "vitest";

import {
  buildLegacyRecoveredEventRecord,
  buildRecoveredEventsFromMappings,
  parseLegacyRecoveryCliArgs,
} from "@/lib/analytics/legacy-recovery-contract";
import { mapLegacyAnalyticsRecordToCanonical } from "@/lib/analytics/legacy-event-mapping";

describe("analytics legacy recovery contract", () => {
  it("builds recovered event records with legacy confidence and warnings", () => {
    const mapping = mapLegacyAnalyticsRecordToCanonical({
      legacySource: "transactions",
      legacyId: "txn_legacy_1",
      record: {
        transactionId: "txn_legacy_1",
        status: "completed",
        userId: "user_1",
        dropId: "drop_1",
        completedAt: "2024-01-15T12:00:00.000Z",
      },
    });

    expect(mapping.status).toBe("mapped");
    if (mapping.status !== "mapped") return;

    const recovered = buildLegacyRecoveredEventRecord(mapping, {
      recoveredAt: "2026-04-30T12:00:00.000Z",
    });

    expect(recovered).toMatchObject({
      legacySource: "transactions",
      legacyId: "txn_legacy_1",
      legacyTimestamp: "2024-01-15T12:00:00.000Z",
      mappedEventName: "gumdrops_purchase_completed",
      mappingConfidence: "high",
      recoveredAt: "2026-04-30T12:00:00.000Z",
      actorConfidence: "high",
      objectConfidence: "high",
      sourceMode: "legacy_mapped",
      includedInSnapshot: true,
      serverConfirmed: false,
    });
    expect(recovered.mappingWarnings).toEqual([]);
  });

  it("labels directional guest records outside snapshot inclusion", () => {
    const mapping = mapLegacyAnalyticsRecordToCanonical({
      legacySource: "analytics_guest_batches",
      legacyId: "guest_batch_1",
      record: {
        batchId: "guest_batch_1",
        anonymousVisitorId: "anon_1",
        clientSessionId: "session_1",
        pagePath: "/drops/demo",
        createdAt: "2024-01-15T12:00:00.000Z",
      },
    });

    expect(mapping.status).toBe("mapped");
    if (mapping.status !== "mapped") return;

    const recovered = buildLegacyRecoveredEventRecord(mapping);

    expect(recovered.mappingConfidence).toBe("directional");
    expect(recovered.includedInSnapshot).toBe(false);
    expect(recovered.excludedReason).toContain("directional");
    expect(recovered.serverConfirmed).toBe(false);
  });

  it("defaults to dry-run and requires explicit write intent", () => {
    expect(parseLegacyRecoveryCliArgs([])).toMatchObject({
      dryRun: true,
      write: false,
      source: null,
      range: null,
    });

    expect(parseLegacyRecoveryCliArgs(["--source=transactions", "--range", "all"])).toMatchObject({
      dryRun: true,
      write: false,
      source: "transactions",
      range: "all",
    });

    expect(parseLegacyRecoveryCliArgs(["--write", "--source", "unlocks"])).toMatchObject({
      dryRun: false,
      write: true,
      source: "unlocks",
    });
  });

  it("dedupes legacy records by source, id, event, timestamp, and actor", () => {
    const first = mapLegacyAnalyticsRecordToCanonical({
      legacySource: "analytics_event_facts",
      legacyId: "evt_1",
      record: {
        eventName: "drop_clicked",
        timestamp: "2024-01-15T12:00:00.000Z",
        userId: "user_1",
        dropId: "drop_1",
      },
    });
    const duplicate = mapLegacyAnalyticsRecordToCanonical({
      legacySource: "analytics_event_facts",
      legacyId: "evt_1",
      record: {
        eventName: "drop_clicked",
        timestamp: "2024-01-15T12:00:00.000Z",
        userId: "user_1",
        dropId: "drop_1",
      },
    });

    const recovery = buildRecoveredEventsFromMappings([first, duplicate]);

    expect(recovery.recoveredEvents).toHaveLength(1);
    expect(recovery.duplicateKeys).toHaveLength(1);
    expect(recovery.unmappedRecords).toHaveLength(0);
  });
});
