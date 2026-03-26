import { describe, expect, it } from "vitest";
import { buildSupportThreadKey } from "@/lib/support-readiness";

describe("buildSupportThreadKey", () => {
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
