# Drop Runtime Refresh

## Doctrine

Public drop browsing uses SWR plus HTTP ETag caching as the canonical data path. Agents must preserve:

- SWR pagination through `/api/drops`.
- ETag request/response caching with `If-None-Match` and `304` reuse.
- Focus and visibility refresh for returning users.
- Expiration timer refresh driven by the next active drop expiration.

The only approved realtime exception is **public drop freshness runtime invalidation**. It watches `systemRuntime/drops` through `SYSTEM_RUNTIME_COLLECTION` and `DROP_RUNTIME_DOC_ID` in `src/hooks/useDrops.ts`, skips the initial snapshot, and only invalidates the SWR/ETag feed. It must not stream public drops, locked content, internal files, or viewer payloads.

## Bounded Refresh Rules

- Default SWR refresh interval: at most `30_000` ms.
- Constrained network SWR refresh interval: at most `90_000` ms.
- Very slow network SWR refresh interval: at most `120_000` ms.
- Focus/visibility refresh must remain throttled.
- Runtime invalidation refresh must remain throttled.
- Expiration timer refresh must use `nextExpiryMs` plus a small buffer.

No new public drops realtime listener, polling loop, `setInterval`, `EventSource`, or route-local subscription may be added for public freshness. Admin/debug realtime surfaces may keep their own documented contracts, but they must not become a second public drops runtime invalidation path.

## Validation

Run:

```bash
npm run check:drop-runtime-refresh
```

The validator fails if `src/hooks/useDrops.ts` loses SWR/ETag/focus/visibility/expiration refresh, if another public drops realtime listener appears, if runtime intervals become unbounded, or if the allowed exception is no longer documented as `public drop freshness runtime invalidation`.
