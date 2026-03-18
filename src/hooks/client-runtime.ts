"use client";

export const CLIENT_RUNTIME_STORAGE_KEYS = {
    analyticsSessionId: "kandy_session_id",
    referralCode: "kandy_referral",
} as const;

export const CLIENT_RUNTIME_EVENTS = {
    notificationsSync: "kandydrops:notifications-sync",
    openNotifications: "kandydrops:open-notifications",
    adminOverviewSync: "kandydrops:admin-overview-sync",
} as const;

export function buildOnboardingCompletionStorageKey(uid: string) {
    return `kandydrops_onboarding_completed_${uid}`;
}

export function readSessionStorageValue(key: string) {
    if (typeof window === "undefined") {
        return null;
    }

    return window.sessionStorage.getItem(key);
}

export function writeSessionStorageValue(key: string, value: string) {
    if (typeof window === "undefined") {
        return;
    }

    window.sessionStorage.setItem(key, value);
}

export function dispatchClientRuntimeEvent(eventName: string) {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(eventName));
}
