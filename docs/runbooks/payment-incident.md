# Payment Incident Runbook

## Symptoms

- PayPal checkout/capture failure, duplicate credit, missing GumDrops, incorrect paid/reward source, revenue inflation, webhook mismatch, or creator monetization spend failure.

## Immediate Containment

- Stop client promotion of purchase success as revenue truth.
- Preserve PayPal transaction ids, internal ledger ids, user id, timestamp, and route logs.
- Disable affected payment feature flags only if owner-approved.

## Rollback

- Revert the smallest payment route, ledger, or telemetry commit.
- Do not manually mutate balances without an idempotent adjustment record.

## Validation

- Run payment/economy validators selected by affected routing.
- Confirm server capture or ledger transaction is the canonical purchase fact.
- Confirm client `begin_checkout` and completion events are funnel/context only.

## Owner

- Wallet/payment/GumDrops CODEOWNER.

## Logs And Evidence

- PayPal capture id, internal transaction id, ledger record id, route status, and debug evidence id.
- Do not paste PayPal secrets, access tokens, or customer payment data into public issues.

## Follow-Up

- Add a regression validator if revenue could be inflated by client-only events.
