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

The canonical ID request lifecycle event is `id_requested`. If a creator source state has `idVerificationStatus: "id_requested"`, Creator Lane parity must require a matching `id_requested` history entry unless a future canonical event migration explicitly supersedes it.

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

- `generatedAtUtc`
- source snapshot counts
- parity status
- top creator-level mismatch rows with `creatorId`, surface, expected state, actual state, suggested action, and validator
- history coverage
- last materialized time or `Not recorded`
- materialization freshness state
- recommended fix
- `canSelfHeal`

Debug can include raw field names and technical evidence. Roster copy must stay short and action-oriented.

If `lastMaterializedAtUtc` is missing, the lane must stay in review and say: "Materializer has no recorded completion timestamp." When source snapshots are present but the materializer timestamp is missing, the card must also explain: "Source snapshots loaded, but queue materializer completion was not recorded." Missing materializer evidence must never render as live.

## Generated Report

Local Creator Lane parity evidence is refreshed into `agent/state/creator-lane-debug-parity.generated.json` by `npm run score:creator-lane-debug-parity`. The source-only scorer does not query Firebase or repair creator data; it records local runtime wiring, `generatedAtUtc`, materialization freshness, source snapshot counts, mismatch rows when available, and next actions. Live creator-specific IDs and mismatches come from the Admin Debug creator onboarding snapshot.

The generated report must keep this shape:

- `generatedAtUtc`
- `status`
- `lastMaterializedAtUtc`
- `materializationFreshnessState`
- `sourceSnapshots`
- `issueCount`
- `historyGapCount`
- `mismatches`
- `nextActions`

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

## History Gap Repair

Do not blindly insert missing audit history. First verify the source state in Admin Debug or a dry run:

```bash
npm run repair:creator-lifecycle-history -- --userId FuJn6cyZi4UxZgN2TaJEwwkKUHz1 --event id_requested --sourceOnboardingUpdatedAt 1775425067822
```

Only after verifying the canonical creator onboarding source still has `idVerificationStatus: "id_requested"` should an operator apply the repair:

```bash
npm run repair:creator-lifecycle-history -- --userId FuJn6cyZi4UxZgN2TaJEwwkKUHz1 --event id_requested --sourceOnboardingUpdatedAt 1775425067822 --apply
```

The repair writes a provenance-marked history entry only. It uses actor `system_debug_repair`, role `system`, label `Debug parity repair`, summary `ID request history restored from source state`, and metadata including `repairReason: "missing_history_event"`, `missingHistoryEvent: "id_requested"`, `sourceStatus: "id_requested"`, `provenance: "creator_lane_debug_parity"`, `repairedAtUtc`, and `doesNotChangeCreatorState: true`.

The repair must not change approval status, user role, ID verification status, legal/signature status, creator settings, restrictions, queue bucket, or queue parity. If `queueParityOk` is still false, that remains a separate visible Creator Lane issue.
