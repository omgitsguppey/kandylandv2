# Drops Doctrine

Authority level: 4

Owner: drops/unlock/content protection

## Must

- Treat full-page locked Drop preview as canonical conversion surface.
- Expose only safe preview metadata before entitlement truth.
- Count unlocks from server entitlement facts only.
- Use viewport-backed impressions for discovery metrics.

## Must Not

- Treat the old preview modal as canonical.
- Render internal content URLs or thumbnails before unlock.
- Count client unlock success UI as canonical unlock truth.

## Source Truth

- Drop contracts, server unlock route, entitlement id, sourceTruth=server.

## Validators

- `check:drop-preview-page`
- `check:unlock-telemetry-truth`
- `check:content-protection`
- `check:discovery-tracking-truth`
