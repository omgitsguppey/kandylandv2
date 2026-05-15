import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "@/lib/server/bounded-concurrency";

describe("mapWithConcurrency", () => {
  it("preserves result order while never exceeding the concurrency cap", async () => {
    let active = 0;
    let maxActive = 0;
    const items = [40, 10, 30, 20, 5];

    const results = await mapWithConcurrency(items, 2, async (delayMs, index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      active -= 1;
      return `${index}:${delayMs}`;
    });

    expect(results).toEqual(["0:40", "1:10", "2:30", "3:20", "4:5"]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("treats invalid concurrency as a single worker", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrency([1, 2, 3], 0, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });

    expect(results).toEqual([2, 4, 6]);
    expect(maxActive).toBe(1);
  });
});
