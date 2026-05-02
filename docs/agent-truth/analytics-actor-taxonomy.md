# Analytics Actor Taxonomy

Status: Phase 2 actor contract
Last updated: 2026-05-02

## Why Actor Lanes Matter

KandyDrops analytics must not collapse every action into a generic user lane. Guest traffic, authenticated fan behavior, creator operations, admin actions, and system jobs answer different questions. Mixing them creates false audience totals, fake conversion rates, and noisy live streams.

## Actor Types

### Guest

A guest is a public visitor or unauthenticated session that can view public surfaces and emit consented first-party telemetry. Guest history must remain guest history even if the person later signs in.

Required identifiers may include:

- session id
- client session id
- anonymous visitor id
- consent state
- route or surface
- first seen / last seen timestamps

### Anonymous Visitor

An anonymous visitor is the broader public identity lane before a stable session is known. Use this when the code has public traffic evidence but cannot prove a durable session key. Anonymous visitor metrics must not be counted as authenticated users.

### Session

A session is a time-bounded interaction container. It can belong to a guest, authenticated user, creator, admin, or unknown actor. Session analytics must name the session source and timeout/window.

### Authenticated User

An authenticated user is a signed-in fan or account holder. Authenticated-user analytics can use `uid`, profile records, first-party event facts, purchases, unlocks, tasks, onboarding state, notifications, and watch sessions. Authenticated activity is not total audience by itself.

### Creator

A creator is an account operating creator-facing tools, drops, experiences, messages, applications, payouts, or creator onboarding. Creator actions must not be mixed into fan conversion analytics unless the module is explicitly about creator operations.

### Admin

An admin is an operator using Admin Console, Debug, moderation, content, queue, economy, AI, support, or analytics surfaces. Admin activity must be excluded from user/guest analytics by default. If included for operational diagnostics, it must be labeled admin.

### Owner Admin

An owner admin is the primary owner or owner-level operator performing an owner-only action such as onboarding override, direct creator activation, or emergency creator account administration. Owner-admin activity is an admin lane, not fan behavior, and must be excluded from user/guest analytics unless a module is explicitly measuring admin operations.

### System

System actors are cron jobs, Cloud Functions, queue processors, materializers, export jobs, recovery jobs, and service workers. System events must not be shown as user behavior unless the module is explicitly about system health.

### Unknown

Unknown means the source cannot prove actor type. Unknown should not be silently coerced to user or guest. The module may include unknown counts only when it labels the lane and exposes the classification gap in Debug.

## Identity Link Event

An identity link event connects earlier guest/session activity to a later authenticated user without deleting or rewriting the guest lane. A correct link record should include:

- previous guest/session key
- new authenticated user id
- link timestamp
- link source
- consent state when relevant
- confidence

The link lets Debug trace continuity while preserving the original actor lane for public traffic analysis.

## Guest to User Merge Rule

This is the guest-to-user link rule for analytics identity.

When a guest signs in:

1. Preserve the original guest/session events.
2. Record an identity link event.
3. Attribute future authenticated actions to the user lane.
4. Allow rollups to show linked journey context only when they label it.
5. Never erase guest history or retroactively call guest events authenticated-only events.

## Admin Exclusion Rules

Admin and owner-admin activity is excluded from user/guest analytics by default. This applies to:

- Live Interaction Stream
- Event Mix user-facing interpretations
- Journey Funnel
- Auth Outcomes unless the module is explicitly testing admin auth
- Audience Snapshot user totals
- Guest + Bounce Quality
- onboarding/task fan behavior
- notification user-facing funnel

Admin excluded counts should be available in Debug for modules that filter event streams.

## Creator, Admin, and System Separation

Creator, admin, and system actions can be valuable operational data, but they answer different questions:

- creator lanes belong in creator operations, creator onboarding, content, payouts, or creator health modules
- admin and owner-admin lanes belong in Admin Debug, route diagnostics, moderation/support/admin audit streams
- system lanes belong in runtime, scheduler, queue, notification, export, and pipeline health

If an analytics module needs to compare these lanes, it must label each lane and expose source classification.

## Unknown Actor Policy

Unknown actor rows must be handled conservatively:

- do not assume user
- do not assume guest
- do not include unknown in conversion denominators without a visible label
- expose raw ids and classification reason in Debug only
- prefer safe display labels such as `Unknown session` over full raw ids

## Required Debug Fields

Later phases should expose these fields where actor classification matters:

- actorType
- actorSource
- actorConfidence
- rawActorId
- displayActorLabel
- identityLinkId
- adminExcludedCount
- creatorSeparatedCount
- systemExcludedCount
- unknownActorCount
- guestInclusive true/false
- authenticatedOnly true/false

## Phase 2 Helper Contract

The typed helper lives at `src/lib/analytics/analytics-event-contract.ts`.

Actor types are:

- `guest`
- `user`
- `creator`
- `admin`
- `owner_admin`
- `system`
- `unknown`

Actor lanes additionally name `anonymous_visitor` and `session` so Debug can explain when an event has public identity evidence without a signed-in user.

The helper rules are:

1. Admin and owner-admin classification wins over user classification. A record with `userId` and an admin route/role remains admin or owner_admin and must not count as user behavior.
2. System events remain system even when they affect user-facing objects.
3. Creator events remain creator lane and must not be merged into fan behavior by default.
4. Unknown is never upgraded to authenticated user.
5. Guest and user history may be connected only through `identity_linked`; old guest events remain guest events.
6. Global events can include all actor types, but actor classification must be preserved.

The client identity helper extension in `src/lib/client-session.ts` owns:

- `anonymousVisitorId` as the durable anonymous subject when consent allows persistence
- `sessionId` as the current session key
- consent-aware identity snapshots
- a local identity-link record for future login/signup wiring

This is a spine only. Future phases must wire product emitters into it without duplicating identity storage.
