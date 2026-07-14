import { describe, expect, it } from "vitest";

import {
  getCreatorSubscriptionOutcomeCopy,
  getCreatorSubscriptionProblemCopy,
  getNotificationProblemCopy,
  getPageProblemCopy,
  getPaymentProblemCopy,
  getUnlockProblemCopy,
} from "@/lib/problem-state-copy";

const BANNED_VISIBLE_COPY = [
  "failed closed",
  "polled route snapshot",
  "realtime lane",
  "canonical rollup",
  "canonical authenticated events",
  "backend cache path",
  "analytics_aggregate",
  "truth score",
  "pipeline health fail",
  "module coverage fail",
  "stale validated backend cache",
  "something went wrong",
];

function expectVisibleCopyIsHuman(headline: string, body: string) {
  const visible = `${headline} ${body}`.toLowerCase();
  for (const phrase of BANNED_VISIBLE_COPY) {
    expect(visible).not.toContain(phrase);
  }
  expect(headline.length).toBeLessThanOrEqual(80);
  expect(body.length).toBeLessThanOrEqual(120);
}

describe("problem-state copy", () => {
  it("keeps Fan Pass materialization and historical receipts distinct from a new success", () => {
    expect(getCreatorSubscriptionProblemCopy({ code: "materializer_missing" })).toContain("will not be charged twice");

    expect(getCreatorSubscriptionOutcomeCopy({
      requestedAction: "subscribe",
      action: "cancel",
      code: "historical_receipt",
      subscriptionStatus: "canceled",
      accessGranted: false,
      historicalReceipt: true,
      duplicatePrevented: true,
    })).toEqual({
      active: false,
      tone: "info",
      message: "An earlier Fan Pass payment is already recorded. This Fan Pass is canceled; start it again to reactivate.",
    });
  });

  it("keeps raw page error details out of visible copy", () => {
    const copy = getPageProblemCopy(new Error("analytics_aggregate backend cache path failed closed"));

    expect(copy.headline).toBe("Page could not load.");
    expect(copy.technicalReason).toContain("analytics_aggregate");
    expectVisibleCopyIsHuman(copy.headline, copy.body);
  });

  it("turns payment verification failures into clear wallet copy", () => {
    const copy = getPaymentProblemCopy("Payment package mismatch from PayPal capture");

    expect(copy.headline).toBe("Checkout could not be verified.");
    expect(copy.body).toContain("Your wallet was not changed");
    expectVisibleCopyIsHuman(copy.headline, copy.body);
  });

  it("turns missing payment completion into retry guidance", () => {
    const copy = getPaymentProblemCopy("Payment was not completed");

    expect(copy.headline).toBe("Payment was not completed.");
    expect(copy.actionLabel).toBe("Retry checkout");
    expectVisibleCopyIsHuman(copy.headline, copy.body);
  });

  it("turns insufficient unlock balance into refill guidance", () => {
    const copy = getUnlockProblemCopy("INSUFFICIENT_FUNDS:300:100");

    expect(copy.headline).toBe("More GumDrops are needed.");
    expect(copy.actionLabel).toBe("Refill GumDrops");
    expectVisibleCopyIsHuman(copy.headline, copy.body);
  });

  it("tells users locked Drop access was not charged on unlock failures", () => {
    const copy = getUnlockProblemCopy("Invalid drop configuration");

    expect(copy.headline).toBe("Drop cannot be unwrapped yet.");
    expect(copy.body).toContain("Your GumDrops were not charged");
    expectVisibleCopyIsHuman(copy.headline, copy.body);
  });

  it("turns notification fetch failures into a refreshable state", () => {
    const copy = getNotificationProblemCopy("Failed to load notifications");

    expect(copy.headline).toBe("Notifications are unavailable.");
    expect(copy.actionLabel).toBe("Refresh");
    expectVisibleCopyIsHuman(copy.headline, copy.body);
  });
});
