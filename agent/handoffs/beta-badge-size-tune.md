# Codex Handoff

## Task
Shrink the visible BETA badge in the KandyDrops header by 50%.

## Result
Status: completed

## Files Changed
- `src/components/ReleaseNotes/BetaBadge.tsx`: reduced the visible header badge chip size while preserving the button tap target and behavior
- `CODEX_HANDOFF.md`: dirty-worktree-safe handoff for this task
- `agent/handoffs/beta-badge-size-tune.md`: task-specific handoff copy

## Behavior Changed
Before:
- The header Beta badge rendered as a relatively prominent chip beside the KandyDrops wordmark.
- The visible badge used `px-2 py-1 text-[10px] tracking-[0.18em]` inside the chip.

After:
- The header Beta badge renders as a smaller status chip with the same color/style and the same click behavior.
- The visible badge now uses `px-1.5 py-0.5 text-[8px] tracking-[0.08em]`.
- The outer button still keeps `min-h-11` for the tap target; only the visible chip was shrunk.

## Dirty Worktree Safety
- `git status --short` showed many unrelated pending broad-audit files before this task.
- I edited only `src/components/ReleaseNotes/BetaBadge.tsx` plus the two handoff files.
- I did not touch `src/components/CoreLayoutWrapper.tsx`, `src/app/api/**`, `src/lib/server/**`, `src/components/PurchaseModal.tsx`, or other dirty broad-audit files.

## Badge Ownership
- Header badge owner: `src/components/ReleaseNotes/BetaBadge.tsx`
- Mounted from: `src/components/Navbar.tsx`
- Header badge and modal are separate surfaces. This task changed only the header badge chip classes in `BetaBadge.tsx`; it did not change the Beta modal drawer.

## Validation
Commands run:
- `git status --short`: pass
- PowerShell fallback search for badge ownership: pass
- `npm run typecheck`: pass

Commands not run:
- `full npm run check`: task forbids broad checks
- `Playwright`: task forbids browser automation
- `Cypress`: task forbids browser automation
- `Lighthouse`: task forbids browser automation

## Browser Verification Needed
Check the header on a narrow mobile viewport and desktop:
- badge sits vertically centered with the KandyDrops wordmark
- badge reads smaller and subtler than before
- badge remains tappable and still opens the Beta notes drawer
- Beta modal size/content is unchanged

## Risk Notes
- The change is class-only and intentionally keeps the outer 44px-scale tap target.
- Visual size is approximately 50% smaller by chip density and typography, but final judgment still needs browser verification against the navbar.
- Because the worktree is dirty, staging must stay limited to the exact badge file and handoff files.
