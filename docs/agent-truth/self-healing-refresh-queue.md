# Self-Healing Refresh Queue

Status: source-only stale artifact refresh queue. It orders registered refresh commands and blocks formal evidence/manual/provider/runtime proof until artifacts are attached.

## Summary

- Queue entries: 54
- Automatic entries: 50
- Blocked entries: 4
- Estimated score impact: 135.66

## Queue

### 1. agent/state/score-80-path-lock.generated.json

- Owner: repo
- Stale reason: source_backed
- Refresh command: `npm run check:beta-score`
- Score impact estimate: 12
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 2. agent/state/admin-truth-sample-evidence.generated.json

- Owner: admin
- Stale reason: stale
- Refresh command: `npm run check:admin-truth-sample-evidence`
- Score impact estimate: 4
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 3. agent/state/final-launch-readiness-report.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:final-launch-readiness-report`
- Score impact estimate: 4
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 4. agent/state/launch-pr-triage.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:launch-pr-triage`
- Score impact estimate: 4
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 5. agent/state/launch-readiness-report.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:launch-readiness-final`
- Score impact estimate: 4
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 6. agent/state/provider-smoke-evidence.generated.json

- Owner: runtime
- Stale reason: stale
- Refresh command: `npm run check:provider-smoke-evidence`
- Score impact estimate: 4
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 7. agent/state/runtime-smoke-evidence.generated.json

- Owner: runtime
- Stale reason: stale
- Refresh command: `npm run check:runtime-smoke-evidence`
- Score impact estimate: 4
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 8. agent/state/admin-truth.generated.json

- Owner: admin
- Stale reason: missing
- Refresh command: `npm run check:admin-truth`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 9. agent/state/beta-freshness-language.generated.json

- Owner: beta
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-freshness-language`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 10. agent/state/current-beta-exit-status.generated.json

- Owner: beta
- Stale reason: stale_source_version
- Refresh command: `npm run check:current-beta-exit-status`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 11. agent/state/public-beta-score.generated.json

- Owner: beta
- Stale reason: stale_source_version
- Refresh command: `npm run score:beta && npm run check:beta-score`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 12. agent/state/creator-drop-status-metrics.generated.json

- Owner: creator
- Stale reason: stale_source_version
- Refresh command: `npm run check:creator-drop-status-metrics`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 13. agent/state/creator-lane-debug-parity.generated.json

- Owner: creator
- Stale reason: stale
- Refresh command: `npm run check:creator-lane-debug-parity`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 14. agent/state/creator-lane-legacy-truth-inventory.generated.json

- Owner: creator
- Stale reason: stale
- Refresh command: `npm run check:creator-lane-legacy-truth-inventory`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 15. agent/state/creator-settings-control-plane.generated.json

- Owner: creator
- Stale reason: stale_source_version
- Refresh command: `npm run check:creator-settings-control-plane`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 16. agent/state/beta-evidence-gap-map.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-evidence-gap-map`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 17. agent/state/beta-evidence-lane-prep.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:beta-evidence-lane-prep`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 18. agent/state/evidence-capture-status.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:evidence-capture-status`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 19. agent/state/operator-revenue-smoke.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:operator-revenue-smoke`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 20. agent/state/source-truth-authority-map.generated.json

- Owner: evidence
- Stale reason: stale_source_version
- Refresh command: `npm run check:source-truth-authority-map`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 21. agent/state/global-marquee-truncated-titles.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:global-marquee-truncated-titles`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 22. agent/state/mobile-ui-final-lock.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:mobile-ui-final-lock`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 23. agent/state/user-loading-wallet-mobile-refinement.generated.json

