import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadUiContinuityModules, readUiJson } from "@/lib/ui-continuity";

describe("ui continuity helpers", () => {
    let localStorageData: Record<string, string> = {};

    beforeEach(() => {
        localStorageData = {};
        vi.stubGlobal("window", {
            localStorage: {
                getItem: vi.fn((key: string) => localStorageData[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    localStorageData[key] = value;
                }),
                removeItem: vi.fn((key: string) => {
                    delete localStorageData[key];
                }),
            },
            location: { pathname: "/creators/demo", search: "" },
            innerWidth: 1280,
            innerHeight: 720,
            navigator: { userAgent: "vitest" },
        });
        vi.stubGlobal("document", {
            createElement: () => ({ getContext: () => null }),
        });
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("parses successful JSON responses", async () => {
        const response = new Response(JSON.stringify({ success: true }), { status: 200 });
        await expect(readUiJson<{ success: boolean }>(response, { moduleLabel: "module", url: "/api/test" })).resolves.toEqual({ success: true });
    });

    it("throws the route error message when response.ok is false", async () => {
        const response = new Response(JSON.stringify({ error: "Route failed" }), { status: 500 });
        await expect(readUiJson(response, { moduleLabel: "module", url: "/api/test" })).rejects.toThrow("Route failed");
    });

    it("returns per-module success and fallback warning state", async () => {
        const results = await loadUiContinuityModules({
            surface: "creator_public_profile",
            modules: [
                {
                    key: "subscriptions",
                    label: "subscriptions",
                    critical: true,
                    load: async () => ({ status: "active" }),
                },
                {
                    key: "bookings",
                    label: "bookings",
                    critical: true,
                    fallbackValue: { bookings: [] },
                    load: async () => {
                        throw new Error("Bookings route unavailable");
                    },
                },
            ],
        });

        expect(results[0].state.status).toBe("success");
        expect(results[1].state.status).toBe("error");
        expect(results[1].state.fallbackActive).toBe(true);
        expect(results[1].state.warning).toContain("Bookings route unavailable");
        expect(results[1].value).toEqual({ bookings: [] });
    });

    it("rejects explicit HTTP 200 failure and retains safe typed recovery metadata", async () => {
        const response = new Response(JSON.stringify({ success: false, code: "validation_error", message: "The draft was not accepted.", retryable: false, privateData: "must not be copied" }), { status: 200 });
        const failure = await readUiJson(response, { moduleLabel: "creator broadcast", url: "/api/creator/broadcasts" }).catch(error => error);
        expect(failure).toBeInstanceOf(Error);
        expect(failure).toMatchObject({ message: "The draft was not accepted.", code: "validation_error", status: 200, retryable: false });
        expect(failure).not.toHaveProperty("privateData");
    });

    it("retains HTTP failure classification and prioritizes its route error", async () => {
        const response = new Response(JSON.stringify({ error: "Permission denied.", message: "Other copy", errorKey: "creator_permission_denied", errorCode: "permission_denied" }), { status: 403 });
        await expect(readUiJson(response, { moduleLabel: "creator request", url: "/api/creator/requests" })).rejects.toMatchObject({ message: "Permission denied.", status: 403, errorKey: "creator_permission_denied", errorCode: "permission_denied" });
    });

    it.each([{ requests: [] }, { subscription: null }, [], null, 0, "raw creator payload", { success: true, bookings: [] }])("preserves successful raw payload compatibility: %j", async (payload) => {
        const response = new Response(JSON.stringify(payload), { status: 200 });
        await expect(readUiJson(response, { moduleLabel: "module", url: "/api/test" })).resolves.toEqual(payload);
    });

    it("keeps an explicit rejected source degraded and accepts the next valid hydration", async () => {
        let rejected = true;
        const modules = [{
            key: "bookings", label: "creator bookings", critical: true, fallbackValue: { bookings: [] },
            load: () => readUiJson(new Response(JSON.stringify(rejected ? { success: false, error: "Bookings source unavailable." } : { bookings: [{ id: "booking_1" }] }), { status: 200 }), { moduleLabel: "creator bookings", url: "/api/creator/bookings" }),
        }];
        const failed = await loadUiContinuityModules({ surface: "creator_workspace", modules });
        expect(failed[0].state).toMatchObject({ status: "error", responseOk: false, fallbackActive: true, warning: "Bookings source unavailable." });
        expect(failed[0].value).toEqual({ bookings: [] });
        rejected = false;
        const recovered = await loadUiContinuityModules({ surface: "creator_workspace", modules });
        expect(recovered[0].state).toMatchObject({ status: "success", responseOk: true, fallbackActive: false, warning: null });
        expect(recovered[0].value).toEqual({ bookings: [{ id: "booking_1" }] });
    });
});


describe("ui continuity explicit mutation acknowledgement", () => {
    const context = { moduleLabel: "creator mutation", url: "/api/creator/test", requireSuccess: true };

    it("accepts a confirmed mutation and retains its returned fields", async () => {
        const body = { success: true, status: "accepted", receipt: "receipt_1" };
        await expect(readUiJson(new Response(JSON.stringify(body), { status: 200 }), context)).resolves.toEqual(body);
    });

    it.each([{}, [], null, { success: "true" }])("rejects a missing or malformed success acknowledgement: %j", async (body) => {
        const failure = await readUiJson(new Response(JSON.stringify(body), { status: 200 }), context).catch(error => error);
        expect(failure).toBeInstanceOf(Error);
        expect(failure).toMatchObject({ status: 200 });
        if (!(failure instanceof Error)) throw failure;
        expect(failure.message).toMatch(/acknowledge|acknowledgement|confirm/i);
    });

    it("requires a mutation acknowledgement even when the response body is empty", async () => {
        await expect(readUiJson(new Response("", { status: 200 }), context)).rejects.toBeInstanceOf(Error);
    });

    it("preserves legacy default empty successful payload parsing", async () => {
        await expect(readUiJson(new Response("", { status: 200 }), { moduleLabel: "creator source", url: "/api/creator/source" })).resolves.toEqual({});
    });

    it("rejects malformed JSON before mutation settlement", async () => {
        await expect(readUiJson(new Response("{broken", { status: 200 }), context)).rejects.toThrow(/invalid JSON/);
    });
});
