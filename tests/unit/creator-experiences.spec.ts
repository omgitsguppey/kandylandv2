import { afterEach, describe, expect, it, vi } from "vitest";

import {
    cryptoSafeId,
    isCreatorMessagingAvailable,
    normalizeCreatorAvailabilityWindows,
} from "@/lib/creator-experiences";

describe("creator-experiences", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("builds creator experience IDs from secure UUIDs", () => {
        vi.stubGlobal("crypto", {
            randomUUID: vi.fn(() => "01234567-89ab-cdef-0123-456789abcdef"),
        });

        expect(cryptoSafeId("window")).toBe("window_01234567");
    });

    it("generates missing availability window IDs with crypto.getRandomValues", () => {
        const mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
            throw new Error("Math.random should not be used");
        });
        const getRandomValues = vi.fn((buffer: Uint8Array) => {
            buffer.set([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);
            return buffer;
        });
        vi.stubGlobal("crypto", { getRandomValues });

        expect(normalizeCreatorAvailabilityWindows([{
            dayOfWeek: 2,
            startHour: 9,
            startMinute: 30,
            endHour: 11,
            endMinute: 15,
            serviceTypes: ["video"],
        }])).toEqual([{
            id: "window_00112233",
            dayOfWeek: 2,
            startHour: 9,
            startMinute: 30,
            endHour: 11,
            endMinute: 15,
            serviceTypes: ["video"],
        }]);
        expect(getRandomValues).toHaveBeenCalledTimes(1);
        expect(mathRandomSpy).not.toHaveBeenCalled();
    });

    it("treats messaging as unavailable for non-creators, disabled creators, and restricted creators", () => {
        expect(isCreatorMessagingAvailable({
            role: "creator",
            status: "active",
        })).toBe(true);

        expect(isCreatorMessagingAvailable({
            role: "user",
            status: "active",
        })).toBe(false);

        expect(isCreatorMessagingAvailable({
            role: "user",
            status: "active",
            creatorApplication: {
                approvalStatus: "creator_approved",
            },
        })).toBe(true);

        expect(isCreatorMessagingAvailable({
            role: "creator",
            status: "banned",
        })).toBe(false);

        expect(isCreatorMessagingAvailable({
            role: "creator",
            status: "active",
            creatorSettings: {
                messagingEnabled: false,
            } as any,
        })).toBe(false);

        expect(isCreatorMessagingAvailable({
            role: "creator",
            status: "active",
            creatorRestrictions: {
                messagingRestricted: true,
            } as any,
        })).toBe(false);
    });
});
