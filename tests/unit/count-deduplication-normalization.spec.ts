import { describe, expect, it } from "vitest";

import {
  buildCanonicalCountKey,
  buildCreatorCountKey,
  buildGlobalCountKey,
  buildLegacyCountKey,
  buildUserCountKey,
  explainCountDecision,
  normalizeCountInput,
  REQUIRED_COUNT_DOMAINS,
  shouldIncrementCount,
} from "@/lib/math/count-deduplication-normalizer";
import {
  getFormulaDefinition,
  validateMetricHasFormula,
} from "@/lib/math/canonical-math-authority-ledger";
import { normalizeGlobalUserMetric } from "@/lib/analytics/global-user-dedupe-engine";

describe("count deduplication normalization", () => {
  it("builds canonical count keys from eventId, then dedupeKey, then timestamp-bucket fallback", () => {
    expect(buildCanonicalCountKey({
      domain: "drops_opened",
      eventName: "drop_preview_opened",
      eventId: "evt_123",
      dedupeKey: "dedupe_123",
      sessionId: "session_1",
      objectId: "drop_1",
      timestampMs: 1_800_000,
    })).toBe("event:evt_123");

    expect(buildCanonicalCountKey({
      domain: "drops_opened",
      eventName: "drop_preview_opened",
      dedupeKey: "dedupe_123",
      sessionId: "session_1",
      objectId: "drop_1",
      timestampMs: 1_800_000,
    })).toBe("dedupe:dedupe_123");

    expect(buildCanonicalCountKey({
      domain: "drops_opened",
      eventName: "drop_preview_opened",
      sessionId: "session_1",
      objectId: "drop_1",
      timestampMs: 1_800_000,
    })).toBe("bucket:session_1:drop_preview_opened:drop_1:30");
  });

  it("counts a linked guest to user action once globally and under best user identity only", () => {
    const normalized = normalizeCountInput({
      domain: "creator_profile_views",
      eventName: "creator_profile_opened",
      eventId: "evt_linked",
      sessionId: "session_1",
      guestId: "guest_1",
      userId: "user_1",
      linkedPersonId: "person_1",
      linkId: "link_1",
      creatorId: "creator_1",
      identityConfidence: "linked",
    });

    expect(buildGlobalCountKey(normalized)).toBe("global:creator_profile_views:event:evt_linked");
    expect(buildUserCountKey(normalized)).toBe("user:person_1:creator_profile_views:event:evt_linked");
    expect(buildCreatorCountKey(normalized)).toBe("creator:creator_1:creator_profile_views:event:evt_linked");
    expect(normalized.decisions.global.increment).toBe(true);
    expect(normalized.decisions.user.increment).toBe(true);
    expect(normalized.decisions.guest.increment).toBe(false);
    expect(normalized.divergenceExplanation).toContain("best user identity");
    expect(shouldIncrementCount({ ...normalized, scope: "global" })).toBe(true);
    expect(shouldIncrementCount({ ...normalized, scope: "user" })).toBe(true);
  });

  it("routes weak and unknown legacy confidence to legacy buckets instead of exact user buckets", () => {
    const normalized = normalizeCountInput({
      domain: "support_account_actions",
      eventName: "support_ticket_created",
      eventId: "legacy_evt",
      sessionId: "legacy_session",
      userId: "legacy_user",
      identityConfidence: "weak",
      legacy: true,
    });

    expect(buildLegacyCountKey(normalized)).toBe("legacy:support_account_actions:event:legacy_evt");
    expect(normalized.decisions.global.increment).toBe(false);
    expect(normalized.decisions.user.increment).toBe(false);
    expect(normalized.decisions.legacy.increment).toBe(true);
    expect(explainCountDecision(normalized)).toContain("legacy bucket");
  });

  it("suppresses retry and replay events unless replay is the metric itself", () => {
    const suppressed = normalizeCountInput({
      domain: "wallet_opens",
      eventName: "wallet_opened",
      eventId: "retry_evt",
      sessionId: "session_1",
      userId: "user_1",
      identityConfidence: "exact",
      replayOfEventId: "wallet_opened:session_1",
    });
    const replayMetric = normalizeCountInput({
      domain: "watch_sessions",
      eventName: "drop_watch_replayed",
      eventId: "replay_evt",
      sessionId: "session_1",
      userId: "user_1",
      objectId: "drop_1",
      identityConfidence: "exact",
      retryAttempt: 1,
      metricIsReplay: true,
    });

    expect(suppressed.decisions.global.increment).toBe(false);
    expect(suppressed.decisions.user.increment).toBe(false);
    expect(suppressed.replaySuppressed).toBe(true);
    expect(replayMetric.decisions.global.increment).toBe(true);
    expect(replayMetric.decisions.user.increment).toBe(true);
    expect(replayMetric.replaySuppressed).toBe(false);
  });

  it("registers formula references for every required count domain and explains zero or unknown behavior", () => {
    expect(REQUIRED_COUNT_DOMAINS).toEqual(expect.arrayContaining([
      "page_session_events",
      "signup_login_events",
      "drops_opened",
      "unwraps",
      "watch_sessions",
      "wallet_opens",
      "checkout_starts",
      "payments_approved",
      "daily_task_events",
      "chat_events",
      "creator_profile_views",
      "creator_relationships",
      "fan_pass_events",
      "notification_events",
      "media_events",
      "support_account_actions",
    ]));

    for (const domain of REQUIRED_COUNT_DOMAINS) {
      const normalized = normalizeCountInput({
        domain,
        eventName: `${domain}_event`,
        eventId: `${domain}_event_id`,
        userId: "user_1",
        sessionId: "session_1",
        identityConfidence: "exact",
      });
      expect(getFormulaDefinition(normalized.formulaId)).toBeTruthy();
      expect(normalized.zeroUnknownBehavior).toContain("no increment");
    }
    expect(validateMetricHasFormula("count_dedupe_global_count")).toMatchObject({ ok: true });
  });

  it("keeps existing global/user dedupe engine aligned with canonical count keys", () => {
    const decision = normalizeGlobalUserMetric({
      eventId: "evt_existing",
      eventName: "creator_followed",
      featureId: "creator_profile",
      surface: "creator-profile",
      sessionId: "session_1",
      guestId: "guest_1",
      userId: "user_1",
      linkedPersonId: "person_1",
      linkId: "link_1",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      idempotencyKey: "creator_followed:creator_1",
    });

    expect(decision.global.count).toBe(true);
    expect(decision.user.count).toBe(true);
    expect(decision.guest.count).toBe(false);
    expect(decision.countDedupeMath?.canonicalKey).toBe("event:evt_existing");
    expect(decision.countDedupeMath?.globalKey).toBe("global:creator_relationships:event:evt_existing");
    expect(decision.debug.explanation).toContain("best user identity");
  });

  it("uses canonical timestamp-bucket fallback keys in global and user summary decisions", () => {
    const input = {
      eventId: "",
      eventName: "drop_preview_opened",
      featureId: "drops",
      surface: "drop-preview",
      sessionId: "session_bucket",
      userId: "user_bucket",
      identityState: "logged_in_unlinked",
      identityConfidence: "exact",
      objectId: "drop_42",
      timestampMs: 180_000,
    } as Parameters<typeof normalizeGlobalUserMetric>[0] & {
      objectId: string;
      timestampMs: number;
    };
    const decision = normalizeGlobalUserMetric(input);

    expect(decision.countDedupeMath?.canonicalKey).toBe("bucket:session_bucket:drop_preview_opened:drop_42:3");
    expect(decision.dedupeKey).toBe(decision.countDedupeMath?.globalKey);
    expect(decision.global.dedupeKey).toBe(decision.countDedupeMath?.globalKey);
    expect(decision.user.dedupeKey).toBe(decision.countDedupeMath?.userKey);
    expect(decision.global.count).toBe(true);
    expect(decision.user.count).toBe(true);
  });
});
