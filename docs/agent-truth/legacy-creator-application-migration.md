# Legacy Creator Application Migration

Status: launch hardening adapter. Runtime code remains the source of truth.

## Doctrine

`creator_onboarding/{uid}` is the canonical creator intake, legal, ID, approval, owner, and role-activation record.

`users/{uid}.creatorApplication is projection only`. It can keep older waitlist and creator-facing status surfaces working, but future writes must create or update canonical onboarding first and then rebuild projections.

## Adapter

The server adapter is `src/lib/server/creator-onboarding-legacy-adapter.ts`.

It exposes:

- `readLegacyCreatorApplicationFromUser(userDoc)`
- `mapLegacyCreatorApplicationToCanonical(input)`
- `buildCreatorApplicationProjection(canonical)`
- `needsCreatorOnboardingBackfill(userDoc)`
- `explainLegacyMapping(input)`

The adapter maps legacy nested projection data into a canonical onboarding shape with explicit legacy debug fields:

- `legacyCreatorApplicationDetected`
- `legacyCreatorApplicationMapped`
- `legacyCreatorApplicationSkipped`
- `mappingConfidence`
- `mappingWarnings`

## Safety Rules

Do not overwrite canonical records with weaker legacy projection data.

Do not infer legacy legal or signature completion unless the legacy record has signature evidence: timestamp, signer, and agreement identity such as version, hash, or dispatch ID.

If an old record says `legal_signed` or `signature_signed` without evidence, the adapter maps it to a sent agreement with pending signatures and adds mapping warnings. Approval status may be preserved for review evidence, but legal/signature blockers stay visible.

## Inventory

The dry-run inventory script is:

```bash
tsx scripts/creators/inventory-legacy-creator-applications.ts
```

It writes:

- `agent/state/legacy-creator-application-inventory.generated.json`

The script is dry-run by default. Write mode is intentionally not implemented in this launch pass; running with `--write` fails rather than mutating data.

Each report entry includes:

- `userId`
- `hasLegacyCreatorApplication`
- `hasCanonicalCreatorOnboarding`
- `hasReviewQueueEntry`
- `migrationNeeded`
- `mappingConfidence`
- `missingFields`
- `blockingRisks`
- `recommendedAction`

## Write Order

New creator intake writes canonical onboarding first through `syncCreatorOnboardingDocuments(...)`.

That path writes:

1. `creator_onboarding/{uid}`
2. `users/{uid}.creatorApplication`
3. `creator_review_queue/{uid}` through the queue materializer

Future migration write mode must keep the same rule and must be idempotent: if canonical onboarding already exists, skip the legacy record and report it as preserved.

## Validation

Run:

```bash
npm run check:legacy-creator-application-migration
```

The validation enforces adapter exports, dry-run inventory behavior, canonical-first write order, projection builder presence, signature-evidence safety, and report schema coverage.
