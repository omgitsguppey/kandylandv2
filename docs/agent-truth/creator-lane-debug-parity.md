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
- Human creator + creator signature signed + missing agreementHash stays an error.
- Human creator + admin countersign signed + missing agreementHash stays an error with message: "Human creator admin countersign is marked signed, but agreementHash is missing."
- Synthetic/internal creator + creator signature signed + missing agreementHash is a Synthetic legal evidence note.
- Synthetic/internal creator + admin countersign signed + missing agreementHash is a Synthetic legal evidence note with message: "Synthetic/internal creator uses internal legal evidence mode; admin countersign agreementHash is optional."
- Human creator + signed signatures + missing agreementHash stays an error.
- Synthetic/internal creator + signed signatures + missing agreementHash is a Synthetic legal evidence note.
- Synthetic creator marker is incomplete. Required internal-only fields such as `syntheticCreatorType`, `syntheticReason`, `syntheticCreatedByUid`, `syntheticCreatedAt`, and `syntheticLegalEvidenceMode` must be present.
- ID verified or submitted without durable document metadata
- live or approved creator missing CreatorSettings
- CreatorSettings enabled lane conflicts with CreatorRestrictions pause
- required sensitive lifecycle history event is missing

Admin and owner override reasons are optional. Missing `ownerOverrideReason` may be shown as an optional audit note but is not an error, parity failure, or launch blocker unless a specific high-risk action explicitly requires a reason.

If owner override is active without a reason, Creator Lane may show:

- `severity: "info"` or `severity: "warn"`
- `status: "reason_optional"` or `status: "optional_audit_note"`
- `message: "Owner override reason is optional for admins."`
- `suggestedAction: "No action required unless you want additional audit context."`

The canonical ID request lifecycle event is `id_requested`. If a creator source state has `idVerificationStatus: "id_requested"`, Creator Lane parity must require a matching `id_requested` history entry unless a future canonical event migration explicitly supersedes it.

## Roster Warnings

Admin Roster is the decision queue. It must show only short operator warnings:

- Review queue out of sync
- Role needs review
- Agreement evidence missing
- ID record needs review
- Settings need review
- Settings missing
- Synthetic legal evidence note

Synthetic/internal creator records must carry `isSyntheticCreator: true` and `syntheticLegalEvidenceMode: "internal_synthetic_no_external_agreement"`. That mode means external `agreementHash` is optional for the synthetic creator classification only, for both creator signature evidence and admin countersign evidence. The recommended fix is "No action required unless stronger internal audit evidence is desired." Human creators still require `agreementHash` whenever creator/admin signatures are marked signed.

An approved/live creator missing settings is critical. "Live" means any of: `users/{uid}.role === "creator"`, canonical `approvalStatus === "creator_approved"`, review queue bucket `approved`, or creator experience activity exists. Missing settings must not be downgraded because legal, ID, or signature states are still pending once any live signal exists.

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

For live creators, the recommended fix is: "Create normalized default fan experience settings from canonical defaults." The self-heal path must create a `CreatorSettings` record with `schemaVersion`, `normalizedBy: "admin_debug_self_heal"`, provenance metadata, and a history entry `creator_default_settings_created`. It must not overwrite existing settings and must not change approval, role, legal, ID, signature, queue, payout, or ledger state. Booking defaults must be safe: bookings remain unavailable until availability is configured, with `creator_availability_not_configured` recorded as the reason.

Human review is required for evidence-sensitive issues:

- missing agreement version/hash/signature timestamp
- missing ID document metadata
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
