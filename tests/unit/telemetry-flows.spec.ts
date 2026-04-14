import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { startTimedFlow, clearTimedFlow, consumeTimedFlow } from "@/lib/telemetry";

const FLOW_STORAGE_KEY = "kandydrops.telemetry.flows";

describe("telemetry flow functions", () => {
    let sessionStorageStore: Record<string, string> = {};

    beforeEach(() => {
        sessionStorageStore = {};

        const mockSessionStorage = {
            getItem: vi.fn((key: string) => sessionStorageStore[key] || null),
            setItem: vi.fn((key: string, value: string) => {
                sessionStorageStore[key] = value;
            }),
            removeItem: vi.fn((key: string) => {
                delete sessionStorageStore[key];
            }),
        };

        vi.stubGlobal("window", {
            sessionStorage: mockSessionStorage,
        });

        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-01T10:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    describe("startTimedFlow", () => {
        it("gracefully exits when window is undefined", () => {
            vi.unstubAllGlobals(); // Remove window

            startTimedFlow("test_flow", { some_param: "value" });

            // Should not throw
            expect(Object.keys(sessionStorageStore).length).toBe(0);
        });

        it("gracefully handles sessionStorage errors (e.g. private mode)", () => {
            vi.stubGlobal("window", {
                sessionStorage: {
                    getItem: () => { throw new Error("SecurityError"); },
                    setItem: () => { throw new Error("SecurityError"); },
                }
            });

            startTimedFlow("test_flow", { some_param: "value" });

            // Should not throw
            expect(true).toBe(true);
        });

        it("creates a new flow entry in sessionStorage", () => {
            startTimedFlow("onboarding_flow", { step: 1 });

            const storedRaw = sessionStorageStore[FLOW_STORAGE_KEY];
            expect(storedRaw).toBeDefined();

            const stored = JSON.parse(storedRaw);
            expect(stored["onboarding_flow"]).toBeDefined();
            expect(stored["onboarding_flow"].startedAt).toBe(1704103200000); // 2024-01-01T10:00:00.000Z
            expect(stored["onboarding_flow"].params).toEqual({ event_schema_version: "v2", step: 1 });
        });

        it("sanitizes event params", () => {
            const complexParams = {
                validString: "string",
                validNumber: 42,
                validBoolean: true,
                invalidNull: null,
                invalidUndefined: undefined,
                complexObject: { a: 1 }
            };

            startTimedFlow("test_flow", complexParams);

            const stored = JSON.parse(sessionStorageStore[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"].params).toEqual({
                event_schema_version: "v2",
                validString: "string",
                validNumber: 42,
                validBoolean: true,
                complexObject: '{"a":1}'
            });
        });

        it("handles missing eventParams", () => {
            startTimedFlow("empty_flow");

            const stored = JSON.parse(sessionStorageStore[FLOW_STORAGE_KEY]);
            expect(stored["empty_flow"].params).toEqual({ event_schema_version: "v2" });
        });
    });

    describe("clearTimedFlow", () => {
        it("gracefully exits when window is undefined", () => {
            sessionStorageStore[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": { startedAt: 1000 }
            });

            vi.unstubAllGlobals(); // Remove window

            clearTimedFlow("test_flow");

            // Should not throw
            expect(true).toBe(true);
        });

        it("gracefully handles sessionStorage errors", () => {
            vi.stubGlobal("window", {
                sessionStorage: {
                    getItem: () => { throw new Error("SecurityError"); },
                    setItem: () => { throw new Error("SecurityError"); },
                }
            });

            clearTimedFlow("test_flow");

            // Should not throw
            expect(true).toBe(true);
        });

        it("removes an existing flow entry from sessionStorage", () => {
            sessionStorageStore[FLOW_STORAGE_KEY] = JSON.stringify({
                "flow_to_clear": { startedAt: 1000 },
                "other_flow": { startedAt: 2000 }
            });

            clearTimedFlow("flow_to_clear");

            const stored = JSON.parse(sessionStorageStore[FLOW_STORAGE_KEY]);
            expect(stored["flow_to_clear"]).toBeUndefined();
            expect(stored["other_flow"]).toBeDefined();
        });

        it("does nothing if flow key does not exist", () => {
            sessionStorageStore[FLOW_STORAGE_KEY] = JSON.stringify({
                "existing_flow": { startedAt: 1000 }
            });

            clearTimedFlow("non_existent_flow");

            const stored = JSON.parse(sessionStorageStore[FLOW_STORAGE_KEY]);
            expect(stored["existing_flow"]).toBeDefined();
        });
    });

    describe("consumeTimedFlow", () => {
        it("calculates duration and merges params correctly", () => {
            const startTime = Date.now();
            sessionStorageStore[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": {
                    startedAt: startTime,
                    params: { initial: "value" }
                }
            });

            // Advance time by 2.5 seconds
            vi.setSystemTime(startTime + 2500);

            const result = consumeTimedFlow("test_flow", { final: "value" });

            expect(result.durationMs).toBe(2500);
            expect(result.startedAt).toBe(startTime);
            expect(result.mergedParams).toEqual({
                event_schema_version: "v2",
                initial: "value",
                final: "value",
                duration_ms: 2500,
                duration_seconds: 3, // Math.round(2500 / 1000) = 3
            });
        });

        it("removes the flow from sessionStorage after consumption", () => {
            sessionStorageStore[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": { startedAt: Date.now() }
            });

            consumeTimedFlow("test_flow");

            const stored = JSON.parse(sessionStorageStore[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"]).toBeUndefined();
        });

        it("handles non-existent flows gracefully", () => {
            const result = consumeTimedFlow("non_existent_flow", { param: "value" });

            expect(result.durationMs).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.mergedParams).toEqual({
                event_schema_version: "v2",
                param: "value"
            });
        });

        it("handles window being undefined gracefully", () => {
            vi.unstubAllGlobals(); // Remove window

            const result = consumeTimedFlow("test_flow", { some: "param" });

            expect(result.durationMs).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.mergedParams).toEqual({
                event_schema_version: "v2",
                some: "param"
            });
        });

        it("gracefully handles sessionStorage errors", () => {
            vi.stubGlobal("window", {
                sessionStorage: {
                    getItem: () => { throw new Error("SecurityError"); },
                    setItem: () => { throw new Error("SecurityError"); },
                }
            });

            const result = consumeTimedFlow("test_flow", { some: "param" });

            expect(result.durationMs).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.mergedParams).toEqual({
                event_schema_version: "v2",
                some: "param"
            });
        });

        it("ensures durationMs is not negative", () => {
            const startTime = Date.now();
            sessionStorageStore[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": { startedAt: startTime }
            });

            // Move time backwards (e.g. clock sync issue)
            vi.setSystemTime(startTime - 1000);

            const result = consumeTimedFlow("test_flow");

            expect(result.durationMs).toBe(0);
            // when duration is 0, the duration object keys aren't merged based on lib/telemetry.ts logic
            expect(result.mergedParams.duration_ms).toBeUndefined();
            expect(result.mergedParams.duration_seconds).toBeUndefined();
        });
    });
});
