# Audit Cache

KandyDrops uses a lightweight local cache for deterministic agent audits. It does not adopt Turborepo and does not use external paid services.

## Research Model

Turborepo caches deterministic tasks from task inputs, outputs, and logs. Its cache hits when the task input fingerprint matches a prior run. ESLint cache focuses on changed files and can use content-based change detection. TypeScript incremental stores project graph metadata in `.tsbuildinfo` so later typechecks can reuse prior graph work.

KandyDrops applies the same concepts locally for audit validators:

- Hash only relevant audit inputs.
- Store local cache records in `agent/cache/audit-cache-index.json`.
- Exclude volatile audit outputs such as the runtime ledger, runtime summary, and cache index from cache input hashes.
- Replay the prior deterministic result instead of spawning a terminal command when inputs and accuracy are still acceptable.
- Keep broad/full-suite commands blocked by the affected audit router.

## Cache Key

The cache key is:

```text
sha256(
  auditName +
  auditVersion +
  sortedRelevantFilePaths +
  contentHashes +
  relevantPackageJsonScripts +
  validatorFileHash +
  configFileHashes
)
```

The default audit version is `audit-cache-v1`.

## Cache Record

Each cache record includes:

```json
{
  "cacheKey": "string",
  "auditName": "string",
  "auditVersion": "string",
  "createdAt": 0,
  "durationMs": 0,
  "resultStatus": "pass",
  "findingsHash": "string",
  "relevantFiles": [],
  "validatorFiles": [],
  "commandsAvoided": [],
  "accuracyScoreAtCreation": 1
}
```

The local index may store additional hashes and hit counters so validators can prove why a record is valid.

## Validity

A cache record is valid only when:

- Relevant file hashes are unchanged.
- Validator file hashes are unchanged.
- Config file hashes are unchanged.
- Cache age is within the max age for the audit class.
- Last known accuracy is at least the configured threshold.
- Previous false positive rate is not above 20%.

If only unrelated files changed, the relevant fingerprint stays the same and `audit:run` skips the terminal run.

If the validator changed, the validator hash changes and the audit reruns.

## Max Age

- Docs/audit doctrine: 72h.
- UI component validators: 24h.
- Payment/auth/security/unlock/rules validators: 6h.
- Generated report validators: 24h.
- Audit runtime summary/cache validators: 1h.

## Commands

```bash
npm run audit:cache-status
npm run audit:cache-status -- --audit check:audit-cache --relevant src/lib/agent-audit/audit-cache.ts --validator scripts/agent/validate-audit-cache.ts
npm run check:audit-cache
```

`audit:run` is the execution integration point. It checks the affected audit plan first, then evaluates the audit cache. On a valid cache hit, it records a ledger entry with `cacheHit=true`, updates `commandsAvoided`, and does not spawn the validator terminal command.
