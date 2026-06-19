# Self-Healing Refresh Queue

Status: source-only stale artifact refresh queue. It orders registered refresh commands and blocks formal evidence/manual/provider/runtime proof until artifacts are attached.

## Summary

- Queue entries: 30
- Automatic entries: 22
- Blocked entries: 8
- Estimated score impact: 98.67

## Queue

### 1. agent/state/score-80-path-lock.generated.json

- Owner: repo
- Stale reason: source_backed
- Refresh command: `npm run check:beta-score`
- Score impact estimate: 12
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

### 3. agent/state/beta-evidence-gap-map.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-evidence-gap-map`
- Score impact estimate: 1.8
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 4. agent/state/beta-evidence-lane-prep.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-evidence-lane-prep`
- Score impact estimate: 1.6
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 5. agent/state/beta-freshness-language.generated.json

- Owner: beta
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-freshness-language`
- Score impact estimate: 1.4
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 6. agent/state/final-pr-stale-cleanup.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:final-pr-stale-cleanup`
- Score impact estimate: 1.2
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 7. agent/state/admin-truth.generated.json

- Owner: admin
- Stale reason: missing
- Refresh command: `npm run check:admin-truth`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 8. agent/state/creator-drop-status-metrics.generated.json

- Owner: creator
- Stale reason: stale_source_version
- Refresh command: `npm run check:creator-drop-status-metrics`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 9. agent/state/creator-settings-control-plane.generated.json

- Owner: creator
- Stale reason: stale_source_version
- Refresh command: `npm run check:creator-settings-control-plane`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 10. agent/state/evidence-capture-status.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:evidence-capture-status`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 11. agent/state/operator-revenue-smoke.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:operator-revenue-smoke`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 12. agent/state/source-truth-authority-map.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:source-truth-authority-map`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 13. agent/state/global-marquee-truncated-titles.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:global-marquee-truncated-titles`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 14. agent/state/mobile-ui-final-lock.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:mobile-ui-final-lock`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 15. agent/state/user-loading-wallet-mobile-refinement.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:user-loading-wallet-mobile-refinement`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 16. agent/state/analytics-rewire-phase-one.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:analytics-rewire-phase-one`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 17. agent/state/content-protection.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:content-protection`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 18. agent/state/existing-algorithm-refinement.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:existing-algorithm-refinement`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 19. agent/state/overnight-wiring-integrity.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:overnight-wiring-integrity`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 20. agent/state/targeted-behavior-evidence.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:targeted-behavior-evidence`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 21. agent/state/user-facing-feature-connection-audit.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:user-facing-feature-connection-audit`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 22. agent/state/final-telemetry-closure-lock.generated.json

- Owner: telemetry
- Stale reason: stale_source_version
- Refresh command: `npm run check:final-telemetry-closure-lock`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 23. debug_runtime_evidence

- Owner: runtime
- Stale reason: Deployed runtime proof required
- Refresh command: `Attach deployed runtime smoke evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 16.33
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: deployed runtime smoke artifact required; source/debug evidence is partial only and cannot clear formal runtime gate.
- Expected outcome: Remain blocked until a human attaches the deployed runtime smoke artifact.

### 24. runtime_provider_smoke

- Owner: runtime
- Stale reason: External proof required
- Refresh command: `Attach formal provider smoke evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 16.33
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: formal provider smoke artifact required; operator-confirmed usage remains partial confidence only.
- Expected outcome: Remain blocked until a human attaches the formal provider smoke artifact.

### 25. admin_truth_sample_evidence

- Owner: admin
- Stale reason: Admin sample required
- Refresh command: `Attach admin truth sample evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 12
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: first-party admin truth sample artifact required; source samples remain partial confidence only.
- Expected outcome: Remain blocked until a human attaches the admin truth sample artifact.

### 26. visual_manual_smoke

- Owner: manual
- Stale reason: Manual UI proof required
- Refresh command: `Attach manual screenshot evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 12
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: targeted visual/manual screenshot or operator artifact required for layout-sensitive UI only.
- Expected outcome: Remain blocked until a human attaches the visual/manual smoke artifact.

### 27. agent/state/provider-smoke-evidence.generated.json

- Owner: runtime
- Stale reason: External proof required
- Refresh command: `npm run check:provider-smoke-evidence`
- Score impact estimate: 4
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: formal provider smoke artifact required; operator-confirmed usage remains partial confidence only.
- Expected outcome: Remain blocked until a human attaches the formal provider smoke artifact.

### 28. agent/state/admin-truth-sample-evidence.generated.json

- Owner: admin
- Stale reason: Admin sample required
- Refresh command: `npm run check:admin-truth-sample-evidence`
- Score impact estimate: 1
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: first-party admin truth sample artifact required; source samples remain partial confidence only.
- Expected outcome: Remain blocked until a human attaches the admin truth sample artifact.

### 29. agent/state/runtime-smoke-evidence.generated.json

- Owner: runtime
- Stale reason: Deployed runtime proof required
- Refresh command: `npm run check:runtime-smoke-evidence`
- Score impact estimate: 1
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: deployed runtime smoke artifact required; source/debug evidence is partial only and cannot clear formal runtime gate.
- Expected outcome: Remain blocked until a human attaches the deployed runtime smoke artifact.

### 30. agent/state/debug-runtime-evidence.generated.json

- Owner: runtime
- Stale reason: Deployed runtime proof required
- Refresh command: `npm run check:debug-runtime-evidence`
- Score impact estimate: 0.01
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: deployed runtime smoke artifact required; source/debug evidence is partial only and cannot clear formal runtime gate.
- Expected outcome: Remain blocked until a human attaches the deployed runtime smoke artifact.
