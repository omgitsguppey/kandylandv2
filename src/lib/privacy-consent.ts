"use client";

export const ANALYTICS_CONSENT_COOKIE = "kandydrops_analytics_consent";
export const PRIVACY_SETTINGS_STORAGE_KEY = "kandydrops.privacy.settings";
const CONSENT_EVENT_NAME = "kandydrops-privacy-updated";

export interface PrivacySettingsSnapshot {
    anonymousAnalyticsEnabled: boolean;
    identifiedAnalyticsEnabled: boolean;
    allowRecommendations: boolean;
    showInAnonymousStats: boolean;
    honorGlobalPrivacyControl: boolean;
    consentUpdatedAt: number;
}

interface PersistPrivacyOptions {
    preserveTimestamp?: boolean;
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsSnapshot = {
    anonymousAnalyticsEnabled: false,
    identifiedAnalyticsEnabled: false,
    allowRecommendations: false,
    showInAnonymousStats: false,
    honorGlobalPrivacyControl: true,
    consentUpdatedAt: 0,
};

export type PrivacyDataAvailabilityReason =
    | "full_signal"
    | "privacy_limited_identified_analytics_denied"
    | "privacy_limited_global_privacy_control";

function canUseDom() {
    return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getBrowserGlobalPrivacyControl() {
    if (typeof navigator === "undefined") {
        return false;
    }

    const browserNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
    return browserNavigator.globalPrivacyControl === true;
}

export function normalizePrivacySettingsSnapshot(
    value: Partial<PrivacySettingsSnapshot> | null | undefined,
): PrivacySettingsSnapshot {
    return {
        anonymousAnalyticsEnabled: value?.anonymousAnalyticsEnabled === true,
        identifiedAnalyticsEnabled: value?.identifiedAnalyticsEnabled === true,
        allowRecommendations: value?.allowRecommendations === true,
        showInAnonymousStats: value?.showInAnonymousStats === true,
        honorGlobalPrivacyControl: value?.honorGlobalPrivacyControl !== false,
        consentUpdatedAt: Number.isFinite(value?.consentUpdatedAt) ? Number(value?.consentUpdatedAt) : Date.now(),
    };
}

export function readPrivacySettingsSnapshot() {
    if (!canUseDom()) {
        return DEFAULT_PRIVACY_SETTINGS;
    }

    try {
        const raw = window.localStorage.getItem(PRIVACY_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return DEFAULT_PRIVACY_SETTINGS;
        }

        return normalizePrivacySettingsSnapshot(JSON.parse(raw) as Partial<PrivacySettingsSnapshot>);
    } catch {
        return DEFAULT_PRIVACY_SETTINGS;
    }
}

export function emitPrivacySettingsChanged() {
    if (!canUseDom()) {
        return;
    }

    window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME));
}

export function subscribeToPrivacySettings(callback: () => void) {
    if (!canUseDom()) {
        return () => undefined;
    }

    const handler = () => callback();
    window.addEventListener(CONSENT_EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
        window.removeEventListener(CONSENT_EVENT_NAME, handler);
        window.removeEventListener("storage", handler);
    };
}

export function applyAnalyticsConsentToGtag(settings: PrivacySettingsSnapshot = readPrivacySettingsSnapshot()) {
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
        return;
    }

    const granted = settings.anonymousAnalyticsEnabled &&
        !(settings.honorGlobalPrivacyControl && getBrowserGlobalPrivacyControl());

    window.gtag("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        functionality_storage: "granted",
        security_storage: "granted",
    });
}

export function persistPrivacySettingsSnapshot(
    nextValue: Partial<PrivacySettingsSnapshot>,
    options?: PersistPrivacyOptions,
) {
    if (!canUseDom()) {
        return DEFAULT_PRIVACY_SETTINGS;
    }

    const current = readPrivacySettingsSnapshot();
    const nextConsentUpdatedAt = options?.preserveTimestamp && Number.isFinite(nextValue.consentUpdatedAt)
        ? Number(nextValue.consentUpdatedAt)
        : Date.now();
    const merged = normalizePrivacySettingsSnapshot({
        ...current,
        ...nextValue,
        consentUpdatedAt: nextConsentUpdatedAt,
    });

    try {
        window.localStorage.setItem(PRIVACY_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
        // Ignore storage failures in restricted/private browsing contexts.
    }

    const cookieParts = [
        `${ANALYTICS_CONSENT_COOKIE}=${merged.anonymousAnalyticsEnabled ? "granted" : "denied"}`,
        "path=/",
        "max-age=31536000",
        "SameSite=Lax",
    ];
    if (window.location.protocol === "https:") {
        cookieParts.push("Secure");
    }

    document.cookie = cookieParts.join("; ");

    applyAnalyticsConsentToGtag(merged);
    emitPrivacySettingsChanged();
    return merged;
}

export async function saveGuestAnalyticsConsent(enabled: boolean) {
    const previousSnapshot = readPrivacySettingsSnapshot();
    const snapshot = persistPrivacySettingsSnapshot({
        anonymousAnalyticsEnabled: enabled,
        identifiedAnalyticsEnabled: false,
    });

    try {
        const response = await fetch("/api/privacy/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                anonymousAnalyticsEnabled: snapshot.anonymousAnalyticsEnabled,
            }),
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(typeof result?.error === "string" ? result.error : "Failed to save privacy preference.");
        }
    } catch (error) {
        persistPrivacySettingsSnapshot(previousSnapshot, { preserveTimestamp: true });
        throw error;
    }

    return snapshot;
}

export function canUseAnonymousAnalytics(settings: PrivacySettingsSnapshot = readPrivacySettingsSnapshot()) {
    if (!settings.anonymousAnalyticsEnabled) {
        return false;
    }

    if (settings.honorGlobalPrivacyControl && getBrowserGlobalPrivacyControl()) {
        return false;
    }

    return true;
}

export function canUseIdentifiedAnalytics(settings: PrivacySettingsSnapshot = readPrivacySettingsSnapshot()) {
    if (!settings.identifiedAnalyticsEnabled) {
        return false;
    }

    if (settings.honorGlobalPrivacyControl && getBrowserGlobalPrivacyControl()) {
        return false;
    }

    return true;
}

export function resolvePrivacyDataAvailabilityReason(
    settings: PrivacySettingsSnapshot = readPrivacySettingsSnapshot(),
): PrivacyDataAvailabilityReason {
    if (settings.honorGlobalPrivacyControl && getBrowserGlobalPrivacyControl()) {
        return "privacy_limited_global_privacy_control";
    }

    if (!settings.identifiedAnalyticsEnabled) {
        return "privacy_limited_identified_analytics_denied";
    }

    return "full_signal";
}
