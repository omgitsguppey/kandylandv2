# Public Beta Release Notes

Authority: Current authority for Beta badge release-note automation and skip-loop behavior.  
Current operator doctrine: `docs/agent-truth/current-operator-doctrine.md`.

KandyDrops Beta release notes are user-facing and track accepted public beta releases, not raw commits. The Beta badge beside the top nav title opens the last 5 app-style updates. Versioning uses odometer format `1.<block>.<release>`, where `1` is the Beta V1 product era, `block` is `floor(betaReleaseCounter / 100)`, and `release` is `betaReleaseCounter % 100`. Each accepted public beta release increments one `betaReleaseCounter` by exactly 1. Changelog copy must explain what changed for users, not dump technical commit noise.

## Phase 1 Patch Acceptance

- During Phase 1 stabilization, every accepted patch batch must create or update a Beta badge-visible release note.
- The Beta badge is the operator's manual stale-version detector during Phase 1.
- Internal-only accepted patches still require a badge-visible note using safe generic copy such as `Bug fixes and general improvements.`, `Bug fixes and performance improvements.`, or `Improved internal beta reliability.`
- User-facing accepted patches require specific app-style user-facing copy that explains what changed for users.
- Multiple commits may be grouped only when they are part of the same accepted patch batch and ship together.
- Grouping must never be used to skip a Beta badge note after an accepted patch batch.
- Raw commit dumps are forbidden in the public note copy.
- Notes must be short, app-style, and understandable to users or the operator.
- Notes must not claim smoke, provider, production, screenshot, real-device, or manual QA passed unless repo evidence exists.
- The badge version counter must advance by exactly 1 per accepted patch batch.

## Migration Truth

- The legacy visible version `1.113.4` migrated to odometer baseline `betaReleaseCounter = 201`, which displays as `1.2.1`.
- The first accepted public beta release after that migration increments to `1.2.2`.
- Current canonical Beta versions may be newer than `1.2.2`, but they must never fall behind the `1.2.1` migration baseline again.
- One accepted public beta release may group multiple commits when they ship the same accepted patch batch or user-facing outcome. The tracker must not require one public release note per commit.
- The lose-our-minds overflow rule exists: once standard `1.<block>.<release>` space is exhausted, the helper moves into `1.99.99.<n>` overflow forms before any manual product-era decision.

## User Surface

- The top nav keeps the KandyDrops title text unchanged.
- A small interactive `Beta` pill sits beside the title and opens `What&apos;s new in Beta`.
- The drawer shows the current version, last 5 public notes, category chips, concise bullets, source freshness, and last updated time.
- If `/kandydrops-release-notes.json` cannot load, the drawer shows the bundled fallback and labels it as `[fallback]`.

## Source Truth

- Public JSON: `public/kandydrops-release-notes.json`.
- Bundled fallback: `src/lib/release-notes/public-release-notes.ts`.
- Contract: `src/lib/release-notes/release-version-contract.ts`.
- Odometer helper: `src/lib/release-notes/beta-odometer-version.ts`.
- Human changelog: `CHANGELOG.md`.
- Generator: `npm run release:notes`.
- Accepted beta release generator: `npm run release:notes:accept` for local same-commit artifact generation before staging.
- Validator: `npm run check:release-notes`.
- Each note stores `committedAtUtc` and `generatedAtUtc` as ISO UTC strings ending in `Z`.
- The drawer displays UTC timestamps such as `Updated 2026-05-05 14:23 UTC`.
- `CHANGELOG.md` keeps date headings and includes an entry-level UTC timestamp for correlation with commits, user complaints, billing spikes, and screenshots.

## Automation

- `npm run release:notes` may normalize the public changelog without creating a new accepted release.
- `npm run release:notes:accept` prepares the next accepted public beta patch batch locally and increments `betaReleaseCounter` by exactly 1 before the real patch is committed.
- Patch notes are same-commit artifacts. Accepted source/config/UI patches must ship their Beta badge release-note artifacts in the same commit.
- Automation validates; it does not create follow-up commits.
- Codex must run release-note generation before committing a real patch, then stage code/docs and release artifacts together.
- Separate docs(release) commits are legacy/forbidden except explicit manual recovery.
- Cloud and GitHub release-note automation must not create a new public beta release, commit generated artifacts, or push follow-up patch-note commits.
- GitHub Actions release-note workflow is workflow_dispatch-only while hosted-runner billing is locked.
- Push commits must not create skipped or pending GitHub Actions release-note checks.
- Cloud Build release-note automation must not run for commits that only touch `public/kandydrops-release-notes.json`, `src/lib/release-notes/public-release-notes.ts`, `src/lib/release-notes/release-version-contract.ts`, `docs/agent-truth/public-beta-release-notes.md`, and `CHANGELOG.md`.
- GitHub release-note automation must skip commits containing `[skip release-notes]`; this avoids failed no-op runs and release-note recursion while hosted-runner billing is unavailable.
- `[skip release-notes]` is only for explicit manual recovery or workflow/release-artifact-only commits, never for accepted source/config/UI patches.
- Release-note-only recovery commits must include `[skip release-notes]` and must not create another Beta badge commit.
- A skipped Public Beta Release Notes Cloud Build lane is not a failure when the commit only touches release-note artifacts.
- GitHub Actions hosted-runner billing lock is external infrastructure status, not app failure. Firebase App Hosting rollout status, local validators, and GitHub runner billing status are separate signals.
- `.github/workflows/ci.yml` runs `npm run check:release-notes` so stale or invalid release notes fail lightweight CI.

## Copy Rules

- Normal users see app update copy, not raw internal file names.
- Security copy stays general, for example: `Improved security checks behind the scenes.`
- Internal-only work may appear as `Improved internal beta reliability.`
- Docs, tooling, audit, and release-note plumbing commits still get traceable entries, but the Beta tab must translate them into user-safe beta reliability or support-traceability copy.
- The Beta badge feature copy is reserved for commits that explicitly ship the Beta badge/release-note UI, not every release-note or changelog maintenance commit.
- Notes include 1-3 bullets and newest notes appear first.
- Notes may group multiple commits into one accepted public beta release when they belong to the same accepted patch batch or user-facing outcome.
- Internal-only commits may collapse into `Bug fixes and quality-of-life improvements.` or `Bug fixes and performance improvements.`

## Command Budget

Run only:

```bash
npm run release:notes
npm run check:release-notes
npm run typecheck
```

Targeted component/release-note tests are allowed. Do not run Playwright, Lighthouse, Cypress, or full `npm run check` for this lane by default.
