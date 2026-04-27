# Admin Recent Transactions — Source of Truth

> **Owner:** Admin Overview  
> **Data source:** `firestore/transactions` → realtime listener (client)  
> **Identity source:** `firestore/users` → batch fetch (client, chunked ≤10)  
> **Server fallback:** `GET /api/admin/overview` → `buildAdminOverviewUserNameMap()`

## Architecture

```
[Firestore transactions collection]
   ↓ onSnapshot (orderBy timestamp desc, limit 20, includeMetadataChanges: true)
[RecentTransactionsPanel]
   → extract userId set from snapshot
   → batch fetch from users collection (chunks ≤10, __name__ in [...])
   → cache resolved names in Map<userId, displayName>
   → render compact feed rows with progressive identity resolution
```

## Identity Resolution Order

1. **Identity map** (batch-fetched from `users` collection — canonical)
2. **Server-provided username** (from `AdminOverviewResponse.recentTransactions[].username`)
3. **Embedded transaction doc fields** (`username`, `userHandle`, `userDisplayName` — rare/legacy)
4. **Truthful fallback:**
   - No userId → `"Guest activity"`
   - User doc exists but has no name → `"Unknown user"`
   - Identity lookup still in progress → loading skeleton (clears when resolved)

## Forbidden States

- `"Pending lookup"` as a steady-state visible label — **NEVER**
- `"@Pending lookup"` — **NEVER**
- Pink/non-purple accent colors — **NEVER**
- Bracket-jargon labels (e.g., `[live]`, `[cached]`) — **NEVER**

## Truth Chip Vocabulary

| State                | Label                        | CSS Variant |
|----------------------|------------------------------|-------------|
| Live server snapshot | "Live server feed"           | emerald     |
| Cached snapshot      | "Cached feed shown"          | amber       |
| No snapshot yet      | "Waiting for server feed"    | gray        |
| Listener errored     | "Fallback feed active"       | rose        |
| Identity degraded    | "Identity lookup degraded"   | amber       |

## Layout Contract

- Row height: ~36-40px (compact feed row, not card)
- Per-row styling: no `rounded-[1.15rem]`, no `border`, no `bg-black/30`
- Container: single `rounded-xl` with `divide-y divide-white/6`
- Layout: `[type pill] [description · @username] [time] [amount]`
- Page size: 5
- Pagination: offset-based with `paginateOverviewItems`

## Debug Metadata Fields

| Field                        | Type    | Description                                    |
|------------------------------|---------|------------------------------------------------|
| transactionSource            | string  | "firestore/transactions"                       |
| identitySource               | string  | "firestore/users"                              |
| listenerStatus               | string  | "active" / "errored" / "waiting"               |
| snapshotSource               | string  | "server" / "cache" / "none"                    |
| lastServerFeedMs             | number  | Epoch ms of last server-confirmed snapshot     |
| lastClientSnapshotMs         | number  | Epoch ms of last client snapshot               |
| pageSize                     | number  | 5                                              |
| currentPage                  | number  | Current page index                             |
| rawRecords                   | number  | Transaction docs in snapshot                   |
| eligibleRecords              | number  | Valid parsed records                            |
| excludedRecords              | number  | Excluded records                               |
| resolvedUserCount            | number  | Users with resolved display names              |
| pendingLookupCount           | number  | Users still being resolved (should settle to 0)|
| missingActorCount            | number  | Transactions with no userId                    |
| identityLookupLatencyMs      | number  | Time to complete batch user fetch              |
| identityLookupFailures       | number  | Count of failed identity fetches               |
| embeddedUsernameUsed         | number  | Records using embedded username                |
| firstFeedRenderMs            | number  | Time to first row paint                        |
| identityResolutionCompleteMs | number  | Time to all usernames resolved                 |
