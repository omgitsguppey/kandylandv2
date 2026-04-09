import { describe, expect, it } from "vitest";

import {
  buildAuthOutcomeChartModel,
  formatAuthOutcomeMethodLabel,
} from "@/lib/admin-auth-outcome-chart";

describe("formatAuthOutcomeMethodLabel", () => {
  it("normalizes common auth method labels", () => {
    expect(formatAuthOutcomeMethodLabel("google.com")).toBe("Google");
    expect(formatAuthOutcomeMethodLabel("email_password")).toBe("Email");
    expect(formatAuthOutcomeMethodLabel("magic_link")).toBe("Magic Link");
  });
});

describe("buildAuthOutcomeChartModel", () => {
  it("treats failed historical auth attempts as real data even when there are no successes", () => {
    const model = buildAuthOutcomeChartModel([
      {
        method: "email_password",
        attempts: 9,
        successes: 0,
        failures: 7,
        avgDurationMs: 0,
        successRate: 0,
      },
    ]);

    expect(model.hasData).toBe(true);
    expect(model.items[0]).toMatchObject({
      label: "Email",
      attempts: 9,
      failures: 7,
      unfinished: 2,
    });
    expect(model.totals).toMatchObject({
      attempts: 9,
      successes: 0,
      failures: 7,
      unfinished: 2,
      successRate: 0,
      weightedAvgDurationMs: 0,
    });
  });

  it("sorts by attempts and computes weighted average completion time from successful finishes", () => {
    const model = buildAuthOutcomeChartModel([
      {
        method: "password",
        attempts: 4,
        successes: 2,
        failures: 1,
        avgDurationMs: 3_000,
        successRate: 0.5,
      },
      {
        method: "google.com",
        attempts: 12,
        successes: 9,
        failures: 2,
        avgDurationMs: 1_000,
        successRate: 0.75,
      },
    ]);

    expect(model.items.map((item) => item.label)).toEqual(["Google", "Email"]);
    expect(model.totals.attempts).toBe(16);
    expect(model.totals.successes).toBe(11);
    expect(model.totals.failures).toBe(3);
    expect(model.totals.unfinished).toBe(2);
    expect(model.totals.successRate).toBeCloseTo(11 / 16);
    expect(model.totals.weightedAvgDurationMs).toBeCloseTo(
      (9_000 + 6_000) / 11,
    );
  });
});
