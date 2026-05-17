import { describe, expect, it } from "vitest";

import {
  resolveHumanErrorFromCode,
  resolveHumanErrorFromStatus,
  sanitizeErrorForUser,
} from "@/lib/errors/resolve-human-error";

describe("resolveHumanError", () => {
  it("resolves internal server errors to platform snag copy and bug reporting", () => {
    const descriptor = resolveHumanErrorFromCode("internal_server_error", "runtime");

    expect(descriptor.errorKey).toBe("internal_server_error");
    expect(descriptor.userTitle).toBe("This hit a platform snag");
    expect(descriptor.userMessage).toContain("Something ain't connected right on our side");
    expect(descriptor.bugReportEligible).toBe(true);
  });

  it("resolves unavailable booking slots to pick-another-slot copy", () => {
    const descriptor = resolveHumanErrorFromCode("slot_unavailable", "creator_booking");

    expect(descriptor.errorKey).toBe("slot_unavailable");
    expect(descriptor.userMessage).toMatch(/pick another open slot/i);
    expect(descriptor.primaryAction).toBe("choose_another_slot");
  });

  it("keeps paid GumDrops and reward balance doctrine in low-balance copy", () => {
    const descriptor = resolveHumanErrorFromCode("insufficient_paid_gumdrops", "creator_request");

    expect(descriptor.userMessage).toContain("paid GumDrops");
    expect(descriptor.userMessage).toContain("not reward balance");
    expect(descriptor.primaryAction).toBe("open_wallet");
  });

  it("does not expose Zod or raw JSON validation wording", () => {
    const descriptor = sanitizeErrorForUser(new Error("ZodError: Invalid JSON at path creatorId"));

    expect(descriptor.errorKey).toBe("validation_failed");
    expect(descriptor.userMessage).not.toMatch(/Zod|JSON|creatorId|path/i);
  });

  it("sanitizes Firebase provider messages", () => {
    const descriptor = sanitizeErrorForUser(new Error("FirebaseError: Missing or insufficient permissions."));

    expect(descriptor.userMessage).not.toMatch(/Firebase|permissions/i);
    expect(descriptor.bugReportEligible).toBe(true);
  });

  it("sanitizes PayPal provider messages", () => {
    const descriptor = sanitizeErrorForUser(new Error("PayPal REST error: INSTRUMENT_DECLINED"));

    expect(descriptor.userMessage).not.toMatch(/PayPal|INSTRUMENT_DECLINED/i);
    expect(descriptor.owner).toMatch(/provider|platform/);
  });

  it("maps HTTP status fallbacks to human descriptors", () => {
    expect(resolveHumanErrorFromStatus(500, "runtime").errorKey).toBe("internal_server_error");
    expect(resolveHumanErrorFromStatus(429, "runtime").errorKey).toBe("rate_limited");
    expect(resolveHumanErrorFromStatus(409, "creator_booking").errorKey).toBe("slot_unavailable");
  });
});
