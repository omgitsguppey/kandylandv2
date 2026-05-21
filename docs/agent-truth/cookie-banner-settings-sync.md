# Cookie Banner Settings Sync

Status: pass

The cookie banner now uses the consent policy as the source of truth instead of only hiding the banner. Accept all maps to full behavioral tracking, minimal maps to product/performance analytics only, and decline keeps optional tracking off while required app integrity events remain separate in the consent policy.

## Mobile Banner

- Compact 320px-safe marker: true
- No truncation token: true
- Safe-area bottom aware: true
- Bottom nav reserved spacing: true
- Choices visible: true

## Settings Sync

- Guest consent syncs into a default account: true
- Existing account privacy preference wins: true
- Account sync route wired: true
- Logged-in settings publish local tracking state: true

## Validation

- Pass.
