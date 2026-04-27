# Admin Activity — Source of Truth

## What It Shows

The Admin Activity feed surfaces **operator/system actions** that affect the platform, distinct from customer transaction activity.

### Canonical Sources

| Source | Collection | Filter | Content |
|--------|-----------|--------|---------|
| Admin Adjustments | `transactions` | `type == "admin_adjustment"` | Balance credits/debits applied by operators |
| Admin Telemetry | `analytics_event_facts` | `event_name` prefix: `admin_`, `creator_`, `owner_` | Platform events like drops created, settings changed |

### Source Separation from Recent Transactions

- **Recent Transactions** shows ALL transaction types ordered by recency
- **Admin Activity** shows ONLY `admin_adjustment` transactions + admin telemetry events
- The two feeds intentionally overlap on `admin_adjustment` records — this is correct because admin adjustments are both transactions AND admin activity
- They use completely separate listeners and merge paths

## Actor / Target Architecture

Each admin activity row distinguishes:

| Field | Meaning | Fallback |
|-------|---------|----------|
| `actorLabel` | Who performed the action | `"Unknown operator"` (never empty, never `"Admin"`) |
| `targetLabel` | Who was affected (e.g. `target @username`) | `target {userId[0:8]}` or omitted if no target |
| `targetUserId` | Raw user ID of the affected user | `undefined` |

### Resolution Priority for Target

1. Server-resolved username from API `/admin/overview` response
2. Embedded `username` field in the transaction document
3. Embedded `userHandle` field in the transaction document  
4. Truncated `userId` (first 8 chars)
5. Omitted entirely if no target user

### Actor Fallback Rules

- If `adjustedBy` field exists and is non-empty: use it directly
- If missing: show `"Unknown operator"` (honest about missing actor)
- Never show `"Admin"` as a generic fallback — that's vague

## Realtime Data Flow

```
┌─────────────────────────────────┐
│  Firestore Client Listener      │
│  transactions                   │
│  where type == admin_adjustment │
│  orderBy timestamp desc         │
│  limit 20                       │
│  includeMetadataChanges: true   │
└──────────┬──────────────────────┘
           │ realtime adjustments
           ▼
┌──────────────────────────────────┐
│  useAdminOverviewRealtime        │
│  Merge: realtime adjustments     │
│        + server telemetry items  │
│  Sort by timestamp desc          │
│  Limit 20                        │
└──────────┬───────────────────────┘
           │ merged activity
           ▼
┌──────────────────────────────────┐
│  AdminActivityLogPanel           │
│  Truth chip + freshness label    │
│  Compact 36px rows               │
│  Local page-based pagination     │
│  Debug metadata (data attr)      │
└──────────────────────────────────┘
```

### Merge Rules

- Realtime admin_adjustment items replace server-provided adjustment items
- Server-provided telemetry items (`source === "analytics_event_facts"`) are preserved from server poll
- Combined, sorted by timestamp desc, capped at 20

## Truth Chip Vocabulary

| State | Label | Meaning |
|-------|-------|---------|
| `live_server` | "Live admin feed" | Listener active, data from server |
| `cached` | "Cached admin feed" | Data from Firestore client cache |
| `waiting` | "Waiting for admin feed" | Listener initializing |
| `fallback` | "Admin feed degraded" | Listener failed |
| `no_recent_activity` | "No recent admin activity" | Zero records in window |
| `legacy_only` | "Legacy records only" | All records have unknown/legacy actor |

## Freshness Context

- Shows "Latest admin action: {relative time}" below truth chip
- When latest record is > 14 days old, text uses `text-amber-400/70` to signal staleness
- This is honest context — the feed IS live, there just haven't been new admin actions

## Debug Metadata

Exposed as `data-debug-admin-activity` JSON attribute on the root element:

```typescript
{
    feedSource: "firestore/transactions[admin_adjustment] + analytics_event_facts",
    listenerNote: string,     // truth note from hook
    totalItems: number,
    adjustmentItems: number,  // from transactions source
    telemetryItems: number,   // from analytics_event_facts source
    latestItemMs: number,     // most recent record timestamp
    oldestItemMs: number,     // oldest record timestamp
    staleDays: number,        // days since latest record (-1 if empty)
    pageSize: number,
    currentPage: number,
    actorResolved: number,    // items with known actor
    actorUnresolved: number,  // items with "Unknown operator"
    targetResolved: number,   // items with target label
    targetUnresolved: number, // items without target
}
```

## Anti-Patterns (Do Not Reintroduce)

1. **Do not merge admin adjustments into the Recent Transactions feed** — they have separate listeners and separate UI modules
2. **Do not use `"Admin"` as a fallback actorLabel** — use `"Unknown operator"` to be honest about missing data
3. **Do not show stale records without freshness context** — always show "Latest admin action: X ago"
4. **Do not concatenate actor and target into `detail`** — they are separate fields (`actorLabel`, `targetLabel`)
5. **Do not use offset-based pagination** — use `paginateOverviewItems` with local page state
6. **Do not add `"Admin-only feed"` as the sole truth indicator** — use the truth chip with proper vocabulary
7. **Do not bypass the realtime listener** — admin adjustments must flow through `useAdminOverviewRealtime`
