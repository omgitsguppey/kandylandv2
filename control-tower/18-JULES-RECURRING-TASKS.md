# Jules Recurring Task Schedule

This schedule defines the explicit, concrete background maintenance jobs assigned to Jules. 
**DO NOT include economy-ledger logic, PayPal configuration, or AI/ML GumDrop manipulation in these tasks.**

## A. Route + Session Truth Audit
*   **Purpose:** Ensure user presence and navigation are truthfully tracked.
*   **Scope:** Audit route entry/exit capture, session start/stop consistency, and idle/visibility/offscreen edge cases. Look for "fake" session completions where the user didn't actually participate.
*   **Cadence:** Nightly.
*   **Escalate to Antigravity:** If a core routing mechanism (like `next/router` hooks) needs rewriting.
*   **Codex Review:** Weekly.

## B. Viewer Telemetry + Watch Time Audit
*   **Purpose:** Prevent stale metrics in creator engagement stats.
*   **Scope:** Audit per-drop watch time capture, per-user viewer session capture, and the watch-time aggregation paths. Verify the beacon transmission logic.
*   **Cadence:** Every 48 hours.
*   **Escalate to Antigravity:** If Firebase function aggregators are failing or throwing 500s.
*   **Codex Review:** Monthly.

## C. Drop View Count + CTA State Audit
*   **Purpose:** Ensure product grids show live truth, not cached approximations.
*   **Scope:** Verify the drop view count source path, featured drop parity with the preview modal, and ensure CTA states accurately reflect insufficient balances without querying the economy ledger itself (only reading the exposed UI state). Ensure no stale counts are presented as live.
*   **Cadence:** Nightly.
*   **Escalate to Antigravity:** If data hydration mismatches occur between SSR and client.
*   **Codex Review:** Bi-weekly.

## D. Hydration + Nested Scroll Stability Audit
*   **Purpose:** Maintain a premium UI feel by preventing DOM thrash.
*   **Scope:** Scan for modules that rehydrate visibly on load, components violating nested scroll ownership (e.g., dual scrollbars), skeletons that never settle, or heavy rerender thrashing on mobile scroll.
*   **Cadence:** Weekly.
*   **Escalate to Antigravity:** If a shared layout component requires structural CSS overhaul.
*   **Codex Review:** After any major UI feature release.

## E. Realtime Listener + Polling Debt Audit
*   **Purpose:** Eradicate synthetic polling.
*   **Scope:** Hunt for duplicated polling intervals (`setInterval`), zombie listeners not unsubscribing on unmount, places that should be realtime but pretend via polling, and verify polling is only used where explicitly justified (e.g., cold storage metrics).
*   **Cadence:** Weekly.
*   **Escalate to Antigravity:** If transitioning a polled component to an `onSnapshot` listener requires a new Firebase index.
*   **Codex Review:** N/A.

## F. Doctrine Drift + Shared Component Compliance
*   **Purpose:** Enforce the "Premium Candy-Coded" aesthetic and vocabulary rules.
*   **Scope:** Hunt for fake tabs/chips, duplicated or drifted shared components (e.g., a hardcoded button instead of `<Button>`), oversized files (> 500 lines), and copy drift against `kandydrops-vocabulary-index.md` (e.g., reverting to "Tokens").
*   **Cadence:** Nightly.
*   **Escalate to Antigravity:** If a new shared component is genuinely needed but doesn't exist.
*   **Codex Review:** Weekly.

## G. Creator Experiences + Booking State Audit
*   **Purpose:** Maintain truth in the creator-fan transaction UI.
*   **Scope:** Verify creator profile experiences hydration, timeslot UI accuracy, custom request flow integrity, private chat state management, and interaction history.
*   **Cadence:** Every 48 hours.
*   **Escalate to Antigravity:** If the underlying Firestore schema for bookings changes.
*   **Codex Review:** Monthly.

## H. Admin Truth Surface Audit
*   **Purpose:** Ensure system diagnostics are brutally honest.
*   **Scope:** Audit `AdminTruthSurfaces.tsx` and related components. Hunt for stale `[healthy]` states, ensure fallback vs. live labeling is rigorous, and map any source-of-truth visibility gaps.
*   **Cadence:** Nightly.
*   **Escalate to Antigravity:** If a new product surface is completely opaque to the Admin Dashboard.
*   **Codex Review:** Bi-weekly.
