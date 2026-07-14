import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const bucketName = "test-bucket.appspot.com";
    const landing: Record<string, unknown> = {};
    const objects = new Map<string, Buffer>();
    const deleted: string[] = [];
    let transactionTail = Promise.resolve<unknown>(undefined);
    let failTransaction = false;

    const snapshot = () => ({
        exists: Object.keys(landing).length > 0,
        get: (key: string) => landing[key],
    });
    const landingRef = {
        get: vi.fn(async () => snapshot()),
    };
    const runTransaction = vi.fn((callback: (transaction: {
        get: () => Promise<ReturnType<typeof snapshot>>;
        set: (_ref: unknown, patch: Record<string, unknown>) => void;
    }) => Promise<unknown>) => {
        const run = transactionTail.then(async () => {
            if (failTransaction) {
                throw new Error("transaction unavailable");
            }
            let pendingPatch: Record<string, unknown> = {};
            const result = await callback({
                get: async () => snapshot(),
                set: (_ref, patch) => {
                    pendingPatch = { ...pendingPatch, ...patch };
                },
            });
            Object.assign(landing, pendingPatch);
            return result;
        });
        transactionTail = run.catch(() => undefined);
        return run;
    });
    const bucket = {
        name: bucketName,
        file: (path: string) => ({
            save: vi.fn(async (buffer: Buffer) => {
                objects.set(path, buffer);
            }),
            delete: vi.fn(async () => {
                deleted.push(path);
                objects.delete(path);
            }),
        }),
    };

    return {
        bucketName,
        landing,
        objects,
        deleted,
        landingRef,
        runTransaction,
        bucket,
        setFailTransaction(value: boolean) {
            failTransaction = value;
        },
        reset() {
            for (const key of Object.keys(landing)) delete landing[key];
            objects.clear();
            deleted.length = 0;
            transactionTail = Promise.resolve(undefined);
            failTransaction = false;
            landingRef.get.mockClear();
            runTransaction.mockClear();
        },
    };
});

const boundedBody = vi.hoisted(() => ({ read: vi.fn() }));
const requestGuard = vi.hoisted(() => ({
    guard: vi.fn(async (_request: unknown, _options: unknown) => ({ uid: "admin_1" })),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: {
        collection: () => ({ doc: () => mockState.landingRef }),
        runTransaction: mockState.runTransaction,
    },
    adminStorage: { bucket: () => mockState.bucket },
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: requestGuard.guard,
}));
vi.mock("@/lib/server/bounded-json-body", () => ({
    isBoundedJsonBodyError: () => false,
    isRequestBodyTooLargeError: () => false,
    readBoundedFormDataBody: (...args: unknown[]) => boundedBody.read(...args),
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: (error: unknown) => new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
    }),
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_name: string, handler: unknown) => handler,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({ recordRouteWarning: vi.fn() }));
vi.mock("@/lib/landing-assets", () => ({ isAllowedLandingAssetKey: () => true }));

import { POST } from "@/app/api/settings/landing/upload/route";

