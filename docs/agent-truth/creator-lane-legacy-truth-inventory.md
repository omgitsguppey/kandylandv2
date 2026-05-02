# Creator Lane Legacy Truth Inventory

Status: launch hardening inventory. Source of truth remains verified runtime code.

## Canonical Source

`creator_onboarding/{uid}` is the canonical creator intake, legal, ID, approval, owner override, synthetic creator, and role activation record.

`creator_onboarding/{uid}/history/{eventId}` is the canonical audit trail. Creator intake, agreement, ID, approval, account-control, fan-experience, synthetic creator, and admin view-as lifecycle actions should write deterministic history entries there.

Agreement lifecycle evidence is canonical when it is versioned and tied to creator onboarding:

- `creator_agreement_templates/{templateId}`
- `creator_agreement_templates/active`
- `creator_onboarding/{uid}/agreement_dispatches/{dispatchId}`
- `creator_onboarding/{uid}/agreement_signatures/{signatureId}`

Creator fan-experience settings currently live on the user profile as the source model:

- `users/{uid}.creatorSettings`
- `users/{uid}.creatorRestrictions`

The canonical settings shape is `CreatorSettings` and `CreatorRestrictions` in `src/lib/creator-experiences.ts`. Do not create a parallel fan-experience settings model.

## Projection Source

`creator_review_queue/{uid}` is the Admin Roster projection. It exists so the roster can stay fast and decision-oriented. It must be derived from canonical creator onboarding state through shared sync/materializer helpers.

`users/{uid}.creatorApplication` is a creator-facing and legacy-compatible projection. It exists for waitlist routing, creator status rendering, and older consumers that have not fully moved to canonical onboarding reads.

Important rule: `users/{uid}.creatorApplication` is not the future canonical source. It may be used as fallback/projection when `creator_onboarding/{uid}` is absent, but new creator lifecycle logic must not treat it as authoritative when canonical onboarding exists.

`src/lib/creator-onboarding-projection.ts` is the shared projection normalizer for creator onboarding display and admin roster decision labels. Admin Roster, admin user detail readers, and future creator-facing status surfaces should use its normalized display labels instead of interpreting raw `creatorApplication` status fields locally.

The normalized display contract includes:

- canonical status coercion through `normalizeCreatorOnboardingRecord`
- queue projection display through `normalizeCreatorReviewQueueEntry`
- creator-facing projection display through `normalizeCreatorFacingApplication`
- admin detail display through `normalizeCreatorAdminDetail`
- roster decision buckets through `deriveCreatorRosterBucket`
- primary action labels through `deriveCreatorPrimaryAction`
- `visibleStatusLabels` and debug fields for `normalizedFromLegacy`, `canonicalSourceUsed`, `projectionSourceUsed`, and `rawStatusValues`

## Legacy Source

Legacy means code that still depends on old projection or compatibility paths:

- Directly reading `users/{uid}.creatorApplication` to infer creator approval or navigation.
- Generic admin user updates that accept `creatorApplication` patches and must rebuild canonical onboarding.
- The creator messages compatibility route, which is intentionally legacy and should remain separable from native chat truth.
- Public creator helpers that read projection approval status before a dedicated public creator profile source exists.

Legacy-compatible code is allowed only when it is explicit, tested, and routed through canonical sync helpers.

## Cleanup Plan

1. Keep `src/lib/server/creator-onboarding.ts` as the only dual-write bridge for creator onboarding submissions and projection sync.
2. Keep Admin Roster reads queue/canonical first. Use `users.creatorApplication` only as explicit projection fallback.
3. Keep diagnostics that flag `projection_without_source`, `missing_source_onboarding`, and `missing_queue_record`.
4. Migrate projection-only creator records by creating canonical `creator_onboarding/{uid}` records and queue projections, not by blessing the projection as canonical.
5. Keep creator agreement template, dispatch, signature, and history evidence versioned under the agreement/onboarding helpers.
6. Keep creator fan-experience settings on the existing `CreatorSettings`/`CreatorRestrictions` model unless a future migration deliberately changes the canonical source.
7. Retire the legacy creator messages compatibility route only after native chat callers are verified.

## Forbidden Future Pattern

Do not treat `users/{uid}.creatorApplication` as canonical when `creator_onboarding/{uid}` exists.

Do not add direct `creatorApplication` writes outside centralized onboarding sync helpers.

Do not parse raw creator onboarding enums in Admin Roster or admin user detail UI with string replacements such as `replaceAll("_", " ")`. Use the projection normalizer and keep raw enum values only in Debug/detail evidence.

Do not create a parallel creator intake collection or audit collection while `creator_onboarding/{uid}` and `creator_onboarding/{uid}/history/{eventId}` are active.

Do not expose private onboarding, legal, ID, agreement storage paths, or raw audit metadata through public creator routes.

## Inventory Artifact

The machine-readable audit is:

- `agent/state/creator-lane-legacy-truth-inventory.generated.json`

The report classifies each audited file/path as one of:

- `canonical`
- `projection`
- `legacy`
- `mixed`
- `unknown`

Each entry includes read/write flags for:

- `users.creatorApplication`
- `creator_onboarding`
- `creator_review_queue`
- onboarding history

It also records actor lanes, current risk, cleanup recommendation, and tests needed.
