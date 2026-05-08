import { describe, expect, it } from "vitest";

import {
    buildChatPaidGdGateState,
    buildChatPaidGdLowBalanceReminderAfterPaidRefill,
    buildChatPaidGdLowBalanceReminderAfterSend,
    normalizeChatPaidGdLowBalanceReminderState,
    type ChatThreadPricing,
} from "@/lib/chat";

function pricing(overrides: Partial<ChatThreadPricing> = {}): ChatThreadPricing {
    return {
        textPriceGd: 1,
        imagePriceGd: 5,
        videoPriceGd: 10,
        purchasedOnly: true,
        purchasedBalanceGd: 0,
        subscriberFreeChatApplies: false,
        subscriberFreeChatEnabled: true,
        ...overrides,
    };
}

describe("chat paid GumDrops guidance", () => {
    it("gates user messaging when purchased balance is below the required minimum", () => {
        const gate = buildChatPaidGdGateState({
            viewerRole: "user",
            pricing: pricing({ purchasedBalanceGd: 0, textPriceGd: 1 }),
        });

        expect(gate).toMatchObject({
            gated: true,
            purchasedBalanceGd: 0,
            requiredMinPaidGd: 1,
            paidGdShortfall: 1,
        });
    });

    it("does not gate when the user has enough paid GumDrops", () => {
        const gate = buildChatPaidGdGateState({
            viewerRole: "user",
            pricing: pricing({ purchasedBalanceGd: 6, textPriceGd: 1 }),
        });

        expect(gate?.gated).toBe(false);
        expect(gate?.paidGdShortfall).toBe(0);
    });

    it("does not treat subscriber free chat as paid-gd gated", () => {
        const gate = buildChatPaidGdGateState({
            viewerRole: "user",
            pricing: pricing({ purchasedBalanceGd: 0, subscriberFreeChatApplies: true, textPriceGd: 0 }),
        });

        expect(gate).toMatchObject({
            gated: false,
            subscriberFreeChatApplies: true,
            requiredMinPaidGd: 0,
        });
    });

    it("does not gate creator replies", () => {
        const gate = buildChatPaidGdGateState({
            viewerRole: "creator",
            pricing: pricing({ purchasedBalanceGd: 0 }),
        });

        expect(gate).toMatchObject({
            gated: false,
            creatorViewerBypass: true,
            requiredMinPaidGd: 0,
        });
    });

    it("marks the low-balance reminder ineligible after sending once", () => {
        const current = normalizeChatPaidGdLowBalanceReminderState(null);
        const next = buildChatPaidGdLowBalanceReminderAfterSend({
            current,
            paidBalanceGd: 12,
            remindedAt: 123456,
        });

        expect(next).toMatchObject({
            eligibleAgain: false,
            lastRemindedAt: 123456,
            lastRemindedPaidBalanceGd: 12,
        });
    });

    it("resets the low-balance reminder only when paid balance reaches 100 or more", () => {
        const current = normalizeChatPaidGdLowBalanceReminderState({
            eligibleAgain: false,
            reminderCycleId: "old-cycle",
            lastRemindedAt: 42,
            lastRemindedPaidBalanceGd: 7,
        });

        const noReset = buildChatPaidGdLowBalanceReminderAfterPaidRefill({
            current,
            previousPaidBalanceGd: 20,
            nextPaidBalanceGd: 99,
            reminderCycleId: "paid_refill:test-99",
        });
        const reset = buildChatPaidGdLowBalanceReminderAfterPaidRefill({
            current,
            previousPaidBalanceGd: 20,
            nextPaidBalanceGd: 140,
            reminderCycleId: "paid_refill:test-140",
        });

        expect(noReset.eligibleAgain).toBe(false);
        expect(noReset.reminderCycleId).toBe("paid_refill:test-99");
        expect(reset.eligibleAgain).toBe(true);
        expect(reset.reminderCycleId).toBe("paid_refill:test-140");
        expect(reset.resetAtPaidBalanceGd).toBe(140);
    });
});
