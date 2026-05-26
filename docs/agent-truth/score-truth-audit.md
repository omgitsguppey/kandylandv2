# Score Truth Audit

Artifact: `agent/state/score-truth-audit.generated.json`
Validator: `npm run check:score-truth-audit`

## Summary

- Generated: `2026-05-26T22:55:39.722Z`
- Current head: `ab170d4c0157ad2529b1e5c606d5ca65db1b3346`
- Validation status: `pass`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, manual visual QA, payment runtime, or GumDrop math changes. Formal provider/runtime/admin/manual gates remain unproven unless explicitly attached as formal artifacts.

## Report

```json
{
  "reportKey": "score-truth-audit",
  "generatedAtUtc": "2026-05-26T22:55:39.722Z",
  "currentHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
  "publicBetaScoreHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
  "currentBetaExitStatusHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
  "finalReleasePacketHead": "c00b6d90c112eb289ec1b354f92fdbbc9a793ab9",
  "artifactHeadStatuses": [
    {
      "artifactPath": "agent/state/public-beta-score.generated.json",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "status": "current_head",
      "needsRefresh": false,
      "reason": "agent/state/public-beta-score.generated.json was generated for the current code version."
    },
    {
      "artifactPath": "agent/state/current-beta-exit-status.generated.json",
      "artifactHead": "ab170d4c0157ad2529b1e5c606d5ca65db1b3346",
      "status": "current_head",
      "needsRefresh": false,
      "reason": "agent/state/current-beta-exit-status.generated.json was generated for the current code version."
    },
    {
      "artifactPath": "agent/state/final-release-exit-readiness-packet.generated.json",
      "artifactHead": "c00b6d90c112eb289ec1b354f92fdbbc9a793ab9",
      "status": "same_commit_snapshot",
      "needsRefresh": false,
      "reason": "agent/state/final-release-exit-readiness-packet.generated.json is a same commit generated artifact snapshot."
    }
  ],
  "scoreDimensions": {
    "sourceHealth": 100,
    "runtimeHealth": 84.2,
    "evidenceCompleteness": 84.6,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 86,
    "overallHealthScore": 85.34
  },
  "weightedFormulaScore": 85.34,
  "reportedOverallScore": 85.34,
  "formulaMatches": true,
  "staleScoreArtifactSilentlyUsed": false,
  "sourceOnlyClearsFormalProof": false,
  "futureQuietEventPenaltyDetected": false,
  "hardcodedZeroGapDetected": false,
  "costRiskHonestlyClassified": true,
  "betaExitReady": false,
  "formalBlockersRemain": true,
  "validationFailures": []
}
```

## Validation

- Pass.
