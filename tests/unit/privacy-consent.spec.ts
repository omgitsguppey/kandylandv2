import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    ANALYTICS_CONSENT_COOKIE,
    applyAnalyticsConsentToGtag,
    buildAccountPrivacySettingsFromConsentSnapshot,
    canUseAnonymousAnalytics,
    canUseBehavioralAnalytics,
    canUseExternalAnalyticsFromPrivacy,
    canUseIdentifiedAnalytics,
    emitPrivacySettingsChanged,
    getBrowserGlobalPrivacyControl,
    normalizePrivacySettingsSnapshot,
    persistPrivacySettingsSnapshot,
    PRIVACY_SETTINGS_STORAGE_KEY,
    readPrivacySettingsSnapshot,
    saveGuestAnalyticsConsent,
    shouldSyncGuestConsentToAccount,
    subscribeToPrivacySettings,
    type PrivacySettingsSnapshot,
} from "@/lib/privacy-consent";
import {
    canTrackEvent,
    resolveConsentMode,
} from "@/lib/privacy/consent-tracking-policy";

const DEFAULT_PRIVACY_SETTINGS = {
    consentMode: "unknown",
    consentDecision: null,
    consentSource: "unknown",
    consentPolicyVersion: "2026-05-consent-tracking-v1",
    anonymousAnalyticsEnabled: false,
    identifiedAnalyticsEnabled: false,
    allowRecommendations: false,
    showInAnonymousStats: false,
    honorGlobalPrivacyControl: true,
    consentUpdatedAt: 0,
} satisfies PrivacySettingsSnapshot;

