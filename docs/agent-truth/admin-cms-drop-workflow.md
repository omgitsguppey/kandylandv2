# Admin CMS Drop Workflow

Status: launch rule for admin and creator Drop publishing.

Admins can create, edit, publish, queue, expire, and delete Drops. Creators can submit Drops for review. The product rule is simple: a Drop may not become public unless the server can verify the same minimum publish state the CMS form expects.

## Publish Gate

The shared server gate is `validateDropPublishState` in `src/lib/server/drop-mutations.ts`.

Before a Drop is created, approved, or edited in a way that affects publish readiness, the server verifies:

- title is present
- description is present
- cover or public preview URL is present
- Gum Drop price is finite and zero or greater
- start time is present
- expiration, when present, is after the start time
- content Drops have at least one locked content asset
- promo and external Drops have a safe destination URL
- creator-submitted Drops have a creator assignment
- subscriber-only Drops have a creator assignment

Client form validation is helpful, but it is not the source of truth. The admin and creator write routes must keep using the shared server gate.

## Creator Assignment

Creator assignment is optional for normal admin-created Drops. It is required when:

- the Drop was submitted by a creator
- the Drop requires an active creator subscription

Admin-created public content can stay unassigned. Creator-submitted Drops are forced to the caller uid on the server and enter `pending_review`.

## Media

Cover and preview media are public-safe. Locked content assets are not public-safe and must remain behind the guarded content proxy.

Current media flow:

- admin upload: `/api/admin/content`
- creator upload: `/api/creator/drops/assets`
- public feed: sanitized by `sanitizeDropForClient`
- locked content access: `/api/drops/content`
- `AssetUploader` queues every selected asset that needs upload and only emits server-accepted success URLs back into the CMS form.
- `AssetUploader` also emits durable draft queue state so parent forms can keep queued, uploading, failed, and canceled files visible during re-render and draft persistence.
- Cover crop waits in `local` state until `Use Cover`, then joins the same queue truth as other uploads.
- Failed, blocked, or canceled assets stay visible with typed error copy and retry/remove controls instead of silently looking pending.
- Drop save/publish must stay blocked while uploads are still active. The CMS can only submit final content from successful uploaded assets after the queue is complete or the user explicitly removes failed items.
- Queued items waiting behind concurrency are not stalled. `Pending` is not a valid terminal state.

Content Drops require at least one locked asset before publication. Promo and external Drops do not require locked assets, but they require a safe action URL.

## Queue and Return-Live

Queue membership is managed through admin-only queue routes. Queueing a Drop does not notify users by itself.

The runtime activation path owns public return-live behavior:

- scheduled Drops become active when their live window starts
- expired auto-queue Drops can be returned to queue
- return-live notifications use deterministic activation keys
- duplicate notification creation and browser display are prevented by notification idempotency keys and browser tags

Do not add a second queue notification path from the CMS UI.

## Expire

Expiration is derived from the live window and `resolveDropStatusFromTiming`. Expired locked Drops stop rendering as unlockable discovery cards. Existing owners keep entitlement through library/viewer access.

## Archive/Delete

The current launch workflow has delete, not a reversible archive state. Admin delete requires confirmation, admin auth, trusted origin, and surface invalidation.

Deletion removes the Drop document from user-facing routes. Historical analytics may still reference the old Drop id. A reversible archive state is deferred until product operations require restore/history semantics.

## User-Facing Route

Published Drops reach users through:

- `/api/drops`
- `getDrops`
- `DropGrid`
- `DropCard`
- preview modal/details UI

Public payloads must never include raw locked `contentUrl` or `contentUrls` values.

## Notification Trigger

Admin create/update sends activation notifications only after a validated write and only when the Drop transitions into live state. The activation key includes the Drop id and start time.

Manual admin notifications use the notification route idempotency layer. Return-live notifications use queue runtime idempotency.

## Analytics Attribution

CMS-published Drops must keep stable identifiers:

- card impressions include `drop_id`
- details clicks include `drop_id`
- unlock success includes `drop_id`
- creator unlock telemetry includes `creator_id` when a creator exists

Authenticated-only or creator-only telemetry must not be relabeled as total audience.

## Entitlement Behavior

Publishing does not grant entitlement. Unlock is a separate server transaction.

Protected viewer/content access requires:

- creator ownership, or
- unlocked content id, or
- server-written unlock timestamp

Repeated unlocks must not double-charge. Missing locked content should block publish for content Drops instead of producing a public empty Drop.

## Future Agent Rules

- Do not rely on client form validation alone.
- Do not publish content Drops without locked assets.
- Do not send queue/return-live notifications from a second path.
- Do not make creator assignment mandatory for every admin-created Drop unless product doctrine changes.
- Do not add reversible archive semantics without documenting the migration and entitlement behavior.
- Update `agent/state/admin-cms-workflow-audit.generated.json` and `npm run check:admin-cms-workflow` when changing this workflow.
