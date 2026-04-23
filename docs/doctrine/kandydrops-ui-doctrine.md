# KandyDrops UI Doctrine

## Purpose
This document dictates the interaction design and visual hierarchy rules for KandyDrops to ensure consistency, truthfulness, and a premium feel.

---

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
