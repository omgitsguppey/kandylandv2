# Admin Analytics Truth

Authority: Supporting current doctrine for Admin Analytics display truth and metric cadence.  
Current operator doctrine: `docs/agent-truth/current-operator-doctrine.md`.

Status: deterministic hardening doctrine
Recorded: 2026-05-06

Admin Analytics reports on existing telemetry, rollups, GA/source imports, server records, and materialized snapshots. It does not mutate analytics records.

Rules:

- WAIT means actively loading only.
- `WAIT` means actively loading only.
- Verified zero requires a loaded source.
- A zero is valid only when the source loaded and verified zero.
- Zero requires verified source proof before rendering a numeric zero.
- Estimated is not verified. Estimated/recovered/fallback values remain separate from verified values.
- Every rate requires source, range, unit, numerator, and denominator truth.
- No rate may render without denominator, source, and range truth.
- Lifetime, rolling 30D, selected range, snapshot, and live windows must not be mixed silently.
- Display language uses unwrap/unwrapped/unwraps; backend entitlement code may still use unlock.
- Internal/admin/operator/test traffic is excluded or labeled before being called demand.
- Tables with more available rows than shown use pagination or label top-N snapshot.
- Every displayed metric must carry metricKey, canonicalSource, formula, unit, timeWindow, refreshCadence, lastRefreshedAt, freshnessTolerance, exactness, fallbackPolicy, zeroPolicy, and debugSourceDetail.
- Primary Analytics UI shows the number and one compact freshness line. Admin Debug owns detailed formula, source, cadence, fallback, confidence, and legacy warnings.
- Event Chain is event-volume only unless ordered actor/session transition data exists. Aggregated event counts cannot become unique-user funnel math.
- When no Event Chain sample exists, primary UI shows a compact no-sample state, the manual workaround, and Debug/source metadata instead of zero rows or long source doctrine.
- Auth Outcomes canonical source is first-party auth_attempt_* telemetry grouped by authAttemptId, method/provider, timestamps, outcome, duration, and safe failure code.
- Missing auth samples render as no-sample or unavailable, not ERROR. Email/password and Google login method groups should render only after a canonical or legacy auth sample exists.
- Legacy auth sign-in/sign-up/Google count events are partial fallback only. They do not prove exact auth attempt chains or failure timing.
- Failure reasons must use safe error-code fields. If unavailable, primary UI says "Failure reason not captured" and Debug/source metadata carries the missing piece.

Canonical helper: `src/lib/deterministic-admin-truth.ts`.
