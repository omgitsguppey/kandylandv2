import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
    readPrivacySettingsSnapshot,
    PRIVACY_SETTINGS_STORAGE_KEY,
    getBrowserGlobalPrivacyControl,
    normalizePrivacySettingsSnapshot,
    emitPrivacySettingsChanged,
    subscribeToPrivacySettings,
    applyAnalyticsConsentToGtag,
    persistPrivacySettingsSnapshot,
    ANALYTICS_CONSENT_COOKIE,
    saveGuestAnalyticsConsent,
    canUseAnonymousAnalytics,
    canUseIdentifiedAnalytics
} from "@/lib/privacy-consent";

const DEFAULT_PRIVACY_SETTINGS = {
    anonymousAnalyticsEnabled: false,
    identifiedAnalyticsEnabled: false,
    allowRecommendations: false,
    showInAnonymousStats: false,
    honorGlobalPrivacyControl: true,
    consentUpdatedAt: 0,
};

describe("normalizePrivacySettingsSnapshot", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns defaults with current timestamp for null", () => {
        const result = normalizePrivacySettingsSnapshot(null);
        expect(result).toEqual({
            ...DEFAULT_PRIVACY_SETTINGS,
            consentUpdatedAt: Date.now(),
        });
    });

    it("returns defaults with current timestamp for undefined", () => {
        const result = normalizePrivacySettingsSnapshot(undefined);
        expect(result).toEqual({
            ...DEFAULT_PRIVACY_SETTINGS,
            consentUpdatedAt: Date.now(),
        });
    });

    it("normalizes partial settings correctly", () => {
        const partialSettings = {
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
            consentUpdatedAt: 1234567890,
        };
        const result = normalizePrivacySettingsSnapshot(partialSettings);
        expect(result).toEqual({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            showInAnonymousStats: false,
            honorGlobalPrivacyControl: false,
            consentUpdatedAt: 1234567890,
        });
    });

    it("preserves honorGlobalPrivacyControl as true when absent", () => {
        const result = normalizePrivacySettingsSnapshot({});
        expect(result.honorGlobalPrivacyControl).toBe(true);
    });

    it("ensures boolean strictness", () => {
        const result = normalizePrivacySettingsSnapshot({
            anonymousAnalyticsEnabled: "true" as any,
            identifiedAnalyticsEnabled: 1 as any,
        });
        expect(result.anonymousAnalyticsEnabled).toBe(false);
        expect(result.identifiedAnalyticsEnabled).toBe(false);
    });
});

describe("readPrivacySettingsSnapshot", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
            },
        });
        vi.stubGlobal("document", {});
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when localStorage.getItem throws an error", () => {
        vi.mocked(window.localStorage.getItem).mockImplementation(() => {
            throw new Error("SecurityError: The operation is insecure.");
        });

        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });

    it("returns correctly parsed and normalized snapshot from localStorage", () => {
        const storedValue = JSON.stringify({
            anonymousAnalyticsEnabled: true,
            consentUpdatedAt: 123456789,
        });
        vi.mocked(window.localStorage.getItem).mockReturnValue(storedValue);

        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot.anonymousAnalyticsEnabled).toBe(true);
        expect(snapshot.consentUpdatedAt).toBe(123456789);
        // Defaults for other fields
        expect(snapshot.identifiedAnalyticsEnabled).toBe(false);
        expect(snapshot.honorGlobalPrivacyControl).toBe(true);
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when localStorage returns null", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);

        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when JSON.parse fails", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue("invalid-json");

        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });

    it("uses the correct localStorage key", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        readPrivacySettingsSnapshot();
        expect(window.localStorage.getItem).toHaveBeenCalledWith(PRIVACY_SETTINGS_STORAGE_KEY);
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when window is undefined", () => {
        vi.stubGlobal("window", undefined);
        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when document is undefined", () => {
        vi.stubGlobal("document", undefined);
        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });
});

describe("emitPrivacySettingsChanged", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            dispatchEvent: vi.fn(),
        });
        vi.stubGlobal("document", {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("does nothing when canUseDom is false", () => {
        vi.stubGlobal("window", undefined);
        emitPrivacySettingsChanged();
        // Just expect no errors.
    });

    it("dispatches a CustomEvent on window when canUseDom is true", () => {
        emitPrivacySettingsChanged();
        expect(window.dispatchEvent).toHaveBeenCalled();
        const callArgs = vi.mocked(window.dispatchEvent).mock.calls[0];
        expect(callArgs[0]).toBeInstanceOf(CustomEvent);
        expect((callArgs[0] as CustomEvent).type).toBe("kandydrops-privacy-updated");
    });
});

