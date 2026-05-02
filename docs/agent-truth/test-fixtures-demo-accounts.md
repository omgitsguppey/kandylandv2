# Test Fixtures And Demo Accounts

Status: Launch QA fixture doctrine  
Last updated: 2026-05-02  
Scope: Repeatable local/test fixture states for KandyDrops launch validation.

## Rule

Launch validation must not depend on random production state.

Default posture:
- Do not create production users.
- Do not write live Firestore, Realtime Database, Storage, PayPal, FCM, or analytics data.
- Do not commit passwords, tokens, API keys, service credentials, or live account secrets.
- Use `tests/fixtures/launch-demo-fixtures.json` as the local/test fixture contract.
- Use Firebase emulators, route mocks, or explicitly configured staging accounts for executable demo runs.

## Fixture Contract

The launch fixture contract lives at:

```text
tests/fixtures/launch-demo-fixtures.json
```

It is safe to commit because it contains deterministic ids, `example.test` emails, test-only storage paths, no passwords, no tokens, and no live write runner. No passwords or provider secrets belong in fixture JSON.

The fixture clock is fixed at `1770000000000` so queued, live, ending-soon, and expired Drops can be reasoned about without depending on wall-clock time.

## Required Personas

- `guest_visitor`: public browsing, Drop discovery, creator profile, auth prompt, notification prompt skip.
- `new_user`: registration, onboarding, starter reward balance, first dashboard, notification setup.
- `user_zero_gd`: insufficient-balance state, refill prompt, blocked unlock.
- `user_gd_balance`: wallet balance, paid/reward split, can-afford unlock.
- `user_unlocked_drop`: Library, Viewer entitlement, repeat unlock idempotency, owned expired access.
- `user_failed_purchase`: payment failure copy, support recovery, no fake credit.
- `creator_profile_public_drops`: creator public profile, public-safe Drops, creator routing.
- `admin`: Admin Overview, Analytics, Debug, user recovery, protected admin paths.
- `user_notification_read_unread`: unread count, read persistence, clear all, push preference.
- `user_chat_thread`: message list, thread detail, send route, participant gating, unread chat state.

## Required Drop States

- `fixture_drop_expired`: expired public Drop, still usable for Library access if already unlocked.
- `fixture_drop_queued`: queued Drop, not public until live.
- `fixture_drop_live_ending_soon`: live Drop inside final countdown window.
- `fixture_drop_archived`: archived/not-public Drop for admin-only recovery checks.
- `fixture_drop_missing_cover`: `live_missing_cover` Drop with missing cover so fallback behavior is testable.
- `fixture_drop_locked_assets`: `live_locked_assets` Drop with protected assets so unlock/viewer entitlement is testable.

## Money And Access Truth

Fixture users must distinguish:
- `gumDropsBalance`
- `gumDropsPurchasedBalance`
- `gumDropsRewardBalance`
- admin-granted GumDrops in transaction fixtures
- paid and bonus GumDrops in purchase transaction fixtures
- GumDrops spent on unlock transactions

No fixture may imply bonus, reward, or admin-granted GumDrops are revenue or cash value.

Unlock tests must use server-confirmed state. A fixture user with an owned Drop must include both `unlockedContent` and `unlockedContentTimestamps` so Viewer and Library states can be tested without fake access.

## Notifications And Chat

Notification fixture state must include:
- at least one unread notification
- at least one read notification
- deterministic idempotency keys
- recipient id
- Drop id where the notification is Drop-related

Chat fixture state must include:
- one user/creator thread
- participant ids
- message ids
- unread state

## Critical Paths

The fixture contract must be enough to exercise:
- guest to signup
- wallet refill and unlock
- owned Library and Viewer
- notification read/clear
- chat thread
- admin truth and recovery

Executable tests can use route mocks, Firebase emulator seeds, or future staging seed scripts, but the default committed artifact is intentionally static.

## Before Adding A Seed Runner

A seed runner is not part of this pass. If a future task adds one, it must:
- default to dry-run
- reject production project ids by default
- require explicit `KANDYDROPS_ALLOW_TEST_SEED_WRITE=1`
- target emulator or staging only unless leadership explicitly approves otherwise
- print redacted output only
- never commit generated credentials
- be validated by `npm run check:test-fixtures-demo`

## Validation

Run:

```bash
npm run check:test-fixtures-demo
```

Focused unit check:

```bash
npx vitest run tests/unit/test-fixtures-demo.spec.ts
```

Future agents must update this document, `agent/state/test-fixtures-demo-audit.generated.json`, and the validator when adding or changing launch fixture personas, Drop states, executable seed behavior, or demo-account policy.
