import { describe, expect, it } from "vitest";

import type { ChatThreadDetail, ChatThreadPricing, ChatThreadRecord } from "@/lib/chat";
import { reconcileChatSendSuccess } from "@/lib/chat-send-realtime";
import type { CreatorMessage } from "@/types/db";

function buildThread(overrides: Partial<ChatThreadRecord> = {}): ChatThreadRecord {
    return {
        id: "creator_creator-1__user_user-1",
        creatorId: "creator-1",
        userId: "user-1",
        counterpartId: "creator-1",
        counterpartDisplayName: "Creator One",
        counterpartUsername: "creatorone",
        counterpartPhotoURL: null,
        viewerRole: "user",
        unreadCount: 0,
        readAt: 30,
        counterpartReadAt: 10,
        lastMessageAt: 30,
        lastMessagePreview: "Older message",
        messageCount: 1,
        subscriberChatFree: false,
        ...overrides,
    };
}

function buildMessage(overrides: Partial<CreatorMessage> = {}): CreatorMessage {
    return {
        id: "message-1",
        threadId: "creator_creator-1__user_user-1",
        creatorId: "creator-1",
        userId: "user-1",
        senderRole: "user",
        messageKind: "text",
        text: "hello",
        costGd: 1,
        createdAt: 40,
        ...overrides,
    };
}

function buildPricing(overrides: Partial<ChatThreadPricing> = {}): ChatThreadPricing {
    return {
        textPriceGd: 1,
        imagePriceGd: 5,
        videoPriceGd: 10,
        purchasedOnly: true,
        purchasedBalanceGd: 9,
        subscriberFreeChatApplies: false,
        subscriberFreeChatEnabled: true,
        ...overrides,
    };
}

function buildDetail(overrides: Partial<ChatThreadDetail> = {}): ChatThreadDetail {
    return {
        thread: buildThread(),
        messages: [
            buildMessage({
                id: "optimistic-1",
                text: "pending",
                createdAt: 35,
            }),
        ],
        pricing: buildPricing({
            purchasedBalanceGd: 10,
        }),
        threadExists: true,
        ...overrides,
    };
}

describe("reconcileChatSendSuccess", () => {
    it("replaces an optimistic message with the persisted server message", () => {
        const result = reconcileChatSendSuccess(buildDetail(), {
            optimisticMessageId: "optimistic-1",
            thread: buildThread({
                lastMessageAt: 40,
                lastMessagePreview: "hello",
            }),
            message: buildMessage({
                id: "message-123",
                text: "hello",
            }),
            pricing: buildPricing({
                purchasedBalanceGd: 9,
            }),
        });

        expect(result?.messages).toHaveLength(1);
        expect(result?.messages[0]?.id).toBe("message-123");
        expect(result?.thread.lastMessagePreview).toBe("hello");
        expect(result?.pricing.purchasedBalanceGd).toBe(9);
    });

    it("appends a persisted server message when no optimistic placeholder exists", () => {
        const result = reconcileChatSendSuccess(buildDetail({
            messages: [],
        }), {
            thread: buildThread({
                lastMessageAt: 40,
                lastMessagePreview: "hello",
            }),
            message: buildMessage({
                id: "message-123",
                text: "hello",
            }),
        });

        expect(result?.messages).toHaveLength(1);
        expect(result?.messages[0]?.id).toBe("message-123");
    });
});
