# Audit Runtime Ledger

KandyDrops audit speed instrumentation is append-only. Every validator, check, or audit should be launched through:

```bash
npm run audit:run -- --audit check:wallet-density
```

The wrapper records runtime metadata in `agent/state/audit-runtime-ledger.jsonl` and refreshes `agent/state/audit-runtime-summary.generated.json`. The ledger is JSONL, not a giant JSON array, so agents can stream historical runs without loading the whole history.

## JSONL Contract

Each line is one audit run with:

```json
{
  "runId": "string",
  "auditName": "string",
  "startedAt": 0,
  "endedAt": 0,
  "durationMs": 0,
  "changedFiles": [],
  "inspectedFiles": [],
  "terminalCommands": [],
  "forbiddenCommandsAttempted": [],
  "cacheKey": "string",
  "cacheHit": false,
  "findingsCount": 0,
  "criticalCount": 0,
  "majorCount": 0,
  "accuracyStatus": "unknown",
  "resourceClass": "static_scan",
  "triggerReason": "manual"
}
```

Allowed `accuracyStatus` values are `unknown`, `confirmed`, `false_positive`, and `superseded`. Allowed `resourceClass` values are `static_scan`, `targeted_test`, `typecheck`, `heavy_browser`, and `full_suite`.

## Score Model

Audit speed score:

```text
score = clamp(0, 100,
  100
  - min(40, durationMs / 1000)
  - terminalCommandCount * 4
  - forbiddenCommandCount * 25
  - inspectedFileCountPenalty
  - falsePositivePenalty
  + cacheHitBonus
  + confirmedFindingBonus
)
```

`inspectedFileCountPenalty` is `0` for 20 or fewer files, `5` for 75 or fewer, `12` for 200 or fewer, and `25` above 200.

`cacheHitBonus` is `+10` when a cache hit avoided terminal execution and `+5` when it avoided a source scan.

Accuracy is:

```text
confirmedFindings / max(1, confirmedFindings + falsePositiveFindings)
```

Usefulness is:

```text
criticalFindingsConfirmed * 5
+ majorFindingsConfirmed * 2
+ minorFindingsConfirmed
- falsePositiveFindings * 2
- durationMs / 30000
```

## Summary

`npm run score:audit-runtime` rewrites `agent/state/audit-runtime-summary.generated.json` with:

- `slowestAudits`
- `mostUsefulAudits`
- `leastUsefulAudits`
- `mostFalsePositiveAudits`
- `terminalHeavyAudits`
- `auditScores`

These lists are for audit triage only. They do not change product behavior.

## Validator Routing

Package scripts can be wrapped by name:

```bash
npm run audit:run -- --audit check:wallet-density --trigger acceptance_smoke
```

Validators that do not yet have a package alias can be wrapped by direct path:

```bash
npm run audit:run -- --audit scripts/agent/validate-wallet-density.ts
```

No validator should write a giant report without runtime metadata. If a validator writes a generated report, the run that produced or validated it should also be represented by one JSONL ledger line.

## Forbidden Runtime

The audit runtime wrapper blocks Playwright, Lighthouse, Cypress, and full `npm run check` style commands by default. When an audit attempts one of those paths, the wrapper records `forbiddenCommandsAttempted` and does not execute the command.
