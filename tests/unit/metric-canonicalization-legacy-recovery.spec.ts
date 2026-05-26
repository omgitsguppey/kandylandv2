import { describe, expect, it } from "vitest";

import {
  LEGACY_EVENT_ALIAS_TABLE,
  buildLegacyDedupeKey,
  canonicalizeLegacyEventName,
  canonicalizeLegacyMetricName,
  classifyLegacyMetricConfidence,
  explainLegacyCanonicalization,
  mapLegacyEventToCurrentMetric,
} from "@/lib/math/legacy-metric-canonicalization";
import * as dryRunModule from "@/lib/math/legacy-recovery-dry-run-engine";
import {
  buildLegacyRecoveryDryRun,
  recoveryStartDate,
  dryRunOnly,
} from "@/lib/math/legacy-recovery-dry-run-engine";

describe("metric canonicalization legacy recovery", () => {
  it("declares March 1 dry-run-only recovery and does not export mutation helpers", () => {
    expect(recoveryStartDate).toBe("2026-03-01");
    expect(dryRunOnly).toBe(true);
    expect(Object.keys(dryRunModule).join(" ")).not.toMatch(/\b(backfill|mutate|write|commit|apply)\b/iu);
  });

  it("canonicalizes old event and metric aliases into current metric names", () => {
    expect(canonicalizeLegacyEventName({ eventName: "page_duration", sourceRoute: "/drops/a" }).canonicalEventName)
      .toBe("session_closed");
    expect(canonicalizeLegacyMetricName("watchSecondsTotal")).toBe("runtime_watch_sessions");
    expect(mapLegacyEventToCurrentMetric({ eventName: "unlock_drop_success" })).toMatchObject({
      canonicalEventName: "drop_unlocked",
      canonicalMetricId: "unwraps",
    });
    expect(mapLegacyEventToCurrentMetric({ eventName: "wallet_purchase_completed" })).toMatchObject({
      canonicalEventName: "gumdrops_purchased",
      canonicalMetricId: "payment_approvals",
    });
    expect(mapLegacyEventToCurrentMetric({ eventName: "creator_profile_viewed" })).toMatchObject({
      canonicalEventName: "creator_profile_opened",
      canonicalMetricId: "creator_profile_views",
    });
    expect(mapLegacyEventToCurrentMetric({ eventName: "creator_followed" })).toMatchObject({
      canonicalEventName: "creator_followed",
      canonicalMetricId: "follows",
    });

    const mappedCategories = new Set(LEGACY_EVENT_ALIAS_TABLE.map((entry) => entry.aliasCategory));
    expect(mappedCategories).toEqual(new Set([
      "watch_page_duration",
      "unlock_drop_open",
      "wallet_payment",
      "signup_login",
      "daily_task_checkin",
      "chat_message",
      "notification",
      "creator_profile_follow",
      "search_discovery",
      "support_settings",
    ]));
  });

  it("caps legacy confidence according to deterministic identity and source evidence", () => {
    expect(classifyLegacyMetricConfidence({
      canonicalEventName: "drop_unlocked",
      userId: "user_1",
      eventId: "event_1",
      occurredAt: "2026-03-02T00:00:00.000Z",
      sourceRoute: "/api/drops/unlock",
      sourceExact: true,
    })).toMatchObject({ identityConfidence: "exact", confidenceWeight: 1 });

    expect(classifyLegacyMetricConfidence({
      canonicalEventName: "drop_unlocked",
      eventId: "event_2",
      occurredAt: "2026-03-02T00:00:00.000Z",
      sourceRoute: "/api/drops/unlock",
      sourceExact: true,
    })).toMatchObject({ identityConfidence: "inferred", confidenceWeight: 0.6 });

    expect(classifyLegacyMetricConfidence({
      eventName: "old_drop_view",
      sourceRoute: "/drops/a",
      occurredAt: "2026-03-02T00:00:00.000Z",
      partialRouteMatch: true,
    })).toMatchObject({ identityConfidence: "weak", confidenceWeight: 0.35 });

    expect(classifyLegacyMetricConfidence({
      eventName: "mystery_legacy",
      occurredAt: "2026-03-02T00:00:00.000Z",
    })).toMatchObject({ identityConfidence: "unknown", confidenceWeight: 0, action: "archive_only" });
  });

  it("builds duplicate keys with the required timestamp bucket rules", () => {
    expect(buildLegacyDedupeKey({
      canonicalEventName: "creator_card_clicked",
      userId: "user_1",
      objectId: "creator_1",
      sourceRoute: "/discover",
      occurredAt: "2026-03-02T00:00:04.900Z",
      eventKind: "click_action",
    })).toBe("click_action:creator_card_clicked:user_1:creator_1:/discover:354481920");

    expect(buildLegacyDedupeKey({
      canonicalEventName: "creator_card_viewed",
      sessionId: "session_1",
      objectId: "creator_1",
      sourceRoute: "/discover",
      occurredAt: "2026-03-02T00:00:59.900Z",
      eventKind: "view_impression",
    })).toBe("view_impression:creator_card_viewed:session_1:creator_1:/discover:29540160");

    expect(buildLegacyDedupeKey({
      canonicalEventName: "session_started",
      sessionId: "session_abc",
      sourceRoute: "/",
      occurredAt: "2026-03-02T00:29:59.000Z",
      eventKind: "session",
    })).toBe("session:session_abc");

    expect(buildLegacyDedupeKey({
      canonicalEventName: "gumdrops_purchased",
      providerOrderId: "PAYPAL-ORDER-123",
      idempotencyKey: "idem_1",
      occurredAt: "2026-03-02T00:00:00.000Z",
      eventKind: "payment_ledger",
    })).toBe("payment_ledger:idem_1");

    expect(buildLegacyDedupeKey({
      canonicalEventName: "task_completed",
      resetWindowId: "2026-03-02:user_1",
      occurredAt: "2026-03-02T00:00:00.000Z",
      eventKind: "task",
    })).toBe("task:2026-03-02:user_1");

    expect(buildLegacyDedupeKey({
      canonicalEventName: "notification_opened",
      intentId: "intent_1",
      recipientId: "user_1",
      occurredAt: "2026-03-02T00:59:59.000Z",
      eventKind: "notification",
    })).toBe("notification:intent_1:user_1:492336");
  });

  it("builds dry-run recovery candidates with confidence, duplicate risk, and explanations", () => {
    const dryRun = buildLegacyRecoveryDryRun({
      records: [
        {
          legacySource: "analytics_event_facts",
          eventName: "old_drop_view",
          eventId: "event_drop",
          userId: "user_1",
          objectId: "drop_1",
          sourceRoute: "/drops/drop_1",
          occurredAt: "2026-03-02T00:00:00.000Z",
          sourceExact: true,
        },
        {
          legacySource: "old_events",
          eventName: "unknown_legacy",
          occurredAt: "2026-03-02T00:00:00.000Z",
        },
        {
          legacySource: "analytics_event_facts",
          eventName: "page_viewed",
          sessionId: "session_before",
          sourceRoute: "/",
          occurredAt: "2026-02-28T23:59:59.000Z",
        },
      ],
    });

    expect(dryRun).toMatchObject({
      mode: "dry_run_only",
      recoveryStartDate: "2026-03-01",
      readsProduction: false,
      mutationsAllowed: false,
    });
    expect(dryRun.candidates).toHaveLength(3);
    expect(dryRun.candidates[0]).toMatchObject({
      legacySource: "analytics_event_facts",
      canonicalEventName: "drop_preview_opened",
      canonicalMetricId: "drop_opens",
      confidenceWeight: 1,
      identityConfidence: "exact",
      action: "normalize_candidate",
      duplicateRisk: "medium",
    });
    expect(dryRun.candidates[0].accuracyImpact).toContain("canonical");
    expect(dryRun.candidates[0].userVisibleImpact).toContain("dry-run");
    expect(dryRun.candidates[1]).toMatchObject({
      canonicalEventName: "unknown_legacy",
      canonicalMetricId: null,
      identityConfidence: "unknown",
      action: "archive_only",
      duplicateRisk: "high",
    });
    expect(dryRun.candidates[2].action).toBe("ignore");
    expect(dryRun.summary.actionCounts.archive_only).toBe(1);
    expect(dryRun.summary.actionCounts.ignore).toBe(1);
  });

  it("explains canonicalization decisions without promoting unknown legacy", () => {
    const explanation = explainLegacyCanonicalization({
      eventName: "unknown_legacy",
      occurredAt: "2026-03-02T00:00:00.000Z",
    });

    expect(explanation).toContain("archive_only");
    expect(explanation).toContain("unknown legacy cannot become exact");
  });
});
