import { describe, expect, it } from "vitest";

import {
    shouldValidateDropPublishPayload,
    validateDropPublishState,
} from "@/lib/server/drop-mutations";
import { buildNotifyActiveDropsLifecyclePlan } from "../../shared/runtime/queue-runtime";
import type { Drop } from "@/types/db";

const VALID_CONTENT_DROP = {
    title: "Launch Drop",
    description: "A launch-ready Drop with all required fields.",
    imageUrl: "https://cdn.kandydrops.com/covers/launch.jpg",
    contentUrls: ["https://cdn.kandydrops.com/content/launch.mp4"],
    unlockCost: 25,
    validFrom: 1_800_000_000_000,
    validUntil: 1_800_086_400_000,
    type: "content",
};

describe("admin CMS drop workflow guardrails", () => {
    it("blocks publishing a content drop without cover, locked asset, or valid price", () => {
        const result = validateDropPublishState({
            title: "Bad Drop",
            description: "This description is long enough.",
            imageUrl: "",
            contentUrls: [],
            unlockCost: -1,
            validFrom: 1_800_000_000_000,
            type: "content",
        });

        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining([
            "Cover or public preview media is required before publishing.",
            "Gum Drop price must be zero or greater.",
            "At least one locked content asset is required for content drops.",
        ]));
    });

    it("allows an admin-created content drop to publish without a creator assignment", () => {
        const result = validateDropPublishState(VALID_CONTENT_DROP);

        expect(result).toEqual({ ok: true, errors: [] });
    });

    it("blocks protocol-relative action URLs before publishing promo and external drops", () => {
        for (const actionUrl of ["//evil.com/drop", "/\\evil.com/drop", "\\\\evil.com/drop", "https://kandydrops.invalid//evil.com"]) {
            const result = validateDropPublishState({
                ...VALID_CONTENT_DROP,
                type: "external",
                contentUrls: [],
                actionUrl,
            });

            expect(result.ok).toBe(false);
            expect(result.errors).toContain("Promo and external drops require a safe destination URL.");
        }
    });

    it("requires a creator assignment for subscriber-only and creator-submitted drops", () => {
        const subscriberOnly = validateDropPublishState({
            ...VALID_CONTENT_DROP,
            requiresActiveSubscription: true,
        });
        const creatorSubmitted = validateDropPublishState(VALID_CONTENT_DROP, { requireCreator: true });

        expect(subscriberOnly.ok).toBe(false);
        expect(subscriberOnly.errors).toContain("Subscriber-only drops require a creator assignment.");
        expect(creatorSubmitted.ok).toBe(false);
        expect(creatorSubmitted.errors).toContain("Creator assignment is required for creator-submitted drops.");
    });

    it("validates approval and partial edit payloads against the existing drop", () => {
        const existingDrop = {
            id: "drop_1",
            ...VALID_CONTENT_DROP,
            creatorId: "creator_1",
            autoQueueOnExpire: true,
            status: "scheduled",
            totalUnlocks: 0,
        } as Drop;

        expect(shouldValidateDropPublishPayload({ approvalStatus: "approved" })).toBe(true);
        expect(validateDropPublishState({ approvalStatus: "approved" }, { existingDrop }).ok).toBe(true);
        expect(validateDropPublishState({ title: "Edited Drop" }, { existingDrop }).ok).toBe(true);
    });

    it("generates one deterministic return-live notification for an eligible queued drop", () => {
        const plan = buildNotifyActiveDropsLifecyclePlan({
            scheduledDrops: [{
                id: "drop_returning",
                title: "Returning Drop",
                imageUrl: "https://cdn.kandydrops.com/covers/returning.jpg",
                validFrom: 1_800_000_000_000,
                validUntil: 1_800_086_400_000,
                activationCount: 1,
                status: "scheduled",
                autoQueueOnExpire: true,
            }],
            activeDrops: [],
            now: 1_800_000_000_001,
        });

        expect(plan.activationNotifications).toEqual([{
            dropId: "drop_returning",
            dropTitle: "Returning Drop",
            imageUrl: "https://cdn.kandydrops.com/covers/returning.jpg",
            isReturn: true,
            activationKey: "drop-activation:drop_returning:1800000000000",
        }]);
    });
});
