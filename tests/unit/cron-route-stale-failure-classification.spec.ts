import { describe, expect, it } from "vitest";

import { classifyScheduledRouteSample } from "@/lib/debug/cron-route-stale-failure-classifier";

describe("cron route stale failure classification", () => {
  it("classifies old cron server errors as stale scheduled failures without running cron", () => {
    const record = classifyScheduledRouteSample({
      routeKey: "cron/process-queue:GET",
      lastResult: "server_error",
      lastSampleAgeMs: 22 * 24 * 60 * 60 * 1000,
      freshnessWindowMs: 24 * 60 * 60 * 1000,
      schedulerExpected: true,
    });

    expect(record.status).toBe("scheduled_stale_failure");
    expect(record.currentFailure).toBe(false);
    expect(record.validatorRunsCron).toBe(false);
    expect(record.nextAction).toContain("scheduler");
  });
});
