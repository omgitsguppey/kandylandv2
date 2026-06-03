# Analytics Hydration Consolidation Audit

Generated: 2026-06-03T22:49:03.126Z
Current head: ba57a31950095eb4342a1165bee081fc34a0a94e

## File Classification

- src/lib/admin-analytics/panel-hydration-contract.ts: canonical_keep; Thin status/display/report adapter types.
- src/lib/admin-analytics/panel-hydration-registry.ts: merge_into_person_metrics; Derives events, materializers, and debug owners from person metrics, feature, surface parity, and event liveness registries.
- src/lib/admin-analytics/panel-hydration-resolver.ts: merge_into_event_liveness; Delegates source/liveness state to event liveness and person metrics, then adapts display status.
- src/lib/analytics/person-metrics-hydration.ts: canonical_keep; Owns person metric counts, confidence, provenZero, missingProducer, and missingBridge truth.
- src/lib/analytics/event-liveness-engine.ts: canonical_keep; Owns recent/stale/source/materializer/translation/hydration liveness classification.
- src/lib/debug/debug-panel-tracking-summary.ts: merge_into_debug_tracking_summary; Owns default debug summary lane; panel hydration is one summarized lane only.
- src/lib/product-integrity/interpretive-brain.ts: merge_into_interpretive_brain; Owns root-cause/top-action prioritization instead of panel hydration creating a debug brain.
- src/lib/parity/surface-parity-registry.ts: merge_into_surface_parity; Owns major surface/debug lane mapping reused by panel derivation.
- src/lib/release-readiness/live-panel-evidence-resolver.ts: canonical_keep; Maps compact panel statuses into release evidence decisions.
- agent/state/analytics-panel-hydration.generated.json: generated_artifact_too_verbose; Must remain compact summary plus per-panel lookup, not full static registry dump.

## Symbol Classification

- AdminAnalyticsPanelHydrationStatus: canonical_keep
- derivePanelFromPersonMetric: merge_into_person_metrics
- ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY: duplicate_registry_to_collapse
- resolvePanelHydration: canonical_keep
- statusFromDelegatedSources: merge_into_event_liveness
- buildAnalyticsPanelHydrationDebugLane: merge_into_debug_tracking_summary
- buildAnalyticsPanelHydrationReport: canonical_keep
- panelStatus: compact_artifact
- topPanelHydrationFailures: drilldown_only
- buildLivePanelEvidenceReport: canonical_keep

## Validation

- none
