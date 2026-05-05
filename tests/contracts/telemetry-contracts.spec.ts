import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  TELEMETRY_EVENT_ALIAS_MAP,
  TELEMETRY_EVENT_NAMES,
  TELEMETRY_EVENT_OPTIONS,
  TELEMETRY_EVENT_PAYLOAD_CONTRACTS,
  TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME,
  TELEMETRY_EVENT_QUERY_NAMES,
  TELEMETRY_MODULE_INDEXES,
  normalizeTelemetryEventPayloadParams,
  normalizeTelemetryEventName,
} from "@/lib/telemetry-catalog";

describe("telemetry catalog contracts", () => {
  it("keeps canonical event names unique", () => {
    const uniqueNames = new Set(TELEMETRY_EVENT_NAMES);
    expect(uniqueNames.size).toBe(TELEMETRY_EVENT_NAMES.length);
    expect(TELEMETRY_EVENT_OPTIONS.length).toBe(TELEMETRY_EVENT_NAMES.length);
  });

  it("keeps aliases unique and resolvable", () => {
    const aliases = Object.keys(TELEMETRY_EVENT_ALIAS_MAP);
    const uniqueAliases = new Set(aliases);

    expect(uniqueAliases.size).toBe(aliases.length);

    aliases.forEach((alias) => {
      expect(TELEMETRY_EVENT_NAMES).toContain(normalizeTelemetryEventName(alias));
    });
  });

  it("normalizes event casing drift and payload key aliases", () => {
    expect(normalizeTelemetryEventName("Unlock_Drop_Success")).toBe("unlock_drop_success");
    expect(normalizeTelemetryEventName("NOTIFICATION_READ")).toBe("notification_read");
    expect(normalizeTelemetryEventName("daily_reward_claimed")).toBe("daily_checkin_claimed");
    expect(normalizeTelemetryEventName("daily_task_completed")).toBe("task_completed");
    expect(normalizeTelemetryEventName("viewer_asset_started")).toBe("file_viewed");
    expect(normalizeTelemetryEventName("viewer_asset_changed")).toBe("file_viewed");
    expect(normalizeTelemetryEventName("support_ticket_submitted")).toBe("support_ticket_created");
    expect(normalizeTelemetryEventName("feedback_submitted")).toBe("bug_report_submitted");
    expect(normalizeTelemetryEventName("support_thread_replied")).toBe("support_reply_sent");

    expect(normalizeTelemetryEventPayloadParams({
      dropId: "drop_1",
      fileId: "file_1",
      transactionId: "txn_1",
      notificationId: "note_1",
      idempotencyKey: "idem_1",
      pagePath: "/drops",
      viewerSessionId: "watch_1",
      mediaIndex: 1,
      mediaType: "video",
      rewardGd: 100,
      sourceTruth: "canonical",
    })).toMatchObject({
      drop_id: "drop_1",
      file_id: "file_1",
      transaction_id: "txn_1",
      notification_id: "note_1",
      idempotency_key: "idem_1",
      page_path: "/drops",
      viewer_session_id: "watch_1",
      media_index: 1,
      media_type: "video",
      reward_gd: 100,
      source_truth: "canonical",
    });
  });

  it("keeps module indexes bound to known telemetry events", () => {
    const knownEvents = new Set(TELEMETRY_EVENT_NAMES);

    TELEMETRY_MODULE_INDEXES.forEach((moduleIndex) => {
      moduleIndex.eventNames.forEach((eventName) => {
        expect(knownEvents.has(eventName), `${moduleIndex.key} -> ${eventName}`).toBe(true);
      });
    });
  });

  it("keeps query names covering every canonical event and alias", () => {
    TELEMETRY_EVENT_NAMES.forEach((eventName) => {
      expect(TELEMETRY_EVENT_QUERY_NAMES).toContain(eventName);
    });

    Object.keys(TELEMETRY_EVENT_ALIAS_MAP).forEach((alias) => {
      expect(TELEMETRY_EVENT_QUERY_NAMES).toContain(alias);
    });
  });

  it("keeps payload contracts for every cataloged launch-critical event family", () => {
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS).toHaveLength(TELEMETRY_EVENT_OPTIONS.length);
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.drop_unlock_attempted.requiredObjectFields.join(" ")).toContain("drop_id");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.unlock_drop_success.requiredObjectFields.join(" ")).toContain("transaction_id");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.purchase_verified.requiredObjectFields.join(" ")).toContain("transaction_id");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.notification_opened.requiredObjectFields.join(" ")).toContain("idempotency");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.creator_message_sent.requiredObjectFields.join(" ")).toContain("message_id");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.file_viewed.aliases).toContain("viewer_asset_started");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.file_viewed.requiredObjectFields.join(" ")).toContain("file_id");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.daily_checkin_claimed.aliases).toContain("daily_reward_claimed");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.task_completed.requiredObjectFields.join(" ")).toContain("task_id");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.task_completed.requiredObjectFields.join(" ")).toContain("reward_gd");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.support_ticket_created.aliases).toContain("support_ticket_submitted");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.support_reply_sent.aliases).toContain("support_thread_replied");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.bug_report_submitted.aliases).toContain("feedback_submitted");
    expect(TELEMETRY_EVENT_PAYLOAD_CONTRACTS_BY_NAME.admin_analytics_viewed.adminExcludedFromUserAnalytics).toBe(true);
  });
});

describe("analytics consistency contracts", () => {
  it("keeps runtime-critical package versions aligned", () => {
    const rootPackageJson = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };
    const functionsPackageJson = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "functions/package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };

    expect(rootPackageJson.dependencies?.["firebase-admin"]).toBe(
      functionsPackageJson.dependencies?.["firebase-admin"],
    );
  });

  it("keeps admin analytics historical queries tied to the shared event catalog", () => {
    const adminAnalyticsHistoricalRouteSource = readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/analytics/historical/route.ts"),
      "utf8",
    );
    const adminAnalyticsEntryRouteSource = readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/analytics/route.ts"),
      "utf8",
    );
    const adminAnalyticsDataSource = readFileSync(
      path.resolve(process.cwd(), "src/lib/server/admin-analytics-data.ts"),
      "utf8",
    );

    expect(adminAnalyticsHistoricalRouteSource).toContain("fetchAdminHistoricalAnalyticsSources");
    expect(adminAnalyticsEntryRouteSource).toContain("/api/admin/analytics/realtime");
    expect(adminAnalyticsEntryRouteSource).toContain("/api/admin/analytics/historical");
    expect(adminAnalyticsDataSource).toContain("fetchTelemetryLogs(ADMIN_TELEMETRY_LOG_EVENT_NAMES, startMs)");
    expect(adminAnalyticsDataSource).not.toContain("const telemetryEventNames = [");
    expect(adminAnalyticsDataSource).not.toContain("const ADMIN_TELEMETRY_LOG_EVENT_NAMES = [");
  });
});
