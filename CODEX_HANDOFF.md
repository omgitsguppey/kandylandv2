# Codex Handoff

## Task
Clean up legacy update-tracker/versioning logic.

## Result
Status: completed

## Legacy Findings
- File: `scripts/release/update-public-changelog.ts`
  Finding: The release generator still parsed `--numstat` additions/deletions even though odometer releases no longer use diff size for versioning or note generation.
  Classification: active legacy
  Action taken: rewritten
  Reason: Diff-size parsing looked like a competing bump path and was not needed for grouped accepted Beta releases.
- File: `src/lib/release-notes/beta-odometer-version.ts`
  Finding: `migrateLegacyVersionToBetaCounter("1.113.4")` remains as a one-time migration bridge.
  Classification: passive legacy
  Action taken: kept unchanged
  Reason: It does not drive current version bumps and still provides deterministic local migration proof.
- File: `src/lib/release-notes/release-version-contract.ts`
  Finding: The contract still accepts legacy version strings through the migration helper.
  Classification: passive legacy
  Action taken: kept unchanged
  Reason: This is compatibility normalization, not active semver or diff-size behavior.
- File: `scripts/agent/validate-beta-update-tracker.ts`
  Finding: The validator did not explicitly fail on leftover diff-size parsing or missing migration/overflow doctrine text.
  Classification: safe to rewrite
  Action taken: rewritten
  Reason: The tracker now fails loudly if the generator keeps diff-size bump remnants or the doctrine drops the migration anchor.
- File: `scripts/agent/validate-public-beta-changelog.ts`
  Finding: The compatibility validator still centered old changelog wording and did not enforce the grouped-release and migration doctrine details strongly enough.
  Classification: safe to rewrite
  Action taken: rewritten
  Reason: The validator now enforces accepted-release wording, grouped-commit wording, migration anchors, and removal of diff-size bump remnants.
- File: `scripts/agent/validate-beta-versioning.ts`
  Finding: The migration-baseline assertion wording still read like generic next-version logic.
  Classification: safe to rewrite
  Action taken: rewritten
  Reason: The wording now labels `1.2.2` as the first accepted release after the `1.2.1` migration baseline.
- File: `docs/agent-truth/public-beta-release-notes.md`
  Finding: Doctrine explained odometer versioning but did not yet spell out the `1.113.4 -> 1.2.1` migration anchor, `betaReleaseCounter = 201`, or the overflow rule in one place.
  Classification: safe to rewrite
  Action taken: rewritten
  Reason: The doctrine now states the migration baseline, grouped-release rule, and lose-our-minds overflow rule explicitly.
- File: `README.md`
  Finding: README gave the high-level odometer rule but omitted the migration anchor and grouped-release behavior.
  Classification: safe to rewrite
  Action taken: rewritten
  Reason: Repo gateway docs should not lag the canonical release-note doctrine.
- File: `AGENTS.md`
  Finding: Agent instructions described odometer versioning but omitted the migration anchor and grouped-release clarification.
  Classification: safe to rewrite
  Action taken: rewritten
  Reason: Repo instructions should match the current release-note doctrine.
- File: `public/kandydrops-release-notes.json`
  Finding: Historical entries still include older odometer versions such as `1.1.99`.
  Classification: passive legacy
  Action taken: kept unchanged
  Reason: These are valid historical accepted Beta releases, not legacy semver current-version truth.
- File: `src/lib/release-notes/public-release-notes.ts`
  Finding: Bundled fallback mirrors the current accepted public release notes and still contains historical prior odometer entries.
  Classification: passive legacy
  Action taken: kept unchanged
  Reason: Historical odometer entries are expected and do not conflict with current truth.

## Removed or Rewritten Legacy Logic
- file: `scripts/release/update-public-changelog.ts`
  old behavior: parsed `--numstat` additions/deletions even though diff size no longer affects versioning
  new behavior: reads changed file paths with `--name-only` only
