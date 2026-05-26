import { describe, expect, it } from "vitest";

import {
  DURATION_MATH_CATEGORIES,
  calculateActiveDurationMs,
  calculateFlowDurationMs,
  calculateHiddenMs,
  calculateIdleMs,
  calculatePassiveVisibleMs,
  calculateWatchDurationMs,
  classifyDurationConfidence,
  explainDurationDecision,
  normalizeDurationInput,
} from "@/lib/math/duration-math-normalizer";
import {
  requireFormulaDefinition,
  validateMetricHasFormula,
} from "@/lib/math/canonical-math-authority-ledger";

describe("duration math normalization", () => {
  it("keeps active, passive, idle, and hidden session buckets separate", () => {
    const input = {
      category: "session_active" as const,
      startedAtMs: 1_000,
      endedAtMs: 11_000,
      foregroundVisibleMs: 10_000,
      activeMs: 5_500,
      passiveVisibleMs: 1_500,
      idleMs: 1_000,
      hiddenMs: 2_000,
      recentActivityAtMs: 10_500,
      source: "session" as const,
    };

    expect(calculateActiveDurationMs(input)).toBe(5_500);
    expect(calculatePassiveVisibleMs(input)).toBe(1_500);
    expect(calculateIdleMs(input)).toBe(1_000);
    expect(calculateHiddenMs(input)).toBe(2_000);

    const normalized = normalizeDurationInput(input);
    expect(normalized.activeMs).toBe(5_500);
    expect(normalized.passiveVisibleMs).toBe(1_500);
    expect(normalized.idleMs).toBe(1_000);
    expect(normalized.hiddenMs).toBe(2_000);
    expect(normalized.backgroundExcluded).toBe(true);
    expect(normalized.confidence).toBe("exact");
  });

  it("does not count page-open duration as watch time", () => {
    const decision = normalizeDurationInput({
      category: "drop_watch_active",
      source: "page",
      startedAtMs: 1_000,
      endedAtMs: 21_000,
      pageOpenMs: 20_000,
      foregroundVisibleMs: 20_000,
      activeMs: 20_000,
      contentDurationMs: 30_000,
    });

    expect(calculateWatchDurationMs(decision.input)).toBeNull();
    expect(decision.watchMs).toBeNull();
    expect(decision.availability).toBe("unavailable");
    expect(decision.suspiciousPageTimeFallback).toBe(true);
    expect(explainDurationDecision(decision.input)).toContain("page-open time is not watch time");
  });

  it("normalizes media watch percent from active media exposure and caps replay unless allowed", () => {
    const capped = normalizeDurationInput({
      category: "drop_watch_normalized",
      source: "media",
      mediaActiveMs: 40_000,
      playingMs: 40_000,
      contentDurationMs: 30_000,
      replayCount: 2,
      countReplay: false,
    });
    const replayAllowed = normalizeDurationInput({
      category: "drop_watch_normalized",
      source: "media",
      mediaActiveMs: 40_000,
      playingMs: 40_000,
      contentDurationMs: 30_000,
      replayCount: 2,
      countReplay: true,
    });

    expect(capped.watchMs).toBe(30_000);
    expect(capped.normalizedWatchPercent).toBe(100);
    expect(replayAllowed.watchMs).toBe(40_000);
    expect(replayAllowed.normalizedWatchPercent).toBeCloseTo(66.67, 2);
  });

  it("uses flow start and finish events instead of page render time", () => {
    const exact = {
      category: "checkout_flow_duration" as const,
      source: "flow" as const,
      startedAtMs: 5_000,
      completedAtMs: 15_250,
      pageOpenMs: 60_000,
    };
    const abandoned = {
      category: "auth_flow_duration" as const,
      source: "flow" as const,
      startedAtMs: 10_000,
      abandonedAtMs: 40_000,
    };

    expect(calculateFlowDurationMs(exact)).toBe(10_250);
    expect(classifyDurationConfidence(exact)).toBe("exact");
    expect(calculateFlowDurationMs(abandoned)).toBe(30_000);
    expect(classifyDurationConfidence(abandoned)).toBe("estimated");
  });

  it("keeps unknown and legacy durations unavailable instead of zero or exact", () => {
    const normalized = normalizeDurationInput({
      category: "unknown_legacy_duration",
      source: "legacy",
      legacy: true,
      durationMs: null,
    });

    expect(normalized.durationMs).toBeNull();
    expect(normalized.activeMs).toBeNull();
    expect(normalized.confidence).toBe("legacy_unknown");
    expect(normalized.availability).toBe("unavailable");
  });

  it("registers formulas for every duration category", () => {
    expect(DURATION_MATH_CATEGORIES).toEqual(expect.arrayContaining([
      "session_active",
      "session_passive",
      "session_idle",
      "session_hidden",
      "drop_watch_active",
      "drop_watch_normalized",
      "task_active_duration",
      "checkout_flow_duration",
      "auth_flow_duration",
      "chat_typing_duration",
      "media_upload_duration",
      "notification_permission_duration",
      "unknown_legacy_duration",
    ]));

    for (const category of DURATION_MATH_CATEGORIES) {
      expect(validateMetricHasFormula(`duration_${category}`)).toMatchObject({ ok: true });
      expect(requireFormulaDefinition(`duration_math.${category}`)).toMatchObject({
        authorityStatus: "canonical",
      });
    }
  });
});
