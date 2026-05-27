import { describe, expect, it } from "vitest";

import {
  BOT_CRAWLER_4XX_POLICY,
  validateBotCrawler4xxPolicy,
} from "@/lib/route-hardening/bot-crawler-4xx-policy";

describe("bot crawler 4xx policy", () => {
  it("keeps cheap bot noise out of user product scoring", () => {
    expect(validateBotCrawler4xxPolicy()).toEqual([]);
    const cheapNoise = BOT_CRAWLER_4XX_POLICY.filter((entry) => entry.productJourneyImpact === "none");

    expect(cheapNoise.length).toBeGreaterThan(0);
    expect(cheapNoise.every((entry) => entry.diagnosticPolicy.writeMode === "sampled_hourly_rollup")).toBe(true);
    expect(cheapNoise.every((entry) => entry.countsAsUserProductError === false)).toBe(true);
  });

  it("keeps suspicious probes visible without raw spam", () => {
    const probes = BOT_CRAWLER_4XX_POLICY.filter((entry) => entry.securityVisibility === "debug_security_grouped");

    expect(probes.length).toBeGreaterThan(0);
    expect(probes.every((entry) => entry.diagnosticPolicy.rawPayloadAllowed === false)).toBe(true);
  });
});
