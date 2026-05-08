# User creator feature parity

Parity checks verify user and creator surfaces are connected to real backend truth or explicit unavailable states.

## Minimum parity checks

- Route exists for each claimed live surface.
- Claimed live CTA has backend route support.
- Telemetry hooks exist for key surface actions.
- Debug/parity markers stay available for audits.
- Typed expected errors are preferred over generic internal server failures.

Command: `npm run check:user-creator-feature-parity`
