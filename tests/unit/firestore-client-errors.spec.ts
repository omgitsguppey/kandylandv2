import { describe, expect, it } from "vitest";

import {
    analyzeFirestoreClientIssue,
    buildFirestoreClientFallbackMessage,
    buildFirestoreClientIssueDetail,
    classifyFirestoreClientRetry,
} from "@/lib/firestore-client-errors";

describe("firestore client error helpers", () => {
    it("parses nested Firestore internal assertion ids and sdk version", () => {
        const error = new Error("FIRESTORE (12.11.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {\"Pc\":\"FIRESTORE (12.11.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9) CONTEXT: {\\\"ve\\\":-1}\"}");

        const result = analyzeFirestoreClientIssue(error);

        expect(result).toMatchObject({
            kind: "internal_assertion",
            sdkVersion: "12.11.0",
            primaryAssertionId: "b815",
        });
        expect(result?.assertionIds).toEqual(["b815", "ca9"]);
    });

    it("builds explicit issue detail and a user-facing fallback message", () => {
        const error = new Error("FIRESTORE (12.11.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)");

        expect(buildFirestoreClientIssueDetail(error, { scope: "chat thread list" })).toEqual(expect.objectContaining({
            firestoreIssueKind: "internal_assertion",
            firestorePrimaryAssertionId: "b815",
            scope: "chat thread list",
        }));
        expect(buildFirestoreClientFallbackMessage("Chat", error)).toContain("live updates paused");
    });
});

describe("Firestore read-listener retry classification", () => {
    it.each(["permission-denied", "unauthenticated", "invalid-argument", "failed-precondition"])("settles %s without replaying the same failed source", (code) => {
        expect(classifyFirestoreClientRetry(Object.assign(new Error("network-looking message"), { code }))).toEqual({ retryable: false, reason: "permanent" });
    });

    it("normalizes the SDK prefix and refuses quota or cancellation loops", () => {
        expect(classifyFirestoreClientRetry({ code: "firestore/permission-denied" }).retryable).toBe(false);
        expect(classifyFirestoreClientRetry({ code: "resource-exhausted" })).toEqual({ retryable: false, reason: "quota_recovery_required" });
        expect(classifyFirestoreClientRetry(new DOMException("Cancelled", "AbortError"))).toEqual({ retryable: false, reason: "cancelled" });
    });

    it("permits finite recovery for a service outage or uncoded transport failure", () => {
        expect(classifyFirestoreClientRetry({ code: "unavailable" })).toEqual({ retryable: true, reason: "transient" });
        expect(classifyFirestoreClientRetry(new TypeError("Failed to fetch")).retryable).toBe(true);
        expect(classifyFirestoreClientRetry({ code: "unexpected-code" }).retryable).toBe(false);
    });

    it("settles internal assertion failures even when a transient code accompanies them", () => {
        const error = Object.assign(new Error("FIRESTORE (12.11.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)"), { code: "unavailable" });
        expect(classifyFirestoreClientRetry(error)).toEqual({ retryable: false, reason: "client_state_recovery_required" });
    });

    it("keeps fallback copy truthful after permanent or exhausted recovery", () => {
        expect(buildFirestoreClientFallbackMessage("Drops", { code: "permission-denied" })).toContain("paused");
        expect(buildFirestoreClientFallbackMessage("Drops", { code: "firestore/resource-exhausted" })).toContain("quota limits");
        expect(buildFirestoreClientFallbackMessage("Drops", { code: "unavailable" })).not.toContain("attempting restoration");
    });
});
