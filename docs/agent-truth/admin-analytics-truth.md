# Admin Analytics Truth

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

Canonical helper: `src/lib/deterministic-admin-truth.ts`.
