# Live Evidence Gate Replacement

Artifact: `agent/state/live-evidence-gate-replacement.generated.json`
Validator: `npm run check:live-evidence-gate-replacement`

## Summary

- Generated: `2026-06-16T20:01:04.949Z`
- Current head: `daac8d022546507e5d7489c5476c35a0e7c940fa`
- Status: `pass`

## Report

```json
{
  "reportKey": "live-evidence-gate-replacement",
  "generatedAtUtc": "2026-06-16T20:01:04.949Z",
  "currentHead": "daac8d022546507e5d7489c5476c35a0e7c940fa",
  "broadManualGatesBefore": [
    "operator-final visual QA",
    "manual production smoke",
    "admin truth/sample evidence",
    "runtime/provider smoke",
    "external billing review"
  ],
  "broadManualGatesAfter": [
    "visual-only operator QA",
    "external provider proof",
    "external billing review",
    "source_missing live evidence lanes"
  ],
  "gatesReplacedByLiveEvidence": [
    {
      "gate": "manual production smoke",
      "beforeClass": "broad_manual",
      "afterClass": "live_route_health_evidence",
      "status": "source_missing_live_evidence",
      "replacement": "split into live route/runtime evidence, live product journey evidence, external provider evidence, and visual-only QA",
      "reason": "A single manual smoke gate is too broad; each product system must use its live evidence source or be marked source_missing.",
      "blocksBetaExit": true
    },
    {
      "gate": "admin truth/sample evidence",
      "beforeClass": "mixed_manual_formal",
      "afterClass": "live_admin_truth_evidence",
      "status": "source_missing_live_evidence",
      "replacement": "redacted live admin truth summary or redaction packet; screenshots are not evidence for admin truth",
      "reason": "Admin truth must come from redacted summaries or source_missing classification.",
      "blocksBetaExit": true
    },
    {
      "gate": "runtime/provider smoke",
      "beforeClass": "mixed_manual_formal",
      "afterClass": "external_provider_evidence",
      "status": "external_provider_required",
      "replacement": "deployed route health/live runtime evidence plus external provider proof for PayPal/provider flows",
      "reason": "Route/product behavior can use live summaries when available; PayPal/provider proof remains external.",
      "blocksBetaExit": true
    }
  ],
  "visualOnlyManualGatesRemaining": [
    {
      "gate": "operator-final visual QA",
      "beforeClass": "broad_manual",
      "afterClass": "visual_operator_evidence",
      "status": "visual_only_manual",
      "replacement": "visual layout QA only: nav overlap, clipping, readable text, responsive layout, and visual loading/empty/error states",
      "reason": "Screenshots cannot prove backend, runtime, payment, telemetry, or journey behavior.",
      "blocksBetaExit": true
    }
  ],
  "externalProviderGatesRemaining": [
    {
      "gate": "runtime/provider smoke",
      "beforeClass": "mixed_manual_formal",
      "afterClass": "external_provider_evidence",
      "status": "external_provider_required",
      "replacement": "deployed route health/live runtime evidence plus external provider proof for PayPal/provider flows",
      "reason": "Route/product behavior can use live summaries when available; PayPal/provider proof remains external.",
      "blocksBetaExit": true
    }
  ],
  "externalBillingGatesRemaining": [
    {
      "gate": "external billing review",
      "beforeClass": "mixed_manual_formal",
      "afterClass": "external_billing_evidence",
      "status": "external_billing_required",
      "replacement": "external billing review note separated from source cost guards",
      "reason": "Source cost guards do not prove Cloud/Firebase/AI provider spend.",
      "blocksBetaExit": true
    }
  ],
  "liveEvidenceBySystem": [
    {
      "systemId": "auth_signup_login_session_restore",
      "label": "Auth/signup/login/session restore",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "recent auth event facts or redacted session restore summary",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        },
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "auth_session_established or auth_session_restored observed in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1,
        "evidenceCompleteness": 2,
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source_missing auth liveness must replace manual screenshot proof",
      "reason": "No clearing live evidence source was found. source_missing auth liveness must replace manual screenshot proof.",
      "nextExactAction": "Add or attach recent auth event facts or redacted session restore summary; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "wallet_payment_gumdrop_ledger",
      "label": "Wallet/payment/GumDrop ledger",
      "gateClass": "live_ledger_evidence",
      "status": "external_provider_required",
      "expectedLiveEvidenceSource": "redacted wallet ledger summary plus provider evidence for payment proof",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/real-usage-confidence.generated.json",
          "sourceKind": "ledger_summary",
          "clearsLiveGate": false,
          "sourceStatus": "operator_confirmed",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:55.634Z"
        },
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "provider_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "wallet/payment/ledger event facts with source buckets and no raw provider IDs",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1,
        "evidenceCompleteness": 2
      },
      "betaExitImpact": "external_required",
      "fallbackIfMissing": "keep provider proof external and classify ledger live source as source_missing or source_only",
      "reason": "Provider/payment UI or webhook proof must come from external provider evidence.",
      "nextExactAction": "Attach redacted provider/payment proof without exposing raw provider IDs."
    },
    {
      "systemId": "drops_open_unlock_unwrap_watch",
      "label": "Drops/open/unlock/unwrap/watch",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "drop event facts, watch summaries, and journey summaries",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/user-journey-behavioral-intelligence.generated.json",
          "sourceKind": "journey_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "7747ca78ac19f78c396f9c5c50301347ce492a45",
          "generatedAtUtc": "2026-05-27T00:55:34.822Z"
        },
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "drop_opened/drop_unlocked/drop_unwrapped/watch_session event facts in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1,
        "evidenceCompleteness": 2,
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "classify live drop liveness as source_missing instead of asking screenshots to prove watch/unlock behavior",
      "reason": "No clearing live evidence source was found. classify live drop liveness as source_missing instead of asking screenshots to prove watch/unlock behavior.",
      "nextExactAction": "Add or attach drop event facts, watch summaries, and journey summaries; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "creator_profile_discovery_follow",
      "label": "Creator profile/discovery/follow",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "creator profile/follow/discovery event facts",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "creator profile or follow event fact in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1,
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source_missing creator liveness remains a live evidence blocker, not a visual QA item",
      "reason": "No clearing live evidence source was found. source_missing creator liveness remains a live evidence blocker, not a visual QA item.",
      "nextExactAction": "Add or attach creator profile/follow/discovery event facts; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "creator_monetization_fan_pass_entitlements",
      "label": "Creator monetization/Fan Pass/entitlements",
      "gateClass": "live_ledger_evidence",
      "status": "external_provider_required",
      "expectedLiveEvidenceSource": "redacted entitlement/revenue ledger summary",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/real-usage-confidence.generated.json",
          "sourceKind": "ledger_summary",
          "clearsLiveGate": false,
          "sourceStatus": "operator_confirmed",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:55.634Z"
        },
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "provider_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "Fan Pass/entitlement access facts with confidence split and no provider IDs",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1,
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "external_required",
      "fallbackIfMissing": "do not let screenshots prove entitlement or revenue math",
      "reason": "Provider/payment UI or webhook proof must come from external provider evidence.",
      "nextExactAction": "Attach redacted provider/payment proof without exposing raw provider IDs."
    },
    {
      "systemId": "chat_open_thread_message_block_error",
      "label": "Chat open/thread/message/block/error",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "chat event facts and redacted error summaries",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "chat open/message/block/error summary without raw chat content",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "redacted chat live evidence source is required; screenshots prove layout only",
      "reason": "No clearing live evidence source was found. redacted chat live evidence source is required; screenshots prove layout only.",
      "nextExactAction": "Add or attach chat event facts and redacted error summaries; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "daily_tasks_reward_reset",
      "label": "Daily tasks/reward/reset",
      "gateClass": "live_ledger_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "daily task event facts and reward ledger summary",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/user-journey-behavioral-intelligence.generated.json",
          "sourceKind": "journey_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "7747ca78ac19f78c396f9c5c50301347ce492a45",
          "generatedAtUtc": "2026-05-27T00:55:34.822Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "task start/complete/reward event facts with reset window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "task reward proof stays in event/ledger summaries, not screenshots",
      "reason": "No clearing live evidence source was found. task reward proof stays in event/ledger summaries, not screenshots.",
      "nextExactAction": "Add or attach daily task event facts and reward ledger summary; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "notifications_pwa_permission_token_intent",
      "label": "Notifications/PWA permission/token/intent",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "notification prompt/token/intent summaries with raw tokens redacted",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        },
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "permission/token/intent summary without raw FCM/push token",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "operator visual QA only checks prompt layout, not token registration truth",
      "reason": "No clearing live evidence source was found. operator visual QA only checks prompt layout, not token registration truth.",
      "nextExactAction": "Add or attach notification prompt/token/intent summaries with raw tokens redacted; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "account_settings_delete_export_support",
      "label": "Account settings/delete/export/support",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "account/support action summaries with PII redacted",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/runtime-smoke-harness.generated.json",
          "sourceKind": "source_contract",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:56.708Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "settings/support/delete/export facts or route summaries with typed outcomes",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "screenshots do not prove support/account action backend behavior",
      "reason": "No clearing live evidence source was found. screenshots do not prove support/account action backend behavior.",
      "nextExactAction": "Add or attach account/support action summaries with PII redacted; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "media_upload_access",
      "label": "Media upload/access",
      "gateClass": "live_runtime_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "media upload/access block summaries without private URLs",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        },
        {
          "artifactPath": "agent/state/runtime-smoke-harness.generated.json",
          "sourceKind": "source_contract",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:56.708Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "runtime_export_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "redacted upload/access summary with private media URL excluded",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source contract can guide checks but cannot clear live media evidence",
      "reason": "No clearing live evidence source was found. source contract can guide checks but cannot clear live media evidence.",
      "nextExactAction": "Add or attach media upload/access block summaries without private URLs; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "search_discovery",
      "label": "Search/discovery",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "search/discovery event facts",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "runtime_export_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "search/discovery action event fact in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source_missing search liveness remains a live evidence issue",
      "reason": "No clearing live evidence source was found. source_missing search liveness remains a live evidence issue.",
      "nextExactAction": "Add or attach search/discovery event facts; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "admin_debug_user_management",
      "label": "Admin/debug/user management",
      "gateClass": "live_admin_truth_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "redacted admin truth summary or admin debug snapshot",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/admin-truth-redaction-packet.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "7747ca78ac19f78c396f9c5c50301347ce492a45",
          "generatedAtUtc": "2026-05-27T00:58:38.424Z"
        },
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "admin_truth_source_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "redacted admin summary with environment/currentHead and no raw identifiers",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 2
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "admin truth remains source_missing/formal_missing unless a redacted summary is attached",
      "reason": "No clearing live evidence source was found. admin truth remains source_missing/formal_missing unless a redacted summary is attached.",
      "nextExactAction": "Add or attach redacted admin truth summary or admin debug snapshot; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "route_runtime_error_health",
      "label": "Route runtime/error health",
      "gateClass": "live_route_health_evidence",
      "status": "source_only_evidence",
      "expectedLiveEvidenceSource": "deployed route health or runtime summary",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/runtime-smoke-harness.generated.json",
          "sourceKind": "route_health_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:56.708Z"
        },
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "runtime_export_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 1,
      "minimumAcceptableSignal": "deployed route sample/error-rate summary; local harness is source-only",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 2,
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source-safe route harness cannot clear deployed route runtime gate",
      "reason": "Only source-safe or validator-backed evidence is present; it raises confidence but cannot clear live/formal gates.",
      "nextExactAction": "Connect or attach deployed route health or runtime summary; keep source-only evidence labeled as source-only."
    },
    {
      "systemId": "cost_runtime_4xx_summaries",
      "label": "Cost/runtime/4xx summaries",
      "gateClass": "live_error_rate_evidence",
      "status": "external_billing_required",
      "expectedLiveEvidenceSource": "cost and route 4xx rollup with external billing review separate",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/cost-risk-exit-pass.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T03:16:13.690Z"
        },
        {
          "artifactPath": "agent/state/global-cost-surfaces.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": null,
          "generatedAtUtc": "2026-06-03T04:38:29.157Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "billing_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "hourly route 4xx/cost summary and external billing status",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "costRisk": 4
      },
      "betaExitImpact": "external_required",
      "fallbackIfMissing": "cost source guards do not become billing proof",
      "reason": "Actual spend proof must come from external billing review.",
      "nextExactAction": "Attach external billing review for cost lanes."
    }
  ],
  "sourceMissingLiveEvidence": [
    {
      "systemId": "auth_signup_login_session_restore",
      "label": "Auth/signup/login/session restore",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "recent auth event facts or redacted session restore summary",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        },
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "auth_session_established or auth_session_restored observed in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1,
        "evidenceCompleteness": 2,
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source_missing auth liveness must replace manual screenshot proof",
      "reason": "No clearing live evidence source was found. source_missing auth liveness must replace manual screenshot proof.",
      "nextExactAction": "Add or attach recent auth event facts or redacted session restore summary; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "drops_open_unlock_unwrap_watch",
      "label": "Drops/open/unlock/unwrap/watch",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "drop event facts, watch summaries, and journey summaries",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/user-journey-behavioral-intelligence.generated.json",
          "sourceKind": "journey_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "7747ca78ac19f78c396f9c5c50301347ce492a45",
          "generatedAtUtc": "2026-05-27T00:55:34.822Z"
        },
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "drop_opened/drop_unlocked/drop_unwrapped/watch_session event facts in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1,
        "evidenceCompleteness": 2,
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "classify live drop liveness as source_missing instead of asking screenshots to prove watch/unlock behavior",
      "reason": "No clearing live evidence source was found. classify live drop liveness as source_missing instead of asking screenshots to prove watch/unlock behavior.",
      "nextExactAction": "Add or attach drop event facts, watch summaries, and journey summaries; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "creator_profile_discovery_follow",
      "label": "Creator profile/discovery/follow",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "creator profile/follow/discovery event facts",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "creator profile or follow event fact in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1,
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source_missing creator liveness remains a live evidence blocker, not a visual QA item",
      "reason": "No clearing live evidence source was found. source_missing creator liveness remains a live evidence blocker, not a visual QA item.",
      "nextExactAction": "Add or attach creator profile/follow/discovery event facts; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "chat_open_thread_message_block_error",
      "label": "Chat open/thread/message/block/error",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "chat event facts and redacted error summaries",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "chat open/message/block/error summary without raw chat content",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "redacted chat live evidence source is required; screenshots prove layout only",
      "reason": "No clearing live evidence source was found. redacted chat live evidence source is required; screenshots prove layout only.",
      "nextExactAction": "Add or attach chat event facts and redacted error summaries; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "daily_tasks_reward_reset",
      "label": "Daily tasks/reward/reset",
      "gateClass": "live_ledger_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "daily task event facts and reward ledger summary",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/user-journey-behavioral-intelligence.generated.json",
          "sourceKind": "journey_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "7747ca78ac19f78c396f9c5c50301347ce492a45",
          "generatedAtUtc": "2026-05-27T00:55:34.822Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "task start/complete/reward event facts with reset window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "task reward proof stays in event/ledger summaries, not screenshots",
      "reason": "No clearing live evidence source was found. task reward proof stays in event/ledger summaries, not screenshots.",
      "nextExactAction": "Add or attach daily task event facts and reward ledger summary; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "notifications_pwa_permission_token_intent",
      "label": "Notifications/PWA permission/token/intent",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "notification prompt/token/intent summaries with raw tokens redacted",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        },
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "permission/token/intent summary without raw FCM/push token",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "operator visual QA only checks prompt layout, not token registration truth",
      "reason": "No clearing live evidence source was found. operator visual QA only checks prompt layout, not token registration truth.",
      "nextExactAction": "Add or attach notification prompt/token/intent summaries with raw tokens redacted; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "account_settings_delete_export_support",
      "label": "Account settings/delete/export/support",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "account/support action summaries with PII redacted",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/runtime-smoke-harness.generated.json",
          "sourceKind": "source_contract",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:56.708Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "not_observed_but_expected",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "settings/support/delete/export facts or route summaries with typed outcomes",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "screenshots do not prove support/account action backend behavior",
      "reason": "No clearing live evidence source was found. screenshots do not prove support/account action backend behavior.",
      "nextExactAction": "Add or attach account/support action summaries with PII redacted; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "media_upload_access",
      "label": "Media upload/access",
      "gateClass": "live_runtime_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "media upload/access block summaries without private URLs",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        },
        {
          "artifactPath": "agent/state/runtime-smoke-harness.generated.json",
          "sourceKind": "source_contract",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:56.708Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "runtime_export_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "redacted upload/access summary with private media URL excluded",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source contract can guide checks but cannot clear live media evidence",
      "reason": "No clearing live evidence source was found. source contract can guide checks but cannot clear live media evidence.",
      "nextExactAction": "Add or attach media upload/access block summaries without private URLs; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "search_discovery",
      "label": "Search/discovery",
      "gateClass": "live_behavioral_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "search/discovery event facts",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/person-metrics-hydration.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "f31aba5c8ab9d78af0e62ede79ef647570072394",
          "generatedAtUtc": "2026-06-16T18:46:27.603Z"
        },
        {
          "artifactPath": "agent/state/event-liveness-audit.generated.json",
          "sourceKind": "event_fact",
          "clearsLiveGate": false,
          "sourceStatus": "missing",
          "currentHead": "225f9e53f18b60edc7399c1ea258c0b9bacfae84",
          "generatedAtUtc": "2026-06-03T04:32:33.345Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "runtime_export_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "search/discovery action event fact in bounded live window",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "freshness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source_missing search liveness remains a live evidence issue",
      "reason": "No clearing live evidence source was found. source_missing search liveness remains a live evidence issue.",
      "nextExactAction": "Add or attach search/discovery event facts; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "admin_debug_user_management",
      "label": "Admin/debug/user management",
      "gateClass": "live_admin_truth_evidence",
      "status": "source_missing_live_evidence",
      "expectedLiveEvidenceSource": "redacted admin truth summary or admin debug snapshot",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/admin-truth-redaction-packet.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "7747ca78ac19f78c396f9c5c50301347ce492a45",
          "generatedAtUtc": "2026-05-27T00:58:38.424Z"
        },
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "admin_debug_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "admin_truth_source_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 24,
      "minimumAcceptableSignal": "redacted admin summary with environment/currentHead and no raw identifiers",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "evidenceCompleteness": 2
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "admin truth remains source_missing/formal_missing unless a redacted summary is attached",
      "reason": "No clearing live evidence source was found. admin truth remains source_missing/formal_missing unless a redacted summary is attached.",
      "nextExactAction": "Add or attach redacted admin truth summary or admin debug snapshot; classify missing lanes as source_missing, not manual screenshot blockers."
    },
    {
      "systemId": "route_runtime_error_health",
      "label": "Route runtime/error health",
      "gateClass": "live_route_health_evidence",
      "status": "source_only_evidence",
      "expectedLiveEvidenceSource": "deployed route health or runtime summary",
      "evidenceSources": [
        {
          "artifactPath": "agent/state/runtime-smoke-harness.generated.json",
          "sourceKind": "route_health_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "9795630e505231581241589fe40debd01b23d9b0",
          "generatedAtUtc": "2026-06-01T00:00:56.708Z"
        },
        {
          "artifactPath": "agent/state/debug-runtime-evidence.generated.json",
          "sourceKind": "error_rate_summary",
          "clearsLiveGate": false,
          "sourceStatus": "source_only",
          "currentHead": "815177718fc1610590762fdae5d76b3ae390a2ae",
          "generatedAtUtc": "2026-06-03T22:38:14.305Z"
        }
      ],
      "liveRuntimeEvidenceStatus": "runtime_export_required",
      "dailyActivityImport": {
        "expectedPath": "agent/evidence/live-runtime-activity/recent-activity.export.json",
        "foundPaths": [],
        "schema": "reportKey=live-runtime-activity-export; generatedAtUtc=<ISO timestamp>; sourceWindow.fromUtc/sourceWindow.toUtc=<bounded recent window>; privacy.piiRedacted=true; privacy.aggregateOnly=true; privacy.rawProviderIdsExcluded=true; privacy.rawPaymentDataExcluded=true; activity[]=eventName,count,lastSeenAtUtc,source,identityScope,identityConfidence,countsGlobal,countsForExactUser",
        "hasRecentActivity": false
      },
      "freshnessWindowHours": 1,
      "minimumAcceptableSignal": "deployed route sample/error-rate summary; local harness is source-only",
      "privacyRedactionPolicy": [
        "no raw PII",
        "no raw payment/provider IDs",
        "no raw chat/private content",
        "no private media URLs",
        "no tokens",
        "no storage paths"
      ],
      "confidence": "unknown",
      "scoreImpact": {
        "runtimeHealth": 2,
        "evidenceCompleteness": 1
      },
      "betaExitImpact": "blocks_until_live_source_connected",
      "fallbackIfMissing": "source-safe route harness cannot clear deployed route runtime gate",
      "reason": "Only source-safe or validator-backed evidence is present; it raises confidence but cannot clear live/formal gates.",
      "nextExactAction": "Connect or attach deployed route health or runtime summary; keep source-only evidence labeled as source-only."
    }
  ],
  "betaExitReadyBefore": false,
  "betaExitReadyAfter": false,
  "remainingBlockers": [
    "Auth/signup/login/session restore: not_observed_but_expected",
    "Wallet/payment/GumDrop ledger: provider_required",
    "Drops/open/unlock/unwrap/watch: not_observed_but_expected",
    "Creator profile/discovery/follow: not_observed_but_expected",
    "Creator monetization/Fan Pass/entitlements: provider_required",
    "Chat open/thread/message/block/error: not_observed_but_expected",
    "Daily tasks/reward/reset: not_observed_but_expected",
    "Notifications/PWA permission/token/intent: not_observed_but_expected",
    "Account settings/delete/export/support: not_observed_but_expected",
    "Media upload/access: runtime_export_required",
    "Search/discovery: runtime_export_required",
    "Admin/debug/user management: admin_truth_source_required",
    "Route runtime/error health: runtime_export_required",
    "Cost/runtime/4xx summaries: billing_required",
    "external provider proof",
    "external billing review",
    "visual-only operator QA"
  ],
  "nextExactSteps": [
    "Connect safe lastSeen/live event summaries for source_missing product systems.",
    "Attach redacted deployed route/runtime evidence for route health.",
    "Attach redacted provider/payment proof for PayPal/provider flows.",
    "Attach external billing review for cost lanes.",
    "Limit operator screenshots to layout, clipping, readability, responsive, and visual state checks."
  ],
  "validationFailures": [],
  "status": "pass",
  "evidenceClass": "source_snapshot",
  "canClearSourceGate": true,
  "canClearRuntimeGate": false,
  "canClearProviderGate": false,
  "canClearAdminTruthGate": false,
  "doesNotProve": [
    "Does not prove deployed runtime behavior.",
    "Does not prove provider smoke success.",
    "Does not prove current admin truth samples.",
    "Does not prove external billing or GitHub PR state unless an opt-in fresh evidence artifact says so."
  ]
}
```

## Evidence Boundary

This source-generated packet does not prove deployed runtime, provider, billing, production admin truth, or operator-final visual QA unless the report explicitly includes a formal artifact for that category.

## Validation

- Pass.
