# Phase one final cleanup

This final gate consolidates targeted validators for cleanup, speed, telemetry, cost, and parity hardening.

## Gate command

- `npm run check:phase-one-final-cleanup`

## Included lanes

- `check:codebase-junk-cleanup`
- `check:client-loading-speed`
- `check:server-loading-speed`
- `check:user-creator-feature-parity`
- `check:event-timeline-management`
- `check:google-cloud-cost-data-handoff`
- `check:beta-versioning-final`
- plus existing targeted phase validators when scripts are present

Missing scripts are reported as `missing_validator` and block promo readiness until resolved.
