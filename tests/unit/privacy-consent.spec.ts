import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readPrivacySettingsSnapshot, PRIVACY_SETTINGS_STORAGE_KEY, getBrowserGlobalPrivacyControl, subscribeToPrivacySettings } from "@/lib/privacy-consent";

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

describe("subscribeToPrivacySettings", () => {
    let originalWindow: any;
    let originalDocument: any;

    beforeEach(() => {
        originalWindow = global.window;
        originalDocument = global.document;

        vi.stubGlobal("window", {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            localStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
            },
        });
        vi.stubGlobal("document", {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns a no-op function when window is not available", () => {
        vi.stubGlobal("window", undefined);
        vi.stubGlobal("document", undefined);

        const callback = vi.fn();
        const unsubscribe = subscribeToPrivacySettings(callback);

        expect(typeof unsubscribe).toBe("function");
        expect(unsubscribe()).toBeUndefined();
    });

    it("attaches event listeners to window", () => {
        const callback = vi.fn();
        subscribeToPrivacySettings(callback);

        expect(window.addEventListener).toHaveBeenCalledWith("kandydrops-privacy-updated", expect.any(Function));
        expect(window.addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    });

    it("removes event listeners when unsubscribed", () => {
        const callback = vi.fn();
        const unsubscribe = subscribeToPrivacySettings(callback);

        unsubscribe();

        expect(window.removeEventListener).toHaveBeenCalledWith("kandydrops-privacy-updated", expect.any(Function));
        expect(window.removeEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    });

    it("calls the provided callback when kandydrops-privacy-updated is fired", () => {
        let handler: any;
        vi.mocked(window.addEventListener).mockImplementation((event, cb) => {
            if (event === "kandydrops-privacy-updated") {
                handler = cb;
            }
        });

        const callback = vi.fn();
        subscribeToPrivacySettings(callback);

        // Simulate the event firing
        handler(new Event("kandydrops-privacy-updated"));

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("calls the provided callback when storage event is fired", () => {
        let handler: any;
        vi.mocked(window.addEventListener).mockImplementation((event, cb) => {
            if (event === "storage") {
                handler = cb;
            }
        });

        const callback = vi.fn();
        subscribeToPrivacySettings(callback);

        // Simulate the event firing
        handler(new Event("storage"));

        expect(callback).toHaveBeenCalledTimes(1);
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
