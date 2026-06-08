# Evidence Freshness Index

Generated: 2026-06-08T19:25:35.765Z

Generated reports are evidence snapshots only. Stale, missing, runtime, provider, or admin-truth evidence cannot be treated as current app truth by this source-only lane.

## Summary

- Artifacts scanned: 658
- Indexed artifacts: 160
- Omitted artifacts: 498
- Blocking artifacts: 11
- Stale consumed artifacts: 582
- External proof required: 5
- Manual/admin truth required: 2

## Actionability

- refreshable_by_existing_local_validator: 11
- external_proof_required: 5
- manual_admin_truth_required: 2
- archive_evidence_only: 0
- stale_consumed_blocking: 0
- missing_expected_blocking: 0
- no_action_required: 640

## Blocking Artifacts

- agent/state/codebase-hardening.generated.json: refreshable_by_existing_local_validator; Run npm run check:hardening to refresh agent/state/codebase-hardening.generated.json.
- agent/state/speed-security-hardening.generated.json: refreshable_by_existing_local_validator; Run npm run check:speed-security to refresh agent/state/speed-security-hardening.generated.json.
- agent/state/cloudrun-sql-bigquery-guardrails.generated.json: refreshable_by_existing_local_validator; Run npm run check:cloud-cost to refresh agent/state/cloudrun-sql-bigquery-guardrails.generated.json.
- agent/state/content-protection-score.generated.json: refreshable_by_existing_local_validator; Run npm run check:content-protection to refresh agent/state/content-protection-score.generated.json.
- agent/state/device-ui-dry-audit.generated.json: refreshable_by_existing_local_validator; Run npm run check:device-ui to refresh agent/state/device-ui-dry-audit.generated.json.
- agent/state/gumdrop-economy-score.generated.json: refreshable_by_existing_local_validator; Run npm run check:gumdrop-economy to refresh agent/state/gumdrop-economy-score.generated.json.
- agent/state/monolith-orphan-metric-registry.generated.json: refreshable_by_existing_local_validator; Run npm run check:monolith-orphan-metric-registry to refresh agent/state/monolith-orphan-metric-registry.generated.json.
- agent/state/behavior-math-verification.generated.json: refreshable_by_existing_local_validator; Run npm run check:behavior-math-verification to refresh agent/state/behavior-math-verification.generated.json.
- agent/state/telemetry-parity-score.generated.json: refreshable_by_existing_local_validator; Run npm run check:telemetry-parity-score to refresh agent/state/telemetry-parity-score.generated.json.
- agent/state/self-healing-refresh-queue.generated.json: refreshable_by_existing_local_validator; Run npm run check:self-healing-refresh-queue to refresh agent/state/self-healing-refresh-queue.generated.json.
- agent/state/google-cost-bleed.generated.json: refreshable_by_existing_local_validator; Run npm run check:google-cost to refresh agent/state/google-cost-bleed.generated.json.

## Formal Evidence Gates

- agent/state/runtime-smoke-harness.generated.json: external proof required; source checks cannot clear this gate.
- agent/state/runtime-smoke-substitute-matrix.generated.json: external proof required; source checks cannot clear this gate.
- agent/state/runtime-smoke-evidence.generated.json: external proof required; source checks cannot clear this gate.
- agent/state/billing-spike-radar.generated.json: external proof required; source checks cannot clear this gate.
- agent/state/provider-smoke-evidence.generated.json: external proof required; source checks cannot clear this gate.
- agent/state/operator-final-qa-packet.generated.json: manual/admin truth sample required; use redacted approved evidence only.
- agent/state/admin-truth-sample-evidence.generated.json: manual/admin truth sample required; use redacted approved evidence only.
