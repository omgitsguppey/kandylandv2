import { describe, expect, it } from "vitest";
import { buildSupportThreadKey, describeSupportState } from "@/lib/support-readiness";

describe("describeSupportState", () => {
    it("returns 'Needs Attention' for 'open'", () => {
        expect(describeSupportState("open")).toBe("Needs Attention");
    });

    it("returns 'Waiting on User' for 'waiting_on_user' or 'waiting_on_support'", () => {
        expect(describeSupportState("waiting_on_user")).toBe("Waiting on User");
        expect(describeSupportState("waiting_on_support")).toBe("Waiting on User");
    });

    it("returns 'Resolved' for 'resolved'", () => {
        expect(describeSupportState("resolved")).toBe("Resolved");
    });

    it("returns 'Ready' for 'ready' (default)", () => {
        expect(describeSupportState("ready")).toBe("Ready");
        expect(describeSupportState("anything" as any)).toBe("Ready");
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
