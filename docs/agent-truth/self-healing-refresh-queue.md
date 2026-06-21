# Self-Healing Refresh Queue

Status: source-only stale artifact refresh queue. It orders registered refresh commands and blocks formal evidence/manual/provider/runtime proof until artifacts are attached.

## Summary

- Queue entries: 17
- Automatic entries: 12
- Blocked entries: 5
- Estimated score impact: 43.4

## Queue

### 1. agent/state/score-80-path-lock.generated.json

- Owner: repo
- Stale reason: source_backed
- Refresh command: `npm run check:beta-score`
- Score impact estimate: 8.32
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 2. agent/state/overnight-final-integration-lock.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:overnight-final-integration-lock`
- Score impact estimate: 2
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 3. agent/state/admin-truth.generated.json

- Owner: admin
- Stale reason: missing
- Refresh command: `npm run check:admin-truth`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 4. agent/state/current-beta-exit-status.generated.json

- Owner: beta
- Stale reason: stale_source_version
- Refresh command: `npm run check:current-beta-exit-status`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 5. agent/state/beta-evidence-gap-map.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-evidence-gap-map`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 6. agent/state/beta-evidence-lane-prep.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-evidence-lane-prep`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 7. agent/state/mobile-ui-final-lock.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:mobile-ui-final-lock`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 8. agent/state/user-loading-wallet-mobile-refinement.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:user-loading-wallet-mobile-refinement`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 9. agent/state/analytics-rewire-phase-one.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:analytics-rewire-phase-one`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 10. agent/state/content-protection.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:content-protection`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 11. agent/state/targeted-behavior-evidence.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:targeted-behavior-evidence`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 12. agent/state/user-facing-feature-connection-audit.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:user-facing-feature-connection-audit`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 13. admin_truth_sample_evidence

- Owner: admin
- Stale reason: Admin source sample required
- Refresh command: `Produce redacted admin source activity sample, then run npm run check:evidence-capture-status`
- Score impact estimate: 11.32
- Can run automatically: false
- Blocked reason: blocked_source_evidence: redacted admin source activity sample required; source samples remain partial confidence only.
- Expected outcome: Remain blocked until a redacted admin source activity sample is produced.

### 14. runtime_provider_smoke

- Owner: runtime
- Stale reason: Provider-backed site activity required
- Refresh command: `Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 5.76
- Can run automatically: false
- Blocked reason: blocked_source_evidence: provider-backed site activity evidence required; operator-confirmed usage remains partial confidence only.
- Expected outcome: Remain blocked until provider-backed site activity evidence is produced.

### 15. agent/state/provider-smoke-evidence.generated.json

- Owner: runtime
- Stale reason: Provider-backed site activity required
- Refresh command: `Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 4
- Can run automatically: false
- Blocked reason: blocked_source_evidence: provider-backed site activity evidence required; operator-confirmed usage remains partial confidence only.
- Expected outcome: Remain blocked until provider-backed site activity evidence is produced.

### 16. agent/state/admin-truth-sample-evidence.generated.json

- Owner: admin
- Stale reason: Admin source sample required
- Refresh command: `Produce redacted admin source activity sample, then run npm run check:evidence-capture-status`
- Score impact estimate: 1
- Can run automatically: false
- Blocked reason: blocked_source_evidence: redacted admin source activity sample required; source samples remain partial confidence only.
- Expected outcome: Remain blocked until a redacted admin source activity sample is produced.

### 17. agent/state/runtime-smoke-evidence.generated.json

- Owner: runtime
- Stale reason: Deployed runtime route evidence required
- Refresh command: `Produce deployed runtime route evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 1
- Can run automatically: false
- Blocked reason: blocked_source_evidence: deployed runtime route evidence required; source/debug evidence is partial only.
- Expected outcome: Remain blocked until deployed runtime route evidence is produced from source activity.
