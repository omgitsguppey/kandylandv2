# Legacy Update Tracker Cleanup

## Scope
- Legacy update-tracker, changelog, release-note, and odometer-versioning cleanup only.

## What Changed
- Removed the last diff-size-shaped parsing from `scripts/release/update-public-changelog.ts` by switching changed-file detection from `--numstat` to `--name-only`.
- Hardened `scripts/agent/validate-beta-update-tracker.ts` so it fails if the release generator keeps diff-size bump remnants or the doctrine drops the migration/overflow truth.
- Hardened `scripts/agent/validate-public-beta-changelog.ts` so it enforces grouped accepted-release wording and the migration anchor.
- Clarified the migration baseline wording in `scripts/agent/validate-beta-versioning.ts`.
- Updated `docs/agent-truth/public-beta-release-notes.md`, `README.md`, and `AGENTS.md` so the odometer migration truth is explicit and consistent.

## Current Truth
- Canonical app version: `1.2.2`
- Canonical `betaReleaseCounter`: `202`
- Legacy visible version `1.113.4` is migration history only and maps to `betaReleaseCounter = 201` / `1.2.1`
- First accepted public beta release after migration: `1.2.2`
- Public notes may group multiple commits into one accepted public beta release

## Intentionally Kept
- `migrateLegacyVersionToBetaCounter("1.113.4")` remains as passive migration evidence.
- Historical odometer entries remain in both the public JSON and bundled fallback.
- `check:release-notes` remains as a compatibility alias.

## Validation
- `npm run check:beta-update-tracker`
- `npm run check:beta-versioning`
- `npm run check:beta-release-notes`
- `npm run typecheck`
