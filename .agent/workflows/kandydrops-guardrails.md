# KandyDrops Engineering Guardrails

**Core Directive:** The existing site must feel fast, stable, real, deterministic, and trustworthy.

## The 20 Absolute Rules
1. Never ship UI that appears healthy if source truth is missing, stale, partial, fallback, or failed.
2. Never add a new analytics event without mapping it to canonical telemetry contracts.
3. Never add temporary tracking paths that bypass parity validation.
4. Never introduce polling where realtime listeners are already appropriate and available.
5. Never keep both polling and realtime for the same responsibility unless documented with a clear ownership boundary.
6. Never allow a stale async response to overwrite newer UI state.
7. Never swallow errors silently. Every failure path must either recover, log, surface, or all three.
8. Never add hydration-sensitive render logic that depends on browser-only state at first paint.
9. Never remount expensive sections unnecessarily on scroll, tab switch, or route revisit.
10. Never regress mobile nested scrolling behavior.
11. Never add visual/UI changes during performance passes unless required to eliminate instability.
12. Never mutate payment, unlock, wallet, webhook, or booking verification logic casually.
13. Always separate hot live state from cold historical/derived state.
14. Always prefer deterministic state ownership over convenience fetch chains.
15. Always mark fallback, stale, partial, and degraded states honestly in admin/debug surfaces.
16. Always keep feature work compatible with future experiment assignment and exposure logging.
17. Always check legacy code paths before replacing behavior. Migrate or adapter-wrap them intentionally.
18. Always remove dead listeners, orphaned intervals, and duplicate subscriptions.
19. Always preserve canonical event naming and schema consistency across user, admin, and backend surfaces.
20. If a module cannot prove its truth, it must not claim confidence.

These guardrails must be respected by all agents and developers interacting with the KandyDrops codebase. See the individual `/audit-*` workflows for specific implementation strategies.
