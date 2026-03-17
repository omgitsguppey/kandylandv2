import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

import { app } from "./firebase";
import { isIOSNonStandalone, isStandalone } from "./browser-utils";

export const APP_NOTIFICATION_ICON = "/icon-192x192.png";

export interface BrowserNotificationState {
    browserCapable: boolean;
    messagingSupported: boolean;
    needsStandaloneInstall: boolean;
    permission: NotificationPermission | "unsupported";
    hasPermission: boolean;
    canPrompt: boolean;
    context: "browser" | "pwa";
}

interface BrowserNotificationAccess {
    granted: boolean;
    token: string | null;
    state: BrowserNotificationState;
}

function buildServiceWorkerUrl() {
    const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    return `/firebase-messaging-sw.js?apiKey=${config.apiKey}&projectId=${config.projectId}&messagingSenderId=${config.messagingSenderId}&appId=${config.appId}`;
}

export function getAppServiceWorkerUrl() {
    return buildServiceWorkerUrl();
}

export async function registerAppServiceWorker() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return null;
    }

    try {
        return await navigator.serviceWorker.register(getAppServiceWorkerUrl(), { scope: "/" });
    } catch (error) {
        console.error("Failed to register app service worker:", error);
        return null;
    }
}

export async function getBrowserNotificationState(): Promise<BrowserNotificationState> {
    const browserCapable = typeof window !== "undefined" && "Notification" in window;
    const permission = browserCapable ? Notification.permission : "unsupported";
    const needsStandaloneInstall = isIOSNonStandalone();
    const messagingSupported = browserCapable && !needsStandaloneInstall
        ? await isSupported().catch(() => false)
        : false;

    return {
        browserCapable,
        messagingSupported,
        needsStandaloneInstall,
        permission,
        hasPermission: permission === "granted",
        canPrompt: permission === "default",
        context: isStandalone() ? "pwa" : "browser",
    };
}

export async function requestBrowserNotificationAccess(): Promise<BrowserNotificationAccess> {
    const state = await getBrowserNotificationState();
    if (!state.browserCapable || state.needsStandaloneInstall) {
        return {
            granted: false,
            token: null,
            state,
        };
    }

    const permission = await Notification.requestPermission();
    const nextState: BrowserNotificationState = {
        ...state,
        permission,
        hasPermission: permission === "granted",
        canPrompt: false,
    };

    if (permission !== "granted") {
        return {
            granted: false,
            token: null,
            state: nextState,
        };
    }

    if (!nextState.messagingSupported) {
        return {
            granted: true,
            token: null,
            state: nextState,
        };
    }

    try {
        const messaging = getMessaging(app);
        const registration = await registerAppServiceWorker();
        if (!registration) {
            return {
                granted: true,
                token: null,
                state: nextState,
            };
        }

        const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        return {
            granted: true,
            token: token || null,
            state: nextState,
        };
    } catch (error) {
        console.error("Failed to finish browser notification setup:", error);
        return {
            granted: true,
            token: null,
            state: nextState,
        };
    }
}

export async function showBrowserNotification(title: string, body: string, url: string = "/experiences") {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
        return false;
    }

    const options = {
        body,
        icon: APP_NOTIFICATION_ICON,
        data: { url },
    };

    try {
        if ("serviceWorker" in navigator) {
            const registration = await registerAppServiceWorker() ?? await navigator.serviceWorker.ready;
            await registration.showNotification(title, options);
            return true;
        }
    } catch (error) {
        console.error("Service worker notification failed, falling back to window notification:", error);
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
        window.focus();
        window.location.assign(url);
        notification.close();
    };

    return true;
}

export const onNotificationMessage = (callback: (payload: unknown) => void) => {
    let cancelled = false;
    let unsubscribe = () => {};

    void isSupported().then((supported) => {
        if (!supported || cancelled) {
            return;
        }

        const messaging = getMessaging(app);
        unsubscribe = onMessage(messaging, callback);
    }).catch((error) => {
        console.error("Foreground notification listener setup failed:", error);
    });

    return () => {
        cancelled = true;
        unsubscribe();
    };
};
