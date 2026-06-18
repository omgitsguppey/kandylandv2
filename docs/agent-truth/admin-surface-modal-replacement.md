# Admin Surface Modal Replacement

Status: source_review_pass
Generated: 2026-06-18T11:06:36.002Z
Current head: dbb8b712b77473f9f9f50561ba7e8cc8e88c9a4d
Evidence boundary: complete source snapshot, local free, no runtime/provider/admin truth gate cleared.

This pass reviewed admin modal-style actions and normalized Admin Analytics state labels. It is source evidence only. It does not clear runtime, provider, PayPal, wallet, GumDrop treasury, production database, or admin truth sample gates.

## Decisions

- Admin Users: `BalanceAdjustmentPanel` and `TransactionHistoryPanel` already render inside the inline selected-action workspace. They were kept as connected inline panels.
- Admin Drops: `CreateDropModal` is still a legacy component name, but admin drops renders it through an inline Drop action section with `presentation="inline"`. The duplicate visible modal title bar was removed from inline presentation, while the shared modal presentation remains for creator/imported use. A file/component rename is deferred because creator imports share it.
- Admin Analytics: all-caps operational chips were replaced with plain state labels: Current, Cached, Refresh due, Sample, No sample, Collecting, No source, Review, Failed, and Estimate.
- Admin Analytics: source recovery details and panel hydration states now share one compact expandable list instead of nested source-detail and panel-status cards.
- Admin Analytics: `launchHistoryCoverage` now includes `firstPartyCoverage`, and the compact Data status strip surfaces first-party launch gaps. Mixed GA4/fallback coverage can no longer look fully product-truth-ready.
- Admin Drops / AI Draft Helpers: history-clear actions still use the same connected telemetry events, but admin-facing success copy, telemetry catalog labels, debug issue details, and source-context metadata no longer describe inline draft helpers as modal-only actions. The admin inline panel reports `admin_drop_action_panel`; creator modal mode keeps the shared `CreateDropModal` path.

## Deferred

- Rename/split `CreateDropModal` only in a separate creator/admin drop workflow slice.
- Deep Admin Debug pill cleanup needs a dedicated Control Tower pass so raw evidence stays available behind drilldown.
- Generated indexes and old evidence snapshots still mention `BalanceAdjustmentModal` and `TransactionHistoryModal`; runtime source imports the panel replacements, so those references should wait for an agent-index refresh slice.
