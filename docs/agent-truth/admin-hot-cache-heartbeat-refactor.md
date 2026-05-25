# Admin Hot Cache Heartbeat Refactor

- Heartbeat cadence: 3600 seconds.
- Overview reads before: 11 paths, estimated 10336 operations.
- Overview reads after: admin_overview_snapshot hot-cache doc, admin_overview_snapshot heartbeat doc, optional bounded recent feed summary doc.
- Estimated read reduction: 99.97%.
- Estimated polling reduction: 98.33%.
- Missing snapshot behavior: missing snapshot returns source-missing state and does not trigger broad fallback reads.
- Stale snapshot behavior: stale snapshot values remain visible with review freshness.

Remaining gaps:
- Admin analytics/debug live hooks remain inventoried as explicit migration/exception surfaces, not overview defaults.
- Recent transactions panel still has a separate live-feed listener and needs a follow-up snapshot/drilldown split.
