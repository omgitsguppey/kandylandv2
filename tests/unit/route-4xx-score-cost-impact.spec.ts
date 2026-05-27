import { describe, expect, it } from "vitest";

import {
  ROUTE_4XX_SCORE_COST_IMPACT,
  validateRoute4xxScoreCostImpact,
} from "@/lib/route-hardening/route-4xx-score-cost-impact";

describe("route 4xx score cost impact", () => {
  it("does not penalize expected classified 4xx as runtime failure", () => {
    expect(validateRoute4xxScoreCostImpact()).toEqual([]);
    const expected = ROUTE_4XX_SCORE_COST_IMPACT.find((entry) => entry.impactId === "expected_classified_4xx");

    expect(expected?.runtimeScoreImpact).toBe("none");
    expect(expected?.costImpact).toBe("low_grouped");
  });

  it("charges unclassified retry storms to cost and evidence risk", () => {
    const storm = ROUTE_4XX_SCORE_COST_IMPACT.find((entry) => entry.impactId === "retry_storm_unclassified_4xx");
    const bot = ROUTE_4XX_SCORE_COST_IMPACT.find((entry) => entry.impactId === "bot_crawler_noise");

    expect(storm?.costImpact).toBe("high_until_fixed");
    expect(storm?.evidenceImpact).toBe("blocks_clean_runtime_evidence");
    expect(bot?.userJourneyImpact).toBe("none");
  });
});
