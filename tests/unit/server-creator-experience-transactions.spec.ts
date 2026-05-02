import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
    buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds,
    buildCreatorExperienceTransactionDebug,
} from "@/lib/server/creator-experiences";

describe("creator experience transaction helpers", () => {
    it("scopes client idempotency keys by action, fan, and creator", () => {
        const first = buildCreatorExperienceIdempotencyKey({
            action: "custom_request",
            userId: "fan_1",
            creatorId: "creator_1",
            clientKey: "same-client-key",
        });
        const second = buildCreatorExperienceIdempotencyKey({
            action: "custom_request",
            userId: "fan_2",
            creatorId: "creator_1",
            clientKey: "same-client-key",
        });

        expect(first).toContain("creator-experience:custom_request:fan_1:creator_1:");
        expect(second).toContain("creator-experience:custom_request:fan_2:creator_1:");
        expect(first).not.toBe(second);
    });

    it("builds deterministic user transaction and creator accrual IDs from the scoped key", () => {
        const idempotencyKey = buildCreatorExperienceIdempotencyKey({
            action: "live_time",
            userId: "fan_1",
            creatorId: "creator_1",
            clientKey: "booking-key",
        });

        expect(buildCreatorExperienceRecordIds({ action: "live_time", idempotencyKey }))
            .toEqual(buildCreatorExperienceRecordIds({ action: "live_time", idempotencyKey }));
    });

    it("reports creator and platform share debug fields from the configured revenue share", () => {
        expect(buildCreatorExperienceTransactionDebug({
            userTransactionId: "txn_1",
            creatorAccrualId: "accrual_1",
            creatorExperienceRecordId: "experience_1",
            priceGd: 1000,
            idempotencyKey: "key_1",
            duplicatePrevented: false,
        })).toMatchObject({
            platformShareGd: 500,
            creatorShareGd: 500,
            priceGd: 1000,
        });
    });
});