- file: `scripts/agent/validate-beta-update-tracker.ts`
  old behavior: validated commit coverage/version agreement but did not explicitly reject diff-size-shaped release generator remnants
  new behavior: rejects `--numstat`, additions/deletions bump remnants, and missing migration/overflow doctrine strings
- file: `scripts/agent/validate-public-beta-changelog.ts`
  old behavior: checked odometer basics without strongly enforcing grouped-release and migration-anchor wording
  new behavior: enforces accepted-release wording, grouped-commit wording, migration-anchor wording, and removal of diff-size remnants
- file: `docs/agent-truth/public-beta-release-notes.md`
  old behavior: described odometer releases generally
  new behavior: explicitly documents `1.113.4 -> 1.2.1`, `betaReleaseCounter = 201`, first post-migration `1.2.2`, and the lose-our-minds overflow rule
- file: `README.md`
  old behavior: high-level odometer note only
  new behavior: includes migration anchor and grouped accepted-release clarification
- file: `AGENTS.md`
  old behavior: high-level odometer note only
  new behavior: includes migration anchor and grouped accepted-release clarification

## Current Version Truth
- canonical app version: `1.2.2`
- betaReleaseCounter: `202`
- public JSON version: `1.2.2`
- bundled fallback version: `1.2.2`
- Beta modal version: `1.2.2`
- service worker version source: `PUBLIC_APP_VERSION` from `src/lib/release-notes/public-release-notes.ts`

## Validators Updated
- validator: `scripts/agent/validate-beta-update-tracker.ts`
  what it now proves: local git coverage, JSON/fallback/version-context agreement, no legacy diff-size bump remnants in the generator, migration/overflow doctrine presence, and service-worker version-source consistency
- validator: `scripts/agent/validate-public-beta-changelog.ts`
  what it now proves: canonical current version agreement, grouped-release doctrine wording, migration-anchor wording, and absence of known diff-size release-generator remnants
- validator: `scripts/agent/validate-beta-versioning.ts`
  what it now proves: odometer math still maps the legacy migration baseline `1.113.4 -> 201 -> 1.2.1` and the first accepted post-migration release remains `1.2.2`

## Files Deleted
- none

## Files Left Unchanged
Important legacy-looking files intentionally kept:
- file: `src/lib/release-notes/beta-odometer-version.ts`
  reason: the migration helper is passive compatibility evidence and not an active second versioning system
- file: `src/lib/release-notes/release-version-contract.ts`
  reason: legacy normalization remains deterministic and does not perform semver or diff-size bumps
- file: `public/kandydrops-release-notes.json`
  reason: older odometer entries are valid history and not falsely presented as current semver truth
- file: `src/lib/release-notes/public-release-notes.ts`
  reason: bundled fallback mirrors the same historical accepted Beta entries as the public JSON

## Validation
Commands run:
- `npm run check:beta-update-tracker`: pass
- `npm run check:beta-versioning`: pass
- `npm run check:beta-release-notes`: pass
- `npm run typecheck`: pass

Commands not run:
- `npm run check`: forbidden by task
- Playwright/Cypress/Lighthouse: forbidden by task
- deploy commands: forbidden by task

## Risk Notes
- any compatibility alias kept:
  - `check:release-notes` remains as a compatibility alias to `scripts/agent/validate-public-beta-changelog.ts`
- any uncertain old script/doc:
  - none
- anything requiring Uylus/ChatGPT review:
  - none for this mechanical cleanup lane

## Final git status
```text
 M AGENTS.md
 M CODEX_HANDOFF.md
 M README.md
 M docs/agent-truth/public-beta-release-notes.md
 M scripts/agent/validate-beta-update-tracker.ts
 M scripts/agent/validate-beta-versioning.ts
 M scripts/agent/validate-public-beta-changelog.ts
 M scripts/release/update-public-changelog.ts
```
