import { describe, expect, it } from "vitest";

import {
    buildChatThreadRouteSyncTarget,
    getChatRealtimeRefreshPlan,
    getChatRealtimeRetryDelayMs,
    shouldReportChatRealtimeFailure,
} from "@/lib/chat-realtime";

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

    it("only syncs the chat route when the selected thread is missing from the URL", () => {
        expect(buildChatThreadRouteSyncTarget({
            currentSearch: "thread=thread_1",
            selectedThreadId: "thread_1",
        })).toBeNull();

        expect(buildChatThreadRouteSyncTarget({
            creatorId: "creator_1",
            currentSearch: "creator=creator_1",
            selectedThreadId: "thread_1",
        })).toBe("/dashboard/chat?creator=creator_1&thread=thread_1");
    });

    it("builds a scoped refresh plan for degraded realtime lanes", () => {
        expect(getChatRealtimeRefreshPlan({
            degradedScopes: ["chat messages"],
            hasSelectedThread: true,
        })).toEqual({
            refreshThreads: false,
            refreshSelectedThreadDetail: true,
        });

        expect(getChatRealtimeRefreshPlan({
            degradedScopes: ["chat thread list"],
            hasSelectedThread: true,
        })).toEqual({
            refreshThreads: true,
            refreshSelectedThreadDetail: false,
        });
    });

    it("rate limits repeated realtime failure reports", () => {
        expect(shouldReportChatRealtimeFailure(null, 1_000)).toBe(true);
        expect(shouldReportChatRealtimeFailure(1_000, 10_000)).toBe(false);
        expect(shouldReportChatRealtimeFailure(1_000, 40_000)).toBe(true);
    });
});
