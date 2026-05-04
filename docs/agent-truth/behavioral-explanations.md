# Behavioral Explanations

KandyDrops behavioral intelligence must default to verdicts and plain-English reasons by default.

Rules:

- Admin surfaces show verdict, truth state, confidence label, and top reasons first.
- Raw math is diagnostic-only and stays collapsed under `Why this verdict?`.
- If confidence is below 30%, the surface says `Insufficient signal` instead of pretending recommendations are trustworthy.
- If tracking issues exist, the surface says `Tracking issue` instead of showing zero-affinity recommendation spam.
- If creator/content affinity is still zero, fallback recommendations stay compact and capped.
- Recommendation cards explain why they were shown in plain English before exposing ranking diagnostics.
- Stale or degraded sources stay visible with labels; they do not masquerade as live or disappear into `[unavailable]`.

Doctrine:

Behavioral explanations are verdict-first. Math is support evidence, not the primary admin UI.