describe("normalizePrivacySettingsSnapshot", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-01T00:00:00Z").getTime());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns safe defaults without inventing an explicit consent timestamp", () => {
        expect(normalizePrivacySettingsSnapshot(null)).toEqual(DEFAULT_PRIVACY_SETTINGS);
        expect(normalizePrivacySettingsSnapshot(undefined)).toEqual(DEFAULT_PRIVACY_SETTINGS);
    });

    it("preserves valid truthy boolean fields", () => {
        const input = {
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            showInAnonymousStats: true,
        };

        const result = normalizePrivacySettingsSnapshot(input);
        expect(result.anonymousAnalyticsEnabled).toBe(true);
        expect(result.identifiedAnalyticsEnabled).toBe(true);
        expect(result.allowRecommendations).toBe(true);
        expect(result.showInAnonymousStats).toBe(true);
    });

    it("preserves falsey values over defaults", () => {
        const input = { honorGlobalPrivacyControl: false };
        const result = normalizePrivacySettingsSnapshot(input);
        expect(result.honorGlobalPrivacyControl).toBe(false);
    });

    it("preserves valid numeric consentUpdatedAt", () => {
        const timestamp = 123456789;
        const result = normalizePrivacySettingsSnapshot({ consentUpdatedAt: timestamp });
        expect(result.consentUpdatedAt).toBe(timestamp);
    });

    it("keeps invalid consentUpdatedAt non-explicit so the banner can still show", () => {
        expect(normalizePrivacySettingsSnapshot({ consentUpdatedAt: NaN as never }).consentUpdatedAt).toBe(0);
        expect(normalizePrivacySettingsSnapshot({ consentUpdatedAt: Infinity as never }).consentUpdatedAt).toBe(0);
        expect(normalizePrivacySettingsSnapshot({ consentUpdatedAt: -Infinity as never }).consentUpdatedAt).toBe(0);
        expect(normalizePrivacySettingsSnapshot({ consentUpdatedAt: "123" as never }).consentUpdatedAt).toBe(0);
    });

    it("normalizes consent levels without overstating anonymous analytics as behavioral", () => {
        const declined = normalizePrivacySettingsSnapshot({
            anonymousAnalyticsEnabled: false,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            consentUpdatedAt: 1,
        });
        const minimal = normalizePrivacySettingsSnapshot({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            consentUpdatedAt: 1,
        });
        const fullAnalytics = normalizePrivacySettingsSnapshot({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: false,
            consentUpdatedAt: 1,
        });
        const acceptAll = normalizePrivacySettingsSnapshot({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            consentUpdatedAt: 1,
        });

        expect(declined.consentMode).toBe("necessary_only");
        expect(minimal.consentMode).toBe("minimal_analytics");
        expect(fullAnalytics.consentMode).toBe("full_analytics");
        expect(acceptAll.consentMode).toBe("full_behavioral");
        expect(canTrackEvent("wallet_opened", minimal.consentMode)).toBe(true);
        expect(canTrackEvent("semantic_target_clicked", minimal.consentMode)).toBe(false);
        expect(canTrackEvent("semantic_target_clicked", fullAnalytics.consentMode)).toBe(false);
        expect(canTrackEvent("semantic_target_clicked", acceptAll.consentMode)).toBe(true);
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
        expect(snapshot.consentMode).toBe("minimal_analytics");
        expect(snapshot.consentUpdatedAt).toBe(123456789);
        expect(snapshot.identifiedAnalyticsEnabled).toBe(false);
        expect(snapshot.honorGlobalPrivacyControl).toBe(true);
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when localStorage returns null", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);

        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
        expect(snapshot.consentUpdatedAt).toBe(0);
    });

    it("returns DEFAULT_PRIVACY_SETTINGS when JSON.parse fails", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue("invalid-json");

        const snapshot = readPrivacySettingsSnapshot();
        expect(snapshot).toEqual(DEFAULT_PRIVACY_SETTINGS);
        expect(snapshot.consentUpdatedAt).toBe(0);
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

    it("does nothing when DOM is unavailable", () => {
        vi.stubGlobal("window", undefined);
        emitPrivacySettingsChanged();
    });

    it("dispatches a CustomEvent when DOM is available", () => {
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
        let handler: EventListener | undefined;
        vi.mocked(window.addEventListener).mockImplementation((event, cb) => {
            if (event === "kandydrops-privacy-updated") {
                handler = cb as EventListener;
            }
        });

        const callback = vi.fn();
        subscribeToPrivacySettings(callback);
        handler?.(new Event("kandydrops-privacy-updated"));

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("calls the provided callback when storage event is fired", () => {
        let handler: EventListener | undefined;
        vi.mocked(window.addEventListener).mockImplementation((event, cb) => {
            if (event === "storage") {
                handler = cb as EventListener;
            }
        });

        const callback = vi.fn();
        subscribeToPrivacySettings(callback);
        handler?.(new Event("storage"));

        expect(callback).toHaveBeenCalledTimes(1);
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
    });

    it("does nothing when window.gtag is not a function", () => {
        vi.stubGlobal("window", { gtag: undefined });
        applyAnalyticsConsentToGtag();
    });

    it("denies external analytics_storage for anonymous-only minimal analytics", () => {
        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "denied",
            ad_storage: "denied",
            functionality_storage: "granted",
            security_storage: "granted",
        }));
    });

    it("grants analytics_storage for full account analytics when GPC is not blocking", () => {
        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "granted",
            ad_storage: "denied",
            functionality_storage: "granted",
            security_storage: "granted",
        }));
    });

    it("denies analytics_storage when anonymous analytics is disabled", () => {
        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: false,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "denied",
        }));
    });

    it("denies analytics_storage when global privacy control is honored and active", () => {
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

    it("keeps anonymous-only external analytics denied when GPC is active but not honored", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });

        applyAnalyticsConsentToGtag({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "denied",
        }));
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

        let cookieValue = "";
        vi.stubGlobal("document", {});
        Object.defineProperty(document, "cookie", {
            get: () => cookieValue,
            set: (val) => {
                cookieValue = val;
            },
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

    it("preserves consentUpdatedAt when preserveTimestamp is true", () => {
        const storedValue = JSON.stringify({
            anonymousAnalyticsEnabled: false,
            allowRecommendations: true,
            consentUpdatedAt: 1000000000000,
        });
        vi.mocked(window.localStorage.getItem).mockReturnValue(storedValue);

        const snapshot = persistPrivacySettingsSnapshot(
            { anonymousAnalyticsEnabled: true, consentUpdatedAt: 1500000000000 },
            { preserveTimestamp: true },
        );

        expect(snapshot.consentUpdatedAt).toBe(1500000000000);
    });

    it("updates localStorage with the merged settings", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            PRIVACY_SETTINGS_STORAGE_KEY,
            expect.any(String),
        );

        const setItemCall = vi.mocked(window.localStorage.setItem).mock.calls[0];
        const mergedSettings = JSON.parse(setItemCall[1]);
        expect(mergedSettings.anonymousAnalyticsEnabled).toBe(true);
        expect(mergedSettings.consentUpdatedAt).toBe(1600000000000);
    });

    it("sets the analytics consent cookie to minimal analytics on anonymous-only https", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(document.cookie).toBe(`${ANALYTICS_CONSENT_COOKIE}=minimal_analytics; path=/; max-age=31536000; SameSite=Lax; Secure`);
    });

    it("sets the analytics consent cookie to necessary only on https", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: false });

        expect(document.cookie).toBe(`${ANALYTICS_CONSENT_COOKIE}=necessary_only; path=/; max-age=31536000; SameSite=Lax; Secure`);
    });

    it("omits Secure from the analytics consent cookie on http", () => {
        window.location.protocol = "http:";
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(document.cookie).toBe(`${ANALYTICS_CONSENT_COOKIE}=minimal_analytics; path=/; max-age=31536000; SameSite=Lax`);
    });

    it("calls window.gtag with updated consent", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(window.gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
            analytics_storage: "denied",
        }));
    });

    it("dispatches a kandydrops-privacy-updated event", () => {
        persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });

        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        const event = vi.mocked(window.dispatchEvent).mock.calls[0][0] as CustomEvent;
        expect(event.type).toBe("kandydrops-privacy-updated");
    });

    it("ignores localStorage.setItem failures gracefully", () => {
        vi.mocked(window.localStorage.setItem).mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });

        expect(() => {
            persistPrivacySettingsSnapshot({ anonymousAnalyticsEnabled: true });
        }).not.toThrow();

        expect(document.cookie).toContain(ANALYTICS_CONSENT_COOKIE);
    });
});

