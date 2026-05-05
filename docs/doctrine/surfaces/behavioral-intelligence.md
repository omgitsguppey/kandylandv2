# Behavioral Intelligence Doctrine

Authority level: 4

Owner: behavioral intelligence/recommendations

## Must

- Normalize raw events into canonical event facts before scoring.
- Deduplicate aliases by user, entity, and time window.
- Prefer server purchase, entitlement, watch-session, support, and normalized notification facts.
- Keep deterministic recommendation ranking as the safety baseline unless validation promotes ML.
- Validate ranking and behavioral math changes through deterministic holdout experiments before activation.

## Must Not

- Score unknown events as production facts.
- Count client retries twice.
- Activate ML artifacts without validation evidence.
- Promote ranking variants from correlation-only evidence.

## Source Truth

- Event-fact contract, normalizer, rollups, behavioral runtime, recommendation ranker.

## Validators

- `check:event-fact-truth`
- `check:behavioral-truth-source`
- `check:behavioral-experiments`
- `check:recommendation-ranker`
- `check:math-goal-alignment`
