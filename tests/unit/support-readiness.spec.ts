import { describe, it, expect } from "vitest";
import {
    buildSupportThreadKey,
    getSupportPrimaryHandle,
    normalizeSupportThreadStatus,
    describeSupportState,
} from "@/lib/support-readiness";

describe("support-readiness", () => {
    describe("buildSupportThreadKey", () => {
        it("builds the correct thread key for a given user ID", () => {
            expect(buildSupportThreadKey("user123")).toBe("support:user123");
        });

        it("handles empty strings", () => {
            expect(buildSupportThreadKey("")).toBe("support:");
        });
    });

    describe("getSupportPrimaryHandle", () => {
        it("returns @username if username is provided", () => {
            expect(getSupportPrimaryHandle({ username: "john_doe", uid: "123" })).toBe("@john_doe");
        });

        it("trims whitespace from username", () => {
            expect(getSupportPrimaryHandle({ username: "  john_doe  ", uid: "123" })).toBe("@john_doe");
        });

        it("falls back to displayName if username is missing or empty", () => {
            expect(getSupportPrimaryHandle({ displayName: "John Doe", uid: "123" })).toBe("John Doe");
            expect(getSupportPrimaryHandle({ username: "   ", displayName: "John Doe", uid: "123" })).toBe("John Doe");
        });

        it("trims whitespace from displayName", () => {
            expect(getSupportPrimaryHandle({ displayName: "  John Doe  ", uid: "123" })).toBe("John Doe");
        });

        it("falls back to email if username and displayName are missing or empty", () => {
            expect(getSupportPrimaryHandle({ email: "john@example.com", uid: "123" })).toBe("john@example.com");
            expect(getSupportPrimaryHandle({ username: "", displayName: "  ", email: "john@example.com", uid: "123" })).toBe("john@example.com");
        });

        it("trims whitespace from email", () => {
            expect(getSupportPrimaryHandle({ email: "  john@example.com  ", uid: "123" })).toBe("john@example.com");
        });

        it("falls back to uid if everything else is missing or empty", () => {
            expect(getSupportPrimaryHandle({ uid: "user123" })).toBe("user123");
            expect(getSupportPrimaryHandle({ username: "", displayName: "", email: "   ", uid: "user123" })).toBe("user123");
        });
    });

    describe("normalizeSupportThreadStatus", () => {
        it("returns valid statuses as-is", () => {
            expect(normalizeSupportThreadStatus("open")).toBe("open");
            expect(normalizeSupportThreadStatus("waiting_on_support")).toBe("waiting_on_support");
            expect(normalizeSupportThreadStatus("waiting_on_user")).toBe("waiting_on_user");
            expect(normalizeSupportThreadStatus("resolved")).toBe("resolved");
        });

        it("defaults to 'ready' for invalid or unknown values", () => {
            expect(normalizeSupportThreadStatus("invalid_status")).toBe("ready");
            expect(normalizeSupportThreadStatus("")).toBe("ready");
            expect(normalizeSupportThreadStatus(null)).toBe("ready");
            expect(normalizeSupportThreadStatus(undefined)).toBe("ready");
            expect(normalizeSupportThreadStatus(123)).toBe("ready");
        });
    });

    describe("describeSupportState", () => {
        it("returns correct description for 'waiting_on_support'", () => {
            expect(describeSupportState("waiting_on_support")).toEqual({
                label: "Waiting on support",
                description: "The user has an active support issue waiting on the support team.",
            });
        });

        it("returns correct description for 'waiting_on_user'", () => {
            expect(describeSupportState("waiting_on_user")).toEqual({
                label: "Waiting on user",
                description: "Support is waiting on more details from the user before continuing.",
            });
        });

        it("returns correct description for 'open'", () => {
            expect(describeSupportState("open")).toEqual({
                label: "Thread open",
                description: "A support conversation is active and ready for future live chat handoff.",
            });
        });

        it("returns correct description for 'resolved'", () => {
            expect(describeSupportState("resolved")).toEqual({
                label: "Recently resolved",
                description: "Past support activity exists, but there is no open thread right now.",
            });
        });

        it("returns correct description for 'ready' or other values", () => {
            const expectedDefault = {
                label: "Ready for support",
                description: "No live support thread exists yet, but identity and channels are ready for future in-site support.",
            };
            expect(describeSupportState("ready")).toEqual(expectedDefault);
            // Technically describeSupportState expects SupportThreadStatus, but we can test runtime fallback
            expect(describeSupportState("something_else" as any)).toEqual(expectedDefault);
        });
    });
});
