import { webcrypto } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
    clearDurableClientIdempotencyKey,
    generateSecureClientId,
    generateSecureClientToken,
    isDefinitiveClientRejectionStatus,
    resolveDurableClientIdempotencyKey,
    resolvePendingClientIdempotencyKey,
} from "@/lib/client-random";

function createMemorySessionStorage() {
    const values = new Map<string, string>();
    return {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
    } as Storage;
}

describe("client-random", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("uses crypto.randomUUID when available", () => {
        const randomUuid = vi.fn(() => "01234567-89ab-cdef-0123-456789abcdef");
        const getRandomValues = vi.fn();
        vi.stubGlobal("crypto", { randomUUID: randomUuid, getRandomValues });

        expect(generateSecureClientId()).toBe("01234567-89ab-cdef-0123-456789abcdef");
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

    it("throws when secure randomness is unavailable", () => {
        const mathRandomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
            throw new Error("Math.random should never be used for client identifiers.");
        });
        vi.stubGlobal("crypto", {});

        expect(() => generateSecureClientId()).toThrow("Cryptographically secure random number generation is not available in this environment.");
        expect(mathRandomSpy).not.toHaveBeenCalled();
    });

    it("reuses a pending idempotency key for the same payload fingerprint", () => {
        const createKey = vi.fn(() => "key-1");
        const first = resolvePendingClientIdempotencyKey({
            pending: null,
            fingerprint: "payload-a",
            createKey,
        });
        const retry = resolvePendingClientIdempotencyKey({
            pending: first.pending,
            fingerprint: "payload-a",
            createKey,
        });

        expect(first).toMatchObject({ key: "key-1", reused: false });
        expect(retry).toMatchObject({ key: "key-1", reused: true });
        expect(createKey).toHaveBeenCalledTimes(1);
    });

    it("rotates the idempotency key when the payload fingerprint changes", () => {
        const createKey = vi.fn()
            .mockReturnValueOnce("key-1")
            .mockReturnValueOnce("key-2");
        const first = resolvePendingClientIdempotencyKey({
            pending: null,
            fingerprint: "payload-a",
            createKey,
        });
        const next = resolvePendingClientIdempotencyKey({
            pending: first.pending,
            fingerprint: "payload-b",
            createKey,
        });

        expect(next).toMatchObject({ key: "key-2", reused: false });
        expect(createKey).toHaveBeenCalledTimes(2);
    });

    it("rejects empty idempotency fingerprints and generated keys", () => {
        expect(() => resolvePendingClientIdempotencyKey({
            pending: null,
            fingerprint: "",
            createKey: () => "key",
        })).toThrow("Client idempotency fingerprints must not be empty.");
        expect(() => resolvePendingClientIdempotencyKey({
            pending: null,
            fingerprint: "payload",
            createKey: () => "  ",
        })).toThrow("Client idempotency keys must not be empty.");
    });

    it("keeps replay protection for transient or retryable client responses", () => {
        expect(isDefinitiveClientRejectionStatus(400)).toBe(true);
        expect(isDefinitiveClientRejectionStatus(409)).toBe(false);
        expect(isDefinitiveClientRejectionStatus(409, { errorCode: "duplicate_processing" })).toBe(false);
        expect(isDefinitiveClientRejectionStatus(409, { errorCode: "attachment_complete_in_progress" })).toBe(false);
        expect(isDefinitiveClientRejectionStatus(409, { errorCode: "attachment_cancel_requested" })).toBe(false);
        expect(isDefinitiveClientRejectionStatus(409, { errorCode: "attachment_cancel_in_progress" })).toBe(false);
        expect(isDefinitiveClientRejectionStatus(409, {
            code: "idempotency_conflict",
            preserveIdempotencyKey: true,
        })).toBe(false);
        expect(isDefinitiveClientRejectionStatus(409, { code: "idempotency_conflict" })).toBe(true);
        expect(isDefinitiveClientRejectionStatus(409, { errorCode: "attachment_canceled" })).toBe(true);
        expect(isDefinitiveClientRejectionStatus(409, { retryable: false })).toBe(true);
        expect(isDefinitiveClientRejectionStatus(400, { retryable: true })).toBe(false);
        expect(isDefinitiveClientRejectionStatus(408)).toBe(false);
        expect(isDefinitiveClientRejectionStatus(425)).toBe(false);
        expect(isDefinitiveClientRejectionStatus(429)).toBe(false);
        expect(isDefinitiveClientRejectionStatus(499)).toBe(false);
        expect(isDefinitiveClientRejectionStatus(201)).toBe(false);
        expect(isDefinitiveClientRejectionStatus(500)).toBe(false);
        expect(isDefinitiveClientRejectionStatus(null)).toBe(false);
    });

    it("reuses a session-backed key after remount without persisting raw payload or scope text", async () => {
        const sessionStorage = createMemorySessionStorage();
        vi.stubGlobal("window", { sessionStorage });
        vi.stubGlobal("crypto", webcrypto);
        const createKey = vi.fn(() => "secure-key-1");
        const scope = {
            userId: "viewer-sensitive-id",
            targetId: "creator-sensitive-id",
            action: "creator-request",
        };
        const payloadFingerprint = "private request details must never enter storage";

        const first = await resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint,
            createKey,
        });
        const afterRemount = await resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint,
            createKey,
        });

        expect(first).toMatchObject({ key: "secure-key-1", reused: false, persistence: "session" });
        expect(afterRemount).toMatchObject({ key: "secure-key-1", reused: true, persistence: "session" });
        expect(createKey).toHaveBeenCalledTimes(1);
        const serializedStorage = Array.from({ length: sessionStorage.length }, (_, index) => {
            const key = sessionStorage.key(index) ?? "";
            return `${key}:${sessionStorage.getItem(key) ?? ""}`;
        }).join("\n");
        expect(serializedStorage).not.toContain(payloadFingerprint);
        expect(serializedStorage).not.toContain(scope.userId);
        expect(serializedStorage).not.toContain(scope.targetId);
        expect(serializedStorage.length).toBeLessThan(1_000);
    });

    it("rotates a durable key for changed payload and prevents stale completion from clearing it", async () => {
        const sessionStorage = createMemorySessionStorage();
        vi.stubGlobal("window", { sessionStorage });
        vi.stubGlobal("crypto", webcrypto);
        const createKey = vi.fn()
            .mockReturnValueOnce("secure-key-1")
            .mockReturnValueOnce("secure-key-2");
        const scope = { userId: "viewer-1", targetId: "creator-1", action: "creator-booking" };
        const first = await resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint: "slot-a",
            createKey,
        });
        const changed = await resolveDurableClientIdempotencyKey({
            pending: first.pending,
            scope,
            payloadFingerprint: "slot-b",
            createKey,
        });

        expect(changed).toMatchObject({ key: "secure-key-2", reused: false });
        clearDurableClientIdempotencyKey(first.pending);
        const retryChanged = await resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint: "slot-b",
            createKey,
        });
        expect(retryChanged).toMatchObject({ key: "secure-key-2", reused: true });

        clearDurableClientIdempotencyKey(changed.pending);
        const afterClear = await resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint: "slot-b",
            createKey: () => "secure-key-3",
        });
        expect(afterClear).toMatchObject({ key: "secure-key-3", reused: false });
    });

    it("falls back to an in-memory hashed fingerprint when session storage is unavailable", async () => {
        vi.stubGlobal("crypto", webcrypto);
        const createKey = vi.fn(() => "secure-key-memory");
        const scope = { userId: "viewer-1", targetId: "creator-1", action: "creator-subscription" };
        const first = await resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint: "subscribe",
            createKey,
        });
        const retry = await resolveDurableClientIdempotencyKey({
            pending: first.pending,
            scope,
            payloadFingerprint: "subscribe",
            createKey,
        });

        expect(first.persistence).toBe("memory");
        expect(first.pending.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
        expect(first.pending.fingerprint).not.toBe("subscribe");
        expect(retry).toMatchObject({ key: "secure-key-memory", reused: true, persistence: "memory" });
        expect(createKey).toHaveBeenCalledTimes(1);
    });

    it("coalesces concurrent degraded-storage resolutions for the same paid action", async () => {
        vi.stubGlobal("crypto", webcrypto);
        const createKey = vi.fn()
            .mockReturnValueOnce("secure-key-concurrent-1")
            .mockReturnValueOnce("secure-key-concurrent-2");
        const input = {
            pending: null,
            scope: { userId: "viewer-1", targetId: "creator-1", action: "creator-request" },
            payloadFingerprint: "same-request",
            createKey,
        };

        const [first, second] = await Promise.all([
            resolveDurableClientIdempotencyKey(input),
            resolveDurableClientIdempotencyKey(input),
        ]);

        expect(first).toMatchObject({ key: "secure-key-concurrent-1", persistence: "memory" });
        expect(second).toMatchObject({ key: "secure-key-concurrent-1", persistence: "memory" });
        expect(first.pending).toBe(second.pending);
        expect(createKey).toHaveBeenCalledTimes(1);
    });

    it("rejects unbounded fingerprints and unsafe generated keys before storage", async () => {
        const sessionStorage = createMemorySessionStorage();
        vi.stubGlobal("window", { sessionStorage });
        vi.stubGlobal("crypto", webcrypto);
        const scope = { userId: "viewer-1", targetId: "creator-1", action: "creator-request" };

        await expect(resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint: "x".repeat(32_769),
            createKey: () => "secure-key",
        })).rejects.toThrow("payload fingerprints must be between 1 and 32768 characters");
        await expect(resolveDurableClientIdempotencyKey({
            pending: null,
            scope,
            payloadFingerprint: "request-a",
            createKey: () => "unsafe key with spaces",
        })).rejects.toThrow("Client idempotency keys must use only");
        expect(sessionStorage.length).toBe(0);
    });
});
