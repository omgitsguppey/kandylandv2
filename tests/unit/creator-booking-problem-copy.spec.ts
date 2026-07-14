import { describe, expect, it } from "vitest";

import { getCreatorBookingProblemCopy, getCreatorSubscriptionProblemCopy } from "@/lib/problem-state-copy";

describe("creator booking problem copy", () => {
  it("maps expected booking failure codes to safe user-facing messages", () => {
    expect(getCreatorBookingProblemCopy({ code: "slot_outside_availability" }))
      .toBe("Pick a time inside the creator's booking hours.");
    expect(getCreatorBookingProblemCopy({ code: "creator_availability_not_configured" }))
      .toBe("This creator has not opened booking hours yet.");
    expect(getCreatorBookingProblemCopy({ code: "slot_already_booked" }))
      .toBe("That time was just booked. Pick another slot.");
    expect(getCreatorBookingProblemCopy({ code: "bookings_unavailable" }))
      .toBe("Bookings are not available for this creator right now.");
    expect(getCreatorBookingProblemCopy({ code: "creator_unavailable" }))
      .toBe("This creator is unavailable right now.");
    expect(getCreatorBookingProblemCopy({ code: "invalid_booking_request" }))
      .toBe("Check the booking details and try again.");
  });

  it("includes paid GumDrops shortfall when the route provides it", () => {
    expect(getCreatorBookingProblemCopy({
      code: "insufficient_paid_gumdrops",
      shortfallGd: 750,
    })).toBe("Open Wallet to add 750 more paid GD, then book this again.");
  });

  it("does not use internal server error as the fallback booking copy", () => {
    expect(getCreatorBookingProblemCopy({ code: "unexpected" }))
      .toBe("Booking could not be completed. Try again or report the issue.");
  });
});

describe("creator subscription problem copy", () => {
  it("maps expected Fan Pass failure codes to safe user-facing messages", () => {
    expect(getCreatorSubscriptionProblemCopy({
      code: "insufficient_paid_gumdrops",
      shortfallGd: 250,
    })).toBe("Open Wallet to add 250 more paid GD, then start this Fan Pass again.");
    expect(getCreatorSubscriptionProblemCopy({ code: "subscriptions_unavailable" }))
      .toBe("Fan Pass is not available for this creator right now.");
    expect(getCreatorSubscriptionProblemCopy({ code: "creator_unavailable" }))
      .toBe("This creator is unavailable right now.");
    expect(getCreatorSubscriptionProblemCopy({ code: "creator_or_user_not_found" }))
      .toBe("We could not find this creator.");
  });

  it("does not use internal server error as the fallback Fan Pass copy", () => {
    expect(getCreatorSubscriptionProblemCopy({ code: "unexpected" }))
      .toBe("Fan Pass could not be updated. Try again or report the issue.");
  });
});
