# Public Beta Release Notes

KandyDrops Beta release notes are user-facing and track accepted public beta releases, not raw commits. The Beta badge beside the top nav title opens the last 5 app-style updates. Versioning uses odometer format `1.<block>.<release>`, where `1` is the Beta V1 product era, `block` is `floor(betaReleaseCounter / 100)`, and `release` is `betaReleaseCounter % 100`. Each accepted public beta release increments one `betaReleaseCounter` by exactly 1. Changelog copy must explain what changed for users, not dump technical commit noise.

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
- Accepted beta release generator: `npm run release:notes:accept`.
- Validator: `npm run check:release-notes`.
- Each note stores `committedAtUtc` and `generatedAtUtc` as ISO UTC strings ending in `Z`.
- The drawer displays UTC timestamps such as `Updated 2026-05-05 14:23 UTC`.
- `CHANGELOG.md` keeps date headings and includes an entry-level UTC timestamp for correlation with commits, user complaints, billing spikes, and screenshots.

## Automation

- `npm run release:notes` may normalize the public changelog without creating a new accepted release.
- `npm run release:notes:accept` publishes the next accepted public beta release and increments `betaReleaseCounter` by 1.
- Cloud and GitHub release-note automation must not create a new public beta release unless acceptance is explicit.
- `.github/workflows/ci.yml` runs `npm run check:release-notes` so stale or invalid release notes fail lightweight CI.

## Copy Rules

- Normal users see app update copy, not raw internal file names.
- Security copy stays general, for example: `Improved security checks behind the scenes.`
- Internal-only work may appear as `Improved internal beta reliability.`
- Docs, tooling, audit, and release-note plumbing commits still get traceable entries, but the Beta tab must translate them into user-safe beta reliability or support-traceability copy.
- The Beta badge feature copy is reserved for commits that explicitly ship the Beta badge/release-note UI, not every release-note or changelog maintenance commit.
- Notes include 1-3 bullets and newest notes appear first.
- Multiple commits may be grouped into one accepted public beta release when they belong to the same user-facing outcome.
- Internal-only commits may collapse into `Bug fixes and quality-of-life improvements.` or `Bug fixes and performance improvements.`

## Command Budget

Run only:

```bash
npm run release:notes
npm run check:release-notes
npm run typecheck
```

Targeted component/release-note tests are allowed. Do not run Playwright, Lighthouse, Cypress, or full `npm run check` for this lane by default.
