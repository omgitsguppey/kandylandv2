import { afterEach, describe, expect, it, vi } from "vitest";

import { generateSecureClientId, generateSecureClientToken } from "@/lib/client-random";

describe("client-random", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("uses crypto.randomUUID when available", () => {
        const randomUuid = vi.fn(() => "01234567-89ab-cdef-0123-456789abcdef");
        const getRandomValues = vi.fn();
        vi.stubGlobal("crypto", { randomUUID: randomUuid, getRandomValues });

        expect(generateSecureClientId()).toBe("0123456789abcdef0123456789abcdef");
        expect(generateSecureClientToken(8)).toBe("01234567");
        expect(randomUuid).toHaveBeenCalledTimes(2);
        expect(getRandomValues).not.toHaveBeenCalled();
    });

    it("falls back to crypto.getRandomValues without ever touching Math.random", () => {
        const mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
            throw new Error("Math.random should not be used");
        });
        const getRandomValues = vi.fn((buffer: Uint8Array) => {
            buffer.set([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);
            return buffer;
        });
        vi.stubGlobal("crypto", { getRandomValues });

        expect(generateSecureClientId()).toBe("00112233445566778899aabbccddeeff");
        expect(generateSecureClientToken(8)).toBe("00112233");
        expect(getRandomValues).toHaveBeenCalledTimes(2);
        expect(mathRandomSpy).not.toHaveBeenCalled();
    });

    it("rejects invalid token lengths", () => {
        expect(() => generateSecureClientToken(0)).toThrow("Secure client token length must be a positive integer.");
        expect(() => generateSecureClientToken(1.5)).toThrow("Secure client token length must be a positive integer.");
    });

    it("fails closed when secure randomness is unavailable", () => {
        const mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
            throw new Error("Math.random should not be used");
        });
        vi.stubGlobal("crypto", undefined);

        expect(() => generateSecureClientId()).toThrow("Cryptographically secure random number generation is not available in this environment.");
        expect(mathRandomSpy).not.toHaveBeenCalled();
    });
});
