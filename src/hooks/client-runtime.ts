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

export const ADMIN_OVERVIEW_SYNC_EVENT = CLIENT_RUNTIME_EVENTS.adminOverviewSync;

export async function hashIdentifier(id: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(id);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildOnboardingCompletionStorageKey(uid: string) {
    const hashedId = await hashIdentifier(uid);
    return `kandydrops_onboarding_completed_${hashedId}`;
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

export function dispatchAdminOverviewSync() {
    dispatchClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.adminOverviewSync);
}

export function listenForClientRuntimeEvent(eventName: string, listener: EventListener) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
}

export function listenForAdminOverviewSync(listener: EventListener) {
    return listenForClientRuntimeEvent(CLIENT_RUNTIME_EVENTS.adminOverviewSync, listener);
}
