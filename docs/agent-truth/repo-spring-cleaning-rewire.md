# Repo Spring Cleaning Rewire

Authority: Current authority for cleanup inventory classification. Current operator doctrine: `docs/agent-truth/current-operator-doctrine.md`.

This lane inventories stale, duplicate, conflicting, legacy, fake-authority, disconnected, and cleanup-needed repo areas without deleting, moving, or refactoring runtime code.

## Scope

- Report: `agent/state/repo-spring-cleaning-rewire.generated.json`
- Validator: `npm run check:repo-spring-cleaning-rewire`
- Selected issue fingerprint: `repo-spring-cleaning-rewire-inventory`
- Runtime edits: forbidden for this lane
- Production/provider reads: forbidden for this lane

## Doctrine

Generated reports are snapshots. They may support score, Admin Debug, launch readiness, and cleanup decisions, but they do not override runtime code or explicit source-of-truth contracts. A report older than 24 hours is stale unless its own contract says otherwise.

Old generated reports are not authority unless they are consumed by the current score, Debug, or readiness path and are fresh for that lane. Stale archive candidates should not be surfaced as live. Cleanup should demote first and delete later only with human approval and static usage evidence.

This inventory must not claim a file is unused from its filename alone. Cleanup candidates require static evidence from imports, package script ownership, docs references, generated report ownership, validator ownership, or UI/API consumers.

Phase 1 blocker fixes remain separate from this spring-cleaning lane. The report may identify blocker-adjacent risks, but it must not rewire score logic, creator dashboard runtime, watch-time runtime, Admin UI, payment/wallet, chat, AI cover, Firebase rules, Cloud Functions, BigQuery jobs, or deployment config.

## Report Schema

- `generatedReportInventory`: every direct `agent/state/*.generated.json` file with generated time, source commit/head markers, freshness, owner script/doc, score/Admin Debug/launch-readiness consumers, action, and static usage evidence.
- `doctrineConflicts`: docs that describe the same lane, claim competing authority, use launchable language while evidence is missing, or blur generated report snapshot authority.
- `validatorConflicts`: validators that are string-heavy, overlap newer validators, rely on stale generated reports, can pass while UI/runtime is disconnected, or lack package script ownership.
- `legacyLaneCandidates`: legacy lanes that remain active enough to need a planned cleanup path.
- `fakeAuthorityRisks`: places where data can look canonical/live/healthy while evidence is missing, stale, diagnostic, operator-reported, or only object-present.
- `disconnectedUiSurfaces`: UI surfaces with expected source, actual source, metadata state, stale/unavailable handling, broken/self-loop link evidence, and recommended action.
- `cleanupCandidates`: inventory-only archive, merge, validator replacement, stale doc, legacy lane, duplicate report, current authority, or human-review candidates.

## Severity Rules

- `P0`: UI can show live/healthy/zero without source samples; score/readiness can show ready while evidence is missing; creator users can hit unusable dashboard loops; watch time can display diagnostic or legacy data as canonical.
- `P1`: score ignores formal evidence artifacts; stale generated reports can mislead readiness; validators pass while UI is broken; docs conflict with current code; generated reports have no owner while score/debug/readiness consume them.
- `P2`: clutter, duplicated docs, duplicate validators, archive candidates, and cleanup grouping work.
- `P3`: naming and organization cleanup, old reports that appear unconsumed, and lanes kept as current authority.

## Historical Required Lanes

The original inventory identified several Phase 1 blocker-adjacent lanes. Some have since been fixed by focused patches:

- Public beta score evidence ingestion now reads formal artifacts directly.
- Creator dashboard settings now expose `statsEvidence` and must not mark stats live from object presence.
- Watch-time tests now lock canonical watch time to valid watch-session rollups.
- Admin Debug now separates canonical public beta score from report aggregates.

The remaining spring-cleaning role is inventory and demotion: keep stale reports, duplicate docs, legacy validators, and disconnected surfaces classified until a focused fix removes, merges, or archives them with static evidence.

## Validation

Run:

```bash
npm run check:repo-spring-cleaning-rewire
```

Signoff for this patch also uses:

```bash
npm run check:phase-one-score-ui-triage
npm run check:beta-score
npm run check:release-notes
npm run typecheck
```
