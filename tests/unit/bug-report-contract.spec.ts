import { describe, expect, it } from "vitest";

import {
  BUG_REPORT_DAILY_REWARD_CAP,
  BUG_REPORT_DUPLICATE_WINDOW_MS,
  BUG_REPORT_REWARD_GD,
  BUG_REPORT_REWARD_SOURCE,
  resolveBugReportRedirect,
  sanitizeBugReportContext,
} from "@/lib/errors/bug-report-contract";

describe("bug report contract", () => {
  it("pins reward amount, cap, and duplicate window", () => {
    expect(BUG_REPORT_REWARD_GD).toBe(10);
    expect(BUG_REPORT_DAILY_REWARD_CAP).toBe(3);
    expect(BUG_REPORT_DUPLICATE_WINDOW_MS).toBe(6 * 60 * 60 * 1000);
    expect(BUG_REPORT_REWARD_SOURCE).toBe("bug_report_reward");
  });

  it("strips sensitive context keys and trims noisy values", () => {
    const sanitized = sanitizeBugReportContext({
      route: "/drops",
      token: "secret-token",
      apiSecret: "do-not-keep",
      passwordHint: "nope",
      authorizationHeader: "Bearer raw",
      cookieValue: "session=raw",
      paypalCaptureId: "CAPTURE123",
      clientSecret: "client_secret_raw",
      okNumber: 12,
      longValue: "x".repeat(500),
    });

    expect(sanitized.route).toBe("/drops");
    expect(sanitized.okNumber).toBe(12);
    expect(String(sanitized.longValue).length).toBeLessThanOrEqual(240);
    expect(Object.keys(sanitized).join(" ")).not.toMatch(/token|secret|password|authorization|cookie|paypal|capture|clientSecret/i);
  });

  it("keeps redirects internal", () => {
    expect(resolveBugReportRedirect("/dashboard", "/drops")).toBe("/dashboard");
    expect(resolveBugReportRedirect("https://evil.example", "/drops")).toBe("/drops");
    expect(resolveBugReportRedirect("//evil.example", "/drops")).toBe("/drops");
    expect(resolveBugReportRedirect("javascript:alert(1)", undefined)).toBe("/");
  });
});
