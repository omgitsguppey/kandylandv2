# UI Visual Smoke Evidence

This folder is the narrow manual/operator evidence lane for layout-sensitive UI surfaces only.

Use `template.json` as the starting shape for a real evidence artifact. A template is not proof. The beta score gate only clears when every required surface is backed by either:

- `operator_confirmed` with `operatorConfirmed: true`, or
- `screenshot_attached` with a real `screenshotArtifactPath`.

Non-UI telemetry, admin truth, cost, refresh, provider, and runtime source evidence must not be routed through this lane.

Protected surfaces are excluded by default:

- chat
- top nav
- bottom nav