- Owner: mobile
- Stale reason: stale_source_version
- Refresh command: `npm run check:user-loading-wallet-mobile-refinement`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 24. agent/state/analytics-rewire-phase-one.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:analytics-rewire-phase-one`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 25. agent/state/cloudrun-sql-bigquery-guardrails.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:cloud-cost`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 26. agent/state/codebase-hardening.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:hardening`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 27. agent/state/content-protection.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:content-protection`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 28. agent/state/debug-evidence-pipeline.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:debug-evidence-pipeline`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 29. agent/state/device-layout-score.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:device-layout-score`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 30. agent/state/device-ui-dry-audit.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:device-ui`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 31. agent/state/existing-algorithm-refinement.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:existing-algorithm-refinement`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 32. agent/state/final-pr-stale-cleanup.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:final-pr-stale-cleanup`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 33. agent/state/google-cost-bleed.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:google-cost`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 34. agent/state/gumdrop-economy.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:gumdrop-economy`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 35. agent/state/hydration-performance.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:hydration-performance`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 36. agent/state/lost-data-recovery-dry-run.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:lost-data-recovery-dry-run`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 37. agent/state/orphaned-logic-score.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:orphaned-logic`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 38. agent/state/overnight-final-integration-lock.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:overnight-final-integration-lock`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 39. agent/state/overnight-wiring-integrity.generated.json

- Owner: repo
- Stale reason: stale_source_version
- Refresh command: `npm run check:overnight-wiring-integrity`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 40. agent/state/sitewide-image-optimization.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:sitewide-image-optimization`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 41. agent/state/speed-security-hardening.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:speed-security`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 42. agent/state/sql-mirror-status.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:generated-report-authority`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 43. agent/state/support-recovery-flows.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:support-recovery-flows`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 44. agent/state/targeted-behavior-evidence.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:targeted-behavior-evidence`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 45. agent/state/user-facing-feature-connection-audit.generated.json

- Owner: repo
- Stale reason: stale
- Refresh command: `npm run check:user-facing-feature-connection-audit`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 46. agent/state/watch-time-rollup-truth.generated.json

- Owner: repo
- Stale reason: missing
- Refresh command: `npm run check:watch-time-rollup-truth`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 47. agent/state/precatch-runtime-issues.generated.json

- Owner: runtime
- Stale reason: stale
- Refresh command: `npm run precheck:runtime-issues`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 48. agent/state/event-catalog-telemetry.generated.json

- Owner: telemetry
- Stale reason: missing
- Refresh command: `npm run check:event-catalog-telemetry`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 49. agent/state/final-telemetry-closure-lock.generated.json

- Owner: telemetry
- Stale reason: stale_source_version
- Refresh command: `npm run check:final-telemetry-closure-lock`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh generated artifact from current source and update debug/beta freshness state.

### 50. agent/state/telemetry-parity-score.generated.json

- Owner: telemetry
- Stale reason: stale
- Refresh command: `npm run check:telemetry-parity-score`
- Score impact estimate: 1
- Can run automatically: true
- Blocked reason: none
- Expected outcome: Refresh score-impact artifact and reduce freshness/regression drag if validation passes.

### 51. debug_runtime_evidence

- Owner: runtime
- Stale reason: Unknown evidence: Debug/runtime evidence
- Refresh command: `Attach deployed runtime smoke evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 16.33
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: deployed runtime smoke artifact required; source/debug evidence is partial only and cannot clear formal runtime gate.
- Expected outcome: Remain blocked until a human attaches the deployed runtime smoke artifact.

### 52. runtime_provider_smoke

- Owner: runtime
- Stale reason: Runtime unverified: Runtime/provider smoke
- Refresh command: `Attach formal provider smoke evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 16.33
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: formal provider smoke artifact required; operator-confirmed usage remains partial confidence only.
- Expected outcome: Remain blocked until a human attaches the formal provider smoke artifact.

### 53. admin_truth_sample_evidence

- Owner: admin
- Stale reason: Unknown evidence: Admin truth/sample evidence
- Refresh command: `Attach admin truth sample evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 12
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: first-party admin truth sample artifact required; source samples remain partial confidence only.
- Expected outcome: Remain blocked until a human attaches the admin truth sample artifact.

### 54. visual_manual_smoke

- Owner: manual
- Stale reason: Visual QA required: Visual/manual smoke
- Refresh command: `Attach manual screenshot evidence, then run npm run check:evidence-capture-status`
- Score impact estimate: 12
- Can run automatically: false
- Blocked reason: blocked_formal_evidence: targeted visual/manual screenshot or operator artifact required for layout-sensitive UI only.
- Expected outcome: Remain blocked until a human attaches the visual/manual smoke artifact.
