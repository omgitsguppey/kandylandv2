import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readPrivacySettingsSnapshot, PRIVACY_SETTINGS_STORAGE_KEY, getBrowserGlobalPrivacyControl } from "@/lib/privacy-consent";

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

    it("returns false when globalPrivacyControl is false", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: false });
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });

    it("returns true when globalPrivacyControl is true", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(getBrowserGlobalPrivacyControl()).toBe(true);
    });
});
