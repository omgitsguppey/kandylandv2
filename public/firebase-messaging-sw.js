importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const APP_SHELL_CACHE = "kandydrops-app-shell-v2";
const APP_RUNTIME_CACHE = "kandydrops-runtime-v2";
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

const firebaseConfig = {
    apiKey: new URL(location).searchParams.get("apiKey"),
    projectId: new URL(location).searchParams.get("projectId"),
    messagingSenderId: new URL(location).searchParams.get("messagingSenderId"),
    appId: new URL(location).searchParams.get("appId"),
};

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
                .filter((cacheName) => cacheName !== APP_SHELL_CACHE && cacheName !== APP_RUNTIME_CACHE)
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
    try {
        const response = await fetch(request);
        return cacheRuntimeResponse(request, response);
    } catch (error) {
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
    if (requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith("/api/")) {
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
        request.destination === "script" ||
        request.destination === "font";

    if (shouldHandleAsStatic) {
        event.respondWith(handleStaticRequest(request));
    }
});

messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message", payload);

    const title = payload?.notification?.title || payload?.data?.title || "KandyDrops";
    const body = payload?.notification?.body || payload?.data?.body || "You have a fresh update waiting.";
    const url = payload?.data?.url || "/experiences";

    const notificationOptions = {
        body,
        icon: NOTIFICATION_ICON,
        data: {
            ...(payload?.data || {}),
            url,
        },
    };

    self.registration.showNotification(title, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const rawTargetUrl = event.notification?.data?.url || "/experiences";
    event.waitUntil((async () => {
        const targetUrl = new URL(rawTargetUrl, self.location.origin);
        const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
        const exactClient = allClients.find((client) => client.url === targetUrl.toString());

        if (exactClient) {
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
            await matchingPathClient.focus();
            if (typeof matchingPathClient.navigate === "function") {
                await matchingPathClient.navigate(targetUrl.toString());
            }
            return;
        }

        await clients.openWindow(targetUrl.toString());
    })());
});
