import { describe, expect, it } from "vitest";

import {
  classifyDuplicateRisk,
  explainDedupeDecision,
  normalizeGlobalUserMetric,
} from "@/lib/analytics/global-user-dedupe-engine";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";

describe("global user dedupe normalization", () => {
  it("counts a linked guest to user action once globally and once for the best identity", () => {
    const decision = normalizeGlobalUserMetric({
      eventId: "evt_1",
      eventName: "drop_preview_opened",
      featureId: "drops",
      surface: "drop-preview",
      sessionId: "session_1",
      guestId: "guest_1",
      userId: "user_1",
      linkedPersonId: "person_1",
      linkId: "link_1",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      idempotencyKey: "drop_preview_opened:drop_1",
    });

    expect(decision.global.count).toBe(true);
    expect(decision.user.count).toBe(true);
    expect(decision.sql.count).toBe(true);
    expect(decision.guest.count).toBe(false);
    expect(decision.linkedPerson.count).toBe(true);
    expect(decision.duplicateRisk).toBe("linked_guest_user_duplicate_risk_suppressed");
    expect(decision.suppressedDuplicateKeys).toContain("guest:guest_1");
    expect(explainDedupeDecision(decision)).toContain("linked guest");
  });

  it("blocks unknown legacy from becoming exact user truth while preserving raw SQL facts", () => {
    const decision = normalizeGlobalUserMetric({
      eventId: "legacy_1",
      eventName: "semantic_page_viewed",
      featureId: "legacy",
      surface: "legacy-import",
      sessionId: "legacy_session",
      userId: "maybe_user",
      identityState: "legacy_unknown",
      identityConfidence: "unknown",
      legacyUnknown: true,
    });

    expect(decision.global.count).toBe(false);
    expect(decision.user.count).toBe(false);
    expect(decision.sql.count).toBe(true);
    expect(decision.sql.policy).toBe("preserve_raw_fact_normalized_summary");
    expect(decision.duplicateRisk).toBe("unknown_legacy_archived");
    expect(decision.debug.explanation).toContain("legacy");
  });

  it("prevents retry and replay events from inflating metrics", () => {
    const decision = normalizeGlobalUserMetric({
      eventId: "retry_1",
      eventName: "wallet_opened",
      featureId: "wallet",
      surface: "wallet",
      sessionId: "session_1",
      userId: "user_1",
      identityState: "logged_in_unlinked",
      identityConfidence: "exact",
      idempotencyKey: "wallet_opened:session_1",
      replayOfEventId: "wallet_opened:session_1",
    });

    expect(decision.global.count).toBe(false);
    expect(decision.user.count).toBe(false);
    expect(decision.sql.count).toBe(true);
    expect(classifyDuplicateRisk(decision.input)).toBe("retry_replay_suppressed");
    expect(decision.debug.explanation).toContain("replay");
  });

  it("adds dedupe scope and global user SQL parity fields to normalized event facts", () => {
    const fact = normalizeBehavioralEventFact({
      eventId: "fact_1",
      eventName: "drop_preview_opened",
      timestamp: Date.parse("2026-05-24T10:00:00.000Z"),
      userId: "user_1",
      sessionId: "session_1",
      anonymousVisitorId: "guest_1",
      params: {
        sourceComponent: "unit-test",
        route: "/drops/drop_1",
        dropId: "drop_1",
        linkId: "link_1",
        identityState: "logged_in_linked_guest",
        identityConfidence: "linked",
        idempotencyKey: "drop_preview_opened:drop_1",
      },
      route: "/drops/drop_1",
      pagePath: "/drops/drop_1",
      source: "client",
    });

    expect(fact?.dedupeScope).toBe("event");
    expect(fact?.dedupeDecision.global.count).toBe(true);
    expect(fact?.dedupeDecision.user.count).toBe(true);
    expect(fact?.dedupeDecision.guest.count).toBe(false);
    expect(fact?.globalUserParity.globalAggregationPolicy).toBe("count_once");
    expect(fact?.globalUserParity.userAggregationPolicy).toBe("best_identity_wins");
    expect(fact?.globalUserParity.sqlAggregationPolicy).toBe("preserve_raw_fact_normalized_summary");
    expect(fact?.identityConfidence).toBe("linked");
  });
});
