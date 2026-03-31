import { describe, expect, it } from "vitest";
import { buildSupportThreadKey, describeSupportState, getSupportPrimaryHandle } from "@/lib/support-readiness";

describe("getSupportPrimaryHandle", () => {
    it("returns @handle if handle is present", () => {
        expect(getSupportPrimaryHandle({ handle: "johndoe", email: "john@example.com", displayName: "John Doe" })).toBe("@johndoe");
        expect(getSupportPrimaryHandle({ handle: "johndoe" })).toBe("@johndoe");
    });

    it("returns email if handle is missing but email is present", () => {
        expect(getSupportPrimaryHandle({ email: "john@example.com", displayName: "John Doe" })).toBe("john@example.com");
        expect(getSupportPrimaryHandle({ email: "john@example.com" })).toBe("john@example.com");
        expect(getSupportPrimaryHandle({ handle: null, email: "john@example.com" })).toBe("john@example.com");
    });

    it("returns displayName if handle and email are missing but displayName is present", () => {
        expect(getSupportPrimaryHandle({ displayName: "John Doe" })).toBe("John Doe");
        expect(getSupportPrimaryHandle({ handle: null, email: null, displayName: "John Doe" })).toBe("John Doe");
    });

    it("returns 'Anonymous User' if handle, email, and displayName are all missing or null", () => {
        expect(getSupportPrimaryHandle({})).toBe("Anonymous User");
        expect(getSupportPrimaryHandle({ handle: null, email: null, displayName: null })).toBe("Anonymous User");
    });
});

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
        expect(buildSupportThreadKey(undefined as unknown as string)).toBe("support:undefined");
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