function ownedUrl(path: string, token = "token") {
    return `https://firebasestorage.googleapis.com/v0/b/${mockState.bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function assetPath(url: string) {
    return decodeURIComponent(new URL(url).pathname.split("/o/")[1] || "");
}

function uploadFile(label: string) {
    const bytes = Buffer.from(label);
    return {
        type: "image/png",
        size: bytes.byteLength,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
}

describe("settings landing upload route", () => {
    beforeEach(() => {
        mockState.reset();
        boundedBody.read.mockReset();
        requestGuard.guard.mockClear();
        let uuidCounter = 0;
        vi.stubGlobal("crypto", {
            randomUUID: () => {
                uuidCounter += 1;
                return `00000000-0000-4000-8000-${uuidCounter.toString().padStart(12, "0")}`;
            },
        });
    });

    it("enforces the admin, origin, rate, and bounded multipart contract before writing storage", async () => {
        boundedBody.read.mockResolvedValueOnce(new Map<string, unknown>([
            ["file", uploadFile("hero")],
            ["key", "hero"],
        ]));

        const request = new NextRequest("http://localhost/api/settings/landing/upload", { method: "POST" });
        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(requestGuard.guard).toHaveBeenCalledWith(request, expect.objectContaining({
            routeName: "settings/landing/upload",
            auth: "admin",
            requireTrustedOrigin: true,
            maxBodyBytes: 10 * 1024 * 1024 + 64 * 1024,
            requiredContentTypePrefix: "multipart/form-data",
            rateLimit: {
                maxRequests: 10,
                windowMs: 60_000,
            },
        }));
        expect(boundedBody.read).toHaveBeenCalledWith(request, {
            maxBytes: 10 * 1024 * 1024 + 64 * 1024,
            routeName: "settings/landing/upload",
        });
    });

    it("serializes concurrent replacements and deletes only the committed predecessor", async () => {
        const oldPath = "landing/assets/hero_old.png";
        mockState.landing.hero = ownedUrl(oldPath, "old-token");
        mockState.objects.set(oldPath, Buffer.from("old"));
        boundedBody.read
            .mockResolvedValueOnce(new Map<string, unknown>([["file", uploadFile("first")], ["key", "hero"]]))
            .mockResolvedValueOnce(new Map<string, unknown>([["file", uploadFile("second")], ["key", "hero"]]));

        const [firstResponse, secondResponse] = await Promise.all([
            POST(new NextRequest("http://localhost/api/settings/landing/upload", { method: "POST" })),
            POST(new NextRequest("http://localhost/api/settings/landing/upload", { method: "POST" })),
        ]);
        const first = await firstResponse.json() as { url: string };
        const second = await secondResponse.json() as { url: string };
        const firstPath = assetPath(first.url);
        const secondPath = assetPath(second.url);
        const committedUrl = mockState.landing.hero as string;
        const committedPath = assetPath(committedUrl);

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(firstPath).not.toBe(secondPath);
        expect(firstPath).toMatch(/^landing\/assets\/hero_[0-9a-f-]+\.png$/u);
        expect(secondPath).toMatch(/^landing\/assets\/hero_[0-9a-f-]+\.png$/u);
        expect([first.url, second.url]).toContain(committedUrl);
        expect(mockState.objects.has(committedPath)).toBe(true);
        expect(mockState.objects.has(committedPath === firstPath ? secondPath : firstPath)).toBe(false);
        expect(mockState.objects.has(oldPath)).toBe(false);
        expect(mockState.deleted).toEqual(expect.arrayContaining([oldPath, committedPath === firstPath ? secondPath : firstPath]));
        expect(mockState.runTransaction).toHaveBeenCalledTimes(2);
    });

    it("cleans a new object after a verified failed settings transaction", async () => {
        const oldPath = "landing/assets/hero_old.png";
        mockState.landing.hero = ownedUrl(oldPath, "old-token");
        mockState.objects.set(oldPath, Buffer.from("old"));
        mockState.setFailTransaction(true);
        boundedBody.read.mockResolvedValueOnce(new Map<string, unknown>([
            ["file", uploadFile("replacement")],
            ["key", "hero"],
        ]));

        const response = await POST(new NextRequest("http://localhost/api/settings/landing/upload", { method: "POST" }));

        expect(response.status).toBe(500);
        expect(mockState.landing.hero).toBe(ownedUrl(oldPath, "old-token"));
        expect(mockState.objects.has(oldPath)).toBe(true);
        expect(Array.from(mockState.objects.keys())).toEqual([oldPath]);
        expect(mockState.deleted).toHaveLength(1);
        expect(mockState.deleted[0]).toMatch(/^landing\/assets\/hero_[0-9a-f-]+\.png$/u);
    });
});
