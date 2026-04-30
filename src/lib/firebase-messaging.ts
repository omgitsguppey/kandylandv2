import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

import { app } from "./firebase";
import { isIOSNonStandalone, isStandalone } from "./browser-utils";
import { recordClientDiagnostic } from "./client-diagnostics";
import { FIREBASE_MESSAGING_CONFIG, FIREBASE_VAPID_KEY } from "./firebase-runtime";

const APP_NOTIFICATION_ICON = "/icon-192x192.png";

type BrowserNotificationOptions = {
    notificationId?: string | null;
    idempotencyKey?: string | null;
    tag?: string | null;
    type?: string | null;
};

interface BrowserNotificationState {
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

function resolveSafeNotificationUrl(rawUrl: string | undefined) {
    if (!rawUrl || typeof window === "undefined") {
        return "/experiences";
    }

    try {
        const parsed = new URL(rawUrl, window.location.origin);
        if (parsed.origin !== window.location.origin) {
            return "/experiences";
        }

        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return "/experiences";
    }
}

function buildServiceWorkerUrl() {
    return `/firebase-messaging-sw.js?apiKey=${FIREBASE_MESSAGING_CONFIG.apiKey}&projectId=${FIREBASE_MESSAGING_CONFIG.projectId}&messagingSenderId=${FIREBASE_MESSAGING_CONFIG.messagingSenderId}&appId=${FIREBASE_MESSAGING_CONFIG.appId}`;
}

function getAppServiceWorkerUrl() {
    return buildServiceWorkerUrl();
}

function cleanNotificationTagPart(value: string | null | undefined, fallback: string) {
    const cleaned = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9:_-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return cleaned || fallback;
}

function resolveBrowserNotificationTag(options: BrowserNotificationOptions, url: string) {
    if (options.tag) {
        return options.tag;
    }

    if (options.idempotencyKey) {
        return `kandydrops:${cleanNotificationTagPart(options.idempotencyKey, "notification")}`;
    }

    if (options.notificationId) {
        return `kandydrops:notification:${cleanNotificationTagPart(options.notificationId, "unknown")}`;
    }

    return `kandydrops:${cleanNotificationTagPart(options.type, "general")}:${cleanNotificationTagPart(url, "route")}`;
}

export async function registerAppServiceWorker() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return null;
    }

    try {
        return await navigator.serviceWorker.register(getAppServiceWorkerUrl(), { scope: "/" });
    } catch (error) {
        recordClientDiagnostic("firebase", "Service worker registration failed", {
            message: error instanceof Error ? error.message : String(error),
        });
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
            vapidKey: FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        return {
            granted: true,
            token: token || null,
            state: nextState,
        };
    } catch (error) {
        recordClientDiagnostic("firebase", "Browser notification setup failed", {
            message: error instanceof Error ? error.message : String(error),
        });
        return {
            granted: true,
            token: null,
            state: nextState,
        };
    }
}

export async function showBrowserNotification(
    title: string,
    body: string,
    url: string = "/experiences",
    options: BrowserNotificationOptions = {},
) {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
        return false;
    }

    const tag = resolveBrowserNotificationTag(options, url);
    const notificationOptions = {
        tag,
        renotify: false,
        body,
        icon: APP_NOTIFICATION_ICON,
        data: {
            url,
            notificationId: options.notificationId ?? null,
            idempotencyKey: options.idempotencyKey ?? null,
            tag,
            browserDisplayMode: "foreground-client",
        },
    };

    try {
        if ("serviceWorker" in navigator) {
            const registration = await registerAppServiceWorker() ?? await navigator.serviceWorker.ready;
            await registration.showNotification(title, notificationOptions);
            return true;
        }
    } catch (error) {
        recordClientDiagnostic("firebase", "Browser notification display fallback triggered", {
            message: error instanceof Error ? error.message : String(error),
        });
    }

    const notification = new Notification(title, notificationOptions);
    notification.onclick = () => {
        window.focus();
        window.location.assign(resolveSafeNotificationUrl(url));
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
        recordClientDiagnostic("firebase", "Foreground notification listener setup failed", {
            message: error instanceof Error ? error.message : String(error),
        });
    });

    return () => {
        cancelled = true;
        unsubscribe();
    };
};
