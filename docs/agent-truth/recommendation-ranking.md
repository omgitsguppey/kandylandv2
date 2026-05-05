# Recommendation Ranking Truth

KandyDrops recommendations use deterministic retrieval first, deterministic ranking second, and a lightweight local ML artifact third.

## Retrieval order

Candidate generation pulls from:

1. live drops
2. ending soon drops
3. creators with strong existing affinity
4. creators from recent unlocked or watched behavior
5. content theme/category matches
6. lookalike creator hints when similar-user overlap exists
7. popularity/freshness fallback

The retrieval layer is cheap by design. It reads materialized behavioral snapshots and drop intelligence, not expensive live joins.

## Ranking order

The deterministic ranker is the safety baseline. It computes:

- `predictedPaidConversion`
- `predictedUnlock`
- `predictedWatchCompletion`
- `predictedReturn`
- `creatorAffinity`
- `contentAffinity`
- `freshness`
- `urgency`
- `priceFit`
- `previousExposurePenalty`
- `fatiguePenalty`
- `confidence`

Deterministic rank score:

```txt
100 * (
0.35 * predictedPaidConversion +
0.20 * predictedWatchCompletion +
0.15 * predictedUnlock +
0.10 * creatorAffinity +
0.08 * contentAffinity +
0.07 * freshness +
0.05 * urgency
)
- fatiguePenalty
- previousExposurePenalty
```

## ML artifact mode

`agent/state/recommendation-model.generated.json` stores the lightweight model artifact.

- no paid AI calls
- no Firebase ML runtime dependency
- local logistic-style heads only
- deterministic fallback remains the baseline

The artifact predicts:

- paid conversion likelihood
- unlock likelihood
- watch completion likelihood
- repeat return likelihood

If the artifact is missing or stale, KandyDrops uses deterministic ranking only.

If the artifact comes from a synthetic bootstrap pass, it stays bounded by a low blend weight. It can inform ordering, but it does not replace deterministic retrieval or deterministic penalties.

## Diversity reranking

After deterministic or blended ML scores are calculated, KandyDrops applies a list-level diversity reranker. It preserves high predicted scores, then penalizes repetitive top windows:

- maximum `2` drops from one creator in the top `6` when alternatives exist
- maximum `3` drops from one category in the top `8` unless category affinity is very high
- bounded penalties for repeated media type and recent exposure
- exploration boost for underrepresented price tiers and fresh/urgent/personalized candidate mix

Formula:

```txt
rerankedScore = predictedScore - diversityPenalty + explorationBoost
```

Admin diagnostics must explain diversity movement in plain English, for example: "Moved lower to keep creator/category diversity."

## UI truth

- Confidence below 30 percent suppresses personalized recommendation explanations.
- Zero-affinity users do not get giant explanation cards.
- Fallback mode is capped to 3 cards.
- Plain-English reasons render by default.
- Numeric ranking math stays collapsed under admin diagnostics.

## Cost truth

Recommendation serving must stay cheap:

- read materialized snapshots first
- avoid wide per-request user-graph scans
- avoid paid AI calls
- use the local artifact file for ML scores

## Admin truth

Admin user detail exposes:

- recommendation mode
- explanation summary
- compact plain-English reasons
- candidate sources
- collapsed ranking diagnostics
- ML artifact blend metadata when present
