# UI Review Process

## Purpose
Create one clean, dated visual evidence packet for each broad UI audit so the repo has:
- consistent screenshot coverage
- no duplicate viewport/full-page clutter
- a repeatable human review packet for desktop, tablet, and mobile

This process supplements `npm run check:ui:audits`; it does not replace it.

## When to run it
Run this process whenever work materially changes:
- navigation or layout chrome
- mobile or tablet page composition
- public-facing landing, drops, experiences, creator-profile, help, or legal surfaces
- major dashboard/admin UI shells
- any broad design polish pass

## Required structure
Create one dated run folder:
- `qa-screenshots/ui-review-YYYY-MM-DD/`

Inside it, keep only:
- `desktop/pages/*.png`
- `desktop/components/*.png`
- `tablet/pages/*.png`
- `tablet/components/*.png`
- `mobile/pages/*.png`
- `mobile/components/*.png`
- `capture-manifest.json`
- `README.md`
- contact-sheet HTML and PNG files

Do not add:
- duplicate full and viewport screenshots of the same surface
- temporary scripts
- Playwright reports
- test-results folders
- unlabeled miscellaneous images

## Capture rules
1. Capture each unique route once per device size.
2. Capture each unique top-level component once per device size.
3. If a page requires auth/admin context and no stable seeded review session exists:
   - do not fake it
   - list it in `capture-manifest.json` as deferred
4. If a UI action fails during capture:
   - do not fake the missing screenshot
   - record the failure in `README.md`
5. Accept or dismiss repeating overlays after their first intentional capture so they do not pollute the rest of the run.

## Device classes
- Desktop: wide production viewport
- Tablet: iPad-class viewport
- Mobile: current iPhone-class viewport

Keep these folders separate. Do not mix screenshots from different device classes.

## Review rubric
Review every run against these lenses:
- hierarchy: is one primary action obvious?
- consistency: do shell, spacing, and card patterns stay stable across routes?
- density: is too much vertical space spent before the user reaches core content?
- safe area: are important controls clear of bottom nav, consent overlays, rounded corners, and edge gestures?
- scale: are buttons, cards, and headings sized consistently?
- overlap: do persistent overlays or nav surfaces cover primary content?
- runtime truth: did any CTA, modal, or dynamic module fail during capture?

## Apple-aligned standards to apply
- clarity over ornament
- consistent grouping and spacing
- safe-area aware control placement
- touch-safe controls of at least `44x44`
- keep controls close to the content they affect
- avoid asymmetrical or shifting chrome patterns that undermine muscle memory

## Required outputs for each run
1. `capture-manifest.json`
2. `README.md` with:
   - scope
   - captured routes
   - deferred routes
   - findings
   - recommended next steps
3. contact-sheet artifacts for fast review

## Repo-level checks to run alongside this process
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `npm run check:inventory`

For broad signoff, also update:
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md` if this process changes a durable workflow rule

## Folder hygiene rule
- Keep only one canonical dated folder per review run.
- If a run fails midway, delete partial captures before rerunning.
- Do not leave screenshots loose at the root unless they are intentionally preserved historical evidence.
