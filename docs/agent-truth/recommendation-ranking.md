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

## Exploration budget

After candidate retrieval and before list-level diversity, KandyDrops applies a capped exploration policy:

- `80%` exploit known best candidates.
- `15%` explore adjacent creators, categories, or current-session interest hints.
- `5%` explore new or low-sample drops.

The boost is deterministic:

```txt
explorationBoost = baseExploreWeight * uncertaintyBonus * freshnessBoost * safetyEligibility
```

Exploration slots never include unsafe, expired, rejected, pending-review, or ineligible drops. New users may receive cold-start recommendations from onboarding interests, first clicks, search intent, and popular fresh drops, but the UI/admin state must not claim strong personalization. Admin diagnostics explain these slots as "Exploration slot: gathering signal."

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

## Creator supply quality

Creator supply quality is an operational confidence layer, not user demand. It scores active inventory, Drop freshness, satisfaction, response reliability, monetization readiness, issue rate, and profile completeness:

```txt
creatorSupplyScore = 100 * (
0.20 * activeInventory +
0.20 * freshness +
0.20 * satisfaction +
0.15 * responseReliability +
0.10 * monetizationReadiness +
0.10 * lowIssueRate +
0.05 * profileCompleteness
)
```

Recommendations expose `creatorSupplyQuality` and use it to reduce confidence when operational supply is weak. Visibility score is not reduced by default, and new creators are not buried solely because they have low data. Admin diagnostics must show exact missing operational pieces.

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

## Drop momentum boost

New drops can receive a bounded momentum boost from early response velocity. The boost uses materialized drop intelligence, not live fan-out queries:

- first `1h`, `6h`, and `24h` impressions
- preview rate, unlock rate, valid watch completion rate, and purchase-after-view rate
- negative feedback penalty
- creator-local baseline lift

Momentum formula:

```txt
100 * (
0.25 * previewRate1h +
0.25 * unlockRate6h +
0.20 * watchCompletionRate6h +
0.20 * purchaseAfterViewRate24h +
0.10 * creatorBaselineLift
) - negativeFeedbackPenalty
```

Samples below `20` impressions stay labeled `early signal`; they may get a bounded lift, but cannot become a strong verdict. Admin diagnostics explain the boost as "Boosted by early drop momentum."

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
