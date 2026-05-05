import { describe, expect, it } from "vitest";

import {
  buildDiscoveryImpressionKey,
  resolveDropsDiscoverySort,
  sanitizeDiscoveryQuery,
} from "@/lib/discovery-telemetry";

describe("discovery telemetry helpers", () => {
  it("sanitizes discovery search queries before telemetry dispatch", () => {
    expect(sanitizeDiscoveryQuery("  Sugar   drop  ")).toBe("Sugar drop");
    expect(sanitizeDiscoveryQuery("alice@example.com 555-123-4567")).toBe("[redacted_email] [redacted_phone]");
    expect(sanitizeDiscoveryQuery("https://example.com/search?q=secret#top")).toBe("https://example.com/search");
  });

  it("dedupes impressions by session, surface, and entity", () => {
    expect(buildDiscoveryImpressionKey({
      sessionId: "session-1",
      surface: "drops_page",
      entityId: "drop-1",
    })).toBe("session-1:drops_page:drop-1");
  });

  it("normalizes drops discovery sort labels from category state", () => {
    expect(resolveDropsDiscoverySort("New")).toBe("newest");
    expect(resolveDropsDiscoverySort("Ending Soon")).toBe("ending_soon");
    expect(resolveDropsDiscoverySort("Hottest")).toBe("hottest");
    expect(resolveDropsDiscoverySort("Sweet")).toBe("default");
  });
});
