import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAnalyticsBatchId,
  createAnalyticsEventId,
  createAnalyticsWatchSessionId,
  isValidAnalyticsBatchId,
  isValidAnalyticsEventId,
  isValidAnalyticsWatchSessionId,
} from "@/lib/analytics-identifiers";

describe("analytics-identifiers", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:34:56Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("generates valid event identifiers", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "01234567-89ab-cdef-0123-456789abcdef"),
    });

    const eventId = createAnalyticsEventId(sessionId);
    expect(eventId).toMatch(/^evt_[A-Za-z0-9:_-]{16,160}$/u);
    expect(isValidAnalyticsEventId(eventId)).toBe(true);
  });

  it("generates valid batch identifiers", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "89abcdef-0123-4567-89ab-cdef01234567"),
    });

    const batchId = createAnalyticsBatchId(sessionId);
    expect(batchId).toMatch(/^batch_[A-Za-z0-9:_-]{16,160}$/u);
    expect(isValidAnalyticsBatchId(batchId)).toBe(true);
  });

  it("generates valid watch session identifiers", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "fedcba98-7654-3210-fedc-ba9876543210"),
    });

    const watchSessionId = createAnalyticsWatchSessionId(sessionId);
    expect(watchSessionId).toMatch(/^watch_[A-Za-z0-9:_-]{16,160}$/u);
    expect(isValidAnalyticsWatchSessionId(watchSessionId)).toBe(true);
  });

  it("generates unique identifiers", () => {
    let counter = 0;
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => `${String(counter++).padStart(8, "0")}-89ab-cdef-0123-456789abcdef`),
    });

    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(createAnalyticsEventId(sessionId));
    }
    expect(ids.size).toBe(100);
  });

  it("falls back to crypto.getRandomValues without calling Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random should not be used for analytics identifiers.");
    });

    vi.stubGlobal("crypto", {
      getRandomValues: vi.fn((buffer: Uint8Array) => {
        buffer.set([
          0x00, 0x11, 0x22, 0x33,
          0x44, 0x55, 0x66, 0x77,
          0x88, 0x99, 0xaa, 0xbb,
          0xcc, 0xdd, 0xee, 0xff,
        ]);
        return buffer;
      }),
    });

    const timeFragment = Date.now().toString(36);
    const eventId = createAnalyticsEventId(sessionId);

    expect(eventId).toBe(`evt_test-session-123_${timeFragment}_00112233445566778899aabbccddeeff`);
    expect(mathRandom).not.toHaveBeenCalled();
    expect(isValidAnalyticsEventId(eventId)).toBe(true);
  });

  it("throws when secure randomness is unavailable", () => {
    vi.stubGlobal("crypto", {});

    expect(() => createAnalyticsEventId(sessionId)).toThrow(
      "Cryptographically secure random number generation is not available in this environment.",
    );
  });
});
