# Codex Handoff

## Task
Tune native chat summary-only transcript padding.

## Result
Status: completed

## Files Changed
- src/components/Chat/ChatExperience.tsx: split transcript bottom padding into clean, summary-only, and full tray modes
- CODEX_HANDOFF.md: updated handoff for this task
- agent/handoffs/chat-summary-padding-tune.md: mirrored handoff for review

## Behavior Changed
Before:
- clean padding used `72px + safe bottom`
- summary-only state was treated like full tray state
- full tray used measured composer height: `var(--chat-composer-height) + safe bottom`

After:
- clean padding uses `72px + safe bottom`
- summary-only padding uses `92px + safe bottom`
- full tray padding uses `var(--chat-composer-height) + safe bottom`
- ResizeObserver measurement remains in place and still drives tray-state spacing

## Validation
Commands run:
- npm run typecheck: pass

Commands not run:
- targeted chat/component test: no dedicated chat layout stability test file exists for this surface
- full npm run check: forbidden for this task
- Playwright: forbidden for this task
- Cypress: forbidden for this task
- Lighthouse: forbidden for this task

## Browser Verification Needed
Check /dashboard/chat on narrow iPhone viewport:
- summary-only thread with pricing/free-chat summary visible
- clean composer state end spacing
- full tray states: warning/error/funds/attachment
- keyboard open/close
- send pending -> sent

## Risk Notes
- summary-only mode assumes one-line summary plus control row fits well at `92px`; this still needs mobile browser verification
- `composerSummary` is now isolated from full tray spacing, but longer localized summary text could still feel tight if it wraps
- no browser automation was run, so perceived summary-state end spacing still needs manual verification

## Needs Uylus / ChatGPT Review
- Verify a thread that shows only the pricing/free-chat summary and no other tray state.
- Confirm whether `92px + safe bottom` feels correct or should be nudged after mobile Safari/PWA review.

