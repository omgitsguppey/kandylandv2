# Public Beta Release Notes

KandyDrops Beta release notes are user-facing and update after every commit. The Beta badge beside the top nav title opens the last 5 app-style updates. Versioning uses MAJOR.MINOR.PATCH starting at 1.0.0. MAJOR never auto-increments. Effective non-generated diff size above 100 additions/deletions bumps MINOR and resets PATCH. Effective diff size of 100 or below bumps PATCH. Changelog copy must explain what changed for users, not dump technical commit noise.

## User Surface

- The top nav keeps the KandyDrops title text unchanged.
- A small interactive `Beta` pill sits beside the title and opens `What&apos;s new in Beta`.
- The drawer shows the current version, last 5 public notes, category chips, concise bullets, source freshness, and last updated time.
- If `/kandydrops-release-notes.json` cannot load, the drawer shows the bundled fallback and labels it as `[fallback]`.

## Source Truth

- Public JSON: `public/kandydrops-release-notes.json`.
- Bundled fallback: `src/lib/release-notes/public-release-notes.ts`.
- Contract: `src/lib/release-notes/release-version-contract.ts`.
- Human changelog: `CHANGELOG.md`.
- Generator: `npm run release:notes`.
- Validator: `npm run check:release-notes`.
- Each note stores `committedAtUtc` and `generatedAtUtc` as ISO UTC strings ending in `Z`.
- The drawer displays UTC timestamps such as `Updated 2026-05-05 14:23 UTC`.
- `CHANGELOG.md` keeps date headings and includes an entry-level UTC timestamp for correlation with commits, user complaints, billing spikes, and screenshots.

## Automation

- `.github/workflows/public-release-notes.yml` runs after pushes to `main` unless the commit includes `[skip release-notes]`.
- Generated release note commits use `chore(release): update public changelog [skip release-notes]` to prevent infinite loops.
- `.github/workflows/ci.yml` runs `npm run check:release-notes` so stale or invalid release notes fail lightweight CI.

## Copy Rules

- Normal users see app update copy, not raw internal file names.
- Security copy stays general, for example: `Improved security checks behind the scenes.`
- Internal-only work may appear as `Improved internal beta reliability.`
- Notes include 1-3 bullets and newest notes appear first.

## Command Budget

Run only:

```bash
npm run release:notes
npm run check:release-notes
npm run typecheck
```

Targeted component/release-note tests are allowed. Do not run Playwright, Lighthouse, Cypress, or full `npm run check` for this lane by default.
