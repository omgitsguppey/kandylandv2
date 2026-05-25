# Targeted Behavior Evidence

Status: `failed`  
Artifact: `agent/state/targeted-behavior-evidence.generated.json`  
Validator: `npm run check:targeted-behavior-evidence`

## Scope

This artifact records source-backed targeted behavior validator results from the latest code version. It is not runtime smoke, manual screenshot evidence, provider evidence, or production admin truth sample evidence.

## Summary

- Source commit: `5482caa9bc232cfe8344932355dfaac552ff671a`
- Latest code version: `5482caa9bc232cfe8344932355dfaac552ff671a`
- Passed: false
- Formal evidence impact: `source_behavior_only`
- Does not clear: `manual_screenshot`, `provider_smoke`, `runtime_smoke`, `admin_truth_sample`

## Validator Results

| Lane | Status | Command | Artifact | Surfaces | Blocker |
| --- | --- | --- | --- | --- | --- |
| creator-settings-control-plane | fail | npm run check:creator-settings-control-plane | agent/state/creator-settings-control-plane.generated.json | creator_settings, creator_profile, fan_pass | agent/state/creator-settings-control-plane.generated.json was not generated from the latest code version. |
| creator-pricing-wiring | fail | npm run check:creator-pricing-wiring | agent/state/creator-pricing-wiring.generated.json | creator_pricing, fan_pass, creator_experiences | agent/state/creator-pricing-wiring.generated.json was not generated from the latest code version. |
| creator-broadcast-timeline-prep | fail | npm run check:creator-broadcast-timeline-prep | agent/state/creator-broadcast-timeline-prep.generated.json | creator_broadcasts, notifications, creator_timeline | agent/state/creator-broadcast-timeline-prep.generated.json was not generated from the latest code version. |
| creator-profile-mobile-timeline | fail | npm run check:creator-profile-mobile-timeline | agent/state/creator-profile-mobile-timeline.generated.json | creator_profile, mobile_ui, timeline | agent/state/creator-profile-mobile-timeline.generated.json was not generated from the latest code version. |
| global-marquee-truncated-titles | fail | npm run check:global-marquee-truncated-titles | agent/state/global-marquee-truncated-titles.generated.json | ui_titles, creator_ui, admin_ui, user_library | agent/state/global-marquee-truncated-titles.generated.json was not generated from the latest code version. |
| creator-drop-status-metrics | fail | npm run check:creator-drop-status-metrics | agent/state/creator-drop-status-metrics.generated.json | creator_drop_manager, drop_metrics, drop_status | agent/state/creator-drop-status-metrics.generated.json was not generated from the latest code version. |
| user-loading-wallet-mobile-refinement | fail | npm run check:user-loading-wallet-mobile-refinement | agent/state/user-loading-wallet-mobile-refinement.generated.json | user_dashboard, wallet_ui, mobile_loading | agent/state/user-loading-wallet-mobile-refinement.generated.json was not generated from the latest code version. |
| existing-algorithm-refinement | fail | npm run check:existing-algorithm-refinement | agent/state/existing-algorithm-refinement.generated.json | beta_scoring, telemetry, creator_pricing, drop_status, mobile_density | agent/state/existing-algorithm-refinement.generated.json was not generated from the latest code version. |
| overnight-wiring-integrity | fail | npm run check:overnight-wiring-integrity | agent/state/overnight-wiring-integrity.generated.json | creator_settings, telemetry, parity, routes | agent/state/overnight-wiring-integrity.generated.json was not generated from the latest code version. |
| final-telemetry-closure-lock | fail | npm run check:final-telemetry-closure-lock | agent/state/final-telemetry-closure-lock.generated.json | telemetry, firestore, bigquery, ga4, admin_evidence | agent/state/final-telemetry-closure-lock.generated.json was not generated from the latest code version. |
| mobile-ui-final-lock | fail | npm run check:mobile-ui-final-lock | agent/state/mobile-ui-final-lock.generated.json | mobile_ui, admin_ui, creator_ui, user_ui | agent/state/mobile-ui-final-lock.generated.json was not generated from the latest code version. |
| user-creator-ui-parity | fail | npm run check:user-creator-ui-parity | agent/state/user-creator-ui-parity.generated.json | user_ui, creator_ui, route_parity | agent/state/user-creator-ui-parity.generated.json was not generated from the latest code version. |
| source-truth-authority-map | fail | npm run check:source-truth-authority-map | agent/state/source-truth-authority-map.generated.json | source_truth, admin_truth, beta_evidence | agent/state/source-truth-authority-map.generated.json was not generated from the latest code version. |
| gumdrop-economy-accuracy | fail | npm run check:gumdrop-economy-accuracy | agent/state/gumdrop-economy-accuracy.generated.json | gumdrop_economy, source_of_funds, creator_monetization | agent/state/gumdrop-economy-accuracy.generated.json was not generated from the latest code version. |
| creator-drop-management-approval | fail | npm run check:creator-drop-management-approval | agent/state/creator-drop-management-approval.generated.json | creator_drop_manager, admin_approval, drop_lifecycle | agent/state/creator-drop-management-approval.generated.json was not generated from the latest code version. |
| creator-drop-manager-mobile-refinement | fail | npm run check:creator-drop-manager-mobile-refinement | agent/state/creator-drop-manager-mobile-refinement.generated.json | creator_drop_manager, mobile_ui | agent/state/creator-drop-manager-mobile-refinement.generated.json was not generated from the latest code version. |

## Surfaces Covered

- admin_approval
- admin_evidence
- admin_truth
- admin_ui
- beta_evidence
- beta_scoring
- bigquery
- creator_broadcasts
- creator_drop_manager
- creator_experiences
- creator_monetization
- creator_pricing
- creator_profile
- creator_settings
- creator_timeline
- creator_ui
- drop_lifecycle
- drop_metrics
- drop_status
- fan_pass
- firestore
- ga4
- gumdrop_economy
- mobile_density
- mobile_loading
- mobile_ui
- notifications
- parity
- route_parity
- routes
- source_of_funds
- source_truth
- telemetry
- timeline
- ui_titles
- user_dashboard
- user_library
- user_ui
- wallet_ui

## Not Covered

- manual screenshot QA
- provider smoke
- runtime smoke
- admin truth sample
- real-device smoke
- deployed runtime smoke

## Readiness Impact

Targeted behavior evidence can improve source behavior confidence when fresh and passing. It cannot replace manual screenshot evidence, provider smoke, runtime smoke, real-device smoke, deployed runtime smoke, or production admin truth samples.
