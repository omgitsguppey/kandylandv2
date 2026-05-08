# Chat Paid GumDrops Guidance

Status: canonical chat affordability guidance  
Recorded: 2026-05-08

Creator chat uses paid-source GumDrops only. Free GumDrops are for unwrapping KandyDrops. The chat UI must proactively explain paid-GD requirements before a user attempts to send a message. Chat shell positioning is frozen and must not be modified by affordability guidance work.

## Required UX

- If the user follows no creators, chat shows a follow-first guide instead of a fake composer state.
- If the user opens a creator chat, the thread is auto-resolved from the creator relationship and shown immediately.
- If `subscriberFreeChatApplies` is true, the paid-GD gate is bypassed.
- If the viewer role is `creator`, the paid-GD gate is bypassed.
- Otherwise the minimum affordability check is `max(1, textPriceGd || 1)` against `purchasedBalanceGd` only.

## Paid-GD Gate

The proactive thread gate must say:

- “To message {creatorFirstName}, you’ll need to get more paid GumDrops!”
- “Free GumDrops are only for unwrapping KandyDrops.”
- “Paid GumDrops allow you to send a text, pic, or vid straight to your favorite creator!”
- “Every message helps support {creatorFirstName}, no chat agencies, ever.”

Required CTAs:

- Primary: `Get More GumDrops`
- Secondary: `Go unwrap drops`

## Reminder Cycle

Low paid-GD reminders trigger when paid balance is below `100` and the user is still eligible in the current reminder cycle.

- Reminder lock field: `chatPaidGdLowBalanceReminder`
- Free/reward GD changes do not reset the reminder
- Only a paid refill that brings `gumDropsPurchasedBalance` back to `100+` resets eligibility
- Reset telemetry: `chat_low_paid_gd_reminder_reset`

## Frozen Shell

This lane must not modify:

- `CHAT_VIEWPORT_SHELL_CLASSNAME`
- `chatViewportShellStyle`
- `chatThreadSectionStyle`
- `chatTranscriptStyle`
- `ChatRouteShell`
- `user-mobile-shell` viewport and bottom-nav-safe tokens
