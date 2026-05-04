import { describe, expect, it } from "vitest";

import {
  buildAdminReviewBadge,
  buildBehaviorRollupReviewBadge,
} from "@/lib/behavioral/review-badge-rules";

describe("admin review badge rules", () => {
  it("flags views without watch time for review", () => {
    const decision = buildAdminReviewBadge({
      truthState: "review",
      viewsExistButWatchMissing: true,
    });

    expect(decision?.severity).toBe("review");
    expect(decision?.reasonCode).toBe("watch_time_missing_despite_views");
  });

  it("flags revenue without purchases as critical", () => {
    const decision = buildAdminReviewBadge({
      truthState: "live",
      revenueExistsButPurchaseCountMissing: true,
    });

    expect(decision?.severity).toBe("critical");
    expect(decision?.reasonCode).toBe("revenue_missing_purchase_count");
  });

  it("keeps refreshing in wait state with a reason code", () => {
    const decision = buildAdminReviewBadge({
      truthState: "refreshing",
    });

    expect(decision?.severity).toBe("wait");
    expect(decision?.reasonCode).toBe("source_refreshing");
  });

  it("flags low-confidence personalization as critical", () => {
    const decision = buildBehaviorRollupReviewBadge({
      truthState: "live",
      personalizedOutputShown: true,
      behaviorRollup: {
        confidenceScore: 22,
        confidence: "insufficient",
        freshnessState: "live",
        issues: [],
      } as any,
    });

    expect(decision?.severity).toBe("critical");
    expect(decision?.reasonCode).toBe("personalized_output_low_confidence");
  });
});
