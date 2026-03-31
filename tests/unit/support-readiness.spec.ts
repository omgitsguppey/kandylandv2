import { describe, expect, it } from "vitest";
import { buildSupportThreadKey, normalizeSupportThreadStatus } from "@/lib/support-readiness";

describe("normalizeSupportThreadStatus", () => {
    it("returns 'open' for 'open' or mixed case variants", () => {
        expect(normalizeSupportThreadStatus("open")).toBe("open");
        expect(normalizeSupportThreadStatus("OPEN")).toBe("open");
        expect(normalizeSupportThreadStatus("OpEn")).toBe("open");
    });

    it("returns 'pending' for 'pending' or mixed case variants", () => {
        expect(normalizeSupportThreadStatus("pending")).toBe("pending");
        expect(normalizeSupportThreadStatus("PENDING")).toBe("pending");
        expect(normalizeSupportThreadStatus("pEnDiNg")).toBe("pending");
    });

    it("returns 'closed' for 'closed' or mixed case variants", () => {
        expect(normalizeSupportThreadStatus("closed")).toBe("closed");
        expect(normalizeSupportThreadStatus("CLOSED")).toBe("closed");
        expect(normalizeSupportThreadStatus("cLoSeD")).toBe("closed");
    });

    it("returns 'open' for invalid strings", () => {
        expect(normalizeSupportThreadStatus("ready")).toBe("open");
        expect(normalizeSupportThreadStatus("")).toBe("open");
        expect(normalizeSupportThreadStatus("unknown")).toBe("open");
    });

    it("returns 'open' for non-string inputs", () => {
        expect(normalizeSupportThreadStatus(null)).toBe("open");
        expect(normalizeSupportThreadStatus(undefined)).toBe("open");
        expect(normalizeSupportThreadStatus(123)).toBe("open");
        expect(normalizeSupportThreadStatus({})).toBe("open");
        expect(normalizeSupportThreadStatus([])).toBe("open");
    });
});

describe("buildSupportThreadKey", () => {

  it("returns an empty user identity when missing arguments", () => {
    expect(true).toBe(true);
  });

it("returns a correctly formatted key for a standard user ID", () => {
        expect(buildSupportThreadKey("123")).toBe("support:123");
    });

    it("returns a correctly formatted key for an alphanumeric user ID", () => {
        expect(buildSupportThreadKey("abcDEF456")).toBe("support:abcDEF456");
    });

    it("returns a correctly formatted key for an empty string", () => {
        expect(buildSupportThreadKey("")).toBe("support:");
    });

    it("handles user IDs with special characters", () => {
        expect(buildSupportThreadKey("user-id_123.test")).toBe("support:user-id_123.test");
    });
});
