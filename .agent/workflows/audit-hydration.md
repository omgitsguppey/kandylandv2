# Hydration & Race Condition Hardening

**Goal:** Eliminate client/server mismatches, flicker, and any chance of a late-arriving request overwriting a newer request state. First render and hydrated render must be deterministic.

## Checklist

### 1. Hydration Stabilization
- [ ] Remove hydration-sensitive randomized values or non-deterministic ID generation.
- [ ] Prevent browser-only API reads (`window.innerText`, `localStorage`, `navigator.userAgent`) directly inside initial mount render bodies without robust `useEffect` or layout effects holding fallback states.
- [ ] Audit the codebase to ensure no flicker happens moving from Suspend -> Loaded state.

### 2. Async Orchestration
- [ ] Verify deterministic behavior across auth state, route guards, and creator lookups.
- [ ] Validate wallet balance state arrays predictably, never wiping previously known good state implicitly.
- [ ] Check viewer states, chat, notification polling, and analytics dashboard initializations for duplicate overlapping fetches.

### 3. Race Conditions
- [ ] Implement query cancellation or ignore flags for overlapping requests so late-returning older requests don't write to state.
- [ ] Enforce deterministic request ownership (e.g., matching a fetch request ID or timestamp) against global UI state.
- [ ] Stop late-arriving fetches from masquerading seamlessly over intentional user actions.
