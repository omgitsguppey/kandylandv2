# Codex Handoff

## Task
Fix native chat composer/transcript layout shifts.

## Result
Status: completed

## Files Changed
- src/components/Chat/ChatExperience.tsx: measured composer height, bound composer tray states, and tied transcript bottom spacing to the live composer height
- CODEX_HANDOFF.md: recorded this task handoff
- agent/handoffs/chat-composer-transcript-stability.md: mirrored handoff for review

## Behavior Changed
Before:
- composer/status/attachment states changed height and pushed transcript unpredictably

After:
- transcript bottom spacing follows measured composer height
- composer/status/attachment area is bounded
- transcript remains the scroll owner

## Validation
Commands run:
- npm run typecheck: pass

Commands not run:
- targeted chat/component test: no existing `chat-layout-stability` or `ChatExperience` layout test file was present, and this task forbade building a new broad harness
- full npm run check: forbidden for this task
- Playwright: forbidden for this task
- Cypress: forbidden for this task
- Lighthouse: forbidden for this task

## Browser Verification Needed
Check /dashboard/chat on narrow iPhone viewport:
- thread list -> open thread
- keyboard open/close
- attachment selected
- warning/error/funds state
- attachment menu open
- send pending -> sent

## Risk Notes
- transcript bottom padding now follows the full measured composer shell; this should stabilize last-message visibility, but it needs browser confirmation that the added end spacing does not feel oversized
- composer height is measured with `ResizeObserver` and falls back to a default height; older browser fallback behavior still needs a quick runtime check
- no dedicated ChatExperience layout test exists yet, so stability is currently enforced by source shape plus typecheck and still needs manual viewport verification

## Needs Uylus / ChatGPT Review
- Recheck the native `/dashboard/chat` detail pane on mobile Safari/PWA specifically when warning/error/funds trays appear.
- Confirm whether the new transcript end spacing feels correct when the composer is in its clean state with no status tray.

