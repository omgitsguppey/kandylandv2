# Creator Admin Action Route

## Canonical Rule

Admin Roster lifecycle actions must go through `/api/admin/creators/[userId]/action`.

`creator_onboarding/{uid}` is the canonical creator review source. `creator_review_queue/{uid}` and `users/{uid}.creatorApplication` are projections rebuilt from the canonical record after each action.

The typed action registry and transition rules live in `src/lib/server/creator-admin-action-contract.ts`. The executor that applies those rules, writes projections/history, and emits telemetry lives in `src/lib/server/creator-admin-actions.ts`.

## Supported Actions

- `send_agreement`
- `send_updated_agreement`
- `countersign_agreement`
- `request_id`
- `mark_id_verified`
- `mark_id_rejected`
- `approve_creator`
- `reject_creator`
- `request_changes`
- `apply_owner_override`
- `clear_owner_override`
- `activate_creator_role`
- `update_admin_notes`
- `mark_synthetic_creator`

## Required Request Shape

```json
{
  "action": "approve_creator",
  "payload": {},
  "expectedVersion": "2",
  "idempotencyKey": "admin_roster:approve_creator:creator_1:1710000000000"
}
```

## Server Contract

- Admin auth and trusted origin are required.
- Owner-only actions are enforced server-side for owner override actions.
- The client never submits a mutable `creatorApplication` lifecycle blob.
- The server validates the current canonical state before changing legal, ID, approval, override, or role state.
- Each successful state change calls the shared creator onboarding sync path so canonical onboarding, user projection, and `creator_review_queue` materialize together.
- Each state change appends creator onboarding history with actor markers.
- Telemetry includes actor marker fields, target creator, action key, source version, and lifecycle state.
- Invalid transitions return a clear 400/403/409 response instead of silently rewriting state.
- Admin and owner override reasons are optional. Missing `ownerOverrideReason` may be shown as an optional audit note but is not an error, parity failure, or launch blocker unless a specific high-risk action explicitly requires a reason.
- Owner override audit evidence still requires actor id, action type, override active flag, target creator/user id, timestamp, source surface, and owner/admin actor marker.
- `mark_synthetic_creator` is an admin-only internal classification action. It requires a synthetic creator type and internal reason, writes `synthetic_creator_marked` history, sets `syntheticLegalEvidenceMode: internal_synthetic_no_external_agreement`, and must not change approval, role, payout, ledger, or public profile copy.

## Forbidden

- Do not use `/api/admin/users` from Admin Roster for creator lifecycle actions.
- Do not send `{ creatorApplication: { ...existing, ...patch } }` from the client for legal, ID, approval, owner override, or role activation.
- Do not trust client-submitted status enum values.
- Do not update user projection without canonical `creator_onboarding/{uid}` and review queue materialization.
- Do not skip `creator_onboarding/{uid}/history/{eventId}`.

## Generic User Updates

Generic admin user updates may remain for non-lifecycle profile/account fields, but creator lifecycle state must stay on the typed action route. Account email/password/profile controls use their own focused admin route.

## Debug Evidence

The route returns normalized creator detail fields and debug evidence:

- actor marker presence
- actor type
- performed-as mode
- canonical source used
- projection source used
- legacy normalization indicator
- history written
- queue materialized

Future agents should extend this route with a new typed action only when the action has explicit server validation, history, telemetry, and projection sync.
