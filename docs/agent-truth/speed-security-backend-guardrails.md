# Speed/Security Backend Guardrails

Current authority for the Debug speed/security backend guardrail lane.

## Backend Fanout

Cloud Functions that process analytics batches must use bounded worker pools rather than unbounded `Promise.all(events.map(...))` fanout. Identified analytics ingest caps one callable batch at 100 deduped events and writes event facts with concurrency 8. Event-fact side effects must also stay explicitly bounded.

Guest semantic rollups cap each processed batch to 250 events and process rollup writes with concurrency 8. If a guest batch is larger, the function may process the first capped slice and log a safe warning; it must not add new Firestore reads or write a separate skipped-count document without a new contract.

Shared server fanout should use `mapWithConcurrency` from `src/lib/server/bounded-concurrency.ts` when a non-payment route or helper maps over variable-sized input. The helper preserves result ordering, caps concurrent workers, and is source-visible to the scanner through the `cost-bound` worker-pool marker. Current focused fixes use it for creator discovery follower counts, username reservation reads/backfills, queue owner lookups, creator relationship follower counts, and admin creator fan-experience telemetry events.

## Request Bodies

Mutating API routes with `bodyLimitBytes` in the security hardening contract must enforce that limit before JSON parsing. Use `readBoundedJsonBody` instead of `request.json()` so both `content-length` and measured bytes are capped before `JSON.parse`.

Typed safe failures:

- `payload_too_large` returns HTTP 413.
- `invalid_json` returns HTTP 400.

Do not include raw body content in errors or route runtime samples.

The focused guardrail cleanup added bounded JSON parsing to `creator/relationships`, `admin/debug/preferences`, and `admin/creator-fan-experience-settings`. Remaining admin body-limit findings stay active owner-reviewed work; they must be fixed route-by-route with focused tests rather than hidden from the speed/security report.

## Debug Translation

The Debug panel may translate scanner wording into operator language, but it must not hide active backend guardrail findings. Examples:

- `Potential unbounded Promise.all fanout` means backend work can fan out too much at once.
- `Mutating route has body limit contract but no source-visible cap` means an API route needs a visible payload size cap before JSON parsing.

If a generated speed/security report is stale, Debug must present it as stale/evidence-only until `npm run score:speed-security` and `npm run check:speed-security` refresh the source.
