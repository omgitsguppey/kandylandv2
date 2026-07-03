# Codebase Organization Hardening

Generated: 2026-07-03T07:11:50.593Z
Status: pass

This source-only guard requires new limbs to declare body system, feature/surface, route, telemetry, normalizer, metrics, journey, debug, score, cost, legacy alias policy, and validator ownership before they can become canonical.

## Rules

- feature-body-system-required: new feature or route; validator=check:product-body-map; fields=bodySystem, featureId, surfaceId, routeOrApiRoute
- telemetry-event-envelope-required: new telemetry event; validator=check:event-translation-bridge; fields=eventName, eventEnvelope, normalizerPath, privacyClass
- metric-math-owner-required: new metric; validator=check:canonical-math-ledger; fields=metricId, formulaOwner, confidence, freshness, sourceTruth
- journey-mapping-required: new user journey step; validator=check:user-journey-behavioral-intelligence; fields=journeyStep, durationMath, eventFact, debugLane
- debug-interpretive-brain-required: new debug lane; validator=check:interpretive-brain-debug-triage; fields=rootCause, owner, scoreImpact, nextAction, drilldownPolicy
- score-artifact-freshness-required: new score artifact; validator=check:beta-score; fields=validator, freshnessOwner, scoreDimension, currentHead
- cost-class-required: new cost surface; validator=check:cost-export-sql-parity-math; fields=costClass, readBounds, writeBounds, retryPolicy, summaryFirst
- legacy-alias-canonical-map-required: new legacy alias; validator=check:metric-canonicalization-legacy-recovery; fields=canonicalEventName, canonicalMetricId, confidenceCap, dryRunOnly

## Dirty Files

- agent/state/codebase-organization-hardening.generated.json: current_generated_artifact_to_commit
- agent/state/codex-execution-guardrails.generated.json: current_generated_artifact_to_commit
- agent/state/cost-accuracy-hardening.generated.json: current_generated_artifact_to_commit
- agent/state/global-formula-audit.generated.json: current_generated_artifact_to_commit
- agent/state/legacy-canonical-recovery-plan.generated.json: current_generated_artifact_to_commit
- agent/state/legacy-pipeline-inventory.generated.json: current_generated_artifact_to_commit
- agent/state/mega-legacy-pipeline-hardening.generated.json: current_generated_artifact_to_commit
- agent/state/pipeline-ownership-audit.generated.json: current_generated_artifact_to_commit
- agent/state/self-revealing-codebase.generated.json: current_generated_artifact_to_commit
- docs/agent-truth/codebase-organization-hardening.md: documentation_artifact_expected
- docs/agent-truth/codex-execution-guardrails.md: documentation_artifact_expected
- docs/agent-truth/cost-accuracy-hardening.md: documentation_artifact_expected
- docs/agent-truth/global-formula-audit.md: documentation_artifact_expected
- docs/agent-truth/legacy-canonical-recovery-plan.md: documentation_artifact_expected
- docs/agent-truth/legacy-pipeline-inventory.md: documentation_artifact_expected
- docs/agent-truth/mega-legacy-pipeline-hardening.md: documentation_artifact_expected
- docs/agent-truth/pipeline-ownership-audit.md: documentation_artifact_expected
- docs/agent-truth/self-revealing-codebase.md: documentation_artifact_expected
- src/lib/codebase-hardening/self-revealing-codebase-engine.ts: real_source_change_needs_review

## Open PRs

- none
