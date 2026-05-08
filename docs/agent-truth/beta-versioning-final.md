# Beta versioning final

Final Beta versioning lane keeps release history automatic and user-facing notes compact.

## Rules

- Release updates are processed from commits automatically by `npm run release:notes`.
- Main-branch workflow runs release-note normalization and commits generated artifacts with `[skip release-notes]`.
- Public feed retains the last 25 visible updates and renders 5 at a time.
- The Beta drawer must show the last 25 updates with compact pagination (5 at a time).
- User-facing notes avoid technical dropdowns, raw file lists, and audit noise.
- Internal metadata remains in release JSON fields for accountability.

## Commands

- `npm run release:notes`
- `npm run check:beta-versioning-final`
