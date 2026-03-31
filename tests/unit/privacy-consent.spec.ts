import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
    readPrivacySettingsSnapshot,
    PRIVACY_SETTINGS_STORAGE_KEY,
    getBrowserGlobalPrivacyControl,
    persistPrivacySettingsSnapshot,
    ANALYTICS_CONSENT_COOKIE,
} from "@/lib/privacy-consent";

const DEFAULT_PRIVACY_SETTINGS = {
    anonymousAnalyticsEnabled: false,
    identifiedAnalyticsEnabled: false,
    allowRecommendations: false,
    showInAnonymousStats: false,
    honorGlobalPrivacyControl: true,
    consentUpdatedAt: 0,
};

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

describe("persistPrivacySettingsSnapshot", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(1600000000000));

        vi.stubGlobal("window", {
            localStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
            },
            location: {
                protocol: "https:",
            },
            gtag: vi.fn(),
            dispatchEvent: vi.fn(),
        });

        // Use a getter/setter to mock document.cookie assignments
        let cookieValue = "";
        vi.stubGlobal("document", {});
        Object.defineProperty(document, "cookie", {
            get: () => cookieValue,
            set: (val) => { cookieValue = val; },
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when DOM is not available", () => {
        vi.stubGlobal("window", undefined);
        vi.stubGlobal("document", undefined);
        const snapshot = persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });

    it("merges next settings with current settings and sets consentUpdatedAt by default", () => {
        const storedValue = JSON.stringify({
            anonymousAnalyticsEnabled: false,
            allowRecommendations: true,
            consentUpdatedAt: 1000000000000,
        });
        vi.mocked(window.localStorage.getItem).mockReturnValue(storedValue);

        const snapshot = persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(snapshot.anonymousAnalyticsEnabled).toBe(true);
        expect(snapshot.allowRecommendations).toBe(true);
        expect(snapshot.consentUpdatedAt).toBe(1600000000000);
    });

    it("preserves consentUpdatedAt timestamp if preserveTimestamp option is true", () => {
        const storedValue = JSON.stringify({
            anonymousAnalyticsEnabled: false,
            allowRecommendations: true,
            consentUpdatedAt: 1000000000000,
        });
        vi.mocked(window.localStorage.getItem).mockReturnValue(storedValue);

        const snapshot = persistPrivacySettingsSnapshot(
            { anonymousAnalyticsEnabled: true, consentUpdatedAt: 1500000000000 },
            { preserveTimestamp: true }
        );

        expect(snapshot.consentUpdatedAt).toBe(1500000000000);
    });

    it("updates localStorage with the merged settings", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            PRIVACY_SETTINGS_STORAGE_KEY,
            expect.any(String)
        );

        const setItemCall = vi.mocked(window.localStorage.setItem).mock.calls[0];
        const mergedSettings = JSON.parse(setItemCall[1]);
        expect(mergedSettings.anonymousAnalyticsEnabled).toBe(true);
        expect(mergedSettings.consentUpdatedAt).toBe(1600000000000);
    });

    it("sets the document.cookie for analytics consent (granted) with Secure flag on https", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(document.cookie).toBe(`${ANALYTICS_CONSENT_COOKIE}=granted; path=/; max-age=31536000; SameSite=Lax; Secure`);
    });

    it("sets the document.cookie for analytics consent (denied) with Secure flag on https", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: false });

        expect(document.cookie).toBe(`${ANALYTICS_CONSENT_COOKIE}=denied; path=/; max-age=31536000; SameSite=Lax; Secure`);
    });

    it("sets the document.cookie for analytics consent without Secure flag on http", () => {
        window.location.protocol = "http:";
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(document.cookie).toBe(`${ANALYTICS_CONSENT_COOKIE}=granted; path=/; max-age=31536000; SameSite=Lax`);
    });

    it("calls window.gtag with updated consent", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "granted",
        }));
    });

    it("dispatches custom event kandydrops-privacy-updated", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));

        const event = vi.mocked(window.dispatchEvent).mock.calls[0][0] as CustomEvent;
        expect(event.type).toBe("kandydrops-privacy-updated");
    });

    it("ignores localStorage.setItem errors gracefully", () => {
        vi.mocked(window.localStorage.setItem).mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });

        expect(() => {
            persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });
        }).not.toThrow();

        // Ensure subsequent operations still run
        expect(document.cookie).toContain(ANALYTICS_CONSENT_COOKIE);
    });
});
