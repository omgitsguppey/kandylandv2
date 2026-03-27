import { describe, it, expect } from "vitest";
import {
  createAnalyticsEventId,
  createAnalyticsBatchId,
  createAnalyticsWatchSessionId,
  isValidAnalyticsEventId,
  isValidAnalyticsBatchId,
  isValidAnalyticsWatchSessionId
} from "@/lib/analytics-identifiers";

describe("analytics-identifiers", () => {
  const sessionId = "test-session-123";

  it("generates valid event identifiers", () => {
    const eventId = createAnalyticsEventId(sessionId);
    expect(eventId).toMatch(/^evt_[A-Za-z0-9:_-]{16,160}$/u);
    expect(isValidAnalyticsEventId(eventId)).toBe(true);
  });

  it("generates valid batch identifiers", () => {
    const batchId = createAnalyticsBatchId(sessionId);
    expect(batchId).toMatch(/^batch_[A-Za-z0-9:_-]{16,160}$/u);
    expect(isValidAnalyticsBatchId(batchId)).toBe(true);
  });

  it("generates valid watch session identifiers", () => {
    const watchSessionId = createAnalyticsWatchSessionId(sessionId);
    expect(watchSessionId).toMatch(/^watch_[A-Za-z0-9:_-]{16,160}$/u);
    expect(isValidAnalyticsWatchSessionId(watchSessionId)).toBe(true);
  });

  it("generates unique identifiers", () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(createAnalyticsEventId(sessionId));
    }
    expect(ids.size).toBe(100);
  });
});
