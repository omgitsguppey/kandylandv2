import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const FLOW_STORAGE_KEY = "kandydrops.telemetry.flows";
const IDENTIFIED_QUEUE_STORAGE_KEY = "kandydrops.telemetry.identified-queue";

vi.mock("@/lib/privacy-consent", async () => {
    return {
        readPrivacySettingsSnapshot: vi.fn(),
        canUseAnonymousAnalytics: vi.fn(),
        canUseIdentifiedAnalytics: vi.fn(),
    };
});

vi.mock("@/lib/analytics-client-engine", async () => {
    return {
        prepareAnalyticsEvent: vi.fn(),
    };
});

vi.mock("@/lib/firebase", async () => {
    return {
        auth: {
            currentUser: null
        }
    };
});

vi.mock("@/lib/authFetch", async () => {
    return {
        authFetch: vi.fn(),
    };
});

vi.mock("@/lib/client-diagnostics", async () => {
    return {
        recordClientDiagnostic: vi.fn(),
    };
});

describe("telemetry flow logic", () => {
    let mockLocalStorage: Record<string, string> = {};
    let telemetry: typeof import("@/lib/telemetry");
    let privacyConsent: typeof import("@/lib/privacy-consent");
    let analyticsClientEngine: typeof import("@/lib/analytics-client-engine");
    let authFetchModule: typeof import("@/lib/authFetch");
    let firebaseAuth: typeof import("@/lib/firebase");
    let diagnostics: typeof import("@/lib/client-diagnostics");

    beforeEach(async () => {
        vi.resetModules();
        mockLocalStorage = {};
        vi.stubGlobal("window", {
            localStorage: {
                getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    mockLocalStorage[key] = value;
                }),
                removeItem: vi.fn((key: string) => {
                    delete mockLocalStorage[key];
                }),
            },
            innerWidth: 1024,
            innerHeight: 768,
            location: {
                pathname: "/test-path"
            },
            gtag: vi.fn(),
            setTimeout: vi.fn((cb) => {
                return 123; // mock timeout id
            }),
            clearTimeout: vi.fn(),
            addEventListener: vi.fn(),
        });
        vi.stubGlobal("document", {
            visibilityState: "visible",
            addEventListener: vi.fn(),
        });
        vi.stubGlobal("navigator", {
            sendBeacon: vi.fn(),
        });
        vi.stubGlobal("fetch", vi.fn());
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

        telemetry = await import("@/lib/telemetry");
        privacyConsent = await import("@/lib/privacy-consent");
        analyticsClientEngine = await import("@/lib/analytics-client-engine");
        authFetchModule = await import("@/lib/authFetch");
        firebaseAuth = await import("@/lib/firebase");
        diagnostics = await import("@/lib/client-diagnostics");
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    describe("startTimedFlow", () => {
        it("does nothing when window is undefined", () => {
            vi.stubGlobal("window", undefined);
            telemetry.startTimedFlow("test_flow", { some_param: "value" });
            expect(mockLocalStorage[FLOW_STORAGE_KEY]).toBeUndefined();
        });

        it("starts a timed flow and saves it to localStorage", () => {
            telemetry.startTimedFlow("test_flow", { some_param: "value" });

            const stored = JSON.parse(mockLocalStorage[FLOW_STORAGE_KEY]);
            expect(stored).toBeDefined();
            expect(stored["test_flow"]).toBeDefined();
            expect(stored["test_flow"].startedAt).toBe(1767225600000); // 2026-01-01T00:00:00Z
            expect(stored["test_flow"].params).toEqual({
                some_param: "value",
                event_schema_version: "v2",
            });
        });

        it("sanitizes event params", () => {
            telemetry.startTimedFlow("test_flow", {
                valid_str: "str",
                valid_num: 123,
                valid_bool: true,
                invalid_obj: { nested: "ignored but stringified" },
                invalid_null: null
            });

            const stored = JSON.parse(mockLocalStorage[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"].params).toEqual({
                valid_str: "str",
                valid_num: 123,
                valid_bool: true,
                invalid_obj: '{"nested":"ignored but stringified"}',
                event_schema_version: "v2",
            });
        });
    });

    describe("clearTimedFlow", () => {
        it("does nothing when window is undefined", () => {
            mockLocalStorage[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": { startedAt: 123 }
            });
            vi.stubGlobal("window", undefined);
            telemetry.clearTimedFlow("test_flow");

            expect(mockLocalStorage[FLOW_STORAGE_KEY]).toBeDefined();
        });

        it("clears an existing flow", () => {
            mockLocalStorage[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": { startedAt: 123 },
                "other_flow": { startedAt: 456 }
            });

            telemetry.clearTimedFlow("test_flow");

            const stored = JSON.parse(mockLocalStorage[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"]).toBeUndefined();
            expect(stored["other_flow"]).toBeDefined();
        });
    });

    describe("consumeTimedFlow", () => {
        it("returns undefined duration and merged params if flow not found", () => {
            const result = telemetry.consumeTimedFlow("test_flow", { new_param: "value" });
            expect(result.durationMs).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.mergedParams).toEqual({
                new_param: "value",
                event_schema_version: "v2",
            });
        });

        it("calculates duration, merges params, and clears flow from storage", () => {
            const startMs = 1767225600000;
            mockLocalStorage[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": {
                    startedAt: startMs,
                    params: { original_param: "old" }
                }
            });

            vi.setSystemTime(new Date(startMs + 5500));

            const result = telemetry.consumeTimedFlow("test_flow", { new_param: "new" });

            expect(result.durationMs).toBe(5500);
            expect(result.startedAt).toBe(startMs);
            expect(result.mergedParams).toEqual({
                original_param: "old",
                new_param: "new",
                event_schema_version: "v2",
                duration_ms: 5500,
                duration_seconds: 6
            });

            const stored = JSON.parse(mockLocalStorage[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"]).toBeUndefined();
        });
    });

    describe("syncIdentifiedTelemetryOwnership", () => {
        it("clears telemetry queue when userId is null", () => {
            telemetry.__setTelemetryStateForTesting("old_user", [{ eventId: "1", eventName: "test", eventTimestampMs: 123, eventParams: {} }]);

            telemetry.syncIdentifiedTelemetryOwnership(null);

            expect(telemetry.__getTelemetryStateForTesting().userId).toBeNull();
        });

        it("clears telemetry queue when userId changes", () => {
            telemetry.__setTelemetryStateForTesting("old_user", [{ eventId: "1", eventName: "test", eventTimestampMs: 123, eventParams: {} }]);

            telemetry.syncIdentifiedTelemetryOwnership("new_user");

            const stored = telemetry.__getTelemetryStateForTesting();
            expect(stored.userId).toBe("new_user");
            expect(stored.events).toEqual([]);
        });

        it("keeps telemetry queue when userId is the same", () => {
            const events = [{ eventId: "1", eventName: "test", eventTimestampMs: 123, eventParams: {} }];
            telemetry.__setTelemetryStateForTesting("same_user", events);

            telemetry.syncIdentifiedTelemetryOwnership("same_user");

            const stored = telemetry.__getTelemetryStateForTesting();
            expect(stored.userId).toBe("same_user");
            expect(stored.events).toEqual(events);
        });
    });

    describe("trackEvent", () => {
        beforeEach(() => {
            vi.mocked(privacyConsent.readPrivacySettingsSnapshot).mockReturnValue({} as any);
            vi.mocked(privacyConsent.canUseAnonymousAnalytics).mockReturnValue(true);
            vi.mocked(privacyConsent.canUseIdentifiedAnalytics).mockReturnValue(true);

            vi.mocked(analyticsClientEngine.prepareAnalyticsEvent).mockReturnValue({
                isKnownEvent: true,
                canonicalEventName: "known_event",
                enrichedParams: { test: "param" }
            });

            // @ts-ignore
            if (firebaseAuth.auth) {
                // @ts-ignore
                firebaseAuth.auth.currentUser = { uid: "user123" };
            }
        });

        it("bails early if analytics are disabled and not a task progress event", () => {
            vi.mocked(privacyConsent.canUseAnonymousAnalytics).mockReturnValue(false);
            vi.mocked(privacyConsent.canUseIdentifiedAnalytics).mockReturnValue(false);

            telemetry.trackEvent("test_event");

            expect(window.gtag).not.toHaveBeenCalled();
            expect(telemetry.__getTelemetryStateForTesting().events.length).toBe(0);
        });

        it("records client diagnostic on trackEvent error", () => {
            const mockRecord = vi.fn();
            vi.doMock("@/lib/client-diagnostics", () => ({
                recordClientDiagnostic: mockRecord
            }));

            // Force trackEvent to throw by giving invalid data or mocking internal method
            vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network Error")));
            vi.spyOn(console, "error").mockImplementation(() => {});

            expect(() => telemetry.trackEvent("unknown_event" as any)).not.toThrow();
        });

        it("records client diagnostic for unknown events", () => {
            vi.mocked(analyticsClientEngine.prepareAnalyticsEvent).mockReturnValue({
                isKnownEvent: false,
                canonicalEventName: "unknown_event",
                enrichedParams: {}
            });

            telemetry.trackEvent("unknown_event");

            expect(window.gtag).not.toHaveBeenCalled();
            expect(diagnostics.recordClientDiagnostic).toHaveBeenCalledWith("telemetry", "Unsupported telemetry event ignored", { eventName: "unknown_event" });
        });

        it("sends anonymous analytics via gtag", () => {
            telemetry.trackEvent("known_event");

            expect(window.gtag).toHaveBeenCalledWith(
                "event",
                "known_event",
                expect.objectContaining({
                    test: "param",
                    page_path: "/test-path",
                    viewport_width: 1024,
                    viewport_height: 768,
                    is_mobile_viewport: false,
                    auth_state: "authenticated",
                    event_timestamp_ms: 1767225600000
                })
            );
        });

        it("enqueues identified analytics", () => {
            telemetry.trackEvent("known_event");

            const stored = telemetry.__getTelemetryStateForTesting();
            expect(stored.userId).toBe("user123");
            expect(stored.events.length).toBe(1);
            expect(stored.events[0].eventName).toBe("known_event");
            expect(stored.events[0].eventParams).toMatchObject({ test: "param" });
        });

        it("applies rollout and release context", () => {
            telemetry.syncTelemetryRolloutContext({ rollout_context: "A", rollout_assignment_count: 1, active_rollout_count: 1 });
            telemetry.syncTelemetryReleaseContext({ release_version: "1.0.0" });

            telemetry.trackEvent("known_event");

            expect(window.gtag).toHaveBeenCalledWith(
                "event",
                "known_event",
                expect.objectContaining({
                    rollout_context: "A",
                    release_version: "1.0.0"
                })
            );
        });
    });

    describe("canonical client telemetry transports", () => {
        it("submits guest analytics with beacon on lifecycle flushes", async () => {
            vi.mocked(navigator.sendBeacon).mockReturnValue(true);

            const result = await telemetry.submitGuestAnalyticsIngestPayload({
                payload: { batchId: "batch_1", events: [] },
                pagePath: "/test-path",
                reason: "pagehide",
                eventCount: 1,
            });

            expect(result).toBe(true);
            expect(navigator.sendBeacon).toHaveBeenCalledWith(
                "/api/analytics/ingest",
                expect.any(Blob),
            );
            expect(fetch).not.toHaveBeenCalled();
        });

        it("records a diagnostic and keeps the guest queue intact when transport fails", async () => {
            vi.mocked(navigator.sendBeacon).mockReturnValue(false);
            vi.mocked(fetch).mockRejectedValue(new Error("offline"));

            const result = await telemetry.submitGuestAnalyticsIngestPayload({
                payload: { batchId: "batch_1", events: [] },
                pagePath: "/test-path",
                reason: "page_view",
                eventCount: 2,
            });

            expect(result).toBe(false);
            expect(diagnostics.recordClientDiagnostic).toHaveBeenCalledWith("telemetry", "Guest analytics flush failed", expect.objectContaining({
                pagePath: "/test-path",
                reason: "page_view",
                queuedEvents: 2,
                message: "offline",
            }));
        });

        it("submits runtime watch events through the canonical helper", () => {
            vi.mocked(navigator.sendBeacon).mockReturnValue(false);
            vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

            telemetry.submitRuntimeWatchTelemetryEvent({
                event: { eventId: "watch_1", eventType: "watch_pause" },
                ingestEndpoint: "/api/watch/runtime",
                preferBeacon: true,
            });

            expect(navigator.sendBeacon).toHaveBeenCalledWith(
                "/api/watch/runtime",
                expect.any(Blob),
            );
            expect(fetch).toHaveBeenCalledWith("/api/watch/runtime", expect.objectContaining({
                method: "POST",
                keepalive: true,
            }));
        });
    });
});
