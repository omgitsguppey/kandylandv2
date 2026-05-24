import { describe, expect, it } from "vitest";

import {
  buildSqlDatabaseParityDebugLane,
  SQL_DATABASE_PARITY_COST_GUARDS,
} from "@/lib/analytics/sql-database-parity-contract";
import {
  classifyParityMismatch,
  estimateCostLane,
  mapEventFactToGlobalSummary,
  mapEventFactToSqlRow,
  mapEventFactToUserSummary,
  mapJourneyToExport,
  verifyGlobalUserSqlParity,
} from "@/lib/analytics/sql-database-parity-engine";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { buildJourneyEvent } from "@/lib/behavioral/user-journey-builder";

describe("sql database parity cost lock", () => {
  const fact = normalizeBehavioralEventFact({
    eventId: "evt_sql_1",
    eventName: "drop_preview_opened",
    timestamp: Date.parse("2026-05-24T10:00:00.000Z"),
    userId: "user_1",
    sessionId: "session_1",
    anonymousVisitorId: "guest_1",
    params: {
      route: "/drops/drop_1",
      sourceComponent: "unit-test",
      dropId: "drop_1",
      linkedPersonId: "person_1",
      linkId: "link_1",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      idempotencyKey: "drop_preview_opened:drop_1",
    },
    route: "/drops/drop_1",
    pagePath: "/drops/drop_1",
    source: "client",
  });

  it("maps a normalized event fact into raw export, global, user, person, session, and journey truth", () => {
    expect(fact).not.toBeNull();
    const normalizedFact = fact!;
    const journey = buildJourneyEvent({ fact: normalizedFact });
    const exportRow = mapEventFactToSqlRow(normalizedFact);
    const globalSummary = mapEventFactToGlobalSummary(normalizedFact);
    const userSummary = mapEventFactToUserSummary(normalizedFact);
    const journeyExport = mapJourneyToExport(journey);
    const parity = verifyGlobalUserSqlParity({
      rawEventFact: normalizedFact,
      normalizedEventFact: normalizedFact,
      exportRow,
      globalSummary,
      userSummary,
      journeySummary: journeyExport.journeySummary,
    });

    expect(exportRow.rawEventFactId).toBe("evt_sql_1");
    expect(exportRow.normalizedEventName).toBe("drop_preview_opened");
    expect(exportRow.warehousePartition).toBe("2026-05-24");
    expect(exportRow.primaryProductTruth).toBe(false);
    expect(exportRow.replayProtection).toBe("idempotency_key_required");
    expect(globalSummary.countDelta).toBe(1);
    expect(userSummary.countDelta).toBe(1);
    expect(userSummary.linkedPersonId).toBe("person_1");
    expect(journeyExport.exportRowKind).toBe("journey_summary");
    expect(parity.parityStatus).toBe("matched");
    expect(parity.debugLane.parityStatus).toBe("matched");
  });

  it("records global/user divergence instead of silently accepting mismatch", () => {
    const normalizedFact = fact!;
    const globalSummary = mapEventFactToGlobalSummary(normalizedFact);
    const userSummary = {
      ...mapEventFactToUserSummary(normalizedFact),
      countDelta: 0,
      dedupeKey: "wrong:user:key",
    };
    const parity = verifyGlobalUserSqlParity({
      rawEventFact: normalizedFact,
      normalizedEventFact: normalizedFact,
      exportRow: mapEventFactToSqlRow(normalizedFact),
      globalSummary,
      userSummary,
    });

    expect(parity.parityStatus).toBe("mismatch_recorded");
    expect(parity.mismatchCount).toBeGreaterThan(0);
    expect(classifyParityMismatch(parity).status).toBe("mismatch_recorded");
    expect(parity.debugLane.mismatchCount).toBeGreaterThan(0);
  });

  it("keeps export and Cloud SQL cost lanes batched, summary-first, and manually guarded", () => {
    expect(SQL_DATABASE_PARITY_COST_GUARDS.bigQueryExportCadence).toBe("daily_watermark_batch");
    expect(SQL_DATABASE_PARITY_COST_GUARDS.perEventBigQueryExportAllowed).toBe(false);
    expect(SQL_DATABASE_PARITY_COST_GUARDS.casualCloudSqlMirrorSyncAllowed).toBe(false);
    expect(estimateCostLane({ operation: "bigquery_export" }).status).toBe("batched_watermark_export");
    expect(estimateCostLane({ operation: "admin_debug_read" }).status).toBe("summary_first_admin_read");
    expect(estimateCostLane({ operation: "cloud_sql_mirror_sync" }).status).toBe("blocked_casual_cloud_sql_mirror");
    expect(buildSqlDatabaseParityDebugLane().costGuardStatus).toBe("batched_summary_first");
  });
});
