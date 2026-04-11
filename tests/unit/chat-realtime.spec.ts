import { describe, expect, it } from "vitest";

import { getChatRealtimeRetryDelayMs } from "@/lib/chat-realtime";

describe("chat realtime retry delays", () => {
    it("uses bounded backoff for reconnect attempts", () => {
        expect(getChatRealtimeRetryDelayMs(0)).toBe(1_500);
        expect(getChatRealtimeRetryDelayMs(1)).toBe(1_500);
        expect(getChatRealtimeRetryDelayMs(2)).toBe(3_000);
        expect(getChatRealtimeRetryDelayMs(3)).toBe(5_000);
        expect(getChatRealtimeRetryDelayMs(4)).toBe(10_000);
        expect(getChatRealtimeRetryDelayMs(5)).toBe(15_000);
        expect(getChatRealtimeRetryDelayMs(99)).toBe(15_000);
    });
});
