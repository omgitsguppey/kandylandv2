# KandyDrops UI Doctrine

## Purpose
This document dictates the interaction design and visual hierarchy rules for KandyDrops to ensure consistency, truthfulness, and a premium feel.

---

## 0. 2026 Apple-Aligned Mobile Refinement Rule

KandyDrops may use an Apple-aligned interaction philosophy for mobile web surfaces, but it must remain KandyDrops in brand, language, telemetry, and commerce truth. This means using the current official Apple Human Interface Guidelines as an interpretation layer for clarity, hierarchy, safe-area layout, accessibility, and ease of use, not copying Apple branding or controls.

Official source anchors:
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Apple Layout guidance: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple Accessibility guidance: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple Materials guidance: https://developer.apple.com/design/Human-Interface-Guidelines/materials
- Apple Designing for iOS guidance: https://developer.apple.com/design/human-interface-guidelines/designing-for-ios

Mobile UI rules derived for KandyDrops:
- Hierarchy first: primary content appears before decorative context, and reduced-size components must still make the next action obvious.
- Safe areas are structural: content, sticky controls, and bottom actions must respect browser chrome, app nav, and `env(safe-area-inset-*)` without negative margins or guessed viewport hacks.
- One scroll owner: lists and carousels must not create nested scroll fights on iOS Safari or mobile Chrome.
- Progressive disclosure: compact rows, short carousels, and expandable controls are preferred over oversized cards when the user needs repeat scanning.
- Touch targets stay usable: compact controls must preserve comfortable hit areas, visible focus states, and accessible names.
- Motion is optional: autoplay, shimmer, timers, and urgent states must respect reduced-motion intent and never distract from the task.
- Materials are restrained: glass or blur may separate controls from content, but must not obscure text, create low contrast, or become decoration-only.
- Radius consistency is a system contract: mobile cards, chips, search controls, and CTAs should reuse a small set of rounded values instead of arbitrary pill/card radii.
- Telemetry is required: every refined, reduced, or newly added component must preserve or improve canonical tracking, including source component, UI density, and action context when relevant.
- Loading order must prefer useful content: server-seeded or hot data renders first, expensive realtime/listener upgrades wait until idle or documented need, and no fake loaded state is allowed.

## 1. Truth in Interaction
* **No Fake Affordances:** If a UI element looks tappable (e.g., a pill, a chip, a button), it MUST be interactive and perform a function. Decorative chips are strictly banned.
* **Visual Consistency:** Search bars, toggle switches, and standard controls must be reused exactly as intended. Do not create detached, slightly different variants for new pages.

## 2. Scroll and Layout
* **Scroll Ownership:** Only one surface or container should own the scroll at any given time to prevent nested scrolling conflicts.
* **Mobile-First Density:** Spacing should feel intentional, tight, and organized. Avoid massive swathes of empty space unless explicitly used for premium focus.
* **Grouped Settings:** Settings and dense operational lists should follow iOS-style grouped layouts—calm, contained, and highly scannable.

## 3. Motion and Urgency
* **Restrained Motion:** Animations and micro-interactions should be subtle, smooth, and used to provide feedback (e.g., a button press, a toast entering), not to distract.
* **Timer Urgency:** Countdowns and urgency indicators should be clear and elegant, never frantic or flashing.
* **Final-Day Drop Timers:** Drop expiration timers inside their final 24 hours show countdown digits only (`HH:MM:SS`) and inherit the site font. The accessible label may retain full "Ends in" phrasing.

## 4. Aesthetic: Premium vs. Busy
* **Premium Candy-Coded:** Use deep, rich colors, smooth gradients, and glassmorphism carefully.
* **Avoid Clutter:** Do not overload a single view with competing primary colors or dozens of badges.

## 5. State Truth Labeling
The UI must NEVER lie to the user or the admin about the state of the data.
* **Live:** Default assumption if real-time telemetry is connected.
* **Degraded:** Use when the canonical source exists but is incomplete, partially connected, or internally inconsistent.
* **[stale]:** Must be explicitly labeled if the data is cached and older than acceptable thresholds.
* **[fallback]:** Must be explicitly labeled if the primary data source failed and secondary/synthetic data is being shown.
* **[unavailable]:** Must be explicitly labeled if no canonical source is wired or no verified snapshot exists yet.
* **[failed]:** Must be explicitly indicated if data cannot be loaded. Never show an empty or "healthy" state on failed data. Silent catch blocks that result in blank UI are banned.
* Admin truth surfaces must reuse the shared admin status contract rather than inventing page-local labels such as `healthy`, `partial`, `connecting`, or hardcoded `[live]`.

## 6. Admin Commerce Density
* Admin user monetization must summarize gross cash, adjusted profit, package-rate bonus value, delivered GumDrops, and effective rate from canonical commerce helpers.
* Do not show repeated zero-value monetization, support, security, or parity cards by default. Use compact summaries and collapse or link out source diagnostics.
* Bonus value must be labeled as package-rate impact when shown in admin views; the retail anchor remains $1 = 100 GumDrops.

## 7. Dashboards and Overview Surfaces
* **No Polling Fallbacks:** Top-level dashboards must never use synthetic polling snapshots if true realtime canonical subscriptions (Firestore `onSnapshot`) are viable.
* **Minimal Copy, Maximum Trust:** Ban paragraph-heavy explainer cards and verbose headers in overview surfaces. The UI must rely on strict numeric indicators and tight delta labels instead of "explaining" the backend process.
* **No Fake Confidence:** Never blend stale analytics snapshots into live feed gaps to fake completeness. If a metric is broken, label it explicitly as `[Degraded]`.
* **Hot Analytics First:** Admin analytics must read validated hot summaries or backend caches before cold GA4/Data API, BigQuery, SQL Connect, or raw Firestore scans. Cold reads are allowed for async refresh and explicit drill-down only, and their source state must remain visible.
