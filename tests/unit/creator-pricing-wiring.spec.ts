import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  resolveCreatorBookingPricing,
  resolveCreatorFanPassPricing,
  resolveCreatorPricing,
  resolveCreatorRequestPricing,
} from "@/lib/creator-settings/creator-pricing-resolver";
import { CREATOR_SUBSCRIPTION_MIN_GD, DEFAULT_CREATOR_SETTINGS } from "@/lib/creator-experiences";

describe("creator pricing wiring", () => {
  it("resolves creator-configured Fan Pass pricing as paid-only source truth", () => {
    const pricing = resolveCreatorFanPassPricing({
      subscriptionsEnabled: true,
      subscriptionPriceGd: 900,
    });

    expect(pricing).toMatchObject({
      kind: "fan_pass",
      enabled: true,
      priceGd: 900,
      source: "creator_settings",
      paidOnly: true,
    });
  });

  it("marks missing settings as legacy defaults without showing zero price", () => {
    const pricing = resolveCreatorPricing(null);

    expect(pricing.fanPass).toMatchObject({
      enabled: DEFAULT_CREATOR_SETTINGS.subscriptionsEnabled,
      priceGd: CREATOR_SUBSCRIPTION_MIN_GD,
      source: "legacy_default",
      paidOnly: true,
    });
    expect(pricing.requests[0]).toMatchObject({
      source: "legacy_default",
      paidOnly: true,
    });
  });

  it("resolves request and booking prices from creator settings", () => {
    const settings = {
      customRequestsEnabled: true,
      bookingsEnabled: true,
      requestCategories: [{ id: "video", label: "Video", priceGd: 1200, enabled: true }],
      phoneRatePerMinuteGd: 700,
      videoRatePerMinuteGd: 1500,
      videoSubscriberDiscountPercent: 20,
    };

    expect(resolveCreatorRequestPricing(settings, "video")).toMatchObject({
      kind: "request",
      id: "video",
      priceGd: 1200,
      source: "creator_settings",
      paidOnly: true,
    });
    expect(resolveCreatorBookingPricing(settings, {
      serviceType: "video",
      durationMinutes: 10,
      subscriptionActive: true,
    })).toMatchObject({
      kind: "booking",
      serviceType: "video",
      priceGd: 12000,
      ratePerMinuteGd: 1200,
      source: "creator_settings",
      paidOnly: true,
    });
  });

  it("keeps disabled features unavailable for purchase", () => {
    expect(resolveCreatorFanPassPricing({ subscriptionsEnabled: false })).toMatchObject({
      enabled: false,
      disabledReason: "fan_pass_disabled",
    });
    expect(resolveCreatorRequestPricing({ customRequestsEnabled: false }, "custom-photo")).toMatchObject({
      enabled: false,
      disabledReason: "requests_disabled",
    });
  });

  it("keeps creator experience routes on purchased-only spend and resolver-backed prices", () => {
    const root = process.cwd();
    const subscriptionsRoute = readFileSync(join(root, "src/app/api/creator/subscriptions/route.ts"), "utf8");
    const requestsRoute = readFileSync(join(root, "src/app/api/creator/requests/route.ts"), "utf8");
    const bookingsRoute = readFileSync(join(root, "src/app/api/creator/bookings/route.ts"), "utf8");
    const panel = readFileSync(join(root, "src/components/Creators/CreatorExperiencesPanel.tsx"), "utf8");
    const serverHelpers = readFileSync(join(root, "src/lib/server/creator-experiences.ts"), "utf8");

    expect(serverHelpers).toContain("purchasedOnly: true");
    expect(subscriptionsRoute).toContain("resolveCreatorFanPassPricing");
    expect(requestsRoute).toContain("resolveCreatorRequestPricing");
    expect(bookingsRoute).toContain("resolveCreatorBookingPricing");
    expect(panel).toContain("resolveCreatorPricing");
    expect(panel).not.toContain("@ {CREATOR_BOOKING_RATES.phone} GD/min");
  });
});
