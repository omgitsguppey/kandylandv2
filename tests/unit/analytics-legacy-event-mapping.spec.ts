import { describe, expect, it } from "vitest";

import { buildAnalyticsEventDebugMetadata } from "@/lib/analytics/analytics-event-contract";
import { mapLegacyAnalyticsRecordToCanonical, mapLegacyAnalyticsRecords } from "@/lib/analytics/legacy-event-mapping";

describe("legacy analytics event mapping", () => {
  it("maps first-party event facts into canonical event candidates with legacy confidence", () => {
    const result = mapLegacyAnalyticsRecordToCanonical({
      legacySource: "analytics_event_facts",
      legacyId: "fact_1",
      record: {
        eventName: "drop_clicked",
        eventId: "evt_legacy",
        timestamp: "2026-04-30T12:00:00.000Z",
        userId: "user_1",
        sessionId: "sess_1",
        dropId: "drop_1",
        route: "/drops/drop_1",
      },
    });

    expect(result.status).toBe("mapped");
    if (result.status !== "mapped") return;

    expect(result.event.eventName).toBe("drop_clicked");
    expect(result.event.actorType).toBe("user");
    expect(result.event.objectType).toBe("drop");
    expect(result.event.legacySource).toBe("analytics_event_facts");
    expect(result.event.legacyConfidence).toBe("high");
    expect(result.metadata.serverConfirmed).toBe(false);
    expect(result.metadata.mixingPolicy).toBe("legacy_directional_only");
  });

  it("keeps admin audit records excluded from user behavior", () => {
    const result = mapLegacyAnalyticsRecordToCanonical({
      legacySource: "admin_audit_logs",
      legacyId: "audit_1",
      record: {
        adminId: "admin_1",
        route: "/admin/debug",
        createdAt: "2026-04-30T13:00:00.000Z",
      },
    });

    expect(result.status).toBe("mapped");
    if (result.status !== "mapped") return;

    const metadata = buildAnalyticsEventDebugMetadata(result.event);
    expect(result.event.eventName).toBe("admin_action_performed");
    expect(result.event.actorType).toBe("admin");
    expect(metadata.exclusionReason).toContain("Admin events are excluded");
  });

  it("exposes unmapped records instead of silently mixing them into current facts", () => {
    const result = mapLegacyAnalyticsRecordToCanonical({
      legacySource: "unknown",
      legacyId: "mystery",
      record: {
        createdAt: "2026-04-30T13:30:00.000Z",
      },
    });

    expect(result.status).toBe("unmapped");
    if (result.status !== "unmapped") return;

    expect(result.reason).toBe("legacy_event_name_unmapped");
    expect(result.metadata.serverConfirmed).toBe(false);
    expect(result.metadata.mixingPolicy).toBe("legacy_directional_only");
    expect(result.metadata.warnings.join(" ")).toContain("No event name");
  });

  it("reports mapped and unmapped legacy record buckets", () => {
    const summary = mapLegacyAnalyticsRecords([
      {
        legacySource: "transactions",
        legacyId: "txn_1",
        record: {
          status: "completed",
          transactionId: "txn_1",
          userId: "user_1",
          completedAt: "2026-04-30T14:00:00.000Z",
        },
      },
      {
        legacySource: "unknown",
        legacyId: "unknown_1",
        record: {},
      },
    ]);

    expect(summary.mapped).toHaveLength(1);
    expect(summary.unmapped).toHaveLength(1);
    expect(summary.mapped[0].event.eventName).toBe("gumdrops_purchase_completed");
  });
});
