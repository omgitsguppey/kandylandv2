import { describe, expect, it, vi } from "vitest";

import { maxCanonicalEventCount, safeRunReport } from "@/lib/server/admin-analytics-shared";

describe("admin analytics shared event counts", () => {
  it("uses the strongest canonical count across launch-era event aliases", () => {
    expect(maxCanonicalEventCount({
      drop_preview: 7,
      view_drop_details: 4,
      drop_preview_opened: 2,
    }, "drop_preview_opened")).toBe(7);

    expect(maxCanonicalEventCount({
      unlock_drop_success: 3,
      drop_unwrapped: 2,
      entitlement_granted: 3,
      drop_unlocked: 1,
    }, "drop_unlocked")).toBe(3);
  });

  it("keeps duplicate alias buckets from inflating all-range funnel counts", () => {
    expect(maxCanonicalEventCount({
      daily_checkin_claimed: 5,
      daily_check_in_claim: 5,
    }, "daily_checkin_claimed", ["daily_check_in_claim"])).toBe(5);
  });

  it("requests property quota and applies the bounded provider deadline", async () => {
    const runReport = vi.fn().mockResolvedValue([{ rows: [] }]);

    await safeRunReport(
      { runReport } as never,
      { property: "properties/123" } as never,
      { timeoutMs: 2_500 },
    );

    expect(runReport).toHaveBeenCalledWith(
      expect.objectContaining({
        property: "properties/123",
        returnPropertyQuota: true,
      }),
      { timeout: 2_500 },
    );
  });
});
