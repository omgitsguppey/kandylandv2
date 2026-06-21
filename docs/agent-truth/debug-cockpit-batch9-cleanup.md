# Debug Cockpit Batch9 Cleanup

Generated source-only Batch 9 evidence. No production reads, deploys, provider calls, payment runtime changes, or GumDrop math changes were performed.

```json
{
  "generatedAtUtc": "2026-06-21T19:40:30.262Z",
  "reportKey": "debug-cockpit-batch9-cleanup",
  "publicBetaScoreHeadBefore": "a54fc24ccc1ad7b3d23c7aa2a6b3c5bb354fde76",
  "publicBetaScoreHeadAfter": "cbf48ed3419f240b49c9a2a17772476af2efd36c",
  "repoHead": "187d6964a50ddf5a4077b19e88471c7e23414b75",
  "selfHealingAgeBefore": 406694.6,
  "selfHealingAgeAfter": 6.32,
  "speedSecurityAgeBefore": 144.5,
  "speedSecurityAgeAfter": 54.68,
  "adminBalanceBodyCapBefore": "missing_direct_request_json",
  "adminBalanceBodyCapAfter": "bounded_parser_cap_8192",
  "boundedParserUsed": "readBoundedJsonBody",
  "maxBytes": 8192,
  "directRequestJsonRemaining": false,
  "gumdropMathChanged": false,
  "authGuardChanged": false,
  "refreshedArtifacts": [
    "agent/state/public-beta-score.generated.json",
    "agent/state/self-healing-refresh-queue.generated.json",
    "agent/state/speed-security-hardening.generated.json",
    "agent/state/admin-balance-body-cap.generated.json"
  ],
  "remainingStaleArtifacts": [
    "agent/state/public-beta-score.generated.json"
  ],
  "scoreBefore": 79,
  "scoreAfter": 79,
  "scoreDimensions": {
    "sourceHealth": 97.2,
    "runtimeHealth": 91.11,
    "evidenceCompleteness": 95.2,
    "freshness": 91.88,
    "costRisk": 42,
    "regressionRisk": 94,
    "overallHealthScore": 89.31
  },
  "remainingGaps": [
    "Provider-backed site activity, deployed route evidence, and admin source activity sample gates remain separate from this source security fix.",
    "Some generated artifacts still require refresh or same-commit head explanation."
  ],
  "nextExactSteps": [
    "Produce provider-backed site activity, deployed route evidence, and admin source activity sample evidence outside source-code cleanup when available.",
    "Rerun beta score after this commit lands if a same-commit generated artifact head needs post-commit refresh."
  ],
  "validationFailures": [
    "public beta score head mismatch remains without explanation."
  ]
}
```
