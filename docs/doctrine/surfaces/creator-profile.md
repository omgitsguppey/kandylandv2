# Creator Profile Doctrine

Authority level: 4

Owner: creator profile

## Must

- Treat public creator profile actions as fan/user behavior targeting a creator.
- Keep creator identity markers stable and verified by source contracts.
- Preserve safe public profile projection without admin/projection pollution.

## Must Not

- Classify fan follows, fan passes, bookings, or profile clicks as actor creator behavior.
- Expose admin-only creator projection as public truth.

## Source Truth

- Creator profile route, creator identity markers, actor/target telemetry contract.

## Validators

- `check:creator-profile-routing`
- `check:creator-identity-markers`
- `check:actor-target-telemetry`
