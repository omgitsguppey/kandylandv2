import { describe, expect, it } from "vitest";

import {
  classifyRouteLatencyReview,
  summarizeRouteLatencyReview,
} from "@/lib/debug/route-latency-review-engine";

describe("route latency review cleanup", () => {
  it("separates current slow routes from historical slow counters", () => {
    const current = classifyRouteLatencyReview({
      routeKey: "admin/overview:GET",
      lastResult: "success",
      slowThresholdMs: 1200,
      lastLatencyMs: 4580,
      averageLatencyMs: 2108,
      maxLatencyMs: 17552,
      slowCount: 470,
      sampleCount: 1068,
      updatedAtMs: Date.now(),
    });
    const historical = classifyRouteLatencyReview({
      routeKey: "drops:GET",
      lastResult: "success",
      slowThresholdMs: 1200,
      lastLatencyMs: 180,
      averageLatencyMs: 350,
      maxLatencyMs: 2400,
      slowCount: 3,
      sampleCount: 1088,
      updatedAtMs: Date.now(),
    });

    expect(current.currentLatencyStatus).toBe("current_slow");
    expect(current.severity).toBe("critical");
    expect(current.nextAction).toContain("summary-first");
    expect(historical.currentLatencyStatus).toBe("current_fast");
    expect(historical.historicalLatencyStatus).toBe("review");
    expect(historical.severity).toBe("info");
  });

  it("prioritizes latency routes without converting all slow samples to failures", () => {
    const summary = summarizeRouteLatencyReview([
      {
        routeKey: "admin/debug/control-tower:GET",
        lastResult: "success",
        slowThresholdMs: 1200,
        lastLatencyMs: 6095,
        averageLatencyMs: 2600,
        maxLatencyMs: 12243,
        slowCount: 42,
        sampleCount: 90,
        updatedAtMs: Date.now(),
      },
      {
        routeKey: "creator/bookings:GET",
        lastResult: "success",
        slowThresholdMs: 1200,
        lastLatencyMs: 240,
        averageLatencyMs: 320,
        maxLatencyMs: 1800,
        slowCount: 3,
        sampleCount: 1127,
        updatedAtMs: Date.now(),
      },
    ]);

    expect(summary.currentSlowRoutes).toEqual(["admin/debug/control-tower:GET"]);
    expect(summary.historicalSlowReviewRoutes).toEqual(["creator/bookings:GET"]);
    expect(summary.totalSlowSamples).toBe(45);
    expect(summary.currentSlowRoutes.length).toBeLessThan(summary.totalSlowSamples);
  });
});
