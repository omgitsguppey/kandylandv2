const FIREBASE_SDK_VERSION = "12.10.0";

importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`);
importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-messaging-compat.js`);

const CACHE_NAME_PREFIXES = {
    appShell: "kandydrops-app-shell-",
    runtime: "kandydrops-runtime-",
};
const APP_SHELL_CACHE = "kandydrops-app-shell-v3";
const APP_RUNTIME_CACHE = "kandydrops-runtime-v3";
const NOTIFICATION_ICON = "/icon-192x192.png";
const OFFLINE_FALLBACK_URL = "/offline";
const PRECACHE_URLS = [
    "/",
    "/drops",
    "/offline",
    "/manifest.json",
    "/candy-main.svg",
    "/candy-3d-glass.png",
    "/icon-192x192.png",
    "/icon-512x512.png",
];
const FORBIDDEN_CACHE_PATH_PREFIXES = [
    "/api/paypal",
    "/api/checkout",
    "/api/wallet",
    "/api/chat",
    "/api/creator/messages",
    "/api/auth",
    "/api/user",
    "/api/notifications",
    "/api/admin",
    "/__/auth",
    "/__/firebase",
    "/dashboard/chat",
    "/dashboard/library",
    "/dashboard/wallet",
    "/wallet",
    "/checkout",
    "/admin",
    "/creator/private",
];
const SEARCH_PARAMS = new URL(self.location).searchParams;

const firebaseConfig = {
    apiKey: SEARCH_PARAMS.get("apiKey"),
    projectId: SEARCH_PARAMS.get("projectId"),
    messagingSenderId: SEARCH_PARAMS.get("messagingSenderId"),
    appId: SEARCH_PARAMS.get("appId"),
};

function resolveSafeNotificationUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl || "/experiences", self.location.origin);
        if (parsed.origin !== self.location.origin) {
            return new URL("/experiences", self.location.origin);
        }

        return parsed;
    } catch {
        return new URL("/experiences", self.location.origin);
    }
}

function normalizeNotificationPart(value, fallback) {
    const cleaned = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9:_-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return cleaned || fallback;
}

function resolveNotificationTag(data) {
    if (data?.tag) {
        return String(data.tag);
    }

    if (data?.idempotencyKey) {
        return `kandydrops:${normalizeNotificationPart(data.idempotencyKey, "notification")}`;
    }

    if (data?.notificationId) {
        return `kandydrops:notification:${normalizeNotificationPart(data.notificationId, "unknown")}`;
    }

    const type = normalizeNotificationPart(data?.type, "general");
    const dropId = normalizeNotificationPart(data?.dropId, "unknown");
    return `kandydrops:${type}:${dropId}`;
}

function isManagedKandyDropsCache(cacheName) {
    return cacheName.startsWith(CACHE_NAME_PREFIXES.appShell) || cacheName.startsWith(CACHE_NAME_PREFIXES.runtime);
}

function shouldDeleteManagedCache(cacheName) {
    return isManagedKandyDropsCache(cacheName)
        && cacheName !== APP_SHELL_CACHE
        && cacheName !== APP_RUNTIME_CACHE;
}

function shouldHandleNavigationCache(pathname) {
    if (
        pathname === "/"
        || pathname === "/drops"
        || pathname.startsWith("/drops/")
        || pathname.startsWith("/creators/")
        || pathname === "/privacy"
        || pathname === "/terms"
        || pathname === "/offline"
    ) {
        return true;
    }

    return false;
}

function shouldBypassServiceWorkerCache(pathname) {
    return FORBIDDEN_CACHE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        const results = await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error("Failed to precache asset:", PRECACHE_URLS[index], result.reason);
            }
        });

        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((cacheName) => shouldDeleteManagedCache(cacheName))
                .map((cacheName) => caches.delete(cacheName)),
        );

        await self.clients.claim();
    })());
});

async function cacheRuntimeResponse(request, response) {
    if (!response || !response.ok || response.type === "opaque") {
        return response;
    }

    const cache = await caches.open(APP_RUNTIME_CACHE);
    await cache.put(request, response.clone());
    return response;
}

async function handleNavigationRequest(request) {
    const requestUrl = new URL(request.url);

    if (!shouldHandleNavigationCache(requestUrl.pathname)) {
        return fetch(request);
    }

    try {
        const response = await fetch(request);
        return cacheRuntimeResponse(request, response);
    } catch {
        const cachedResponse = await caches.match(request, { ignoreSearch: false });
        if (cachedResponse) {
            return cachedResponse;
        }

        return caches.match(OFFLINE_FALLBACK_URL);
    }
}

async function handleStaticRequest(request) {
    const cachedResponse = await caches.match(request, { ignoreSearch: true });
    const networkRequest = fetch(request)
        .then((response) => cacheRuntimeResponse(request, response))
        .catch(() => null);

    if (cachedResponse) {
        void networkRequest;
        return cachedResponse;
    }

    return networkRequest || fetch(request);
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(request.url);
    if (
        requestUrl.origin !== self.location.origin
        || shouldBypassServiceWorkerCache(requestUrl.pathname)
        || requestUrl.pathname.startsWith("/api/")
        || requestUrl.pathname.startsWith("/__/")
    ) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    const shouldHandleAsStatic =
        PRECACHE_URLS.includes(requestUrl.pathname) ||
        request.destination === "image" ||
        request.destination === "style" ||
        request.destination === "font";

    if (shouldHandleAsStatic) {
        event.respondWith(handleStaticRequest(request));
    }
});

messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message", payload);

    const data = payload?.data || {};
    const autoDisplayedByFcm = Boolean(payload?.notification) && data.pwaDisplayMode !== "manual-service-worker";
    if (autoDisplayedByFcm) {
        console.log("[firebase-messaging-sw.js] FCM notification payload can auto-display; manual display suppressed.");
        return;
    }

    const title = data.title || payload?.notification?.title || "KandyDrops";
    const body = data.body || payload?.notification?.body || "You have a fresh update waiting.";
    const url = data.url || "/experiences";
    const tag = resolveNotificationTag(data);

    const notificationOptions = {
        body,
        icon: NOTIFICATION_ICON,
        tag,
        renotify: false,
        data: {
            ...data,
            url,
            tag,
            browserDisplayMode: "manual-service-worker",
        },
    };

    self.registration.showNotification(title, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const rawTargetUrl = event.notification?.data?.url || "/experiences";
    event.waitUntil((async () => {
        const targetUrl = resolveSafeNotificationUrl(rawTargetUrl);
        const clickPayload = {
            type: "KANDYDROPS_NOTIFICATION_CLICK",
            notificationId: event.notification?.data?.notificationId || null,
            idempotencyKey: event.notification?.data?.idempotencyKey || null,
            tag: event.notification?.data?.tag || event.notification?.tag || null,
            url: targetUrl.toString(),
        };
        const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
        const exactClient = allClients.find((client) => client.url === targetUrl.toString());

        if (exactClient) {
            exactClient.postMessage(clickPayload);
            await exactClient.focus();
            return;
        }

        const matchingPathClient = allClients.find((client) => {
            try {
                return new URL(client.url).pathname === targetUrl.pathname;
            } catch {
                return false;
            }
        });

        if (matchingPathClient) {
            matchingPathClient.postMessage(clickPayload);
            await matchingPathClient.focus();
            if (typeof matchingPathClient.navigate === "function") {
                await matchingPathClient.navigate(targetUrl.toString());
            }
            return;
        }

        const openedClient = await clients.openWindow(targetUrl.toString());
        if (openedClient) {
            openedClient.postMessage(clickPayload);
        }
    })());
});
