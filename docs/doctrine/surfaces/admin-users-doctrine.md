# Admin Users Doctrine

Authority: account and behavior truth for admin user lists, behavior leaderboard, and user detail.

## Rules

- Admin Users is account/behavior truth. The behavior leaderboard must not require a selected user.
- WAIT means actively loading only; loaded, missing, unavailable, stale, partial, and no-sample behavior rows must use explicit state labels.
- Leaderboard rows must use display name/username first and collapse raw UID details.
- Rows show score, confidence, purchases, unwraps, verified/estimated watch, task completions, last meaningful action, source truth, and freshness.
- Guest-only traffic cannot hydrate authenticated user return cadence or user behavior truth.
- Zero engagement, purchases, unwraps, or watch is valid only when the behavior source loaded and verified zero.
- Behavioral fallback data remains fallback/review and must not become verified account truth.
- Pagination is required for behavior leaderboard rows.

## Canonical Helpers

Use `src/lib/deterministic-admin-truth.ts` for metric state, safe rate, watch truth, event context, and pagination semantics.
