# Agent Routing Recipes

This document provides explicit routing examples for KandyDrops to prevent task misallocation.

## Route to ANTIGRAVITY
*   **Realtime Telemetry Hardening:** Creating a new `onSnapshot` Firestore listener hook for drop view counts.
*   **Monolith Decomposition:** Breaking down a 1000-line profile page into distinct data fetching, state, and UI components.
*   **Environment Configuration:** Wiring up Firebase Remote Config or a new MCP.
*   **Admin Truth Audit (Structural):** Creating the initial connection between a new database collection and the `AdminTruthSurfaces` UI.

## Route to JULES
*   **Stale Activity Module Investigation:** A ticket claiming the "Recent Activity" feed isn't updating. Jules finds the existing polling hook and fixes a bad TTL check.
*   **Isolated Viewer UI Refinement:** A ticket to adjust padding, font-weight, or color on a specific `DropGridCard` variant according to doctrine.
*   **Creator Experiences Tab Cleanup:** Deleting dead CSS or migrating a hardcoded string to the copy dictionary in `CreatorExperiences.tsx`.
*   **Scheduled Nightly Integrity Checks:** Running the Route + Session Truth Audit and reporting anomalies.

## Route to CODEX / GPT
*   **Doctrine Compliance Pass:** "Verify that all changes made in the last 48 hours to the Wallet UI adhere strictly to `kandydrops-copy-doctrine.md`."
*   **Prove It Actually Works:** "Review PR #45. Does the `useA11yHealthFeed` actually pipe to the Admin Truth Surface without fake fallback data? Prove it."
*   **Regression Review:** "Check the recent checkout flow changes. Did they accidentally mutate the PayPal credentials or the GumDrop economy ledger?"
