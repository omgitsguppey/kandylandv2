# Chat Functionality Score Lock

Generated: 2026-05-24T16:44:51.466Z
Current HEAD: d02b8b2da859d47d880182fe2169db1ad6a40ad6

## Status

- Realtime propagation: pass; next=Keep source validation; runtime/provider proof remains separate.
- Listener cost: pass; next=Keep listener count and document limits bounded.
- Typing/presence: pass; next=Keep typing ephemeral and throttled.
- Paid-GD gating: pass; next=Preserve GumDrop math and source-of-funds policy.
- Moderation: pass; next=Keep blocked attempts visible without exposing message content in summaries.
- Telemetry: pass; next=Keep chat events mapped into canonical envelopes and debug lanes.
- Admin truth: pass; next=Keep admin summaries count/source-state based.
- Transcript truth: pass; next=Use guarded drilldown only; do not dump transcripts by default.
- Person metrics: pass; next=Keep chat usage hydrating through person metrics, not raw transcript dumps.

## Transcript Truth

- Message content exposed by default: false
- Guarded drilldown: true
- Source route: src/app/api/admin/moderation/threads/[threadId]/route.ts
- Source helper: src/lib/server/admin-moderation.ts

## Score Dimensions

- sourceHealth: 92.5 -> 92.5 (target 80; at_or_above_target); next=No chat-specific score action needed.
- runtimeHealth: 84.2 -> 84.2 (target 80; at_or_above_target); next=No chat-specific score action needed.
- evidenceCompleteness: 69.6 -> 69.6 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.
- freshness: 83.75 -> 83.75 (target 80; at_or_above_target); next=No chat-specific score action needed.
- costRisk: 42 -> 42 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.
- regressionRisk: 86 -> 86 (target 80; at_or_above_target); next=No chat-specific score action needed.
- overallHealthScore: 79.25 -> 79.25 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.

## Remaining Gaps

- None in source-level chat functionality lock.

## Next Exact Steps

- Collect formal runtime/provider smoke and admin truth evidence outside this source-only lock.
- Keep future chat activity distinct from source readiness; do not fake runtime evidence.

## Validation Failures

- None.
