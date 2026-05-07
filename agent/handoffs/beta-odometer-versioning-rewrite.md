# Codex Handoff

## Task
Switch KandyDrops Beta release/version logic from legacy semver-plus-diff-size bumps to counter-driven odometer versioning.

## Result
Status: completed

Summary:
- Audited the current Beta version source, generator, validators, fallback, and public JSON before editing.
- Removed the old semver/diff-size bump path and replaced it with canonical odometer math driven by `betaReleaseCounter`.
- Migrated the visible current Beta version from `1.113.4` to `1.2.1` with `betaReleaseCounter = 201`, added targeted tests, and updated release-note docs/validators.

## Files Changed
- `src/lib/release-notes/beta-odometer-version.ts`: new canonical odometer math helper
- `src/lib/release-notes/release-version-contract.ts`: removed semver bump contract and added counter-driven release-note types/context
- `src/hooks/usePublicReleaseNotes.ts`: updated runtime validation for the new release-note document shape
- `scripts/release/update-public-changelog.ts`: rewrote generator around accepted beta releases and grouped commit metadata
- `scripts/agent/validate-public-beta-changelog.ts`: replaced old semver/diff-size assertions with odometer migration checks
- `scripts/agent/validate-beta-versioning.ts`: new focused validator for odometer math and current version migration
- `scripts/agent/validate-beta-release-notes.ts`: updated visible-note validation for grouped release entries
- `scripts/agent/validate-beta-modal-layout.ts`: aligned modal z-index expectation with current overlay implementation
- `tests/unit/beta-odometer-versioning.spec.ts`: added odometer math coverage
- `tests/unit/public-beta-release-notes.spec.tsx`: updated Beta badge/drawer test expectations for the new version model
- `public/kandydrops-release-notes.json`: migrated canonical public changelog to `1.2.1` and removed the visible duplicate commit parade
- `src/lib/release-notes/public-release-notes.ts`: regenerated bundled fallback from the canonical public changelog
- `CHANGELOG.md`: regenerated human changelog with odometer versions
- `package.json`: added `release:notes:accept` and `check:beta-versioning`
- `docs/agent-truth/public-beta-release-notes.md`: updated doctrine to accepted-release odometer rules
- `README.md`: updated public Beta release-note instructions
- `AGENTS.md`: updated repo instruction text for accepted-release odometer rules
- `.github/workflows/public-release-notes.yml`: switched manual fallback to explicit accepted-release generation
- `cloudbuild.release-notes.yaml`: clarified push-lane normalization vs accepted-release publishing

## Behavior Changed
Before:
- Beta versioning used `MAJOR.MINOR.PATCH`.
- Effective diff size decided `minor` vs `patch`.
- Release-note generator treated commits as release entries.
- Current public version was `1.113.4`.
- Public JSON, fallback, and validators were coupled to commit-by-commit release behavior.

After:
- Beta versioning uses odometer format `1.<block>.<release>`.
- One accepted public beta release increments `betaReleaseCounter` by exactly 1.
- Current canonical state is `betaReleaseCounter = 201` and visible version `1.2.1`.
- Next accepted public beta release resolves to `1.2.2`.
- `npm run release:notes` now normalizes artifacts without publishing a new release by default.
- `npm run release:notes:accept` is the explicit accepted-release publish step.
- Visible Beta history is no longer a raw duplicate commit parade.

## Validation
Commands run:
- `npm run release:notes`: pass
- `npm run typecheck`: pass
- `npm run check:beta-versioning`: pass
- `npm run check:beta-release-notes`: pass
- `npm run check:release-notes`: pass
- `npx vitest run tests/unit/beta-odometer-versioning.spec.ts tests/unit/public-beta-release-notes.spec.tsx`: pass

Commands not run:
- full `npm run check`: forbidden by task
- Playwright: forbidden by task
- Cypress: forbidden by task
- Lighthouse: forbidden by task

## Browser Verification Needed
- Tap the Beta badge and confirm the drawer header shows `Current version: v1.2.1`.
- Confirm the visible note list no longer shows the old `1.113.4` current version.
- Confirm the last 5 visible entries read like grouped app updates instead of commit noise.

## Risk Notes
- `check:beta-versioning` and `check:release-notes` are partly source-string based; they verify the rule path and current migration state, but they are not a substitute for runtime review of release-note publishing operations.
- Existing historical note versions were migrated to odometer-style display order for the retained visible history instead of preserving legacy semver strings.
- Accepted-release publication now requires explicit intent (`release:notes:accept`); any external automation still assuming per-push public releases needs to follow that new rule.

## Needs Uylus / ChatGPT Review
- Confirm the product decision to keep the migrated visible history as odometer versions instead of showing legacy semver strings for older entries.
- Confirm the chosen grouped `1.2.1` visible note copy is the right public story for the recent Beta badge/changelog fixes.
- Recheck whether any external Cloud Build trigger config still assumes every push should publish a public beta release.
