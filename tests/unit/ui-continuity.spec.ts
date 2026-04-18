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
});
