import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { getSafeUrl } from "@/components/PromoCard";
import { generateSecureClientToken } from "@/lib/client-random";
import { buildSecurityPrngRedirectClosureReport, validateSecurityPrngRedirectClosureReport } from "@/lib/release-readiness/final-beta-exit-closure";

describe("security PRNG and redirect closure", () => {
  it("blocks protocol-relative and backslash redirect smuggling", () => {
    expect(getSafeUrl("//evil.com")).toBeUndefined();
    expect(getSafeUrl("\\evil.com")).toBeUndefined();
    expect(getSafeUrl("/\\evil.com")).toBeUndefined();
  });

  it("keeps sensitive ID helpers off Math.random", () => {
    for (const path of [
      "src/lib/auth-outcome-telemetry.ts",
      "src/lib/browser-notification-enrollment.ts",
      "src/lib/discovery-telemetry.ts",
    ]) {
      expect(readFileSync(join(process.cwd(), path), "utf8")).not.toContain("Math.random");
    }
  });

  it("uses crypto fallback for client tokens", () => {
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random must not be used for sensitive IDs.");
    });
    vi.stubGlobal("crypto", {
      getRandomValues: vi.fn((buffer: Uint8Array) => {
        buffer.fill(0xab);
        return buffer;
      }),
    });

    expect(generateSecureClientToken(12)).toBe("abababababab");
    expect(Math.random).not.toHaveBeenCalled();
  });

  it("validates closure with security PRs absent", () => {
    const report = buildSecurityPrngRedirectClosureReport(process.cwd(), []);
    expect(validateSecurityPrngRedirectClosureReport(report)).toEqual([]);
  });
});
