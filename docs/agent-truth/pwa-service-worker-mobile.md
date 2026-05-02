# PWA Service Worker Mobile Doctrine

Status: Active launch doctrine
Last updated: 2026-05-01

## Core Rule

KandyDrops PWA behavior must be predictable on mobile. The app may cache shell assets and offline fallback routes, but it must not cache private API data, show duplicate notifications, trap users in stale app shells, or route notification clicks outside the app.

## Manifest

`public/manifest.json` is the install source of truth. It must keep:

- `name` and `short_name` as `KandyDrops`
- `start_url` on a valid app route, currently `/drops?source=pwa`
- root `scope`
- `display: "standalone"`
- current PNG icons, currently `/icon-192x192.png` and `/icon-512x512.png`
- black launch/background colors that match the app shell

Old starter icons or logos must not be referenced from the manifest, service worker notification icon, or 404 recovery surface.

## Service Worker

`public/firebase-messaging-sw.js` owns both app-shell caching and Firebase Messaging background notifications. It must:

- use versioned cache names
- precache only safe public shell assets and routes
- exclude `/api/` and `/__/` requests
- use network-first navigation before cached/offline fallback
- use cache-first public static assets with background refresh
- delete old cache names on activate
- call `skipWaiting()` and `clients.claim()` so deploys do not leave users stuck on an old worker

Private admin, wallet, chat, notification, content, purchase, unlock, and analytics API payloads must never be publicly cached by the service worker.

## Registration

`src/components/PwaRuntimeBridge.tsx` is the app-shell registration owner. It loads outside admin routes through `CoreLayoutWrapper`. `src/lib/firebase-messaging.ts` must keep a module-level registration promise so notification enrollment and foreground display reuse the same registration instead of issuing repeated `navigator.serviceWorker.register` calls.

## Notifications

Foreground messages are handled by `NotificationRuntimeBridge` through `onMessage`. Background messages are handled by `firebase-messaging-sw.js` through `onBackgroundMessage`.

KandyDrops server push payloads should be data-only when the service worker is expected to display the browser notification. If an FCM `notification` payload can auto-display, the service worker must suppress manual display unless the payload explicitly declares manual service-worker mode.

Visible browser notifications must use deterministic tags from notification idempotency keys. `renotify` stays false unless a future product decision intentionally re-alerts an existing tagged notification.

## Notification Clicks

The service worker must sanitize notification click targets to same-origin app routes, then focus or open the app. It must post `KANDYDROPS_NOTIFICATION_CLICK` metadata back to the client so the app can record `notification_opened` and mark the notification read when a notification id exists.

## Push Token Refresh

The Firebase Web modular SDK path used here does not expose the old continuous `onTokenRefresh` listener. The launch path obtains a token with `getToken()` during explicit browser notification enrollment and persists it through `/api/user/profile`. Re-enrollment/getToken is the documented refresh path if a browser rotates or loses a token.

## Mobile Safe Area

Standalone PWA surfaces use the same mobile shell contract as browser mobile surfaces. `src/lib/user-mobile-shell.ts` owns bottom-nav/safe-area tokens; root layout reads `--user-mobile-bottom-nav-reserved-height`; `CoreLayoutWrapper` applies it once; `MobileBottomBar` uses the bottom offset token. Do not add duplicate page-level safe-area padding for normal public routes.

## Offline And Return Routes

`/offline` is the offline fallback route. Notification fallback route is `/experiences`. PWA start route is `/drops`. 404 recovery returns to `/dashboard`. These routes must remain valid and human-readable.

## Future Agents

Do not add a second service worker, random notification tags, FCM auto-display plus manual service-worker display, public caching of API data, custom install prompts that bypass doctrine, stale shell caches without version bumps, or page-local safe-area hacks.
