# Admin Surface Modal Replacement

Status: source_review_pass
Generated: 2026-06-18T09:38:57.300Z
Current head: 742254f45d7ab778d8a8c4c1d1f52a26989e847b
Evidence boundary: complete source snapshot, local free, no runtime/provider/admin truth gate cleared.

This pass reviewed admin modal-style actions and normalized Admin Analytics state labels. It is source evidence only. It does not clear runtime, provider, PayPal, wallet, GumDrop treasury, production database, or admin truth sample gates.

## Decisions

- Admin Users: `BalanceAdjustmentPanel` and `TransactionHistoryPanel` already render inside the inline selected-action workspace. They were kept as connected inline panels.
- Admin Drops: `CreateDropModal` is still a legacy component name, but admin drops already renders it through an inline Drop action section with `presentation="inline"`. A file/component rename is deferred because creator imports share it.
- Admin Analytics: all-caps operational chips were replaced with plain state labels: Current, Cached, Refresh due, Sample, No sample, Collecting, No source, Review, Failed, and Estimate.

## Deferred

- Rename/split `CreateDropModal` only in a separate creator/admin drop workflow slice.
- Deep Admin Debug pill cleanup needs a dedicated Control Tower pass so raw evidence stays available behind drilldown.
