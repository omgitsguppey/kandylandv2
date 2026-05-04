# Math Goal Alignment

KandyDrops behavioral math must prove it aligns with product goals before it is trusted.

## Scope

The validation harness covers:

1. user engagement score
2. user value score
3. recommendation ranker
4. watch-time estimation
5. theft-risk score
6. behavioral confidence score

## Required targets

- paid purchase within 7 days
- unlock within 24 hours
- valid watch completion
- return within 7 days
- support or moderation review outcome
- false-positive dismissal rate

## Split policy

Use a time-based split. Train on older samples and validate on newer samples. Do not use a random-only split because it leaks future behavior into the past.

## Metrics

Every report must include:

- `precisionAt5`
- `precisionAt10`
- `recallAt10`
- `calibrationError`
- `auc` when enough data exists
- `hitRate`
- `falsePositiveRate`
- `coverage`
- `staleSourceRate`
- `sourceDisagreementRate`

## Activation rules

- If sample size < 50, no ML verdict, deterministic-only.
- If sample size < 200, ML result is experimental.
- If model underperforms deterministic baseline, deterministic remains active.
- ML cannot activate without beating deterministic baseline.
- Deterministic rules always remain fallback.
- Security, payment, entitlement, and content-protection hard rules are never overridden by ML.

## Output truth

The canonical report lives at `agent/state/behavioral-model-validation.generated.json`.

The report must show:

- model version
- training sample size
- validation sample size
- metrics
- baseline comparison
- active mode: `deterministic | hybrid | ml_experimental | ml_active`
- reasons

## Recommendation runtime rule

Recommendation ML artifacts must not influence runtime ranking unless the validation report explicitly marks the recommendation ranker as `hybrid` or `ml_active`.
