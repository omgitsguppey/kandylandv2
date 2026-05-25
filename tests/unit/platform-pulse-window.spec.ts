import { describe, expect, it } from "vitest";

import {
  buildPlatformPulseWindow,
  calculatePlatformPulseDelta,
  classifyPlatformPulseTrend,
  formatPlatformPulseDelta,
} from "@/lib/admin/platform-pulse-window";

describe("platform pulse rolling window semantics", () => {
  it("builds one current rolling 30d window and one prior 30d baseline", () => {
    const nowMs = Date.parse("2026-05-25T12:00:00.000Z");
    const window = buildPlatformPulseWindow(nowMs);

    expect(window).toEqual({
      nowUtc: "2026-05-25T12:00:00.000Z",
      currentStartUtc: "2026-04-25T12:00:00.000Z",
      currentEndUtc: "2026-05-25T12:00:00.000Z",
      priorStartUtc: "2026-03-26T12:00:00.000Z",
      priorEndUtc: "2026-04-25T12:00:00.000Z",
      label: "rolling_30d",
    });
  });

  it("formats zero-baseline growth as New with explicit baseline context", () => {
    const delta = calculatePlatformPulseDelta(8, 0);
    const formatted = formatPlatformPulseDelta(delta);

    expect(delta.percentChange).toBeNull();
    expect(classifyPlatformPulseTrend(delta)).toBe("new");
    expect(formatted.text).toBe("New");
    expect(formatted.ariaLabel).toBe("New: prior 30d was 0");
    expect(formatted.title).toContain("no prior 30d baseline");
  });

  it("keeps zero, up, down, and flat deltas unambiguous", () => {
    expect(formatPlatformPulseDelta(calculatePlatformPulseDelta(0, 0))).toMatchObject({
      text: "0%",
      ariaLabel: "Current 30d vs previous 30d: 0%",
    });
    expect(formatPlatformPulseDelta(calculatePlatformPulseDelta(15, 10))).toMatchObject({
      text: "+50%",
      ariaLabel: "Current 30d vs previous 30d: +50%",
    });
    expect(formatPlatformPulseDelta(calculatePlatformPulseDelta(5, 10))).toMatchObject({
      text: "-50%",
      ariaLabel: "Current 30d vs previous 30d: -50%",
    });
    expect(formatPlatformPulseDelta(calculatePlatformPulseDelta(10, 10))).toMatchObject({
      text: "0%",
      ariaLabel: "Current 30d vs previous 30d: 0%",
    });
  });
});
