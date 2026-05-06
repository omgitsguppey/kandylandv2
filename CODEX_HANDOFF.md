# Codex Handoff

## Task
Fix the Beta changelog modal z-index so it renders above the rest of the app.

## Scope
Allowed files touched:
- src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx
- CODEX_HANDOFF.md

Files intentionally not touched:
- release note content generation
- validators
- navbar layout/copy
- admin/debug/analytics/economy surfaces

## Result
Status:
- completed

Summary:
- Moved the Beta changelog modal into a `document.body` portal so it no longer inherits the navbar stacking context.
- Raised the modal overlay layer from `z-[200]` to `z-[300]` for clearer overlay priority.
- Kept the existing body/document scroll lock behavior unchanged.

## Commit
Branch:
- main

Commit SHA:
- Not committed yet

Commit message:
- Not committed because: commit/push will be done after this handoff update.

## Files Changed
- src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx: render the drawer with `createPortal`, add client-ready guard, and raise overlay z-index
- CODEX_HANDOFF.md: recorded this task handoff

## Behavior Changed
Before:
- The Beta changelog drawer rendered inside the navbar subtree.
- Even with a high local z-index, it could still sit below other app layers because of the navbar stacking context.

After:
- The Beta changelog drawer renders at `document.body` via portal.
- The overlay now sits in a top-level stacking context with `z-[300]`, so it should appear above the rest of the app UI.

## Validation
Commands run:
- npm run typecheck: pass

Important output:
- `tsc --noEmit --pretty`: pass

Commands not run:
- browser automation: not run for this narrow fix
- full npm run check: unnecessary for this overlay-layer patch

## Risk Notes
- The portal adds a client-ready guard, so the drawer will only mount after client hydration.
- If another global overlay is using a higher body-level z-index than `300`, the conflict would still be external to the navbar stacking issue.

## Needs Uylus / ChatGPT Review
- Tap the Beta badge and confirm the changelog now appears above the navbar, bottom nav, and any floating UI.
- Recheck iPhone Safari/PWA specifically since that was the reported overlay failure mode.

## Follow-up Suggestions
- If any other app overlays still appear above the changelog, inventory the shared overlay z-index ladder and normalize it in one place.

