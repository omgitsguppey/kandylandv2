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