describe("subscribeToPrivacySettings", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
        vi.stubGlobal("document", {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns a no-op function when canUseDom is false", () => {
        vi.stubGlobal("window", undefined);
        const unsubscribe = subscribeToPrivacySettings(() => {});
        expect(unsubscribe).toBeInstanceOf(Function);
        expect(unsubscribe()).toBeUndefined();
    });

    it("adds event listeners for kandydrops-privacy-updated and storage", () => {
        const callback = vi.fn();
        subscribeToPrivacySettings(callback);
        expect(window.addEventListener).toHaveBeenCalledWith("kandydrops-privacy-updated", expect.any(Function));
        expect(window.addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    });

    it("returns an unsubscribe function that removes listeners", () => {
        const callback = vi.fn();
        const unsubscribe = subscribeToPrivacySettings(callback);

        unsubscribe();
        expect(window.removeEventListener).toHaveBeenCalledWith("kandydrops-privacy-updated", expect.any(Function));
        expect(window.removeEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    });

    it("calls the provided callback when event occurs", () => {
        const callback = vi.fn();
        subscribeToPrivacySettings(callback);

        const handler = vi.mocked(window.addEventListener).mock.calls[0][1] as EventListener;
        handler(new Event("kandydrops-privacy-updated"));

        expect(callback).toHaveBeenCalled();
    });
});

describe("applyAnalyticsConsentToGtag", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            gtag: vi.fn(),
        });
        vi.stubGlobal("document", {});
        vi.stubGlobal("navigator", {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("does nothing when window is undefined", () => {
        vi.stubGlobal("window", undefined);
        applyAnalyticsConsentToGtag();
        // Should not throw
    });

    it("does nothing when window.gtag is not a function", () => {
        vi.stubGlobal("window", { gtag: undefined });
        applyAnalyticsConsentToGtag();
        // Should not throw
    });

    it("grants analytics_storage when anonymousAnalyticsEnabled is true", () => {
        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "granted",
            ad_storage: "denied",
            functionality_storage: "granted",
            security_storage: "granted",
        }));
    });

    it("denies analytics_storage when anonymousAnalyticsEnabled is false", () => {
        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: false,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "denied",
        }));
    });

    it("denies analytics_storage when globalPrivacyControl is honored and active", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });

        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: true,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "denied",
        }));
    });

    it("grants analytics_storage when globalPrivacyControl is true but honorGlobalPrivacyControl is false", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });

        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "granted",
        }));
    });
});

describe("persistPrivacySettingsSnapshot", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
            },
            gtag: vi.fn(),
            dispatchEvent: vi.fn(),
            location: { protocol: "http:" },
        });
        vi.stubGlobal("document", { cookie: "" });
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("returns default settings and does not persist when canUseDom is false", () => {
        vi.stubGlobal("window", undefined);
        const snapshot = persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });

    it("persists to localStorage, sets cookie, applies to gtag, and emits event", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);

        const nextValue = { anonymousAnalyticsEnabled: true, honorGlobalPrivacyControl: false };
        const snapshot = persistPrivacySettingsSnapshot(nextValue);

        // Check local storage
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            PRIVACY_SETTINGS_STORAGE_KEY,
            JSON.stringify(snapshot)
        );

        // Check cookie
        expect(document.cookie).toContain(`${ANALYTICS_CONSENT_COOKIE}=granted`);
        expect(document.cookie).toContain("path=/");
        expect(document.cookie).toContain("max-age=31536000");
        expect(document.cookie).toContain("SameSite=Lax");

        // Check gtag application
        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "granted",
        }));

        // Check event emission
        expect(window.dispatchEvent).toHaveBeenCalled();
        const callArgs = vi.mocked(window.dispatchEvent).mock.calls[0];
        expect((callArgs[0] as CustomEvent).type).toBe("kandydrops-privacy-updated");
    });

    it("ignores localStorage setItem failures", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        vi.mocked(window.localStorage.setItem).mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });

        // Should not throw
        const snapshot = persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: false });
        expect(snapshot.anonymousAnalyticsEnabled).toBe(false);
    });

    it("adds Secure to cookie when protocol is https:", () => {
        vi.stubGlobal("window", {
            ...window,
            location: { protocol: "https:" },
        });
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);

        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: false });
        expect(document.cookie).toContain("Secure");
    });

    it("preserves previous timestamp when options.preserveTimestamp is true", () => {
        const previousTimestamp = 1234567890;
        vi.mocked(window.localStorage.getItem).mockReturnValue(JSON.stringify({
            ...DEFAULT_PRIVACY_SETTINGS,
            consentUpdatedAt: previousTimestamp,
        }));

        const snapshot = persistPrivacySettingsSnapshot(
            { anonymousAnalyticsEnabled: true, consentUpdatedAt: previousTimestamp },
            { preserveTimestamp: true }
        );

        expect(snapshot.consentUpdatedAt).toBe(previousTimestamp);
    });

    it("uses current timestamp when preserveTimestamp is false", () => {
        const previousTimestamp = 1234567890;
        vi.mocked(window.localStorage.getItem).mockReturnValue(JSON.stringify({
            ...DEFAULT_PRIVACY_SETTINGS,
            consentUpdatedAt: previousTimestamp,
        }));

        const snapshot = persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        // Timer is mocked to "2023-01-01T00:00:00.000Z"
        expect(snapshot.consentUpdatedAt).toBe(Date.now());
    });
});

