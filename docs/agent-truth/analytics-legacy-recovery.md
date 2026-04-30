# Analytics Legacy Recovery

Status: Phase 4 executable dry-run recovery plan
Last updated: 2026-04-30

## Purpose

Legacy recovery lets KandyDrops read older analytics and business records back to first deployment without pretending they are current first-party event facts. Recovery is allowed for parity, historical continuity, and Admin Debug context. It must not overwrite stronger product truth, hide missing actor data, or merge guest history into users without an `identity_linked` event.

The mapper contract lives in `src/lib/analytics/legacy-event-mapping.ts`. It emits canonical event-shaped candidates with `legacySource`, `legacyId`, `legacyConfidence`, and `mappingWarnings`. It does not run a backfill, write Firestore, or mix legacy records into server-confirmed current events.

Phase 4 adds executable dry-run tooling around that contract:

- `scripts/analytics/inventory-legacy-sources.ts` writes `agent/state/analytics-legacy-source-inventory.generated.json`.
- `scripts/analytics/map-legacy-events.ts` writes `agent/state/analytics-legacy-mapping-report.generated.json`.
- `scripts/analytics/check-analytics-ecosystem-parity.ts` writes `agent/state/analytics-ecosystem-parity.generated.json`.
- `scripts/agent/validate-analytics-legacy-recovery.ts` validates the scripts, generated reports, Debug metadata, and doctrine.

These scripts are non-destructive by default. They are allowed to inspect configured source definitions and safe fixture-shaped samples. They are not allowed to overwrite current analytics, run a production migration, or mark legacy records as server-confirmed.

## Recovery Inventory

| Legacy source | Earliest known date | Recoverable event types | Actor info | Object IDs | Timestamp field | Confidence | Backfill use | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Firestore `analytics_event_facts` | First telemetry deployment; exact date must be verified from oldest doc | page, auth, commerce, content, viewer, task, notification, onboarding, admin events | userId, sessionId, event params, sometimes anonymous subject | event params such as dropId, taskId, transactionId | `timestamp`, `eventTimestamp`, `createdAt`, `receivedAt` | high when event name and timestamp exist | Backfillable into canonical event candidates | Older params can miss actor lane, consent, object type, and dedupe key |
| Firestore `analytics_guest_batches` | First guest batch deployment; exact date must be verified from oldest doc | guest page/view/engagement batches | anonymous/session evidence only when batch includes it | route/page/object params when present | batch `createdAt`, event timestamp fields | directional | Directional guest recovery only | Missing consented guest batches means quality metrics remain unavailable |
| Firestore `analytics_session_facts` and `analytics_sessions` | First session fact deployment | session start/end, last seen, active route | sessionId, userId when identified | route/surface | `startedAt`, `lastEventAt`, `updatedAt` | medium | Session continuity support | Session facts are not event facts and cannot prove ordered actions alone |
| Firestore `analytics_watch_sessions`, `analytics_watch_assets`, `analytics_watch_observations` | Viewer telemetry deployment | viewer opened, asset started/completed/consumed, watch checkpoints | userId/sessionId when present | dropId, assetId, watchSessionId | `createdAt`, `startedAt`, `completedAt`, `lastSeenAt` | medium | Viewer history and watch parity | Missing start/end pairs make duration partial |
| Firestore `transactions` and PayPal/internal commerce rollups | Commerce launch | purchase completed/failed, checkout recovery, real-money events | userId and payment/customer records | transactionId, orderId, packageId | `createdAt`, `completedAt`, `capturedAt`, `updatedAt` | high for completed internal/payment facts | Backfillable for commerce parity | Promo/admin/bonus value must never be counted as revenue |
| Unlock records / GumDrops ledger | Unlock/economy launch | unlock success/failure, GD spend | userId/session when present | dropId, unlockId, ledger entry | `createdAt`, `unlockedAt`, `updatedAt` | medium to high | Unlock parity and content conversion | Ledger entries must distinguish paid, bonus, promo, admin-granted, and refunded GD |
| Drop view records and page rollups | Public drop launch | drop impressions, preview opens, details views | guest/session/user depending on source | dropId, route | `createdAt`, `dayKey`, document id date | directional to medium | Historical audience/content recovery | Rollup counts are not unique users or ordered journeys |
| Firestore `daily_task_events`, task lifecycle logs, user task state | Daily task deployment | task assigned, started, completed, failed, reminders, guidance signals | userId/sessionId/task assignment | taskId, assignmentId | `assignedAt`, `startedAt`, `completedAt`, `failedAt`, `createdAt` | high for canonical task state, medium for logs | Task pipeline and leaderboard parity | Guide/reminder events are not lifecycle states unless mapped |
| Notification records and push/runtime logs | Notification deployment | prompted, enabled, sent, opened, read, cleared, duplicate prevented, skipped | userId/recipientId, sometimes token/browser state | notificationId, dropId, taskId | `createdAt`, `sentAt`, `openedAt`, `readAt`, `clearedAt` | medium | Notification funnel and dedupe parity | Web push delivery is often unknown; foreground/background state may be missing |
| Onboarding state and step records | Guided onboarding launch | onboarding started, step started/completed, onboarding completed | userId/sessionId when present | stepId | `startedAt`, `completedAt`, `createdAt`, `updatedAt` | high when step state exists | Onboarding Performance parity | Auth sign-ups are not onboarding starts |
| User records and profile/audit fields | Auth launch | registration, profile completion, role changes | userId, role, creator/admin flags | userId, creatorId | `createdAt`, `registeredAt`, `updatedAt` | medium | Identity and role lane context | User records are not behavioral events by themselves |
| RTDB presence/session paths | Presence/chat/runtime deployment | active session, last seen, route presence | session/user/admin when path includes it | sessionId, route/chat id | server timestamp / `lastSeen` | directional unless server timestamp and disconnect lifecycle are proven | Live Pulse support only | RTDB presence must prove `onDisconnect` before it is called exact live truth |
| Admin audit records and route diagnostics | Admin launch | admin_action_performed, route health, debug validation | adminId/system actor | route, module, validation key | `createdAt`, `updatedAt`, `lastValidatedAt` | high for admin/system lane | Admin Debug and exclusion counts | Must be excluded from user/guest analytics |
| GA4 / BigQuery daily `events_YYYYMMDD` | GA4 export start date; verify from dataset | provider event totals and params | user pseudo id, user id when exported | event params | event timestamp | medium for provider validation | Historical parity only | Not product truth unless reconciled with first-party records |
| GA4 / BigQuery intraday `events_intraday_YYYYMMDD` | GA4 streaming/intraday setup date | current-day directional event counts | user pseudo id, user id when exported | event params | event timestamp | directional | Live-ish validation only | Incomplete current-day export; never final totals |
| Backend rollups, caches, and route snapshots | Varies by materializer | module summaries, historical totals, realtime snapshots | summarized actor lanes if present | module-specific keys | `generatedAt`, `lastValidatedAt`, `updatedAt` | directional to high depending on validator | Hot-cache seed or Debug comparison | Stale snapshots must stay labeled stale and cannot become live pass |

