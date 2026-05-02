# Creator Lane Debug Parity

Status: launch hardening doctrine for creator onboarding, roster, and Debug truth.

## Source Order

Creator lane truth is compared in this order:

1. `creator_onboarding/{uid}` canonical intake, legal, ID, approval, owner override, synthetic creator, and role activation state.
2. `creator_onboarding/{uid}/history/*` append-only lifecycle evidence.
3. `creator_review_queue/{uid}` Admin Roster projection.
4. `users/{uid}.creatorApplication` creator-facing legacy-compatible projection.
5. `users/{uid}.role`, `users/{uid}.creatorSettings`, and `users/{uid}.creatorRestrictions`.
6. Creator fan-experience records for subscriptions, requests, bookings, message threads, and messages.

`users.creatorApplication` remains projection/legacy-compatible only. It must not become canonical when a creator onboarding record exists.

## Parity Checks

Admin Debug owns the full technical evidence for these checks:

- onboarding exists but the review queue record is missing
- review queue exists but canonical onboarding is missing
- user creatorApplication projection differs from canonical onboarding
- approved creator state but role is not creator/admin
- role creator but approval is not approved
- legal signed without matching creator/admin signature state
- creator signature missing agreement version, hash, or signature timestamp
- admin countersign missing agreement version, hash, or signature timestamp
- ID verified or submitted without durable document metadata
- owner override active without a reason
- live or approved creator missing CreatorSettings
- CreatorSettings enabled lane conflicts with CreatorRestrictions pause
- required sensitive lifecycle history event is missing

## Roster Warnings

Admin Roster is the decision queue. It must show only short operator warnings:

- Review queue out of sync
- Role needs review
- Agreement evidence missing
- ID record needs review
- Settings need review

Do not show raw collection paths, raw enum blobs, queue deltas, signature hashes, or storage details in the main roster row. Those details belong in Admin Debug.

## Debug Group

Admin Debug exposes a `Creator Lane` group with:

- source snapshot counts
- parity status
- mismatch rows
- history coverage
- last materialized time
- recommended fix
- `canSelfHeal`

Debug can include raw field names and technical evidence. Roster copy must stay short and action-oriented.

## Recommended Fix Rules

Self-healing is allowed for deterministic projection repairs:

- rebuild review queue from canonical onboarding
- sync user creatorApplication projection from canonical onboarding
- normalize missing creator settings from the existing settings model

Human review is required for evidence-sensitive issues:

- missing agreement version/hash/signature timestamp
- missing ID document metadata
- owner override without reason
- role/approval disagreement before creator access changes
- missing history for sensitive lifecycle actions
