import { describe, expect, it } from "vitest";

import { CREATOR_FEATURE_PARITY_MAP } from "@/lib/creator/features/creator-feature-parity-map";

describe("creator feature parity map", () => {
  it("maps creator surfaces through source truth, status, user/admin consumers, telemetry, debug, and 4xx", () => {
    const requiredFeatures = [
      "creator_dashboard_stats",
      "creator_settings",
      "creator_monetization",
      "fan_pass",
      "creator_profile_timeline_broadcasts",
      "creator_drop_manager",
      "creator_chat_pricing_status",
      "creator_notifications",
      "creator_subscribers_fans",
      "creator_media_uploads",
    ];

    expect(CREATOR_FEATURE_PARITY_MAP.map((entry) => entry.featureId)).toEqual(expect.arrayContaining(requiredFeatures));

    for (const feature of CREATOR_FEATURE_PARITY_MAP) {
      expect(feature.sourceOfTruth.length).toBeGreaterThan(0);
      expect(feature.statusStates.length).toBeGreaterThan(0);
      expect(feature.userFacingConsumer.length).toBeGreaterThan(0);
      expect(feature.adminFacingConsumer.length).toBeGreaterThan(0);
      expect(feature.telemetry.length).toBeGreaterThan(0);
      expect(feature.debug.length).toBeGreaterThan(0);
      expect(feature.fourxxPolicy.length).toBeGreaterThan(0);
    }
  });
});
