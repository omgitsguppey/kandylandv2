"use client";

import {
    CONSENT_DECISION_VALUES,
    CONSENT_MODE_VALUES,
    CONSENT_SOURCE_VALUES,
    CONSENT_TRACKING_STORAGE_KEYS,
    CONSENT_TRACKING_VERSION,
    type ConsentDecision,
    type ConsentMode,
    type ConsentSource,
} from "@/lib/privacy/consent-tracking-contract";
import {
    buildConsentSettingsFromDecision,
    canPersistIdentityLink,
    canUseBehavioralSignals,
    canUseExternalAnalytics,
    resolveConsentMode,
} from "@/lib/privacy/consent-tracking-policy";

export const ANALYTICS_CONSENT_COOKIE = CONSENT_TRACKING_STORAGE_KEYS.cookie;
export const PRIVACY_SETTINGS_STORAGE_KEY = CONSENT_TRACKING_STORAGE_KEYS.localStorage;
const CONSENT_EVENT_NAME = CONSENT_TRACKING_STORAGE_KEYS.eventName;

export interface PrivacySettingsSnapshot {
    consentMode: ConsentMode;
    consentDecision: ConsentDecision | null;
    consentSource: ConsentSource;
    consentPolicyVersion: typeof CONSENT_TRACKING_VERSION;
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

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsSnapshot = {
    consentMode: "unknown",
    consentDecision: null,
    consentSource: "unknown",
    consentPolicyVersion: CONSENT_TRACKING_VERSION,
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

export type AccountPrivacySettingsInput = Partial<Pick<
    PrivacySettingsSnapshot,
    | "consentMode"
    | "consentDecision"
    | "consentSource"
    | "consentPolicyVersion"
    | "anonymousAnalyticsEnabled"
    | "identifiedAnalyticsEnabled"
    | "allowRecommendations"
    | "showInAnonymousStats"
    | "honorGlobalPrivacyControl"
    | "consentUpdatedAt"
>>;

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
    const consentMode = resolveConsentMode(value);
    const legacyAccepted = !value?.consentMode && value?.anonymousAnalyticsEnabled === true;
    const minimalAllowed = consentMode === "minimal_analytics" || consentMode === "full_analytics" || consentMode === "full_behavioral";
    const identifiedAllowed = consentMode === "full_analytics" || consentMode === "full_behavioral";
    const behavioralAllowed = consentMode === "full_behavioral";
    return {
        consentMode,
        consentDecision: value?.consentDecision ?? (legacyAccepted ? "minimal" : null),
        consentSource: value?.consentSource ?? (legacyAccepted ? "legacy_default" : "unknown"),
        consentPolicyVersion: CONSENT_TRACKING_VERSION,
        anonymousAnalyticsEnabled: value?.anonymousAnalyticsEnabled === true || minimalAllowed,
        identifiedAnalyticsEnabled: value?.identifiedAnalyticsEnabled === true || identifiedAllowed,
        allowRecommendations: value?.allowRecommendations === true || behavioralAllowed,
        showInAnonymousStats: value?.showInAnonymousStats === true || minimalAllowed,
        honorGlobalPrivacyControl: value?.honorGlobalPrivacyControl !== false,
        consentUpdatedAt: Number.isFinite(value?.consentUpdatedAt) ? Number(value?.consentUpdatedAt) : 0,
    };
}

export function hasExplicitConsentPreference(value: {
    consentUpdatedAt?: unknown;
    consentDecision?: unknown;
    consentSource?: unknown;
    consentMode?: unknown;
} | null | undefined) {
    if (Number.isFinite(value?.consentUpdatedAt) && Number(value?.consentUpdatedAt) > 0) {
        return true;
    }

    const consentSource = CONSENT_SOURCE_VALUES.includes(value?.consentSource as ConsentSource)
        ? value?.consentSource as ConsentSource
        : "unknown";
    const hasExplicitSource = consentSource === "banner" || consentSource === "account_settings";
    const hasExplicitDecision = CONSENT_DECISION_VALUES.includes(value?.consentDecision as ConsentDecision);
    const consentMode = CONSENT_MODE_VALUES.includes(value?.consentMode as ConsentMode)
        ? value?.consentMode as ConsentMode
        : "unknown";

    return hasExplicitSource && (hasExplicitDecision || consentMode !== "unknown");
}

export function buildAccountPrivacySettingsFromConsentSnapshot(
    snapshot: PrivacySettingsSnapshot,
): Required<Omit<AccountPrivacySettingsInput, "consentDecision">> & Pick<PrivacySettingsSnapshot, "consentDecision"> {
    const consentMode = resolveConsentMode(snapshot);
    const minimalAllowed = consentMode === "minimal_analytics" || consentMode === "full_analytics" || consentMode === "full_behavioral";
    const identifiedAllowed = consentMode === "full_analytics" || consentMode === "full_behavioral";
    const fullBehavioralAllowed = consentMode === "full_behavioral";

    return {
        consentMode,
        consentDecision: snapshot.consentDecision,
        consentSource: snapshot.consentSource,
        consentPolicyVersion: snapshot.consentPolicyVersion,
        anonymousAnalyticsEnabled: minimalAllowed,
        identifiedAnalyticsEnabled: identifiedAllowed,
        allowRecommendations: fullBehavioralAllowed,
        showInAnonymousStats: minimalAllowed,
        honorGlobalPrivacyControl: snapshot.honorGlobalPrivacyControl !== false,
        consentUpdatedAt: hasExplicitConsentPreference(snapshot) ? snapshot.consentUpdatedAt : Date.now(),
    };
}

export function shouldSyncGuestConsentToAccount(
    guestSnapshot: PrivacySettingsSnapshot | null | undefined,
    accountPrivacySettings: AccountPrivacySettingsInput | null | undefined,
) {
    return hasExplicitConsentPreference(guestSnapshot)
        && !hasExplicitConsentPreference(accountPrivacySettings);
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

    const granted = canUseExternalAnalytics(resolveConsentMode({
        ...settings,
        globalPrivacyControl: getBrowserGlobalPrivacyControl(),
    }));

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
        `${ANALYTICS_CONSENT_COOKIE}=${merged.consentMode}`,
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
    return saveGuestConsentDecision(enabled ? "accept_all" : "decline_optional");
}

export async function saveGuestConsentDecision(decision: ConsentDecision) {
    const previousSnapshot = readPrivacySettingsSnapshot();
    const snapshot = persistPrivacySettingsSnapshot(buildConsentSettingsFromDecision(decision, "banner"));

    try {
        const response = await fetch("/api/privacy/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                anonymousAnalyticsEnabled: snapshot.anonymousAnalyticsEnabled,
                consentMode: snapshot.consentMode,
                consentDecision: snapshot.consentDecision,
                consentSource: snapshot.consentSource,
                consentPolicyVersion: snapshot.consentPolicyVersion,
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
    const consentMode = resolveConsentMode({
        ...settings,
        globalPrivacyControl: getBrowserGlobalPrivacyControl(),
    });
    return consentMode === "minimal_analytics" || consentMode === "full_analytics" || consentMode === "full_behavioral";
}

export function canUseIdentifiedAnalytics(settings: PrivacySettingsSnapshot = readPrivacySettingsSnapshot()) {
    return canPersistIdentityLink(resolveConsentMode({
        ...settings,
        globalPrivacyControl: getBrowserGlobalPrivacyControl(),
    }));
}

export function canUseBehavioralAnalytics(settings: PrivacySettingsSnapshot = readPrivacySettingsSnapshot()) {
    return canUseBehavioralSignals(resolveConsentMode({
        ...settings,
        globalPrivacyControl: getBrowserGlobalPrivacyControl(),
    }));
}

export function canUseExternalAnalyticsFromPrivacy(settings: PrivacySettingsSnapshot = readPrivacySettingsSnapshot()) {
    return canUseExternalAnalytics(resolveConsentMode({
        ...settings,
        globalPrivacyControl: getBrowserGlobalPrivacyControl(),
    }));
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
