# Behavioral Experiments

KandyDrops ranking and behavioral math changes need causal validation, not correlation-only score watching.

## Experiment Units

Assignment uses the most stable available unit:

- authenticated users use `userId`
- guests use `anonymousVisitorId`
- sessions use `sessionId` only when no stronger unit exists

The assignment bucket is deterministic:

```text
hash(userOrSessionId + experimentId) % 100
```

This keeps a user or guest in the same lane across requests for the same experiment.

## Default rollout

Risky ranking changes start with a `90%` control holdout and a `10%` variant lane.

The control group keeps the deterministic baseline. The variant group receives the new ranking or behavioral math under test. A wider rollout requires explicit configuration after validation.

## Required Metrics

Every experiment must define one success metric and a rollback rule before it can run.

Supported metrics:

- `purchase_7d`
- `unlock_24h`
- `watch_completion`
- `return_7d`
- `negative_feedback`
- `support_complaints`

Negative feedback and support complaints are guardrails by default. They cannot worsen just because a purchase or unlock metric improved.

## Activation Math

Lift is calculated as:

```text
(metricVariant - metricControl) / max(metricControl, epsilon)
```

Activation requires:

- at least `200` users or sessions in the evaluated experiment sample
- lift above the configured threshold
- no worsening in negative feedback or support complaints
- no future events used in training validation
- confidence interval does not cross zero when a confidence interval is available

## Future-Event Rule

Do not use future events in training validation. If a training cutoff exists, any training event timestamp after that cutoff is leakage and blocks activation.

## Validator

Targeted command:

```bash
npm run check:behavioral-experiments
```

This validator checks the assignment formula, 90/10 risky rollout default, required success and rollback rules, activation gates, guardrails, future-event leakage, and docs/index wiring.
