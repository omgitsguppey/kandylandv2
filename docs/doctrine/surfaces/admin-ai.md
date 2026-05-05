# Admin AI Doctrine

Authority level: 4

Owner: admin AI

## Must

- Use the shared AI model registry and admin-only route controls.
- Keep prompt/job history canonical when used for learning or audit.
- Enforce budget, model, timeout, and kill-switch controls for paid AI calls.

## Must Not

- Hardcode model aliases outside the registry.
- Show AI fallback states as healthy.
- Let local UI history clearing delete canonical server AI jobs.

## Source Truth

- Admin AI registry, admin AI routes, AI cost controls, debug evidence.

## Validators

- `check:admin-debug-control-tower`
- `check:admin-review-badges`
- `check:google-cost`
