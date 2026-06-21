# Manual Qa Readiness Gate

Artifact: `agent/state/manual-qa-readiness-gate.generated.json`
Validator: `npm run check:manual-qa-readiness-gate`

## Summary

- Generated: `2026-06-21T04:12:43.360Z`
- Current head: `456b9eb57f7ca4ebbb33d7baaa1b23fd24dd4b34`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, payment runtime, or GumDrop math changes. Provider-backed site activity, deployed route evidence, and redacted admin source samples remain unproven unless explicitly attached as typed evidence artifacts.

## Report

```json
{
  "reportKey": "manual-qa-readiness-gate",
  "generatedAtUtc": "2026-06-21T04:12:43.360Z",
  "currentHead": "456b9eb57f7ca4ebbb33d7baaa1b23fd24dd4b34",
  "manualQaRecommended": false,
  "betaExitReady": false,
  "prerequisites": [
    {
      "id": "latest-main-head-reconciled",
      "status": "passed",
      "severity": "release_critical",
      "exactNextAction": "Keep score and release artifacts current or same-commit snapshots."
    },
    {
      "id": "open-prs-classified",
      "status": "passed",
      "severity": "release_critical",
      "exactNextAction": "Classify every open PR."
    },
    {
      "id": "security-prs-handled-or-blocked",
      "status": "blocked",
      "severity": "release_critical",
      "exactNextAction": "Review and cherry-pick or explicitly defer security PRs #304 and #293 before manual QA starts."
    },
    {
      "id": "half-implementation-zero-release-critical",
      "status": "passed",
      "severity": "release_critical",
      "exactNextAction": "Fix release-critical half-implementation findings."
    },
    {
      "id": "wiring-release-critical-zero",
      "status": "passed",
      "severity": "release_critical",
      "exactNextAction": "Repair missing release-critical source wiring."
    },
    {
      "id": "formal-items-operator-only",
      "status": "operator_only",
      "severity": "manual_required",
      "exactNextAction": "Provider-backed site activity, deployed route evidence, redacted admin source samples, and external billing review remain owner-scoped and cannot be cleared by unrelated source checks."
    }
  ],
  "releaseCriticalGaps": [
    "security-prs-handled-or-blocked"
  ],
  "validationFailures": []
}
```

## Validation

- Pass.
