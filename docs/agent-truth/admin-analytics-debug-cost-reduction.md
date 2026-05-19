# Admin Analytics Debug Cost Reduction

Generated: 2026-05-19T14:47:21.882Z
Current HEAD: 83d085481f237358a857f16ca55c99b662ecbed5

## Summary

- Historical cache default: true
- GA snapshot-first default: true
- Debug lazy default: true
- Support/roster/user detail bounded: true
- Truth semantics preserved: true

## Fixes Applied

- adminHistoricalDefaultCacheEnabled: Historical analytics route defaults to cache/stale-known metadata instead of no-store cold rebuild.
- gaSnapshotFirstEnabled: GA/Data API reports are skipped on default raw fallback and only allowed by explicit refresh.
- eventFactsDefaultLimitReduced: Default event-fact sample cap is reduced from 5000.
- guestDiagnosticsDefaultLimitReduced: Guest/security/diagnostic default sample caps are reduced.
- dropsArchivePaged: Drops archive uses a bounded top-drop snapshot instead of an unordered 1000-doc read.
- debugInitialLoadLazy: Admin Debug default route returns a bounded summary and defers high-cost sections.
- heartbeatFullScanBlocked: Queue heartbeat listing uses a latest-N query by default.
- supportThreadsPaged: Admin and user support thread lists are bounded and ordered by updated activity.
- rosterSummaryDefault: Admin roster default is bounded and keeps creator ops behind an explicit includeOps drilldown.
- userDetailExpensiveSectionsLazy: Admin user and user-detail expensive creator-op sections are bounded and explicitly requested.
- truthSemanticsPreserved: Deferred, stale, and unavailable admin data remains truth-labeled instead of shown as live.

## Deferred Findings

- P2 admin-debug-section-route-split: The debug route now supports summary/all source sections. A later UI pass can call named drilldown sections directly instead of the all section.

## Cost Savings Model

- admin_debug_default: 70-95% fewer default Debug Firestore reads before explicit drilldown (readReduction = highCostSectionReads - summarySectionReads)
- admin_analytics_vendor: up to 100% fewer GA Data API report calls on default non-refresh loads (vendorCallReduction = defaultLoads * previousGaReportCount)
- admin_analytics_samples: 50-90% lower raw sample reads for event facts, guest batches, diagnostics, drops, tasks, and transactions (sampleReadReduction = previousLimit - newLimit)
- support_and_roster: 60-95% fewer default support/roster/user-detail reads on large tenants (defaultReadReduction = unboundedOrBroadReads - boundedPageOrDeferredReads)

## Next Exact Steps

- Add UI drilldown controls for named Admin Debug sections after the summary/all route split is consumed.
- Promote verified Admin Analytics materializers for remaining placeholder modules so explicit refreshes use fewer raw sources.
- Add cursor-based support and roster pagination in the admin UI after route-level caps are stable.
