# Debug Cockpit Batch 17 Route Runtime

Status: route runtime rollups are classified by current failure, stale route, unseen route, warning group, and slow sample history.
- Tracked/observed/unseen/stale: 173/109/64/54
- Current failures: 1 (admin/debug/control-tower:GET)
- Warnings: 156 samples -> 4 groups
- Slow: 42346 samples -> 3 current slow routes
- Native chat: warning, error rate 0.9%, threshold 1.0%
- Compat chat: legacy_visible_until_removal, removal after 2026-07-31

## Release Notes
- Cleaned route runtime rollups and separated current failures, stale routes, unseen routes, warnings, and slow samples.
- Added native and compatibility chat route cohort status.
- Fixed route runtime display contradictions without hiding real failures.
