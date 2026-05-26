# Manual Qa Readiness Gate

Artifact: `agent/state/manual-qa-readiness-gate.generated.json`
Validator: `npm run check:manual-qa-readiness-gate`

## Summary

- Generated: `2026-05-26T23:03:33.780Z`
- Current head: `ab170d4c0157ad2529b1e5c606d5ca65db1b3346`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, manual visual QA, payment runtime, or GumDrop math changes. Formal provider/runtime/admin/manual gates remain unproven unless explicitly attached as formal artifacts.

## Report

```json
{
  "reportKey": "manual-qa-readiness-gate",
  "generatedAtUtc": "2026-05-26T23:03:33.780Z",
  "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
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
      "exactNextAction": "Formal provider/runtime/admin/manual evidence remains operator-owned and cannot be cleared by Codex."
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
