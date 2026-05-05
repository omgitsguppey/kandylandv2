# Behavioral Math Calibration

KandyDrops behavioral math is source-truthed prediction math, not a vague aggregate affinity score.

## Source Truth

Source reliability weights:

- `server_transaction`: `1.00`
- `server_entitlement_unlock`: `1.00`
- `watch_session_rollup`: `0.95`
- `server_creator_relationship`: `0.90`
- `identified_event_fact`: `0.75`
- `client_ui_event`: `0.60`
- `guest_batch`: `0.45`
- `legacy_page_duration`: `0.20`

`legacy_page_duration` is diagnostic only. It cannot be verified watch truth.

## Prediction Outputs

Recommendations and admin behavior rollups expose:

- `pPurchase7d`
- `pUnlock24h`
- `pWatchComplete`
- `pReturn7d`
- `pCreatorFollow`
- `pNegativeFeedback`

User-facing explanations stay plain English. Admin-only surfaces may show collapsed diagnostics, truth score, prediction fields, and validation mode.

## Candidate And Filter Layers

Candidate generation includes recent/live drops, creator affinity, category/theme affinity, followed creators, previous unlock creators, fresh or urgent drops, popular-with-similar-users, and fallback popular/fresh picks.

Filtering removes expired drops, unavailable or non-active drops, rejected or pending-review content, and unsafe/moderation-blocked content. Repeat exposure and fatigue are penalties, not hard recommendations.

## Scores

Truth score:

```text
clamp01(
  0.40 * sourceReliability +
  0.25 * freshnessScore +
  0.20 * sampleScore +
  0.10 * schemaCompleteness -
  0.05 * sourceDisagreementPenalty
)
```

Engagement score:

```text
100 * (
  0.24 * purchaseSignal +
  0.23 * unwrapSignal +
  0.23 * validWatchSignal +
  0.13 * return7dSignal +
  0.10 * meaningfulActionSignal +
  0.07 * freeIntentSignal
)
```

Value score remains anchored to verified spend and completed purchases.

Drop recommendation score:

```text
100 * (
  0.35 * pPurchase7d +
  0.25 * pUnlock24h +
  0.20 * pWatchComplete +
  0.10 * pReturn7d +
  0.05 * freshness +
  0.05 * urgency
) - fatiguePenalty - repeatExposurePenalty + diversityBoost
```

## Negative Preference Suppression

KandyDrops recommendations learn what to avoid through explicit preference controls:

- `drop_not_interested`
- `creator_not_interested`
- `category_not_interested`
- `creator_muted`
- `recommendation_dismissed`

Suppression score:

```text
clamp01(
  0.45 * explicitNegativeFeedback +
  0.25 * repeatedSkips +
  0.15 * lowWatchAfterRecommendation +
  0.10 * negativeFeedbackRecency +
  0.05 * creatorMuteStrength
)
```

Final recommendation score:

```text
baseScore * (1 - suppressionScore)
```

Explicit negative feedback beats weak positive behavior. Suppression decays with a 30-day half-life unless the creator is muted. A single weak dismissal cannot suppress an entire category; category suppression requires an explicit category action or repeated skip evidence. Admin-facing reasons stay plain English, for example: "Lowered because user dismissed similar drops."

## Search Intent Ranking

KandyDrops treats active search and filter behavior as explicit short-lived intent, separate from passive browsing:

- `search_query_submitted`
- `filter_selected`
- `sort_changed`
- `category_clicked`
- `creator_search_selected`

Search query text is sanitized before storage. Reports and behavioral profiles must store normalized tokens, category, query length, query cluster, and intent class, never raw unsafe or sensitive query text.

Query intent score:

```text
0.40 * exactCategoryMatch +
0.25 * creatorNameMatch +
0.20 * recentSearchRecency +
0.10 * repeatedQueryCluster +
0.05 * filterMatch
```

Active-session ranking boost:

```text
finalScore += queryIntentScore * 15
```

Search intent decays with a 24-hour half-life and expires fast. It should influence the current session more than the long-term profile. Admin-facing reasons stay plain English, for example: "Boosted by recent search intent."

## Diversity Reranking

KandyDrops applies a list-level diversity pass after predicted recommendation scores are calculated. This prevents one creator, category, media type, or price tier from monopolizing the feed while preserving high-scoring candidates.

Top-window constraints:

- No more than `2` drops from the same creator in the top `6` when alternatives exist.
- No more than `3` drops from the same category in the top `8` unless the user has very high category affinity.
- Mix price tiers when possible through bounded exploration boost.
- Mix fresh, urgent, personalized, and fallback candidates when possible.
- Penalize drops and creators already shown across recent sessions.

Diversity penalty:

```text
sameCreatorPenalty +
sameCategoryPenalty +
sameMediaTypePenalty +
recentExposurePenalty
```

Reranked score:

```text
predictedScore - diversityPenalty + explorationBoost
```

Admin-facing reasons stay plain English, for example: "Moved lower to keep creator/category diversity."

## Surface Objectives

- User drops page: `pUnlock24h`, `pPurchase7d`, freshness
- Preview page: `pPurchase7d`, `pUnlock24h`, urgency
- Creator profile: `pCreatorFollow`, `pFanPass`, `pBooking`
- Dashboard: `pReturn7d`, `pTaskCompletion`, `pUnlock24h`
- Admin users: `valueScore`, `engagementScore`, `truthScore`
- Moderation: server-backed risk score only

## Validation Rules

ML verdicts are not active when sample size is below `50`. If ML underperforms the deterministic baseline, deterministic stays active. Missing purchase truth is critical. Missing entitlement unlock truth is critical.

Targeted commands:

```bash
npm run validate:behavioral-predictions
npm run check:behavioral-math-calibration
```
