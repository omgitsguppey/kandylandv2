# Debug Operator Cockpit

Status: admin debug information hierarchy. The cockpit summarizes what to fix next before raw report details.

- Sections: 8
- Score impact items: 8
- Stale refresh items: 8
- Critical warning items: 8
- AI critic findings: 1
- Recovery playbooks: 6

## Default Order

### 1. Score Impact Queue

- Owner: runtime
- State: degraded
- Score impact estimate: 80.66
- Next action: Attach deployed runtime smoke evidence, then run npm run check:evidence-capture-status

### 2. Critical Runtime + Debug Warnings

- Owner: admin_debug
- State: failed
- Score impact estimate: 16
- Next action: Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate.

### 3. Stale Artifact Refresh Queue

- Owner: repo
- State: stale
- Score impact estimate: 37
- Next action: npm run check:beta-score

### 4. Admin Truth Status

- Owner: admin
- State: unknown
- Score impact estimate: 4
- Next action: Attach a redacted first-party admin truth sample, then run npm run check:beta-score.

### 5. Telemetry Lane Status

- Owner: telemetry
- State: unknown
- Score impact estimate: 3
- Next action: Run npm run check:telemetry-dependency-graph.

### 6. Cost Owner-Review Lanes

- Owner: cost
- State: degraded
- Score impact estimate: 1
- Next action: Run npm run check:global-cost.

### 7. AI Critic Requested Changes

- Owner: critic
- State: degraded
- Score impact estimate: 1
- Next action: Open stale backlog items are classified as refresh, formal evidence, or operator confirmation work; they must stay visible but do not imply a source code request-change.

### 8. Recovery Playbook CTA

- Owner: debug
- State: degraded
- Score impact estimate: 1
- Next action: npm run score:beta