describe("privacy consent capability levels", () => {
    beforeEach(() => {
        vi.stubGlobal("navigator", {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("resolves anonymous-only, identified-only, accept-all, and GPC override semantics", () => {
        expect(resolveConsentMode({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            consentUpdatedAt: 1,
        })).toBe("minimal_analytics");
        expect(resolveConsentMode({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: false,
            consentUpdatedAt: 1,
        })).toBe("full_analytics");
        expect(resolveConsentMode({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            consentUpdatedAt: 1,
        })).toBe("full_behavioral");
        expect(resolveConsentMode({
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            honorGlobalPrivacyControl: true,
            globalPrivacyControl: true,
        })).toBe("necessary_only");
    });

    it("allows minimal product telemetry while denying behavioral personalization", () => {
        const minimal = {
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            consentUpdatedAt: 1,
        };
        const fullAnalytics = {
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: false,
            consentUpdatedAt: 1,
        };
        const acceptAll = {
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            consentUpdatedAt: 1,
        };

        expect(canUseAnonymousAnalytics(minimal)).toBe(true);
        expect(canUseIdentifiedAnalytics(minimal)).toBe(false);
        expect(canUseBehavioralAnalytics(minimal)).toBe(false);
        expect(canUseExternalAnalyticsFromPrivacy(minimal)).toBe(false);

        expect(canUseAnonymousAnalytics(fullAnalytics)).toBe(true);
        expect(canUseIdentifiedAnalytics(fullAnalytics)).toBe(true);
        expect(canUseBehavioralAnalytics(fullAnalytics)).toBe(false);
        expect(canUseExternalAnalyticsFromPrivacy(fullAnalytics)).toBe(true);

        expect(canUseAnonymousAnalytics(acceptAll)).toBe(true);
        expect(canUseIdentifiedAnalytics(acceptAll)).toBe(true);
        expect(canUseBehavioralAnalytics(acceptAll)).toBe(true);
        expect(canUseExternalAnalyticsFromPrivacy(acceptAll)).toBe(true);
    });

    it("builds account privacy settings with consent metadata for server round trips", () => {
        const accountSettings = buildAccountPrivacySettingsFromConsentSnapshot({
            ...DEFAULT_PRIVACY_SETTINGS,
            consentMode: "full_behavioral",
            consentDecision: "accept_all",
            consentSource: "banner",
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            showInAnonymousStats: true,
            consentUpdatedAt: 1700000000000,
        });

        expect(accountSettings).toEqual({
            consentMode: "full_behavioral",
            consentDecision: "accept_all",
            consentSource: "banner",
            consentPolicyVersion: "2026-05-consent-tracking-v1",
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            showInAnonymousStats: true,
            honorGlobalPrivacyControl: true,
            consentUpdatedAt: 1700000000000,
        });
    });

    it("carries guest accept-all consent into signup when the account has no explicit setting", () => {
        const guestAcceptAll = normalizePrivacySettingsSnapshot({
            consentMode: "full_behavioral",
            consentDecision: "accept_all",
            consentSource: "banner",
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            showInAnonymousStats: true,
            consentUpdatedAt: 1700000000000,
        });

        expect(shouldSyncGuestConsentToAccount(guestAcceptAll, undefined)).toBe(true);
        expect(buildAccountPrivacySettingsFromConsentSnapshot(guestAcceptAll)).toMatchObject({
            consentMode: "full_behavioral",
            consentDecision: "accept_all",
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            showInAnonymousStats: true,
            consentUpdatedAt: 1700000000000,
        });
    });

    it("carries guest minimal consent into signup without enabling behavioral personalization", () => {
        const guestMinimal = normalizePrivacySettingsSnapshot({
            consentMode: "minimal_analytics",
            consentDecision: "minimal",
            consentSource: "banner",
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            showInAnonymousStats: true,
            consentUpdatedAt: 1700000000001,
        });

        expect(shouldSyncGuestConsentToAccount(guestMinimal, { consentUpdatedAt: 0 })).toBe(true);
        expect(buildAccountPrivacySettingsFromConsentSnapshot(guestMinimal)).toMatchObject({
            consentMode: "minimal_analytics",
            consentDecision: "minimal",
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: false,
            allowRecommendations: false,
            showInAnonymousStats: true,
            consentUpdatedAt: 1700000000001,
        });
    });

    it("does not override explicit account privacy metadata even when a legacy account timestamp is missing", () => {
        const guestAcceptAll = normalizePrivacySettingsSnapshot({
            consentMode: "full_behavioral",
            consentDecision: "accept_all",
            consentSource: "banner",
            anonymousAnalyticsEnabled: true,
            identifiedAnalyticsEnabled: true,
            allowRecommendations: true,
            showInAnonymousStats: true,
            consentUpdatedAt: 1700000000002,
        });

        expect(shouldSyncGuestConsentToAccount(guestAcceptAll, {
            consentMode: "minimal_analytics",
            consentDecision: "minimal",
            consentSource: "account_settings",
            consentUpdatedAt: 0,
        })).toBe(false);
        expect(shouldSyncGuestConsentToAccount(guestAcceptAll, {
            consentMode: "minimal_analytics",
            consentDecision: "minimal",
            consentSource: "legacy_default",
            consentUpdatedAt: 0,
        })).toBe(true);
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

    it("makes a POST request and returns a snapshot on success", async () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as Response);

        const snapshot = await saveGuestAnalyticsConsent(true);

        expect(fetch).toHaveBeenCalledWith("/api/privacy/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                anonymousAnalyticsEnabled: true,
                consentMode: "full_behavioral",
                consentDecision: "accept_all",
                consentSource: "banner",
                consentPolicyVersion: "2026-05-consent-tracking-v1",
            }),
        });
        expect(snapshot.anonymousAnalyticsEnabled).toBe(true);
        expect(snapshot.identifiedAnalyticsEnabled).toBe(true);
    });

    it("restores the previous snapshot on fetch failure", async () => {
        const previousSnapshot = {
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: false,
            consentUpdatedAt: 1000,
        };
        vi.mocked(window.localStorage.getItem).mockReturnValueOnce(JSON.stringify(previousSnapshot));

        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Server error" }),
        } as Response);

        await expect(saveGuestAnalyticsConsent(true)).rejects.toThrow("Server error");
        expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
            PRIVACY_SETTINGS_STORAGE_KEY,
            JSON.stringify({
                ...previousSnapshot,
                consentMode: "necessary_only",
            }),
        );
    });

    it("throws a generic error when the response has no error string", async () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({}),
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

    it("returns false when anonymousAnalyticsEnabled is false", () => {
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: false,
        })).toBe(false);
    });

    it("returns true when anonymous analytics is enabled and GPC is not honored", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        })).toBe(true);
    });

    it("returns false when global privacy control is honored and active", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: true,
        })).toBe(false);
    });

    it("returns true when anonymous analytics is enabled and GPC is inactive", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: false });
        expect(canUseAnonymousAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            anonymousAnalyticsEnabled: true,
            honorGlobalPrivacyControl: true,
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

    it("returns false when identifiedAnalyticsEnabled is false", () => {
        expect(canUseIdentifiedAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            identifiedAnalyticsEnabled: false,
        })).toBe(false);
    });

    it("returns true when identified analytics is enabled and GPC is not honored", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(canUseIdentifiedAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            identifiedAnalyticsEnabled: true,
            honorGlobalPrivacyControl: false,
        })).toBe(true);
    });

    it("returns false when global privacy control is honored and active", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: true });
        expect(canUseIdentifiedAnalytics({
            ...DEFAULT_PRIVACY_SETTINGS,
            identifiedAnalyticsEnabled: true,
            honorGlobalPrivacyControl: true,
        })).toBe(false);
    });
});

describe("getBrowserGlobalPrivacyControl", () => {
    beforeEach(() => {
        vi.stubGlobal("navigator", {});
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

    it("returns false when globalPrivacyControl is a string", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: "true" });
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });

    it("returns false when globalPrivacyControl is a number", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: 1 });
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });

    it("returns false when globalPrivacyControl is null", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: null });
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });

    it("returns false when globalPrivacyControl is undefined", () => {
        vi.stubGlobal("navigator", { globalPrivacyControl: undefined });
        expect(getBrowserGlobalPrivacyControl()).toBe(false);
    });
});
