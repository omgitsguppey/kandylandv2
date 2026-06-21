# Debug Operator Cockpit

Status: admin debug information hierarchy. The cockpit summarizes what to fix next before raw report details.

- Sections: 8
- Score impact items: 0
- Stale refresh items: 6
- Critical warning items: 2
- AI critic findings: 1
- Recovery playbooks: 6

## Default Order

### 1. Score Impact Queue

- Owner: beta
- State: live
- Score impact estimate: 0
- Next action: Review typed evidence and owner-review lanes in collapsed drilldown.

### 2. Critical Runtime + Debug Warnings

- Owner: admin_debug
- State: failed
- Score impact estimate: 4
- Next action: Use the canonical beta score and cap reasons as the primary Phase 1 queue.

### 3. Stale Artifact Refresh Queue

- Owner: repo
- State: stale
- Score impact estimate: 7
- Next action: npm run check:overnight-final-integration-lock

### 4. Admin Truth Status

- Owner: admin
- State: degraded
- Score impact estimate: 4
- Next action: Attach a redacted admin source activity sample before clearing the typed admin evidence gate.

### 5. Telemetry Lane Status

- Owner: telemetry
- State: live
- Score impact estimate: 0
- Next action: Keep telemetry parity in drilldown; no fix-first action remains.

### 6. Cost Owner-Review Lanes

- Owner: cost
- State: live
- Score impact estimate: 0
- Next action: Keep exact cost checks in drilldown: npm run check:gumdrop-economy, npm run check:google-cost, npm run check:cloud-cost.

### 7. AI Critic Requested Changes

- Owner: critic
- State: live
- Score impact estimate: 0
- Next action: No source changes requested; keep typed evidence backlog visible without marking critic degraded.

### 8. Recovery Playbook CTA

- Owner: debug
- State: degraded
- Score impact estimate: 1
- Next action: npm run check:route-diagnostics-error-map
