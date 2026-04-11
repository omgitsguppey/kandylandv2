import { describe, expect, it } from "vitest";

import { buildChatSoftSealScope, softOpenChatValue, softSealChatValue } from "@/lib/chat-soft-seal";

describe("chat soft seal", () => {
    it("soft-seals and reopens values for the same thread scope", () => {
        const scope = buildChatSoftSealScope("creator_creator-1__user_user-1", "text");
        const sealed = softSealChatValue(scope, "hello there");

        expect(sealed).not.toBe("hello there");
        expect(sealed?.startsWith("soft1:")).toBe(true);
        expect(softOpenChatValue(scope, sealed)).toBe("hello there");
    });

    it("leaves legacy plaintext values readable", () => {
        const scope = buildChatSoftSealScope("creator_creator-1__user_user-1", "preview");
        expect(softOpenChatValue(scope, "older plaintext preview")).toBe("older plaintext preview");
    });

    it("does not decode with the wrong scope", () => {
        const sealed = softSealChatValue(buildChatSoftSealScope("thread-a", "text"), "private copy");
        const wrongScopeValue = softOpenChatValue(buildChatSoftSealScope("thread-b", "text"), sealed);

        expect(wrongScopeValue).not.toBe("private copy");
    });
});
