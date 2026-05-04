# Hydration Performance

KandyDrops hydration uses staged priority lanes. Critical shell and first actions hydrate first. Telemetry/session/privacy truth remains connected. Diagnostics, overlays, bridges, cookie UI, bug reports, onboarding helpers, notification runtime, and PWA enhancement load after paint or idle unless required by the current interaction. No public-beta performance fix may disconnect tracking, privacy consent, parity truth, or source-of-truth debug surfaces.

## Priority Lanes

- `critical`: Navbar, MobileBottomBar, current route content, auth redirect safety, and primary CTA behavior.
- `afterPaint`: semantic route analytics, client diagnostics bridges, scroll restoration helpers, notification bridge readiness, and task guidance.
- `idle`: PWA enhancement, cookie UI, bug report trigger, onboarding helpers, homepage diagnostics, and below-fold homepage modules.
- `interactionOpened`: auth, purchase, insufficient balance, and PayPal UI loaded only when that interaction is already open or after the shell has painted.
- `adminOnly`: admin surfaces may keep their own truth and debugging requirements, but public shell overlays must not block them.
- `routeOnly`: route-specific heavy modules stay outside the global shell unless the route owns them.

The generated score report includes these six lanes in `hydrationLanes` so agents can verify the classification without browser audits.

## Homepage Contract

The homepage keeps server-seeded drops and creator discovery data in `src/app/page.tsx`. Hero and `HomeHeroActions` remain in the critical path so guest signup and authenticated dashboard routing stay responsive. `HomeDropTicker`, `HomeActiveDropsCarousel`, and `HomepageRuntimeDiagnostics` are deferred through lightweight client wrappers so below-fold motion and diagnostics do not compete with first interaction.

## Telemetry And Privacy

`trackEvent` remains the canonical telemetry path and keeps route, session, viewport, auth, privacy, and immediate-event behavior. `DeepTracker` may load after paint, but it must not be disconnected. PostHog pageview capture is dynamic, post-paint, and gated by the current privacy snapshot plus privacy-setting subscriptions.

## Validation

- `npm run score:hydration` writes `agent/state/hydration-performance.generated.json`.
- `npm run check:hydration-performance` validates the source contract, generated report, docs, package scripts, telemetry truth, privacy truth, homepage staging, and no broad browser-audit dependency.
- `npm run typecheck -- --pretty false` is the smallest TypeScript signoff when hydration source files change.

The scorer flags eager modal/overlay imports, global overlays or bridges outside after-paint/idle lanes, duplicate first-paint homepage fetches, removed telemetry/privacy gates, early PWA runtime loading, and polling or `setInterval` in the global shell path.

Forbidden default validation for this lane: Playwright, Lighthouse, Cypress, full `npm run check`, and broad UI audit marathons.
