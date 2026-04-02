import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSecureClientId } from "@/lib/client-random";

describe("generateSecureClientId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "01234567-89ab-cdef-0123-456789abcdef"),
    });

    expect(generateSecureClientId()).toBe("01234567-89ab-cdef-0123-456789abcdef");
  });

  it("falls back to crypto.getRandomValues without touching Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random should never be used for client identifiers.");
    });

    vi.stubGlobal("crypto", {
      getRandomValues: vi.fn((buffer: Uint8Array) => {
        buffer.set([
          0x00, 0x11, 0x22, 0x33,
          0x44, 0x55, 0x66, 0x77,
          0x88, 0x99, 0xaa, 0xbb,
          0xcc, 0xdd, 0xee, 0xff,
        ]);
        return buffer;
      }),
    });

    expect(generateSecureClientId()).toBe("00112233445566778899aabbccddeeff");
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("throws when secure randomness is unavailable", () => {
    vi.stubGlobal("crypto", {});

    expect(() => generateSecureClientId()).toThrow(
      "Cryptographically secure random number generation is not available in this environment.",
    );
  });
});
