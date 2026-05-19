# DeepTracker Telemetry Volume Reduction

Generated report: `agent/state/deeptracker-telemetry-volume-reduction.generated.json`

This phase reduces generic client analytics volume while preserving priority tracking, identity linking, and runtime watch-time accuracy.

## Applied Fixes

- Non-priority DeepTracker interval flushes now run every 15 seconds instead of 2.5 seconds.
- Priority client telemetry is explicitly classified so purchase, payment, creator spend, identity link, auth transition, bug report, and runtime watch lifecycle events are not delayed by generic batching.
- Pagehide, visibility hidden, cleanup, and final queue flushes share one route-session closeout key.
- The anonymous non-priority queue cap is 200, and priority events can displace older non-priority entries instead of being dropped.
- Hover telemetry is summarized as one session/surface summary using existing ingest-safe fields.
- Visibility telemetry is summarized as transition totals instead of one event per visibility change.
- Scroll telemetry uses requestAnimationFrame and 25/50/75/100 milestones instead of 500ms polling.
- Identity link submission marks a pending state before fetch, writes sent on success, and writes retry-after on failure to avoid duplicate bursts without blocking auth.

## Runtime Watch Boundary

Runtime watch-time v2 remains separate from DeepTracker batching. `RuntimeWatchTracker` still uses the canonical 10 second playback heartbeat from `RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS`, and this phase does not merge watch tracking into the generic non-priority queue.

## Deferred Work

- `src/lib/telemetry.ts` has its own global `trackEvent` queue and should be reviewed in a separate focused pass.
- Summary events reuse existing anonymous ingest schema fields. Richer summary dimensions should only be added through a dedicated ingest contract pass.

## Savings Model

Savings are formula and percentage estimates only. No billing-dollar savings are claimed without provider evidence.
