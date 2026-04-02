import { describe, expect, it } from "vitest";

import { applyDropStatus, isDropActiveNow, resolveDropStatusFromTiming } from "@/lib/drop-status";

describe("drop status timing resolution", () => {
    it("marks a future drop as scheduled", () => {
        expect(resolveDropStatusFromTiming({
            validFrom: 2_000,
            validUntil: 3_000,
            status: "active",
        }, 1_000)).toBe("scheduled");
    });

    it("marks a drop as active once the start time has passed and the end time has not", () => {
        expect(resolveDropStatusFromTiming({
            validFrom: 1_000,
            validUntil: 3_000,
            status: "scheduled",
        }, 2_000)).toBe("active");
    });

    it("marks a drop as expired once the end time has passed", () => {
        expect(resolveDropStatusFromTiming({
            validFrom: 1_000,
            validUntil: 3_000,
            status: "active",
        }, 3_000)).toBe("expired");
    });

    it("treats a started drop with no end time as active", () => {
        expect(resolveDropStatusFromTiming({
            validFrom: 1_000,
            status: "scheduled",
        }, 2_000)).toBe("active");
    });

    it("applies the resolved status onto the drop payload", () => {
        expect(applyDropStatus({
            id: "drop_1",
            title: "Drop 1",
            description: "Test drop",
            imageUrl: "https://example.com/drop.jpg",
            contentUrl: "",
            contentUrls: [],
            unlockCost: 10,
            validFrom: 1_000,
            validUntil: 3_000,
            status: "scheduled",
            totalUnlocks: 0,
        }, 2_000).status).toBe("active");
    });

    it("reports activity from the same timing rules used by the feed route", () => {
        expect(isDropActiveNow({
            validFrom: 1_000,
            validUntil: 3_000,
            status: "scheduled",
        }, 2_000)).toBe(true);
        expect(isDropActiveNow({
            validFrom: 4_000,
            validUntil: 5_000,
            status: "scheduled",
        }, 2_000)).toBe(false);
    });
});
