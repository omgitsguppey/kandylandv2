import { describe, expect, it } from "vitest";

import { sanitizeFirestorePayload } from "@/lib/server/firestore-sanitize";

describe("sanitizeFirestorePayload", () => {
    it("removes undefined fields recursively without stripping null values", () => {
        expect(sanitizeFirestorePayload({
            text: "hello",
            assetUrl: undefined,
            nested: {
                keep: 1,
                drop: undefined,
                nullValue: null,
            },
            list: [
                "first",
                undefined,
                {
                    ok: true,
                    nope: undefined,
                },
            ],
        })).toEqual({
            text: "hello",
            nested: {
                keep: 1,
                nullValue: null,
            },
            list: [
                "first",
                {
                    ok: true,
                },
            ],
        });
    });
});
