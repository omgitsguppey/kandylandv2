# UI Visual Smoke Evidence

This folder is the narrow operator-final visual review checklist for layout-sensitive UI surfaces only.

Use `template.json` as the starting shape for the external visual workflow. A template is not proof. Visual confirmation is handled outside Codex and does not block Codex source/debug scoring.

- `operator_confirmed_outside_codex` with `operatorConfirmed: true`, or
- `screenshot_attached` with a real `screenshotArtifactPath`.

Non-UI telemetry, admin truth, cost, refresh, provider, and runtime source evidence must not be routed through this lane.

Protected surfaces are excluded by default:

- chat
- top nav
- bottom nav
