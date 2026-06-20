# Event Catalog Telemetry

Status: Launch telemetry naming and payload contract doctrine.
Last updated: 2026-05-01.

## Doctrine

Every emitted event must be cataloged in `src/lib/telemetry-catalog.ts`. Every catalog event must either have a detected emitter or an explicit `auditCoveredBy` explanation that ties it to a canonical replacement or upstream source.

Canonical event names use lowercase snake_case. Casing drift and historical aliases must pass through `normalizeTelemetryEventName`; emitters should not invent ad hoc names.

Telemetry has separate actor, source, and object lanes. Admin events may be stored for Admin Analytics and Debug, but they must not enter user behavior or active-user metrics. Unknown actors do not become authenticated users.

## Payload Contract

`TELEMETRY_EVENT_PAYLOAD_CONTRACTS` records the launch-required fields for each event:

- Drop events require `drop_id` or `dropId` plus a route/surface/source component when emitted from UI.
- Unlock events require a user actor, `drop_id`, and `transaction_id` or `idempotency_key`.
- Purchase events require a user actor where purchase is completed or verified, an order/purchase/transaction id, amount/source fields, and payment source metadata.
- Notification events require a recipient or audience, `notification_id` or `idempotency_key`, and notification type/lifecycle metadata.
- Chat/message events require thread or conversation id plus message id or idempotency key.
- Auth events require method/outcome when available and a session, anonymous visitor, or user identifier.
- Admin events require admin classification and are excluded from user behavior lanes.

Public beta chat UI emits `chat_thread_opened`, `chat_compose_sheet_opened`, `chat_list_search_focused`, `chat_message_send_attempted`, `chat_message_send_failed`, and `chat_message_sent` with `source_component`, route, display mode, viewport size, and thread/creator/idempotency details when available.

Camel-case payload keys may be accepted by client emitters, but the analytics client mirrors canonical snake_case aliases before transport.

## Admin And User Lanes

Identified client ingest and server analytics write event facts with lane metadata:

- `actorType`
- `actorLane`
- `adminId`
- `analyticsUserId`
- `includeInUserBehavior`
- `includeInAdminAnalytics`
- `analyticsExclusionReason`
- `metricFamily`
- `actorUserId` / `actorAdminId` / `actorCreatorId`
- `targetUserId` / `targetCreatorId` / `targetDropId` / `targetFileId` / `targetThreadId`
- `sourceTruth`
- `sourceConfidence`
- `metricEligible`
- `metricExclusionReason`

Only events with `includeInUserBehavior: true` may update `analytics_active_users`. Admin route visits, admin UI interactions, system jobs, and unknown actors stay visible in Debug/global evidence without polluting user behavior.

`identity_linked` must emit on signup, login, and session restore. Privacy-limited identity linking is recorded with an exclusion reason instead of being mislabeled as a broken metric source.

## Validation

Run:

```bash
npm run check:event-catalog-telemetry
npm run check:telemetry
npx vitest run tests/contracts/telemetry-contracts.spec.ts tests/unit/analytics-event-contract.spec.ts
```

The generated audit lives at `agent/state/event-catalog-telemetry-audit.generated.json` and stays compact by default. It stores counts, bounded samples, findings, and report-shape metadata; the full catalog/event-contract table is validated in-process from source instead of being copied into the generated snapshot.

## Future Agent Rules

Do not emit a new telemetry event without adding it to the catalog and payload contract.

Do not add a catalog event without an emitter, `auditCoveredBy`, or a clear legacy/deprecated reason.

Do not label admin/system events as user behavior.

Do not use raw backend event names as primary admin UI labels. Use operator copy in main UI and keep raw event/source names in Debug evidence.

## Public Beta PR Triage Addendum

Open bot PRs must be cherry-picked by current-source relevance. Duplicate Bolt/Jules branches should not be merged wholesale. Public beta fixes prioritize current source-of-truth, no UI regression, and targeted validation over broad stale branch merges.

Only truly critical user-path telemetry should bypass the normal identified batch window. Wallet open/close-incomplete, locked preview page/CTA, unlock success, purchase completion/failure, viewer open/session, creator follow, feedback submission, guided onboarding, auth, security, task progress, and admin-route events may flush immediately when consent and identity gates allow it. Do not turn every event into an immediate backend flush.
