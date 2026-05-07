# Codex Handoff

## Task
Fix stale live deploy behavior by making the Firebase messaging service worker and its caches deploy-version-aware.

## Scope
Allowed files touched:
- [public/firebase-messaging-sw.js](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js)
- [src/lib/firebase-messaging.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-messaging.ts)
- [src/components/PwaRuntimeBridge.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PwaRuntimeBridge.tsx)
- [src/lib/release-notes/public-release-notes.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/release-notes/public-release-notes.ts)

Files intentionally not touched:
- admin analytics/debug routes
- wallet/packages behavior
- PurchaseModal
- Platform Economy
- API cache headers
- release note generation

## Result
Status:
- completed

Summary:
- Reused the existing public app version source from `PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion`.
- Added the app version to the service worker registration URL and to the worker cache names.
- Added old KandyDrops cache cleanup plus a minimal client update signal/toast when a new worker is installed or takes control.

## Commit
Branch: `main`
Commit SHA: Not committed because: handoff written before commit per task requirement
Commit message: `fix(pwa): version service worker caches`

## Files Changed
- [src/lib/release-notes/public-release-notes.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/release-notes/public-release-notes.ts): exported the existing public app version constant for reuse
- [src/lib/firebase-messaging.ts](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-messaging.ts): versioned the worker registration URL and added update lifecycle event dispatch
- [src/components/PwaRuntimeBridge.tsx](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/components/PwaRuntimeBridge.tsx): surfaced a small refresh toast when a new worker is available
- [public/firebase-messaging-sw.js](C:/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js): versioned cache names, deleted old caches, and narrowed which navigations the worker may cache

## Behavior Changed
Before:
- Service worker registration URL only varied by Firebase config query params.
- Cache names were static: `kandydrops-app-shell-v3` and `kandydrops-runtime-v3`.
- Old worker caches could survive deploys and continue serving old shells/assets.
- Admin/dashboard/authenticated routes could still be trapped by the worker’s navigation cache path.

After:
- Registration URL now includes `v=<appVersion>`.
- Cache names now use the deploy version: `kandydrops-app-shell-<version>` and `kandydrops-runtime-<version>`.
- Activate deletes older KandyDrops shell/runtime caches that do not match the current version.
- The worker only caches navigations for explicitly public routes; admin/dashboard/wallet/experiences navigations are no longer app-shell cached.
- Client runtime now dispatches `kandydrops:app-update-available` and shows a small refresh toast when a new worker is installed or takes control.

## Validation
Commands run:
- `npm run typecheck`: pass

Important output:
- `tsc --noEmit --pretty`: pass

Commands not run:
- targeted PWA validator: none identified for this task
- full `npm run check`: forbidden by task

## Risk Notes
- The update toast is event-driven from `updatefound`/`controllerchange`; browser verification is still needed to confirm it fires reliably across Safari/PWA and normal browser tabs.
- The worker still caches public `/` and `/drops` navigations by design; this patch only removes stale trapping for sensitive/auth/admin surfaces.
- Existing open tabs may still need one reload to move onto the new controller after deploy; the main fix is that storage clearing should no longer be required.

## Needs Uylus / ChatGPT Review
- Inspect service worker registration in DevTools and confirm the script URL includes `v=1.113.4` (or the deployed version).
- Confirm old `kandydrops-app-shell-*` and `kandydrops-runtime-*` caches are removed after activation.
- Recheck `/dashboard/chat`, `/admin/debug`, and the Beta badge after deploy without clearing cookies/storage.

## Follow-up Suggestions
- Add a tiny build/version status probe so the app can detect a newer deploy even before the worker finishes installing.
- Version or invalidate admin sessionStorage snapshot keys on app-version change so admin analytics/debug cannot hydrate from prior-tab snapshots after deploy.
