# Debug Operator Cockpit

Status: admin debug information hierarchy. The cockpit summarizes what to fix next before raw report details.

- Sections: 8
- Score impact items: 0
- Stale refresh items: 8
- Critical warning items: 0
- AI critic findings: 1
- Recovery playbooks: 6

## Default Order

### 1. Score Impact Queue

- Owner: beta
- State: live
- Score impact estimate: 0
- Next action: Review formal evidence and external owner-review lanes in collapsed drilldown.

### 2. Critical Runtime + Debug Warnings

- Owner: runtime
- State: live
- Score impact estimate: 0
- Next action: Keep formal runtime/provider smoke in formal evidence drilldown.

### 3. Stale Artifact Refresh Queue

- Owner: repo
- State: stale
- Score impact estimate: 17
- Next action: npm run check:launch-pr-triage

### 4. Admin Truth Status

- Owner: admin
- State: degraded
- Score impact estimate: 4
- Next action: Attach a redacted first-party admin truth sample only when clearing the formal admin truth gate.

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
- Next action: No source changes requested; keep formal backlog visible without marking critic degraded.

### 8. Recovery Playbook CTA

- Owner: debug
- State: live
- Score impact estimate: 0
- Next action: Formal evidence and stale artifact playbooks are collapsed until a matching active issue exists.
