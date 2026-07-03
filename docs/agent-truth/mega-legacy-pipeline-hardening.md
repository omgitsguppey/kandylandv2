# mega legacy pipeline hardening

Source-only hardening artifact. It does not run production reads, provider calls, exports, deploys, or mutate legacy/production data.

```json
{
  "reportKey": "mega-legacy-pipeline-hardening",
  "generatedAtUtc": "2026-07-03T07:11:01.901Z",
  "currentHead": "3190fc8fc4da226c996cc8589d6ec4ed2977700c",
  "status": "pass",
  "productionReadsPerformed": false,
  "productionMutationPerformed": false,
  "providerCallsPerformed": false,
  "deployPerformed": false,
  "paymentRuntimeChanged": false,
  "walletRuntimeChanged": false,
  "paypalRuntimeChanged": false,
  "pricesOrPackagesChanged": false,
  "gumdropPricingMathChanged": false,
  "topBottomNavChanged": false,
  "evidenceFaked": false,
  "inventorySummary": {
    "version": "2026.05.mega-legacy-pipeline-inventory.1",
    "total": 10,
    "actions": {
      "remove": 0,
      "reinforce_into_pipeline": 5,
      "legacy_alias": 3,
      "dry_run_recovery": 1,
      "leave_in_flight": 1,
      "unsafe_unknown": 0
    },
    "byType": {
      "legacy_metric_alias": 2,
      "legacy_event_alias": 1,
      "old_direct_telemetry_path": 1,
      "duplicate_normalizer": 1,
      "duplicate_debug_lane": 1,
      "stale_generated_artifact": 1,
      "hardcoded_score_or_gap": 1,
      "stale_cost_logic": 1,
      "duplicate_score_input": 1
    },
    "unsafeUnknownCount": 0,
    "sourceOnly": true
  },
  "pipelineOwnership": {
    "reportKey": "pipeline-ownership-audit",
    "generatedAtUtc": "2026-07-03T07:11:01.901Z",
    "status": "pass",
    "ownershipStages": [
      {
        "id": "routes-surfaces-feature-registry",
        "subject": "routes and user-facing surfaces",
        "stage": "feature_surface_registry",
        "canonicalOwner": "src/lib/features/feature-registration-registry.ts + src/lib/product-integrity/product-body-map.ts",
        "sourceFiles": [
          "src/lib/features/feature-registration-registry.ts",
          "src/lib/product-integrity/product-body-map.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "sourceHealth",
          "evidenceCompleteness"
        ],
        "exemption": "none",
        "reason": "Major limbs are mapped to body systems before normalizer/debug/score consumption.",
        "exactNextAction": "Require every new route or surface to declare feature, body system, telemetry, debug, score, and cost mapping."
      },
      {
        "id": "raw-actions-central-normalizer",
        "subject": "raw product signals",
        "stage": "central_normalizer",
        "canonicalOwner": "src/lib/product-integrity/central-normalizer.ts",
        "sourceFiles": [
          "src/lib/product-integrity/central-normalizer.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "sourceHealth",
          "evidenceCompleteness"
        ],
        "exemption": "none",
        "reason": "Signals route through central normalizer adapters before metrics, journey, debug, score, and export facts.",
        "exactNextAction": "Classify any direct pathway as adapter, documented exemption, or unsafe_unknown."
      },
      {
        "id": "telemetry-event-envelope",
        "subject": "telemetry event envelopes",
        "stage": "event_envelope",
        "canonicalOwner": "src/lib/analytics/event-envelope-builder.ts",
        "sourceFiles": [
          "src/lib/analytics/event-envelope-builder.ts",
          "src/lib/analytics/event-envelope-contract.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "sourceHealth"
        ],
        "exemption": "none",
        "reason": "Canonical envelopes preserve who/what/when/where/source/dedupe fields before fact normalization.",
        "exactNextAction": "Do not add telemetry events without catalog and envelope validation."
      },
      {
        "id": "normalized-event-facts",
        "subject": "behavioral event facts",
        "stage": "event_fact",
        "canonicalOwner": "src/lib/behavioral/normalize-event-fact.ts",
        "sourceFiles": [
          "src/lib/behavioral/normalize-event-fact.ts",
          "src/lib/behavioral/event-fact-contract.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "sourceHealth",
          "evidenceCompleteness"
        ],
        "exemption": "none",
        "reason": "Event facts are normalized once before metrics, journeys, and exports consume them.",
        "exactNextAction": "Keep alias mappings inside legacy/canonical recovery and event fact normalizer."
      },
      {
        "id": "person-global-metrics",
        "subject": "global/user/person metrics",
        "stage": "person_global_metrics",
        "canonicalOwner": "src/lib/analytics/person-metrics-hydration.ts + src/lib/math/global-user-counting-math.ts",
        "sourceFiles": [
          "src/lib/analytics/person-metrics-hydration.ts",
          "src/lib/math/global-user-counting-math.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "evidenceCompleteness"
        ],
        "exemption": "none",
        "reason": "Metrics count through canonical dedupe and linked-person rules with real gap reporting.",
        "exactNextAction": "Block scattered count logic unless it calls the canonical math module."
      },
      {
        "id": "duration-journey-watch-math",
        "subject": "session, watch, bounce, and journey duration",
        "stage": "session_watch_journey_math",
        "canonicalOwner": "src/lib/math/session-journey-math.ts + src/lib/math/drop-watch-unlock-math.ts",
        "sourceFiles": [
          "src/lib/math/session-journey-math.ts",
          "src/lib/math/drop-watch-unlock-math.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "sourceHealth",
          "evidenceCompleteness"
        ],
        "exemption": "none",
        "reason": "Page duration, hidden time, active time, watch time, and unknown duration are separated.",
        "exactNextAction": "Reject pageDurationMs as watch time and hidden time as active time."
      },
      {
        "id": "source-funds-revenue-entitlements",
        "subject": "GumDrop source-of-funds, revenue, Fan Pass, entitlements",
        "stage": "source_of_funds_revenue_entitlement_math",
        "canonicalOwner": "src/lib/math/gumdrop-ledger-math.ts + src/lib/math/creator-revenue-entitlement-math.ts",
        "sourceFiles": [
          "src/lib/math/gumdrop-ledger-math.ts",
          "src/lib/math/creator-revenue-entitlement-math.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "sourceHealth",
          "evidenceCompleteness"
        ],
        "exemption": "none",
        "reason": "Source classification and entitlement truth are separated from payment runtime and payout formulas.",
        "exactNextAction": "Keep reward, paid, bonus, refund, and unknown legacy buckets explicit without changing runtime math."
      },
      {
        "id": "debug-product-brain",
        "subject": "debug and root-cause triage",
        "stage": "debug_interpretive_brain",
        "canonicalOwner": "src/lib/product-integrity/interpretive-brain.ts",
        "sourceFiles": [
          "src/lib/product-integrity/interpretive-brain.ts",
          "src/lib/debug/debug-backlog-builder.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "evidenceCompleteness",
          "freshness"
        ],
        "exemption": "none",
        "reason": "Debug summaries route through interpreted findings while raw lanes stay drilldown evidence.",
        "exactNextAction": "Do not introduce new default debug lanes without root cause, owner, score impact, and next action."
      },
      {
        "id": "score-evidence-cost",
        "subject": "score evidence and cost readiness",
        "stage": "score_evidence_cost",
        "canonicalOwner": "src/lib/agent-score/* + src/lib/math/cost-export-parity-math.ts",
        "sourceFiles": [
          "src/lib/agent-score/core.ts",
          "src/lib/math/cost-export-parity-math.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "freshness",
          "costRisk",
          "regressionRisk"
        ],
        "exemption": "none",
        "reason": "Source guards improve cost/source readiness but external billing and formal runtime gates remain separate.",
        "exactNextAction": "Keep cost owner-review lanes exact and never claim provider billing proof from source validators."
      },
      {
        "id": "display-state-accuracy",
        "subject": "user, creator, and admin metric display",
        "stage": "display_state",
        "canonicalOwner": "src/lib/math/metric-display-accuracy.ts",
        "sourceFiles": [
          "src/lib/math/metric-display-accuracy.ts"
        ],
        "status": "owned",
        "severity": "info",
        "scoreImpact": [
          "evidenceCompleteness"
        ],
        "exemption": "none",
        "reason": "Display states prevent missing or weak data from looking like exact zero.",
        "exactNextAction": "Require provenZero, confidence, freshness, and source truth before displaying exact-looking numbers."
      }
    ],
    "duplicateOwners": [],
    "missingOwners": [],
    "bypassedPipelines": [],
    "productionReadsPerformed": false,
    "providerCallsPerformed": false
  },
  "globalFormulaAudit": {
    "reportKey": "global-formula-audit",
    "generatedAtUtc": "2026-07-03T07:11:01.901Z",
    "status": "pass",
    "scoreWeights": {
      "sourceHealth": 18,
      "runtimeHealth": 30,
      "evidenceCompleteness": 25,
      "freshness": 10,
      "costRisk": 7,
      "regressionRisk": 10
    },
    "confidenceWeights": {
      "exact": 1,
      "linked": 0.85,
      "inferred": 0.6,
      "weak": 0.35,
      "unknown": 0
    },
    "requiredDecisions": {
      "missingDataIsZero": false,
      "unknownLegacyCanBecomeExact": false,
      "nonEventsCanReduceScore": false,
      "futureOnlyQuietEventsCanReduceScore": false,
      "pageDurationCanBeWatchTime": false,
      "hiddenTimeCanBeActiveSessionTime": false,
      "paymentApprovalEqualsCheckoutStart": false,
      "rewardGdCanBecomePaidGd": false,
      "paidBonusGdCanBecomeRewardGd": false,
      "legacyUnknownCanFundPaidOnly": false,
      "costSavingsCanReduceAccuracy": false
    },
    "personMetricHydrationGapMath": {
      "computedGapSource": "missingHydration.length",
      "debugLaneUsesActualGapCount": true,
      "scoreImpactUsesActualGapCount": true,
      "fakeZeroPatternBlocked": true
    },
    "entries": [
      {
        "area": "beta_score",
        "formulaOwner": "src/lib/math/canonical-math-ledger.ts",
        "currentFormula": "Weighted dimensions from src/lib/agent-score/weights.ts.",
        "canonicalFormula": "sourceHealth 25, runtimeHealth 20, evidenceCompleteness 20, freshness 15, costRisk 10, regressionRisk 10.",
        "classification": "canonical",
        "accuracyExplanation": "Freezing the weights prevents score drift and keeps the public beta calculation reproducible.",
        "filesReviewed": [
          "src/lib/agent-score/core.ts",
          "src/lib/agent-score/weights.ts",
          "src/lib/math/canonical-math-ledger.ts"
        ]
      },
      {
        "area": "identity_confidence",
        "formulaOwner": "src/lib/math/canonical-math-ledger.ts",
        "currentFormula": "Identity confidence labels flow through analytics and person metrics.",
        "canonicalFormula": "exact=1.0, linked=0.85, inferred=0.60, weak=0.35, unknown=0.0.",
        "classification": "canonical",
        "accuracyExplanation": "Shared numeric confidence prevents weak or inferred identity from looking exact in metrics and debug.",
        "filesReviewed": [
          "src/lib/math/canonical-math-ledger.ts",
          "src/lib/analytics/person-metrics-hydration.ts"
        ]
      },
      {
        "area": "legacy_confidence",
        "formulaOwner": "src/lib/math/legacy-metric-canonicalization.ts",
        "currentFormula": "Legacy sources are mapped with confidence caps and dry-run plans.",
        "canonicalFormula": "Unknown legacy cannot become exact; deterministic identity, event, route, and timestamp are required before stronger confidence.",
        "classification": "canonical",
        "accuracyExplanation": "Dry-run confidence caps recover useful history without mutating production or overstating user truth.",
        "filesReviewed": [
          "src/lib/math/legacy-metric-canonicalization.ts",
          "src/lib/math/legacy-recovery-dry-run-engine.ts"
        ]
      },
      {
        "area": "person_metrics",
        "formulaOwner": "src/lib/analytics/person-metrics-hydration.ts",
        "currentFormula": "missingHydration is computed from low confidence metric statuses.",
        "canonicalFormula": "debugLane.gaps and scoreImpactByDimension use missingHydration.length.",
        "classification": "normalized",
        "accuracyExplanation": "Real gap counts stop missing source or bridge work from being hidden as zero.",
        "filesReviewed": [
          "src/lib/analytics/person-metrics-hydration.ts"
        ]
      },
      {
        "area": "watch_time",
        "formulaOwner": "src/lib/math/drop-watch-unlock-math.ts",
        "currentFormula": "Drop watch math separates page duration, locked preview, active watch, and confidence.",
        "canonicalFormula": "media_or_content_exposure_only",
        "classification": "canonical",
        "accuracyExplanation": "Watch time reflects active content exposure rather than page-open time.",
        "filesReviewed": [
          "src/lib/math/drop-watch-unlock-math.ts",
          "src/lib/analytics/drop-watch-time-engine.ts"
        ]
      },
      {
        "area": "bounce",
        "formulaOwner": "src/lib/math/session-journey-math.ts",
        "currentFormula": "Bounce requires one route, no meaningful interaction, activeMs below threshold, and no conversion.",
        "canonicalFormula": "zeroDenominator=If session denominator is missing or unbounded, bounce rate is unavailable instead of 0.",
        "classification": "canonical",
        "accuracyExplanation": "Unknown closeouts and one-page conversions cannot corrupt bounce rate.",
        "filesReviewed": [
          "src/lib/math/session-journey-math.ts",
          "src/lib/analytics/session-metrics-engine.ts"
        ]
      },
      {
        "area": "dedupe_windows",
        "formulaOwner": "src/lib/math/global-user-counting-math.ts",
        "currentFormula": "Global/user/guest/linked-person counts route through canonical dedupe windows.",
        "canonicalFormula": "{\"eventIdPriority\":\"canonical_event_id\",\"fallbackPriority\":[\"dedupeKey\",\"sessionId:eventName:objectId:timestampBucket\"],\"linkedGuestUserRule\":\"count once globally and once under best user identity only\",\"legacyWeakUnknownRule\":\"count in legacy bucket, not exact user bucket\",\"retryReplayRule\":\"retry/replay events do not increment standard counts unless replay is the metric itself\"}",
        "classification": "canonical",
        "accuracyExplanation": "Linked guest/user actions count once globally and once under the best person identity.",
        "filesReviewed": [
          "src/lib/math/global-user-counting-math.ts",
          "src/lib/math/count-deduplication-normalizer.ts"
        ]
      },
      {
        "area": "gumdrop_source_of_funds",
        "formulaOwner": "src/lib/math/gumdrop-ledger-math.ts",
        "currentFormula": "Source buckets distinguish paid, paid bonus, reward, task reward, admin grant, refund, adjustment, and legacy unknown.",
        "canonicalFormula": "{\"paidBaseGumDropsSource\":\"paid_gd\",\"paidPackageBonusGumDropsSource\":\"paid_bonus_gd\",\"rewardGumDropsSource\":\"reward_gd\",\"taskRewardGumDropsSource\":\"task_reward_gd\",\"adminGrantGumDropsSource\":\"admin_grant_gd\",\"unknownLegacyGumDropsSource\":\"legacy_unknown\",\"bonusGumDropsMustPreserveSourceOfFunds\":true,\"paidBonusSpendEligibilityFollowsCurrentPaidBonusPolicy\":true,\"rewardGumDropsEligibleForFanPassRenewal\":false,\"sourceTruth\":\"wallet capture and source-of-funds ledger; this ledger documents formula authority without changing GumDrop math\"}",
        "classification": "canonical",
        "accuracyExplanation": "Source-of-funds math prevents reward or unknown legacy balances from funding paid-only creator experiences.",
        "filesReviewed": [
          "src/lib/math/gumdrop-ledger-math.ts",
          "src/lib/gumdrop-ledger.ts"
        ]
      },
      {
        "area": "cost_risk",
        "formulaOwner": "src/lib/math/cost-export-parity-math.ts",
        "currentFormula": "Source guards can improve cost readiness; external billing review remains separate.",
        "canonicalFormula": "{\"externalBillingProofRequiredForDollarClaims\":true,\"sourceGuardsCanImproveSourceCostReadiness\":true,\"missingExternalBillingClassification\":\"source_guarded_external_review_remaining\",\"route4xxRule\":\"Known validation errors should be nonretryable and mapped before they affect cost risk.\"}",
        "classification": "canonical",
        "accuracyExplanation": "Cost risk improves only through source guards or external artifacts, not by dropping canonical facts.",
        "filesReviewed": [
          "src/lib/math/cost-export-parity-math.ts",
          "src/lib/server/global-cost-surface-contract.ts"
        ]
      },
      {
        "area": "sql_export_parity",
        "formulaOwner": "src/lib/math/cost-export-parity-math.ts",
        "currentFormula": "Exports are batch/watermark based and Cloud SQL mirror sync is manual/cost-approved.",
        "canonicalFormula": "Batch export by watermark; SQL mirror sync manual/cost-approved only.",
        "classification": "canonical",
        "accuracyExplanation": "Batching protects cost while preserving canonical event facts needed for accuracy.",
        "filesReviewed": [
          "src/lib/analytics/sql-database-parity-engine.ts",
          "src/lib/math/cost-export-parity-math.ts"
        ]
      }
    ],
    "validationFailures": []
  },
  "legacyRecoveryPlan": {
    "reportKey": "legacy-canonical-recovery-plan",
    "generatedAtUtc": "2026-07-03T07:11:01.901Z",
    "startDate": "2026-03-01",
    "dryRunOnly": true,
    "productionMutationAllowed": false,
    "confidenceRules": {
      "exact": {
        "maximumWeight": 1,
        "requiredEvidence": [
          "userId",
          "sessionId",
          "eventId",
          "sourceTimestamp",
          "sourceRoute"
        ],
        "rule": "Exact legacy recovery requires deterministic identity, event, route, and timestamp evidence."
      },
      "linked": {
        "maximumWeight": 0.85,
        "requiredEvidence": [
          "linkId_or_deterministic_identity_transfer"
        ],
        "rule": "Linked recovery requires a deterministic linkId or identity transfer."
      },
      "inferred": {
        "maximumWeight": 0.6,
        "requiredEvidence": [
          "deterministicEvent",
          "objectId"
        ],
        "rule": "Exact source with incomplete identity is inferred at maximum."
      },
      "weak": {
        "maximumWeight": 0.35,
        "requiredEvidence": [
          "partialRouteOrEventMatch"
        ],
        "rule": "Partial route or event match remains weak."
      },
      "unknown": {
        "maximumWeight": 0,
        "requiredEvidence": [],
        "rule": "Unknown source or identity is archive-only and cannot become exact."
      }
    },
    "duplicateWindows": {
      "click_action": "5s",
      "view_impression": "60s",
      "session": "sessionId_or_30m_inactivity",
      "payment": "provider_order_fingerprint_only",
      "task": "taskId_resetWindowId",
      "notification": "intentId_recipientId_1h",
      "chat": "messageId_or_idempotencyKey",
      "drop_unlock": "dropId_unlockId_user_or_linkedPerson",
      "watch": "watchSessionId"
    },
    "candidates": [
      {
        "candidateId": "legacy-page-view-to-surface-view",
        "legacySource": "analytics_guest_batches",
        "oldEventName": "page_view",
        "canonicalEventName": "semantic_page_viewed",
        "oldMetricName": "page_views",
        "canonicalMetricId": "surface_views",
        "confidence": "weak",
        "duplicateWindow": "60s",
        "action": "normalize_candidate",
        "reason": "Guest batch page views can explain historical navigation but lack exact linked identity.",
        "accuracyImpact": "Improves historical surface trend explanations while keeping user truth weak.",
        "userVisibleImpact": "No user-facing numbers change until an approved recovery import exists."
      },
      {
        "candidateId": "legacy-unlock-to-drop-unlocked",
        "legacySource": "legacy_unlock_events",
        "oldEventName": "unlock_content",
        "canonicalEventName": "drop_unlocked",
        "oldMetricName": "unlocks",
        "canonicalMetricId": "drop_unlocks",
        "confidence": "inferred",
        "duplicateWindow": "dropId_unlockId_user_or_linkedPerson",
        "action": "link_candidate",
        "reason": "Unlock records with drop id and user/session can recover access intent, but entitlement/payment truth remains separate.",
        "accuracyImpact": "Separates unlock from unwrap and watch for better creator/drop metrics.",
        "userVisibleImpact": "No entitlement or payment record is mutated."
      },
      {
        "candidateId": "legacy-free-gd-to-reward-source",
        "legacySource": "wallet_legacy_labels",
        "oldEventName": "free_gd_credit",
        "canonicalEventName": "gumdrop_reward_credit_classified",
        "oldMetricName": "free_gd",
        "canonicalMetricId": "reward_gd",
        "confidence": "weak",
        "duplicateWindow": "ledger_id_or_manual_review",
        "action": "manual_review",
        "reason": "Old free labels become reward_gd unless deterministic paid purchase package proof exists.",
        "accuracyImpact": "Prevents legacy source labels from funding paid-only experiences.",
        "userVisibleImpact": "No wallet balance or spend policy changes in dry-run mode."
      },
      {
        "candidateId": "unknown-legacy-source-archive",
        "legacySource": "unknown_legacy",
        "oldEventName": "unknown",
        "canonicalEventName": "unknown_legacy_archived",
        "oldMetricName": "unknown",
        "canonicalMetricId": "archive_only",
        "confidence": "unknown",
        "duplicateWindow": "none",
        "action": "archive_only",
        "reason": "Unknown legacy source or identity cannot become exact current truth.",
        "accuracyImpact": "Blocks unsupported promotions and keeps unknowns visible for operator review.",
        "userVisibleImpact": "No user-facing metric consumes unknown legacy as exact."
      }
    ]
  },
  "costAccuracyHardening": {
    "reportKey": "cost-accuracy-hardening",
    "generatedAtUtc": "2026-07-03T07:11:01.901Z",
    "productionReadsPerformed": false,
    "providerCallsPerformed": false,
    "exportsRun": false,
    "deployPerformed": false,
    "externalBillingProofClaimed": false,
    "accuracyPreserved": true,
    "doctrine": {
      "nonCriticalAnalyticsRefreshHours": 24,
      "realtimeSummaryMinimumMinutes": 5,
      "debugSummaryFirst": true,
      "bigQueryPerEventExportAllowed": false,
      "cloudSqlMirrorManualOnly": true,
      "paidAiRuntimeAllowedByDefault": false,
      "canonicalFactsCanBeDroppedForCost": false
    },
    "lanes": [
      {
        "laneId": "cloud_run_app_hosting",
        "classification": "source_guarded_external_review_remaining",
        "sourceGuard": "route 4xx nonretryable mapping, batching, hot cache, debug summary-first, no runaway realtime loops",
        "externalBillingRequirement": "Cloud Run/App Hosting billing review remains operator/provider artifact.",
        "accuracyPreserved": true,
        "costRisk": "medium",
        "exactNextAction": "Review external billing after source route guards; do not infer dollar savings from source-only checks."
      },
      {
        "laneId": "cloud_sql_data_connect",
        "classification": "manual_cost_approval_required",
        "sourceGuard": "Data Connect is an agent-context mirror and SQL sync is manual/cost-approved only.",
        "externalBillingRequirement": "Cloud SQL billing status requires provider console or billing artifact.",
        "accuracyPreserved": true,
        "costRisk": "high",
        "exactNextAction": "Keep SQL mirror out of runtime user/payment/drop/chat/support/creator paths unless an ApiCostContract promotes it."
      },
      {
        "laneId": "gemini_cloud_assist_vertex_ai",
        "classification": "source_guarded_external_review_remaining",
        "sourceGuard": "debug/critic lanes are source-only unless explicitly approved and must not call paid AI runtime by default.",
        "externalBillingRequirement": "AI usage/billing proof requires external artifact.",
        "accuracyPreserved": true,
        "costRisk": "high",
        "exactNextAction": "Keep AI repair workbench fed by deterministic findings and block paid AI runtime calls without approval."
      },
      {
        "laneId": "bigquery_export",
        "classification": "source_guarded_external_review_remaining",
        "sourceGuard": "exports are batch/watermark based, never per-event hot path.",
        "externalBillingRequirement": "BigQuery job/billing review remains external.",
        "accuracyPreserved": true,
        "costRisk": "medium",
        "exactNextAction": "Keep export facts canonical and use watermark batches rather than per-event export triggers."
      },
      {
        "laneId": "firestore_reads_writes",
        "classification": "source_ready",
        "sourceGuard": "summary documents, bounded reads, and rollups are preferred before raw collection scans.",
        "externalBillingRequirement": "External billing can confirm volume but is not claimed here.",
        "accuracyPreserved": true,
        "costRisk": "medium",
        "exactNextAction": "Keep materializers accurate and reduce duplicate reads rather than dropping facts."
      },
      {
        "laneId": "realtime_listeners",
        "classification": "source_guarded_external_review_remaining",
        "sourceGuard": "summary-first admin lanes and bounded realtime usage; raw firehose belongs behind drilldowns.",
        "externalBillingRequirement": "Runtime listener volume needs deployed sample or provider artifact.",
        "accuracyPreserved": true,
        "costRisk": "medium",
        "exactNextAction": "Keep admin/debug defaults compact and page raw drilldowns."
      },
      {
        "laneId": "admin_debug",
        "classification": "source_ready",
        "sourceGuard": "debug summary-first and raw evidence drilldown.",
        "externalBillingRequirement": "No provider proof claimed.",
        "accuracyPreserved": true,
        "costRisk": "low",
        "exactNextAction": "Keep self-revealing findings compact and route raw details behind drilldowns."
      },
      {
        "laneId": "diagnostics",
        "classification": "source_ready",
        "sourceGuard": "invalid/duplicate diagnostics roll up hourly by fingerprint.",
        "externalBillingRequirement": "No provider proof claimed.",
        "accuracyPreserved": true,
        "costRisk": "low",
        "exactNextAction": "Keep diagnostics rollups fingerprinted and do not spam raw repeated warnings."
      }
    ]
  },
  "codebaseOrganizationHardening": {
    "reportKey": "codebase-organization-hardening",
    "generatedAtUtc": "2026-07-03T07:11:01.901Z",
    "status": "pass",
    "productionReadsPerformed": false,
    "providerCallsPerformed": false,
    "deployPerformed": false,
    "rules": [
      {
        "ruleId": "feature-body-system-required",
        "subject": "new feature or route",
        "requiredFields": [
          "bodySystem",
          "featureId",
          "surfaceId",
          "routeOrApiRoute"
        ],
        "validator": "check:product-body-map",
        "reason": "Every visible limb needs one body system and canonical registry owner."
      },
      {
        "ruleId": "telemetry-event-envelope-required",
        "subject": "new telemetry event",
        "requiredFields": [
          "eventName",
          "eventEnvelope",
          "normalizerPath",
          "privacyClass"
        ],
        "validator": "check:event-translation-bridge",
        "reason": "Telemetry must not bypass envelope, consent, identity, and source truth."
      },
      {
        "ruleId": "metric-math-owner-required",
        "subject": "new metric",
        "requiredFields": [
          "metricId",
          "formulaOwner",
          "confidence",
          "freshness",
          "sourceTruth"
        ],
        "validator": "check:canonical-math-ledger",
        "reason": "No user/admin number should display without math, source, confidence, and freshness."
      },
      {
        "ruleId": "journey-mapping-required",
        "subject": "new user journey step",
        "requiredFields": [
          "journeyStep",
          "durationMath",
          "eventFact",
          "debugLane"
        ],
        "validator": "check:user-journey-behavioral-intelligence",
        "reason": "Journey meaning must come from normalized facts and explicit duration math."
      },
      {
        "ruleId": "debug-interpretive-brain-required",
        "subject": "new debug lane",
        "requiredFields": [
          "rootCause",
          "owner",
          "scoreImpact",
          "nextAction",
          "drilldownPolicy"
        ],
        "validator": "check:interpretive-brain-debug-triage",
        "reason": "Debug defaults must explain root cause before raw evidence."
      },
      {
        "ruleId": "score-artifact-freshness-required",
        "subject": "new score artifact",
        "requiredFields": [
          "validator",
          "freshnessOwner",
          "scoreDimension",
          "currentHead"
        ],
        "validator": "check:beta-score",
        "reason": "Generated reports are snapshots and need a current validator before affecting score."
      },
      {
        "ruleId": "cost-class-required",
        "subject": "new cost surface",
        "requiredFields": [
          "costClass",
          "readBounds",
          "writeBounds",
          "retryPolicy",
          "summaryFirst"
        ],
        "validator": "check:cost-export-sql-parity-math",
        "reason": "Cost surfaces must be source-guarded before they surprise billing."
      },
      {
        "ruleId": "legacy-alias-canonical-map-required",
        "subject": "new legacy alias",
        "requiredFields": [
          "canonicalEventName",
          "canonicalMetricId",
          "confidenceCap",
          "dryRunOnly"
        ],
        "validator": "check:metric-canonicalization-legacy-recovery",
        "reason": "Legacy aliases can recover evidence only through documented canonical mapping."
      }
    ],
    "requiredRulesSatisfied": 8,
    "dirtyFiles": [
      {
        "path": "src/lib/codebase-hardening/self-revealing-codebase-engine.ts",
        "classification": "real_source_change_needs_review"
      }
    ],
    "openPullRequests": [],
    "selfCheck": {
      "packageScriptsPresent": true,
      "generatedArtifactsNeedValidator": true,
      "noRouteWithoutFeatureRegistration": true,
      "noMetricWithoutMathOwner": true,
      "noDebugLaneWithoutBrainMapping": true
    }
  },
  "selfRevealingCodebase": {
    "reportKey": "self-revealing-codebase",
    "generatedAtUtc": "2026-07-03T07:11:01.901Z",
    "status": "pass",
    "productionReadsPerformed": false,
    "providerCallsPerformed": false,
    "deployPerformed": false,
    "findings": [
      {
        "findingId": "orphaned-limb-product-body-map",
        "domain": "orphaned_limb",
        "bodySystem": "admin_debug_ops",
        "sourcePath": "src/lib/product-integrity/product-body-map.ts",
        "owner": "product-integrity",
        "severity": "medium",
        "actionability": "classify",
        "rootCause": "A visible limb without body-system ownership can bypass telemetry, metrics, debug, and score.",
        "exactNextAction": "Run npm run check:product-body-map and classify each orphan as connected, deferred_with_owner, in_flight, or unsafe_unknown.",
        "validator": "npm run check:product-body-map",
        "scoreImpact": [
          "evidenceCompleteness"
        ],
        "costImpact": "none",
        "accuracyImpact": "high",
        "userVisibleImpact": "Prevents user-visible features from losing state or telemetry ownership.",
        "adminVisibleImpact": "Admin debug can see orphaned and deferred limbs with next actions."
      },
      {
        "findingId": "duplicate-formula-global-audit",
        "domain": "duplicate_formula",
        "bodySystem": "telemetry_behavioral_intelligence",
        "sourcePath": "src/lib/math/global-formula-audit.ts",
        "owner": "math",
        "severity": "high",
        "actionability": "fix_now",
        "rootCause": "Formula copies can drift from canonical math and corrupt user/admin numbers.",
        "exactNextAction": "Route every new formula through canonical math ledger or mark needs_operator_decision.",
        "validator": "npm run check:canonical-math-ledger",
        "scoreImpact": [
          "sourceHealth",
          "evidenceCompleteness"
        ],
        "costImpact": "none",
        "accuracyImpact": "high",
        "userVisibleImpact": "Prevents exact-looking weak or stale metric displays.",
        "adminVisibleImpact": "Admin debug sees formula owner, confidence, freshness, and source truth."
      },
      {
        "findingId": "stale-artifact-score-input",
        "domain": "stale_artifact",
        "bodySystem": "admin_debug_ops",
        "sourcePath": "agent/state/*.generated.json",
        "owner": "beta-score",
        "severity": "medium",
        "actionability": "classify",
        "rootCause": "Generated reports are snapshots and can become stale score inputs.",
        "exactNextAction": "Regenerate active score-owned reports or retire superseded artifacts from score inputs.",
        "validator": "npm run check:beta-score",
        "scoreImpact": [
          "freshness",
          "evidenceCompleteness"
        ],
        "costImpact": "none",
        "accuracyImpact": "medium",
        "userVisibleImpact": "Prevents beta readiness from implying stale proof is current.",
        "adminVisibleImpact": "Admin debug sees stale artifact owner and exact refresh command."
      },
      {
        "findingId": "telemetry-chain-central-normalizer",
        "domain": "broken_telemetry_chain",
        "bodySystem": "telemetry_behavioral_intelligence",
        "sourcePath": "src/lib/product-integrity/central-normalizer.ts",
        "owner": "analytics",
        "severity": "high",
        "actionability": "fix_now",
        "rootCause": "Signals that skip central normalizer can bypass envelope, facts, metrics, debug, score, and exports.",
        "exactNextAction": "Add a central normalizer adapter or document an exemption for each direct telemetry path.",
        "validator": "npm run check:central-normalizer-spine",
        "scoreImpact": [
          "sourceHealth",
          "runtimeHealth"
        ],
        "costImpact": "medium",
        "accuracyImpact": "high",
        "userVisibleImpact": "User actions keep canonical metric and journey meaning.",
        "adminVisibleImpact": "Debug triage can show the broken stage instead of raw noise."
      },
      {
        "findingId": "metric-materializer-person-metrics",
        "domain": "missing_metric_materializer",
        "bodySystem": "telemetry_behavioral_intelligence",
        "sourcePath": "src/lib/analytics/person-metrics-hydration.ts",
        "owner": "analytics",
        "severity": "high",
        "actionability": "fix_now",
        "rootCause": "Missing metric producers or bridges must show as gaps, not zero.",
        "exactNextAction": "Keep missingHydration.length wired to debugLane.gaps and scoreImpactByDimension.",
        "validator": "npm run check:person-metrics-hydration",
        "scoreImpact": [
          "evidenceCompleteness"
        ],
        "costImpact": "none",
        "accuracyImpact": "high",
        "userVisibleImpact": "Missing activity does not display as proven zero.",
        "adminVisibleImpact": "Admin sees missing producer/bridge gap counts."
      },
      {
        "findingId": "cost-owner-review-source-guards",
        "domain": "cost_owner_review_lane",
        "bodySystem": "cost_runtime_infrastructure",
        "sourcePath": "src/lib/codebase-hardening/cost-accuracy-hardening.ts",
        "owner": "cost-runtime-infrastructure",
        "severity": "high",
        "actionability": "external_evidence_required",
        "rootCause": "Source cost guards exist, but external billing proof remains separate.",
        "exactNextAction": "Collect external billing/provider artifact before marking cost lanes full pass.",
        "validator": "npm run check:cost-export-sql-parity-math",
        "scoreImpact": [
          "costRisk"
        ],
        "costImpact": "high",
        "accuracyImpact": "medium",
        "userVisibleImpact": "No product metric accuracy is reduced for cost claims.",
        "adminVisibleImpact": "Cost lanes show source guarded with external review remaining."
      },
      {
        "findingId": "formal-runtime-provider-gate",
        "domain": "formal_evidence_requirement",
        "bodySystem": "admin_debug_ops",
        "sourcePath": "agent/state/public-beta-score.generated.json",
        "owner": "operator",
        "severity": "medium",
        "actionability": "manual_review",
        "rootCause": "Source validators cannot clear deployed runtime, provider, or admin production sample proof.",
        "exactNextAction": "Attach formal runtime/provider/admin sample artifacts outside Codex source-only checks.",
        "validator": "npm run check:current-beta-exit-status",
        "scoreImpact": [
          "runtimeHealth",
          "evidenceCompleteness"
        ],
        "costImpact": "none",
        "accuracyImpact": "medium",
        "userVisibleImpact": "Beta readiness remains honest about formal gates.",
        "adminVisibleImpact": "Admin debug separates source confidence from typed evidence artifacts."
      },
      {
        "findingId": "legacy-recovery-dry-run",
        "domain": "legacy_recovery_candidate",
        "bodySystem": "telemetry_behavioral_intelligence",
        "sourcePath": "src/lib/codebase-hardening/legacy-canonical-recovery-plan.ts",
        "owner": "analytics",
        "severity": "medium",
        "actionability": "manual_review",
        "rootCause": "Historical events can be mapped only as dry-run candidates until approved.",
        "exactNextAction": "Review dry-run canonicalization output before any mutation path exists.",
        "validator": "npm run check:metric-canonicalization-legacy-recovery",
        "scoreImpact": [
          "evidenceCompleteness"
        ],
        "costImpact": "low",
        "accuracyImpact": "high",
        "userVisibleImpact": "Legacy data cannot become exact user truth without deterministic evidence.",
        "adminVisibleImpact": "Admin sees confidence, duplicate risk, and archive-only decisions."
      }
    ]
  },
  "dirtyFiles": [
    {
      "path": "src/lib/codebase-hardening/self-revealing-codebase-engine.ts",
      "classification": "real_source_change_needs_review"
    }
  ],
  "openPullRequests": [],
  "artifactsWritten": [
    "agent/state/legacy-pipeline-inventory.generated.json",
    "docs/agent-truth/legacy-pipeline-inventory.md",
    "agent/state/pipeline-ownership-audit.generated.json",
    "docs/agent-truth/pipeline-ownership-audit.md",
    "agent/state/global-formula-audit.generated.json",
    "docs/agent-truth/global-formula-audit.md",
    "agent/state/legacy-canonical-recovery-plan.generated.json",
    "docs/agent-truth/legacy-canonical-recovery-plan.md",
    "agent/state/cost-accuracy-hardening.generated.json",
    "docs/agent-truth/cost-accuracy-hardening.md",
    "agent/state/codebase-organization-hardening.generated.json",
    "docs/agent-truth/codebase-organization-hardening.md",
    "agent/state/codex-execution-guardrails.generated.json",
    "docs/agent-truth/codex-execution-guardrails.md",
    "agent/state/self-revealing-codebase.generated.json",
    "docs/agent-truth/self-revealing-codebase.md",
    "agent/state/mega-legacy-pipeline-hardening.generated.json",
    "docs/agent-truth/mega-legacy-pipeline-hardening.md"
  ],
  "validationFailures": []
}
```
