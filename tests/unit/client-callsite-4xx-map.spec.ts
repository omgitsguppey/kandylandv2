import { describe, expect, it } from "vitest";

import {
  CLIENT_CALLSITE_4XX_MAP,
  validateClientCallsite4xxMap,
} from "@/lib/route-hardening/client-callsite-4xx-map";

describe("client callsite 4xx map", () => {
  it("prevents permanent client errors from becoming retry loops", () => {
    expect(validateClientCallsite4xxMap()).toEqual([]);
    expect(CLIENT_CALLSITE_4XX_MAP.some((entry) => entry.callsitePath === "src/lib/authFetch.ts")).toBe(true);

    for (const entry of CLIENT_CALLSITE_4XX_MAP) {
      expect(entry.retryPolicy.permanent4xxRetryable).toBe(false);
      expect(entry.errorDisplayState.safeCopy.length).toBeGreaterThan(8);
      expect(entry.telemetryEvent).toMatch(/failed|denied|unavailable|expired/u);
      expect(entry.diagnosticPolicy.writeMode).toBe("hourly_rollup");
    }
  });

  it("clears stale state for unavailable resources and deep-link failures", () => {
    const staleRisks = CLIENT_CALLSITE_4XX_MAP.filter(
      (entry) => entry.staleStateRisk !== "none" || entry.deepLinkRisk !== "none",
    );

    expect(staleRisks.length).toBeGreaterThan(0);
    expect(staleRisks.every((entry) => entry.retryPolicy.clearStaleState === true)).toBe(true);
  });
});
