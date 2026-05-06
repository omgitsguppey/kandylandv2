# Admin Debug Control Tower Doctrine

Authority: diagnostic truth for runtime, evidence, repair, route, telemetry, economy, AI, moderation, storage, task, and privacy lanes.

## Rules

- Debug Control Tower is diagnostic truth, not reporting truth. It separates current, recent, and sample windows, plus generated-report windows.
- Current health, recent sample health, and loaded historical sample state must not be collapsed into one LIVE/ERROR badge.
- `WAIT` is reserved for active loading. Loaded numeric, null, stale, unavailable, not-observed, or no-sample values must render explicit source states.
- Inspect-only repair proposals are review evidence, not actionable repairs. Duplicate proposals must cluster by source, route/context, kind, and missing fields.
- Route runtime rows that have never been observed must render `no_sample` or `not_observed`, never fake success or zero latency.
- Background, ledger, notification, task-engine, and server-system events do not require foreground route/session fields unless their context declares those fields required.
- Debug rows must expose generated/rebuilt timestamps, source truth, freshness, and next action.

## Canonical Helpers

Use `src/lib/deterministic-admin-truth.ts` for metric states, actor/event context classification, safe rates, watch quality, and pagination contracts.
