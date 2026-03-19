# Repo State Scorecard

Date: 2026-03-19
Workspace: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`
Assessment type: checklist-driven post-fix scorecard

## Overall

Current estimated completion: `99%`

Why it is not `100%` yet:
- root and `functions` still inherit `9 low` `npm audit` findings each from upstream Google/Firebase dependency chains
- the cycle checker intentionally ignores `4` known non-runtime imports from CSS and generated Data Connect peer references
- [EVERY_FILE_FUNCTION_CHECKLIST.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/EVERY_FILE_FUNCTION_CHECKLIST.md) is now exhaustive and scored, but the confidence values are still derived from the current validated sweep rather than a fresh hand-written note for every single function

## Current Inventory

Tracked files: `410`

Files currently in checklist scope: `413`
- includes every tracked file
- plus [EVERY_FILE_FUNCTION_CHECKLIST.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/EVERY_FILE_FUNCTION_CHECKLIST.md) itself
- plus the new [REPO_STATE_SCORECARD_2026-03-19.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/REPO_STATE_SCORECARD_2026-03-19.md) and [scripts/check-cycles.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/check-cycles.ts)

Detected function-like implementations indexed in the checklist: `3161`

## Validation Status

Passing:
- `npm run check`
- `npm run build`
- `npm run check:consistency`
- `npm --prefix functions run check`

Additional current signals:
- telemetry audit passes with `0` uncovered catalog events
- analytics semantic contract passes
- Firebase runtime check now resolves `authDomain` to `www.kandydrops.com`
- no circular dependencies are reported in app or functions

## Improvements Completed In This Pass

1. Standardized site-origin handling so Firebase runtime and trusted-host logic share the same canonical source in [src/lib/site-origin.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/site-origin.ts) and [src/lib/firebase-runtime.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/src/lib/firebase-runtime.ts).
2. Fixed local/runtime auth-domain drift so the runtime audit now reports the production custom domain instead of the legacy hosted domain by default.
3. Aligned the Firebase messaging service worker CDN runtime with the installed app SDK version in [public/firebase-messaging-sw.js](/Users/uylus/OneDrive/Documents/KandyDrops_Final/public/firebase-messaging-sw.js).
4. Generated the exhaustive file/function checklist in [EVERY_FILE_FUNCTION_CHECKLIST.md](/Users/uylus/OneDrive/Documents/KandyDrops_Final/EVERY_FILE_FUNCTION_CHECKLIST.md).
5. Removed stale generated screenshot/log output directories that were outside the tracked source tree.
6. Replaced the raw `madge` CLI cycle check with the typed wrapper in [scripts/check-cycles.ts](/Users/uylus/OneDrive/Documents/KandyDrops_Final/scripts/check-cycles.ts), so the cycle gate now reports only real dependency problems instead of generic warning noise.

## Area Read

### App / API / Client Runtime
- Estimated completion: `99%`
- State: healthy, validated, and internally consistent after the site-origin/runtime cleanup

### Analytics / Telemetry / Diagnostics
- Estimated completion: `99%`
- State: strong overall; request-path, functions materializers, export layer, admin dashboards, and telemetry audits are all aligned

### Firebase Runtime / Auth / Domain Handling
- Estimated completion: `99%`
- State: dual-domain support remains intact, and the runtime now consistently prefers the custom domain where appropriate

### Cloud Functions
- Estimated completion: `98%`
- State: structurally healthy and validated; the only meaningful remaining drag is upstream dependency audit noise

### Tooling / Audit Infrastructure
- Estimated completion: `99%`
- State: consistency, telemetry, semantic, dependency, and cycle checks are all in place and passing

## Honest Remaining Gaps

1. The remaining `npm audit` issues are upstream low-severity advisories, not clear repo-side code defects.
2. The cycle check is now accurate, but it still depends on an explicit allowlist for known non-runtime imports.
3. The new checklist is exhaustive and scored, but those confidence values are still automation-assisted. A truly bespoke function-by-function written review would be an editorial pass, not another code fix.

## Bottom Line

The repo is now in the "final polish and maintenance" phase rather than the "structural hardening" phase.

The honest current state is `99%` complete from the codebase side. The remaining gap to `100%` is mostly:
- upstream package-chain advisories
- tool-noise reduction
- manual checklist scoring depth, not broken runtime behavior
