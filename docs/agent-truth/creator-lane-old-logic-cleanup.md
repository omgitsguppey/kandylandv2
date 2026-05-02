# Creator Lane Old Logic Cleanup

Status: regression gate for launch hardening.

## Canonical Rule

`creator_onboarding/{uid}` is the source of truth for creator intake, legal, ID, approval, owner override, synthetic creator, and role activation state.

`creator_onboarding/{uid}/history/{eventId}` is the lifecycle audit trail.

`creator_review_queue/{uid}` is the deterministic Admin Roster projection.

`users/{uid}.creatorApplication is projection only`. It can support old creator-facing status reads and migration/backfill, but it must not become the canonical lifecycle write target again.

## Old Logic Removal Gate

Run:

```bash
npm run check:creator-lane-old-logic-removal
```

The gate scans repo files and blocks these regressions:

- Treating `users/{uid}.creatorApplication` as canonical.
- Directly PUT-ing arbitrary `creatorApplication` blobs for legal or approval lifecycle actions.
- Do not PUT arbitrary creatorApplication blobs.
- Showing raw enum labels in primary roster or creator UI.
- No raw enum labels.
- Filtering creator intake by `role === creator only`.
- Marking legal or signature completion without `agreementVersion and agreementHash`.
- Owner override without reason.
- Owner override requires a reason.
- Admin lifecycle actions without an actor marker.
- Creator paid experience writes without an idempotency key.
- Creator profile hardcoded obsolete routes instead of the canonical creator profile href builder.
- View-as mode replacing auth identity instead of simulation context.
- Synthetic creators without synthetic marker fields.

## Allowed Compatibility

Remaining legacy compatibility must be named in:

- `agent/state/creator-lane-old-logic-cleanup.generated.json`

Every exception must include:

- `filePath`
- `pattern`
- `allowedReason`
- `owner`
- `removalPlan`
- `risk`

Adding a new exception is a launch-risk decision. It should be rare, documented, and paired with tests.

## Required Boundaries

Admin Roster lifecycle actions must use:

- `/api/admin/creators/[userId]/action`

Do not PUT arbitrary `creatorApplication` blobs through `/api/admin/users` from the roster.

The generic admin users route remains a deprecated compatibility bridge only when it sanitizes a projection patch, rebuilds canonical onboarding, rebuilds projections, writes history, and emits actor-marked telemetry.

Creator waitlist and older user-profile surfaces may read `users.creatorApplication` as a display projection while the server keeps it synchronized from canonical onboarding.

## Debug And Cleanup

Admin Debug must expose projection/canonical drift. Admin Roster should show only compact operator warnings.

Future cleanup should remove projection fallbacks in this order:

1. Run the legacy creator application inventory.
2. Backfill canonical onboarding for projection-only records.
3. Confirm review queue parity.
4. Move creator-facing status reads to a canonical status endpoint.
5. Delete `users.creatorApplication` projection writers.

The old logic removal gate should stay active until that deletion is complete.
