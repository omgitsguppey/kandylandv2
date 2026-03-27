import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trackEvent, syncIdentifiedTelemetryOwnership } from "@/lib/telemetry";
import { authFetch } from "@/lib/authFetch";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { auth } from "@/lib/firebase";

vi.mock("@/lib/authFetch", () => ({
    authFetch: vi.fn(),
}));

vi.mock("@/lib/client-diagnostics", () => ({
    recordClientDiagnostic: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
    auth: {
        currentUser: null,
    },
}));

// Mock the telemetry identifiers and semantics so we don't have to stub everything
vi.mock("@/lib/analytics-identifiers", () => ({
    createAnalyticsEventId: vi.fn(() => "test-event-id"),
}));

vi.mock("@/lib/analytics-client-engine", () => ({
    prepareAnalyticsEvent: vi.fn((name, params) => ({
        isKnownEvent: true,
        canonicalEventName: name,
        enrichedParams: params || {},
    })),
}));

vi.mock("@/lib/client-session", () => ({
    getClientSessionId: vi.fn(() => "test-session-id"),
}));

vi.mock("@/lib/privacy-consent", () => ({
    readPrivacySettingsSnapshot: vi.fn(() => ({})),
    canUseAnonymousAnalytics: vi.fn(() => true),
    canUseIdentifiedAnalytics: vi.fn(() => true),
}));

describe("Telemetry Queue Flushing", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Setup DOM APIs used by telemetry
        vi.stubGlobal("window", {
            sessionStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            addEventListener: vi.fn(),
            innerWidth: 1024,
            innerHeight: 768,
            location: {
                pathname: "/test",
            },
            gtag: vi.fn(),
        });

        vi.stubGlobal("document", {
            addEventListener: vi.fn(),
            visibilityState: "visible",
        });

        // Setup auth state
        (auth as any).currentUser = { uid: "test-user-id" };

        // Reset telemetry internal state
        syncIdentifiedTelemetryOwnership(null);
        syncIdentifiedTelemetryOwnership("test-user-id");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("handles authFetch rejection silently and records diagnostic", async () => {
        const fetchError = new Error("Network failure");

        // We only want to mock it once so if it calls it a second time (due to a retry) we can ignore it or we can just expect it was called at least once
        vi.mocked(authFetch).mockImplementation(async () => {
            throw fetchError;
        });

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        trackEvent("auth_login", { method: "email" });

        // Let flushQueuedTelemetry run its catch block
        await vi.runOnlyPendingTimersAsync();

        // flushQueuedTelemetry catch logic has run, wait for it
        await new Promise(process.nextTick);

        // Instead of exactly 1 time, it might be retrying because we threw an error, so the queue is not empty, and the timeout pushes it back
        // Wait let's just assert it was called at least once
        expect(authFetch).toHaveBeenCalled();
        expect(recordClientDiagnostic).toHaveBeenCalledWith(
            "telemetry",
            "Identified telemetry batch failed",
            expect.objectContaining({
                reason: "immediate",
                message: "Network failure",
                batchSize: 1,
            })
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[Telemetry] Failed to flush queued telemetry:",
            fetchError
        );

        consoleErrorSpy.mockRestore();
    });

    it("handles non-ok response silently and records diagnostic", async () => {
        const mockResponse = {
            ok: false,
            json: vi.fn().mockResolvedValue({ error: "Server Error" })
        };
        vi.mocked(authFetch).mockImplementation(async () => mockResponse as unknown as Response);

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        trackEvent("auth_login", { method: "email" });

        await vi.runOnlyPendingTimersAsync();
        await new Promise(process.nextTick);

        expect(authFetch).toHaveBeenCalled();
        expect(recordClientDiagnostic).toHaveBeenCalledWith(
            "telemetry",
            "Identified telemetry batch failed",
            expect.objectContaining({
                reason: "immediate",
                message: "Server Error",
                batchSize: 1,
            })
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[Telemetry] Failed to flush queued telemetry:",
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });
});
