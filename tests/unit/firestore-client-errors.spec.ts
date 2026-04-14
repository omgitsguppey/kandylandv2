import { describe, expect, it } from "vitest";

import {
    analyzeFirestoreClientIssue,
    buildFirestoreClientFallbackMessage,
    buildFirestoreClientIssueDetail,
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
        expect(buildFirestoreClientFallbackMessage("Chat", error)).toContain("fallback is active");
    });
});
