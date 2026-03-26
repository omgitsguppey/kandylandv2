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
    let mockSessionStorage: Record<string, string> = {};
    let telemetry: typeof import("@/lib/telemetry");
    let privacyConsent: typeof import("@/lib/privacy-consent");
    let analyticsClientEngine: typeof import("@/lib/analytics-client-engine");
    let authFetchModule: typeof import("@/lib/authFetch");
    let firebaseAuth: typeof import("@/lib/firebase");
    let diagnostics: typeof import("@/lib/client-diagnostics");

    beforeEach(async () => {
        vi.resetModules();
        mockSessionStorage = {};
        vi.stubGlobal("window", {
            sessionStorage: {
                getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    mockSessionStorage[key] = value;
                }),
                removeItem: vi.fn((key: string) => {
                    delete mockSessionStorage[key];
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
            expect(mockSessionStorage[FLOW_STORAGE_KEY]).toBeUndefined();
        });

        it("starts a timed flow and saves it to sessionStorage", () => {
            telemetry.startTimedFlow("test_flow", { some_param: "value" });

            const stored = JSON.parse(mockSessionStorage[FLOW_STORAGE_KEY]);
            expect(stored).toBeDefined();
            expect(stored["test_flow"]).toBeDefined();
            expect(stored["test_flow"].startedAt).toBe(1767225600000); // 2026-01-01T00:00:00Z
            expect(stored["test_flow"].params).toEqual({ some_param: "value" });
        });

        it("sanitizes event params", () => {
            telemetry.startTimedFlow("test_flow", {
                valid_str: "str",
                valid_num: 123,
                valid_bool: true,
                invalid_obj: { nested: "ignored but stringified" },
                invalid_null: null
            });

            const stored = JSON.parse(mockSessionStorage[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"].params).toEqual({
                valid_str: "str",
                valid_num: 123,
                valid_bool: true,
                invalid_obj: '{"nested":"ignored but stringified"}'
            });
        });
    });

    describe("clearTimedFlow", () => {
        it("does nothing when window is undefined", () => {
            mockSessionStorage[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": { startedAt: 123 }
            });
            vi.stubGlobal("window", undefined);
            telemetry.clearTimedFlow("test_flow");

            expect(mockSessionStorage[FLOW_STORAGE_KEY]).toBeDefined();
        });

        it("clears an existing flow", () => {
            mockSessionStorage[FLOW_STORAGE_KEY] = JSON.stringify({
                "test_flow": { startedAt: 123 },
                "other_flow": { startedAt: 456 }
            });

            telemetry.clearTimedFlow("test_flow");

            const stored = JSON.parse(mockSessionStorage[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"]).toBeUndefined();
            expect(stored["other_flow"]).toBeDefined();
        });
    });

    describe("consumeTimedFlow", () => {
        it("returns undefined duration and merged params if flow not found", () => {
            const result = telemetry.consumeTimedFlow("test_flow", { new_param: "value" });
            expect(result.durationMs).toBeUndefined();
            expect(result.startedAt).toBeUndefined();
            expect(result.mergedParams).toEqual({ new_param: "value" });
        });

        it("calculates duration, merges params, and clears flow from storage", () => {
            const startMs = 1767225600000;
            mockSessionStorage[FLOW_STORAGE_KEY] = JSON.stringify({
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
                duration_ms: 5500,
                duration_seconds: 6
            });

            const stored = JSON.parse(mockSessionStorage[FLOW_STORAGE_KEY]);
            expect(stored["test_flow"]).toBeUndefined();
        });
    });

    describe("syncIdentifiedTelemetryOwnership", () => {
        it("clears telemetry queue when userId is null", () => {
            mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY] = JSON.stringify({
                userId: "old_user",
                events: [{ eventId: "1", eventName: "test", eventTimestampMs: 123, eventParams: {} }]
            });

            telemetry.syncIdentifiedTelemetryOwnership(null);

            expect(mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY]).toBeUndefined();
        });

        it("clears telemetry queue when userId changes", () => {
            mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY] = JSON.stringify({
                userId: "old_user",
                events: [{ eventId: "1", eventName: "test", eventTimestampMs: 123, eventParams: {} }]
            });

            telemetry.syncIdentifiedTelemetryOwnership("new_user");

            const stored = JSON.parse(mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY]);
            expect(stored.userId).toBe("new_user");
            expect(stored.events).toEqual([]);
        });

        it("keeps telemetry queue when userId is the same", () => {
            const events = [{ eventId: "1", eventName: "test", eventTimestampMs: 123, eventParams: {} }];
            mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY] = JSON.stringify({
                userId: "same_user",
                events
            });

            telemetry.syncIdentifiedTelemetryOwnership("same_user");

            const stored = JSON.parse(mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY]);
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
            expect(mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY]).toBeUndefined();
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

            const stored = JSON.parse(mockSessionStorage[IDENTIFIED_QUEUE_STORAGE_KEY]);
            expect(stored.userId).toBe("user123");
            expect(stored.events.length).toBe(1);
            expect(stored.events[0].eventName).toBe("known_event");
            expect(stored.events[0].eventParams).toMatchObject({ test: "param" });
        });

        it("applies rollout and release context", () => {
            telemetry.syncTelemetryRolloutContext({ rollout_group: "A" });
            telemetry.syncTelemetryReleaseContext({ release_version: "1.0.0" });

            telemetry.trackEvent("known_event");

            expect(window.gtag).toHaveBeenCalledWith(
                "event",
                "known_event",
                expect.objectContaining({
                    rollout_group: "A",
                    release_version: "1.0.0"
                })
            );
        });
    });
});
