# Evidence Freshness Index

Generated: 2026-07-02T14:10:19.469Z

Generated reports are evidence snapshots only. Stale, missing, runtime, provider, or admin-truth evidence cannot be treated as current app truth by this source-only lane.

## Summary

- Artifacts scanned: 635
- Indexed artifacts: 50
- Omitted artifacts: 585
- Blocking artifacts: 13
- Stale consumed artifacts: 478
- Typed external evidence required: 5
- UI source coverage required: 1
- Admin truth source required: 1

## Actionability

- refreshable_by_existing_local_validator: 13
- external_proof_required: 5
- ui_source_coverage_required: 1
- admin_truth_source_required: 1
- archive_evidence_only: 122
- stale_consumed_blocking: 0
- missing_expected_blocking: 0
- no_action_required: 493

## Blocking Artifacts

- agent/state/cloudrun-sql-bigquery-guardrails.generated.json: refreshable_by_existing_local_validator; Run npm run check:cloud-cost to refresh agent/state/cloudrun-sql-bigquery-guardrails.generated.json.
- agent/state/google-cost-bleed.generated.json: refreshable_by_existing_local_validator; Run npm run check:google-cost to refresh agent/state/google-cost-bleed.generated.json.
- agent/state/gumdrop-economy-score.generated.json: refreshable_by_existing_local_validator; Run npm run check:gumdrop-economy to refresh agent/state/gumdrop-economy-score.generated.json.
- agent/state/monolith-orphan-metric-registry.generated.json: refreshable_by_existing_local_validator; Run npm run check:monolith-orphan-metric-registry to refresh agent/state/monolith-orphan-metric-registry.generated.json.
- agent/state/telemetry-parity-score.generated.json: refreshable_by_existing_local_validator; Run npm run check:telemetry-parity-score to refresh agent/state/telemetry-parity-score.generated.json.
- agent/state/treasury-reconciliation-engine.generated.json: refreshable_by_existing_local_validator; Run npm run check:treasury-reconciliation-engine to refresh agent/state/treasury-reconciliation-engine.generated.json.
- agent/state/content-protection-score.generated.json: refreshable_by_existing_local_validator; Run npm run check:content-protection to refresh agent/state/content-protection-score.generated.json.
- agent/state/codebase-hardening.generated.json: refreshable_by_existing_local_validator; Run npm run check:hardening to refresh agent/state/codebase-hardening.generated.json.
- agent/state/device-ui-dry-audit.generated.json: refreshable_by_existing_local_validator; Run npm run check:device-ui to refresh agent/state/device-ui-dry-audit.generated.json.
- agent/state/speed-security-hardening.generated.json: refreshable_by_existing_local_validator; Run npm run check:speed-security to refresh agent/state/speed-security-hardening.generated.json.
- agent/state/canonical-math-ledger.generated.json: refreshable_by_existing_local_validator; Run npm run check:canonical-math-ledger to refresh agent/state/canonical-math-ledger.generated.json.
- agent/state/self-healing-refresh-queue.generated.json: refreshable_by_existing_local_validator; Run npm run check:self-healing-refresh-queue to refresh agent/state/self-healing-refresh-queue.generated.json.
- agent/state/behavior-math-verification.generated.json: refreshable_by_existing_local_validator; Run npm run check:behavior-math-verification to refresh agent/state/behavior-math-verification.generated.json.

## Typed Evidence Boundaries

- agent/state/billing-spike-radar.generated.json: typed external evidence required; source checks cannot clear this gate.
- agent/state/provider-smoke-evidence.generated.json: typed external evidence required; source checks cannot clear this gate.
- agent/state/runtime-smoke-evidence.generated.json: typed external evidence required; source checks cannot clear this gate.
- agent/state/runtime-smoke-substitute-matrix.generated.json: typed external evidence required; source checks cannot clear this gate.
- agent/state/runtime-smoke-harness.generated.json: typed external evidence required; source checks cannot clear this gate.
- agent/state/operator-final-qa-packet.generated.json: UI source coverage required before optional visual reproduction.
- agent/state/admin-truth-sample-evidence.generated.json: admin truth source sample required; use redacted approved evidence only.
