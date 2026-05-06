# Codex Handoff

## Task
Tune native chat clean-state transcript padding without breaking tray protection.

## Result
Status: completed

## Files Changed
- src/components/Chat/ChatExperience.tsx: changed transcript bottom padding to use compact clean-state spacing and measured tray-state spacing
- CODEX_HANDOFF.md: updated handoff for this task
- agent/handoffs/chat-clean-composer-padding-tune.md: mirrored handoff for review

## Behavior Changed
Before:
- transcript bottom padding always used the full measured composer shell height
- clean composer state could leave an oversized dead gap at the end of the transcript

After:
- clean composer state uses compact transcript padding: `72px + safe bottom`
- tray state still uses measured composer height: `var(--chat-composer-height) + safe bottom`
- transcript still keeps a minimum clean-state floor and tray states still reserve full measured space

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
- clean composer state end spacing
- thread list -> open thread
- keyboard open/close
- attachment selected
- warning/error/funds state
- attachment menu open
- send pending -> sent

## Risk Notes
- `composerSummary` still counts as tray state, so threads showing pricing/free-chat summary will continue to use measured composer spacing by design
- the compact clean-state floor is hard-coded at `72px`; it should be verified against the real control row and safe-area feel on mobile Safari/PWA
- no browser automation was run, so perceived end-gap quality still needs manual verification

## Needs Uylus / ChatGPT Review
- Recheck whether the pricing/free-chat summary should count as a full tray state visually, or whether it should eventually get its own intermediate padding mode.
- Verify the clean-state transcript end spacing specifically on a thread with no warning/error/funds/attachment tray visible.

