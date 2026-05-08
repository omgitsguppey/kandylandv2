# Behavioral Math Calibration

KandyDrops behavioral math is source-truthed prediction math, not a vague aggregate affinity score.

## 2026-05-08 Confidence v2

Behavioral confidence is now explicitly source-derived and outcome-aware with hard caps:

- guest-only confidence cannot exceed `0.45`
- legacy-only confidence cannot exceed `0.30`
- no validated outcome cannot exceed `0.60`
- verified confidence requires server/canonical truth

Privacy-limited data availability must be labeled as `privacy_limited` and must not be treated as low engagement by default.

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

## Cold-Start Exploration Budget

KandyDrops uses a controlled explore/exploit budget so new users, new creators, and new or low-sample drops are not trapped behind deterministic popularity forever.

Slot policy:

- `80%` exploit known best candidates.
- `15%` explore adjacent creators, categories, or active-session interest hints.
- `5%` explore new or low-sample drops.

Exploration boost:

```text
baseExploreWeight * uncertaintyBonus * freshnessBoost * safetyEligibility
```

Rules:

- Exploration is capped at `20%` of the visible recommendation set when enough exploit candidates exist.
- Unsafe, expired, rejected, pending-review, or otherwise ineligible drops are never exploration candidates.
- New users use onboarding interests, first clicks, search intent, and popular fresh drops, but results stay labeled weak or cold-start rather than strong personalization.
- Admin-facing reasons stay plain English, for example: "Exploration slot: gathering signal."

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

## Drop Momentum Scoring

KandyDrops scores new drops with early response velocity so promising drops can surface before large-sample behavioral profiles exist. Momentum is a bounded ranking boost, not a payment, unlock, entitlement, or creator earnings source of truth.

Signals:

- impressions in the first `1h`, `6h`, and `24h`
- preview opens per impression in the first `1h`
- server unlocks per preview in the first `6h`
- valid watch completions per viewer in the first `6h`
- purchases after viewing in the first `24h` when drop attribution exists
- negative feedback rate
- creator-local baseline response

Momentum score:

```text
100 * (
  0.25 * previewRate1h +
  0.25 * unlockRate6h +
  0.20 * watchCompletionRate6h +
  0.20 * purchaseAfterViewRate24h +
  0.10 * creatorBaselineLift
) - negativeFeedbackPenalty
```

Rules:

- Fewer than `20` impressions is labeled `early signal`.
- Strong positive verdicts require at least `20` impressions.
- Creator baseline lift compares against the creator's own historical drop response before global popularity.
- Admin-facing reasons stay plain English, for example: "Boosted by early drop momentum."

## Satisfaction Feedback Loop

KandyDrops captures lightweight satisfaction after meaningful content consumption so ranking can optimize for satisfaction, not just watch time or spend.

Events:

- `content_satisfaction_positive`
- `content_satisfaction_negative`
- `content_satisfaction_skipped`
- `recommendation_reason_helpful`
- `recommendation_reason_not_helpful`

Satisfaction score:

```text
0.35 * explicitRating +
0.25 * completionQuality +
0.20 * repeatCreatorInterest +
0.10 * feedbackRecency +
0.10 * lowRefundRisk
```

Rules:

- Satisfaction is separate from watch time; completion quality is only one component.
- Prompts appear only after meaningful consumption and use cooldowns to avoid spam.
- Negative satisfaction lowers similar recommendations through satisfaction suppression and `pNegativeFeedback`.
- Admin-facing reasons stay plain English, for example: "Lowered because recent satisfaction feedback was negative."

## Creator Supply Quality

Creator-side supply health is scored separately from user demand so a creator can be operationally reliable even before large recommendation samples exist.

Creator supply score:

```text
100 * (
  0.20 * activeInventory +
  0.20 * freshness +
  0.20 * satisfaction +
  0.15 * responseReliability +
  0.10 * monetizationReadiness +
  0.10 * lowIssueRate +
  0.05 * profileCompleteness
)
```

Signals include active Drops count, recent Drop freshness, fulfillment and response health, Fan Pass availability, booking availability, support and moderation issues, positive satisfaction, refund or negative feedback risk, and profile completeness. Low supply score reduces recommendation confidence, not visibility. New creators are not buried only because supply data is still low. Admin diagnostics must list exact missing operational pieces.

## Integrity Demotions

Integrity risk is applied after candidate generation and scoring, before exploration and diversity reranking. This prevents risky content from ranking normally while preserving candidate generation unless policy requires removal.

Integrity multiplier:

```text
1 - clamp01(
  0.35 * moderationRisk +
  0.20 * supportComplaintRate +
  0.20 * negativeSatisfactionRate +
  0.15 * verificationRisk +
  0.10 * metadataRisk
)
```

Final score:

```text
rankScore * integrityMultiplier
```

Critical policy or content-protection failures remove the candidate. Medium and high risk candidates are demoted. Admin diagnostics must say "demoted by integrity risk" and include the risk components.

## Causal Holdout Validation

Correlation is not enough to activate ranking or behavioral math changes. Risky ranking changes must use a deterministic holdout experiment before promotion:

- default rollout is `90%` deterministic baseline control and `10%` variant
- assignment uses `hash(userOrSessionId + experimentId) % 100`
- success metrics include `purchase_7d`, `unlock_24h`, `watch_completion`, and `return_7d`
- guardrails include `negative_feedback` and `support_complaints`
- activation requires at least `200` users or sessions, positive lift above threshold, clean guardrails, and no future-event training leakage

Targeted validator:

```bash
npm run check:behavioral-experiments
```

## Notification Quality Ranking

KandyDrops ranks and throttles notifications by return likelihood and fatigue instead of treating every notification as equally worth sending or showing.

Notification score:

```text
100 * (
  0.30 * predictedOpen +
  0.20 * predictedReturn +
  0.20 * creatorAffinity +
  0.15 * urgency +
  0.10 * novelty +
  0.05 * monetizationRelevance
) - fatiguePenalty
```

Signals include notification type, user last active time, creator affinity, unread notification count, past notification read/click rate, recent notification volume, drop urgency, and purchase/unwrap history. Push delivery is capped per user per day and repeated same-type sends are suppressed. Inbox display uses the same quality score and a top-window same-type diversity rule so one notification type does not monopolize the visible list.

`notification_read` is still the only canonical behavioral notification action. `notification_opened`, `notification_action_clicked`, and browser click/open diagnostics can inform predicted open only when explicitly used by the quality score; they do not become separate engagement facts.

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
