# Codex Handoff

## Task
Stabilize native chat mobile shell width and height.

## Result
Status: completed

## Files Changed
- src/components/Chat/ChatExperience.tsx: aligned mobile shell gutters with app chrome, reused existing chat viewport-shell height token, and made list/loading/empty/detail states render inside one stable frame
- CODEX_HANDOFF.md: updated handoff for this task
- agent/handoffs/chat-shell-width-height-stability.md: mirrored handoff for review

## Behavior Changed
Before:
- mobile chat shell used `px-0` on the outer frame, so the panel read wider than the header/bottom nav lane
- list state could visually collapse toward content height before a thread opened
- list/detail states did not clearly share one stable route frame

After:
- mobile chat shell uses side gutters again (`px-3` mobile, existing `sm:px-4` preserved), so the panel sits in the same app-card lane as the top/bottom chrome
- outer chat frame now reuses the existing `USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT` token for compact viewports
- list scroll area is a full-height flex column, and loading/empty/search-empty states fill that stable frame instead of shrink-wrapping content
- detail state remains inside the same width/height shell instead of swapping to a visually different frame

## Validation
Commands run:
- npm run typecheck: pass

Commands not run:
- full npm run check: forbidden for this task
- Playwright: forbidden for this task
- Cypress: forbidden for this task
- Lighthouse: forbidden for this task

## Browser Verification Needed
Check /dashboard/chat on:
- list view before opening a thread
- list -> thread detail
- back from thread detail -> list
- loading state
- empty/search-empty state
- narrow iPhone Safari/PWA width
- compare chat shell width against top header and bottom tab nav

## Risk Notes
- existing mobile shell token reused: `USER_MOBILE_CHAT_VIEWPORT_SHELL_HEIGHT`; no new shell constant was added
- compact viewport height is now explicitly pinned on the outer chat shell; this needs a real mobile browser check to confirm it does not feel over-constrained during Safari toolbar changes
- loading state now renders as a full-frame placeholder in compact list mode; visual density should be checked against the rest of the app shell

## Needs Uylus / ChatGPT Review
- Recheck whether `px-3` is the right mobile gutter relative to the KandyDrops header and bottom nav, or if it should match another shared lane exactly.
- Verify that list mode no longer appears collapsed before a thread opens on narrow iPhone Safari/PWA.

