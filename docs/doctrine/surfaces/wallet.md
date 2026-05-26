# Wallet Doctrine

Authority level: 4

Owner: wallet/payment/GumDrops

## Must

- Anchor revenue and user value to server purchase or ledger transaction truth.
- Preserve paid vs reward GumDrop source accounting.
- Show source-aware reward GD and paid GD where balance source matters.
- Keep PayPal capture and ledger facts as canonical purchase evidence.

## Must Not

- Count client-only purchase completion as revenue.
- Reintroduce total-only balance chips as canonical wallet truth.
- Hide PayPal button stacks with CSS.
- Spend reward-only GumDrops on paid-only creator monetization.

## Source Truth

- Server capture route, GumDrop ledger, transaction id, sourceTruth.

## Validators

- `check:wallet-density`
- `check:wallet-single-paypal-button`
- `check:purchase-telemetry-truth`
- `check:gumdrop-economy`
