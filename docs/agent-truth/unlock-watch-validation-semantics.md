# Unlock Watch Validation Semantics

Advanced Debug validation now keeps these dimensions separate:

- Unlock access truth: transaction vs rollup reconciliation
- Unlock funnel telemetry: server unlock event coverage
- Viewer activity truth: viewer start events vs watch/session facts
- Watch capture quality: replay recovery and closeout quality

Blocked rows keep `passAllowed=false` with exact blocker reasons.