describe("saveGuestAnalyticsConsent", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
            },
            gtag: vi.fn(),
            dispatchEvent: vi.fn(),
            location: { protocol: "http:" },
        });
        vi.stubGlobal("document", { cookie: "" });
        vi.stubGlobal("fetch", vi.fn());
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("makes a POST request and returns snapshot on success", async () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as Response);

        const snapshot = await saveGuestAnalyticsConsent(true);

        expect(fetch).toHaveBeenCalledWith("/api/privacy/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anonymousAnalyticsEnabled: true }),
        });
        expect(snapshot.anonymousAnalyticsEnabled).toBe(true);
        expect(snapshot.identifiedAnalyticsEnabled).toBe(false);
    });

    it("restores previous snapshot on fetch failure", async () => {
        const previousSnapshot = { ...DEFAULT_PRIVACY_SETTINGS, anonymousAnalyticsEnabled: false, consentUpdatedAt: 1000 };
        vi.mocked(window.localStorage.getItem).mockReturnValueOnce(JSON.stringify(previousSnapshot));

        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Server error" }),
        } as Response);

        await expect(saveGuestAnalyticsConsent(true)).rejects.toThrow("Server error");

        // Ensure localStorage was reverted
        expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
            PRIVACY_SETTINGS_STORAGE_KEY,
            JSON.stringify(previousSnapshot)
        );
    });

    it("throws a generic error message if the response has no error string", async () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({}), // no .error
        } as Response);

        await expect(saveGuestAnalyticsConsent(true)).rejects.toThrow("Failed to save privacy preference.");
    });
});

describe("canUseAnonymousAnalytics", () => {
    beforeEach(() => {
        vi.stubGlobal("navigator", {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns false if anonymousAnalyticsEnabled is false", () => {
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: false,
        })).toBe(false);
    });

    it("returns true if anonymousAnalyticsEnabled is true and honorGlobalPrivacyControl is false", () => {
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        })).toBe(true);
    });

    it("returns false if globalPrivacyControl is honored and active", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: true,
        })).toBe(false);
    });

    it("returns true if globalPrivacyControl is active but not honored", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        })).toBe(true);
    });
});

describe("canUseIdentifiedAnalytics", () => {
    beforeEach(() => {
        vi.stubGlobal("navigator", {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns false if identifiedAnalyticsEnabled is false", () => {
        expect(canUseIdentifiedAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            identifiedAnalyticsEnabled: false,
        })).toBe(false);
    });

    it("returns true if identifiedAnalyticsEnabled is true and honorGlobalPrivacyControl is false", () => {
        expect(canUseIdentifiedAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            identifiedAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        })).toBe(true);
    });

    it("returns false if globalPrivacyControl is honored and active", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(canUseIdentifiedAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            identifiedAnalyticsEnabled: true,
            honorGlobalPrivacyControl: true,
        })).toBe(false);
    });
});

describe("getBrowserGlobalPrivacyControl", () => {
    let originalNavigator: any;

    beforeEach(() => {
        originalNavigator = global.navigator;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns false when navigator is undefined", () => {
        vi.stubGlobal("navigator", undefined);
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });

    it("returns false when globalPrivacyControl is not set on navigator", () => {
        vi.stubGlobal("navigator", {});
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });

    it("returns true when globalPrivacyControl is true", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(getBrowserGlobalPrivacyControl()).toBe(true);
    });

    it("returns false when globalPrivacyControl is false", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: false });
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });
});
