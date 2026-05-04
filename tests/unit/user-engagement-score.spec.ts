import { describe, expect, it } from "vitest";

import {
  buildUserEngagementScoreInputFromActivityDays,
  computeUserEngagementScore,
  recencyDecay,
} from "@/lib/behavioral/user-engagement-score";

describe("user-engagement-score", () => {
  it("scores paid engagement above free-only intent", () => {
    const paid = computeUserEngagementScore({
      normalizedActionCount7d: 12,
      unwrappedCount30d: 4,
      validWatchMinutes30d: 30,
      purchaseCount90d: 2,
      activeDays7d: 3,
      freeGdEarned30d: 100,
    });

    const freeOnly = computeUserEngagementScore({
      normalizedActionCount7d: 6,
      unwrappedCount30d: 0,
      validWatchMinutes30d: 0,
      purchaseCount90d: 0,
      activeDays7d: 2,
      freeGdEarned30d: 1000,
    });

    expect(paid.score).toBeGreaterThan(freeOnly.score);
    expect(paid.topReasons[0]?.code).toMatch(/unwraps|purchases|valid_watch_time/);
  });

  it("builds bounded activity windows from daily records", () => {
    const nowMs = Date.UTC(2026, 4, 4);
    const input = buildUserEngagementScoreInputFromActivityDays({
      nowMs,
      days: [
        {
          timestampMs: nowMs - (2 * 24 * 60 * 60 * 1000),
          normalizedActionCount: 8,
          unwrappedCount: 2,
          validWatchMinutes: 12,
          purchaseCount: 1,
          freeGdEarned: 50,
          hadVisit: true,
        },
        {
          timestampMs: nowMs - (20 * 24 * 60 * 60 * 1000),
          normalizedActionCount: 3,
          unwrappedCount: 1,
          validWatchMinutes: 8,
          purchaseCount: 0,
          freeGdEarned: 100,
          hadAuth: true,
        },
        {
          timestampMs: nowMs - (80 * 24 * 60 * 60 * 1000),
          normalizedActionCount: 1,
          unwrappedCount: 0,
          validWatchMinutes: 2,
          purchaseCount: 2,
          freeGdEarned: 25,
          hadVisit: true,
        },
      ],
    });

    expect(input).toEqual({
      normalizedActionCount7d: 8,
      unwrappedCount30d: 3,
      validWatchMinutes30d: 20,
      purchaseCount90d: 3,
      activeDays7d: 1,
      freeGdEarned30d: 150,
    });
  });

  it("exposes deterministic tiers and top reasons", () => {
    const result = computeUserEngagementScore({
      normalizedActionCount7d: 70,
      unwrappedCount30d: 18,
      validWatchMinutes30d: 140,
      purchaseCount90d: 5,
      activeDays7d: 6,
      freeGdEarned30d: 300,
    });

    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(["engaged", "power"]).toContain(result.tier);
    expect(result.verdict.length).toBeGreaterThan(0);
    expect(result.topReasons).toHaveLength(3);
  });

  it("keeps recency decay deterministic for diagnostics", () => {
    expect(recencyDecay(0, 7)).toBe(1);
    expect(recencyDecay(7, 7)).toBeCloseTo(0.5, 5);
  });
});