## Mapping Rules

1. Prefer first-party product records over GA/provider exports.
2. Attach the original `legacySource`, `legacyId`, confidence, selected range, and mapping warnings.
3. Use `legacy_directional_only` unless a later backfill job verifies the source and writes new canonical facts.
4. Do not silently promote missing timestamps, missing actor lanes, or missing object ids.
5. Keep unmapped records visible to Debug through the `unmapped` output.
6. Do not merge guest/session history into a user unless an `identity_linked` event exists.
7. Do not count admin/system events in user/guest behavior; expose exclusion counts in Debug.

Every recovered event record must carry these fields before it can be reviewed for any snapshot:

- `legacySource`
- `legacyId`
- `legacyTimestamp`
- `mappedEventName`
- `mappingConfidence`
- `mappingWarnings`
- `recoveredAt`
- `actorConfidence`
- `objectConfidence`
- `sourceMode = legacy_mapped`
- `includedInSnapshot`
- `excludedReason` when not included

Legacy mapped records are never server-confirmed current truth. They are evidence with confidence labels. A recovered event can be included in a verified snapshot only when its source-specific mapping, dedupe, and parity checks pass. Directional or unknown records stay visible in Debug and remain excluded from Analytics values.

## Backfill Policy

This phase does not run a backfill. The default command behavior is dry-run. Write mode requires both an explicit `--write` flag and a separate environment gate. The current target is the typed recovery collection `analytics_legacy_recovered_events`, but production writes remain disabled until a reviewed migration plan enables them.

A future destructive or write-heavy migration must:

- use a dry run first
- write to a new canonical ledger or a clearly versioned backfill collection
- retain original ids and source paths
- preserve selected ranges and timestamps
- expose confidence and skipped/unmapped counts
- keep legacy-derived facts separate from server-confirmed current facts until parity passes

## Phase 4 Report Responsibilities

The inventory report lists each configured legacy source, its source type, path/table, timestamp fields, actor fields, object fields, recoverability, confidence, and risks. It does not claim record counts unless counts were cheap and safe to query.

The mapping report lists scanned, mapped, skipped, duplicate, failed, and low-confidence counts. It includes recovered event samples and unmapped records. Duplicate records are suppressed by deterministic duplicate keys and remain visible in the report.

The parity report compares ecosystem lanes and produces snapshot-compatible parity rows. It must include purchases, unlocks, tasks, notifications, onboarding, guest/auth separation, admin exclusion, creator separation, hot cache snapshots, legacy mapping, and Debug validation relocation.

Admin Debug owns the detailed “Analytics Legacy + Parity” surface. Admin Analytics should never show raw legacy audit rows or long parity diagnostics. Analytics may consume a verified hot-cache value later only after Debug parity makes the source state clear.

## Directional-Only Sources

These sources can help explain history but cannot alone prove exact product truth:

- GA4 intraday/current-day exports
- guest batches without consented quality data
- backend route snapshots without validator metadata
- rollups that lost actor identity
- presence rows without server timestamp/disconnect lifecycle proof
- user records used as behavioral events

Future agents must not turn directional recovery into confident Analytics UI values without a fresh source-labeling and parity pass.
