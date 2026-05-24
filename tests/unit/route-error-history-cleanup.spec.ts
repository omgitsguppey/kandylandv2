import { describe, expect, it } from "vitest";

import {
  classifyRouteErrorHistory,
  summarizeRouteErrorHistory,
} from "@/lib/debug/route-error-history-classifier";

describe("route error history cleanup", () => {
  it("keeps current server errors distinct from stale server history", () => {
    const nowMs = Date.parse("2026-05-24T21:00:00.000Z");

    expect(classifyRouteErrorHistory({
      routeKey: "analytics/ingest-identified:POST",
      lastResult: "server_error",
      lastServerErrorAtMs: nowMs - 60_000,
      lastClientErrorAtMs: 0,
      updatedAtMs: nowMs - 60_000,
      successCount: 3952,
      clientErrorCount: 521341,
      serverErrorCount: 139907,
    }, { nowMs }).classification).toBe("current_server_error");

    const resolved = classifyRouteErrorHistory({
      routeKey: "creator/relationships:POST",
      lastResult: "success",
      lastServerErrorAtMs: nowMs - (19 * 24 * 60 * 60 * 1000),
      lastClientErrorAtMs: 0,
      updatedAtMs: nowMs - 10_000,
      successCount: 363,
      clientErrorCount: 0,
      serverErrorCount: 1,
    }, { nowMs });

    expect(resolved.classification).toBe("resolved_error_history");
    expect(resolved.currentFailure).toBe(false);
    expect(resolved.lastErrorAgeLabel).toBe("19d");
  });

  it("reviews high-volume current client errors without calling them server failures", () => {
    const nowMs = Date.parse("2026-05-24T21:00:00.000Z");
    const summary = summarizeRouteErrorHistory([
      {
        routeKey: "wallet/packages:GET",
        lastResult: "client_error",
        lastServerErrorAtMs: 0,
        lastClientErrorAtMs: nowMs - 60 * 60 * 1000,
        updatedAtMs: nowMs - 60 * 60 * 1000,
        successCount: 0,
        clientErrorCount: 806,
        serverErrorCount: 0,
      },
    ], { nowMs });

    expect(summary.currentClientErrors).toEqual(["wallet/packages:GET"]);
    expect(summary.currentServerFailures).toEqual([]);
    expect(summary.records[0]).toMatchObject({
      classification: "current_client_error",
      threshold: expect.any(Number),
    });
  });
});
