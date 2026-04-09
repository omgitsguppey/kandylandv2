import { describe, expect, it } from "vitest";

import {
    buildChatSendErrorMessage,
    buildChatSendWarningMessage,
} from "@/lib/chat-send-feedback";

describe("chat send feedback", () => {
    it("maps known send error codes to user-facing messages", () => {
        expect(buildChatSendErrorMessage({ errorCode: "forbidden" })).toBe(
            "You are not allowed to send messages in this thread.",
        );
        expect(buildChatSendErrorMessage({ errorCode: "creator_unavailable" })).toBe(
            "Messaging is unavailable for this creator right now.",
        );
        expect(buildChatSendErrorMessage({ errorCode: "invalid_attachment" })).toBe(
            "This message type needs a valid attachment before it can be sent.",
        );
    });

    it("falls back to the server error message when no known code exists", () => {
        expect(buildChatSendErrorMessage({ error: "Something specific failed." })).toBe(
            "Something specific failed.",
        );
    });

    it("surfaces post-send tracking degradation as a warning", () => {
        expect(buildChatSendWarningMessage([
            { code: "post_send_tracking_failure", detail: "diagnostic failed" },
        ])).toBe(
            "Message sent, but tracking degraded after delivery. Admin debug will show the warning.",
        );
    });

    it("returns null when there are no warnings", () => {
        expect(buildChatSendWarningMessage([])).toBeNull();
        expect(buildChatSendWarningMessage(null)).toBeNull();
    });
});
