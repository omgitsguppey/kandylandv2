# Performance & Navigation Hardening

**Goal:** Ensure route transitions, components, and scroll behaviors are buttery smooth, removing any layout shifts or heavy render cascades. Do not touch UI layout natively unless it eliminates jank.

## Checklist

### 1. Speed & Smoothness
- [ ] Optimize route transitions (avoid blocking main thread with heavy sync updates).
- [ ] Ensure mobile Safari / PWA usage does not suffer from scroll hitching.
- [ ] Analyze tap/swipe latency on modals, drawers, carousels, and the main drop viewer.
- [ ] Ensure navigation state naturally remembers or anchors scroll correctly, preventing "partially pre-scrolled" page states.
- [ ] Confirm nested scrolling surfaces (like inboxes or bottom sheets) do not leak scroll momentum to parent containers aggressively.

### 2. Render Efficiency
- [ ] Prevent expensive modules from unmounting and remounting unnecessarily on route swaps or when reopening previously loaded content.
- [ ] Clear up duplicate DOM listeners or stale `refs`.
- [ ] Review and patch unstable memoization (checking `useMemo`/`useCallback` dependency arrays).
- [ ] Stop module re-hydration on scroll-in-view for modules that should be completely stable once mounted.
- [ ] Audit React Suspense boundaries and lazy-loading code splits; verify large lists are intelligently virtualized.
- [ ] Check for CSS paint-heavy effects that bottleneck mobile scrolling.

### 3. State Management
- [ ] Prevent layout thrash by splitting DOM reads and DOM writes where possible.
- [ ] Avoid over-broad state subscriptions (where a small leaf component changing forces a massive parent tree to re-evaluate).
- [ ] Replace continuous `useEffect` calculations with derived state if it only relies on props natively available.
