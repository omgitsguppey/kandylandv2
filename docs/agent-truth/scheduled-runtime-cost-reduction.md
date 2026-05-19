# Scheduled Runtime Cost Reduction

Generated: 2026-05-19T15:32:09.444Z
Current HEAD: 785975ca9f5f371e9731a73c6ae32439df52dfff

## Summary

- Realtime summary cadence minutes: 5
- Analytics truth incremental cursor: true
- Behavioral changed sources: true
- Behavioral diff-only profile writes: true
- Queue lifecycle due-only: true
- Active drop notifications due-only: true
- Creator subscriptions due-only: true

## Fixes Applied

- realtimeSummaryCadenceMinutes: Non-critical analytics realtime summary is guarded at a five-minute minimum cadence.
- analyticsTruthUsesIncrementalCursor: Analytics truth runtime defaults to cursor/bootstrap windows; 45-day rebuild requires explicit fullRebuild.
- behavioralIntelligenceUsesChangedSources: Behavioral intelligence reads changed/updated sources instead of full drops and relationships by default.
- behavioralProfileWritesDiffOnly: Behavioral profile writes are guarded by changed hashes so unchanged profiles skip writes.
- queueLifecycleDueOnly: Queue lifecycle and active-drop notification scans fetch due transitions instead of all scheduled/active drops.
- activeDropNotificationsDueOnly: Active drop notifications remain due-only and idempotent by activation key.
- creatorSubscriptionsDueOnly: Creator subscription cron reads due renewals and warning-window subscriptions instead of scanning 1000 active subscriptions.

## Deferred Findings

- P2 external-schedule-verification: No deploy/provider checks were run. After deployment, verify Cloud Scheduler entries match the source cadence and that no old one-minute trigger remains active.

## Cost Savings Model

- analytics_realtime_summary: up to 80% fewer non-critical realtime-summary executions versus one-minute cadence (invocationReduction = 1 - (1 / 5))
- analytics_truth_runtime: typically 80-98% fewer runtime truth source reads after cursor bootstrap (readReduction = 45dayWindowReads - cursorWindowReads)
- behavioral_intelligence: 60-95% fewer profile writes when source hashes are unchanged (writeReduction = unchangedProfiles - changedProfiles)
- queue_and_notifications: 70-99% fewer default drop transition reads on quiet intervals (scanReduction = allScheduledActiveDrops - dueTransitionDrops)
- creator_subscription_cron: 70-99% fewer subscription docs read on non-renewal windows (scanReduction = activeSubscriptions - dueRenewalsAndWarnings)

## PR Cleanup Actions

- #273: not_relevant - Open Admin Debug Map-lookup optimization PR does not touch scheduled runtime job cost lanes.
- #271: not_relevant - Open monolith-boundary PR does not touch scheduled runtime job cost lanes.
- #272: not_relevant - Open creator dashboard accessibility PR does not touch scheduled runtime job cost lanes.

## Next Exact Steps

- Verify deployed Cloud Scheduler cadence after the next deployment without running provider calls from this pass.
- Add persisted recipient summary documents for active-drop notifications to further reduce owner exclusion lookups.
- Add operator-triggered full rebuild controls for analytics truth and behavioral intelligence recovery runs.
