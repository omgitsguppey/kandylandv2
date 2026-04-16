import { describe, it, expect, vi, beforeEach } from "vitest";
import { consumeTimedFlow } from "@/lib/telemetry";

const FLOW_STORAGE_KEY = "kandydrops.telemetry.flows";

describe("telemetry", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            sessionStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
            },
            location: {
                pathname: "/",
            },
            innerWidth: 1024,
            innerHeight: 768,
            clearTimeout: vi.fn(),
            setTimeout: vi.fn(),
            addEventListener: vi.fn(),
        });
        vi.stubGlobal("document", {
            addEventListener: vi.fn(),
            visibilityState: "visible",
        });
    });

    describe("consumeTimedFlow", () => {
        it("should parse normal flows from storage correctly", () => {
            const flowKey = "test_flow";
            const mockStorage = {
                [flowKey]: {
                    startedAt: Date.now() - 1000,
                    params: { some_param: "value" },
                },
            };

            vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(mockStorage));

            const result = consumeTimedFlow(flowKey);

            expect(result.durationMs).toBeGreaterThanOrEqual(1000);
            expect((result.mergedParams as any)?.some_param).toBe("value");
        });

        it("should prevent prototype pollution from malicious JSON in sessionStorage", () => {
            const flowKey = "test_flow";
            // A malicious payload that targets __proto__
            const maliciousPayload = `{"__proto__": {"polluted": true}, "${flowKey}": {"startedAt": 100, "params": {}}}`;

            vi.mocked(window.sessionStorage.getItem).mockReturnValue(maliciousPayload);

            // Should not throw and should safely ignore prototype modifications
            const result = consumeTimedFlow(flowKey);

            // Check that the returned object doesn't have the polluted property
            expect((result as any).polluted).toBeUndefined();
            // Check that Object prototype wasn't globally polluted
            expect(({} as any).polluted).toBeUndefined();
            // Still works correctly for the flow parsing
            expect(result.startedAt).toBe(100);
        });

        it("handles invalid JSON safely", () => {
            const flowKey = "test_flow";
            vi.mocked(window.sessionStorage.getItem).mockReturnValue("invalid json here");

            const result = consumeTimedFlow(flowKey);

            expect(result.durationMs).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.mergedParams).toEqual({ event_schema_version: "v2" });
        });

        it("handles empty storage safely", () => {
            const flowKey = "test_flow";
            vi.mocked(window.sessionStorage.getItem).mockReturnValue(null);

            const result = consumeTimedFlow(flowKey);

            expect(result.durationMs).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.mergedParams).toEqual({ event_schema_version: "v2" });
        });
    });
});
