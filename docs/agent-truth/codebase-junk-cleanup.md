# Codebase junk cleanup

This lane classifies suspicious files as `canonical`, `supporting`, `generated_snapshot`, `legacy_fallback`, `deprecated`, `blocked`, `orphan_candidate`, or `safe_to_remove`.

## Classification rules

- Runtime and rules files are canonical unless explicitly legacy.
- `agent/state/*.generated.json` is evidence-only snapshot state.
- Agent scripts not referenced in `package.json` are `orphan_candidate`.
- Legacy/deprecated/blocked naming is honored and reported.
- Files are removed only after import/script/docs/dependency checks.

## Commands

- `npm run scan:codebase-junk`
- `npm run check:codebase-junk-cleanup`
