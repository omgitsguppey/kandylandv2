import { describe, expect, it } from "vitest";

import { ADMIN_TELEMETRY_LOG_EVENT_NAMES } from "@/lib/telemetry-catalog";

describe("admin telemetry log event names", () => {
  it("includes launch-critical current and legacy event names for historical recovery", () => {
    for (const eventName of [
      "drop_preview",
      "drop_preview_opened",
      "view_drop_details",
      "drop_unlocked",
      "drop_unwrapped",
      "unlock_drop_success",
      "entitlement_granted",
      "drop_share_copied",
      "begin_checkout",
      "gumdrops_purchase_completed",
      "creator_followed",
      "daily_checkin_claimed",
      "daily_check_in_claim",
    ]) {
      expect(ADMIN_TELEMETRY_LOG_EVENT_NAMES).toContain(eventName);
    }
  });
});
