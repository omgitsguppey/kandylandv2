# Release Notes Integrity

Artifact: `agent/state/release-notes-integrity.generated.json`
Validator: `npm run check:release-notes-integrity`

## Summary

- Generated: `2026-07-14T16:07:07.315Z`
- Current head: `dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa`
- Status: `fail`

## Report

```json
{
  "reportKey": "release-notes-integrity",
  "generatedAtUtc": "2026-07-14T16:07:07.315Z",
  "currentHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
  "currentVersion": "1.6.15",
  "publicReleaseJsonValid": true,
  "claimsBetaExit": false,
  "claimsProviderRuntimeProof": false,
  "exposesSensitiveInternals": false,
  "changelogMentionsLatestHardening": true,
  "releaseNotesStaleToCurrentHead": true,
  "releaseNotesAnchorStatus": "not_ancestor",
  "validationFailures": [
    "release notes stale to currentHead.",
    "release notes anchor is not_ancestor; it does not establish currentHead ancestry."
  ],
  "status": "fail",
  "evidenceClass": "source_snapshot",
  "canClearSourceGate": false,
  "canClearRuntimeGate": false,
  "canClearProviderGate": false,
  "canClearAdminTruthGate": false,
  "nextExactSteps": [
    "Use the owning release-readiness validator, then attach source/site-activity/deployed-route/admin-source evidence separately."
  ],
  "doesNotProve": [
    "Does not prove deployed runtime behavior.",
    "Does not prove provider-backed site activity.",
    "Does not prove current admin source activity samples.",
    "Does not prove external billing or GitHub PR state unless an opt-in fresh evidence artifact says so."
  ]
}
```

## Evidence Boundary

This source-generated packet does not prove deployed runtime, provider-backed site activity, billing, admin source activity, or optional visual reproduction unless the report explicitly includes a matching typed evidence artifact for that category.

## Validation

- FAIL: release notes stale to currentHead.
- FAIL: release notes anchor is not_ancestor; it does not establish currentHead ancestry.
