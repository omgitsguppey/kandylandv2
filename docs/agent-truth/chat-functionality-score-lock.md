# Chat Functionality Score Lock

Generated: 2026-06-10T04:02:51.921Z
Current HEAD: c755f63fefff812038edb484ff5577fea601631c

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

- sourceHealth: 91.7 -> 91.7 (target 80; at_or_above_target); next=No chat-specific score action needed.
- runtimeHealth: 72.8 -> 72.8 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.
- evidenceCompleteness: 43.4 -> 43.4 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.
- freshness: 59.38 -> 59.38 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.
- costRisk: 42 -> 42 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.
- regressionRisk: 94 -> 94 (target 80; at_or_above_target); next=No chat-specific score action needed.
- overallHealthScore: 68.67 -> 68.67 (target 80; below_target); next=Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.

## Remaining Gaps

- None in source-level chat functionality lock.

## Dirty Classification

- Dirty files classified: 237
- Unsafe unknown count: 0
- Stale/report noise: 184
- Source gaps/manual review: 4
- Real chat reliability risk candidates: 2
- Protected payment/Fan Pass manual review: 4
- Support overlap owner review: 2
- Obsolete/stale report noise: 61
- agent_validator_artifact_outside_chat_reliability: 80
- current_generated_artifact_to_commit: 2
- documentation_artifact_expected: 2
- generated_report_doc_outside_chat_lock: 23
- non_chat_artifact_outside_chat_reliability: 18
- protected_manual_review_payment_or_fan_pass_gating: 4
- real_source_change_needs_review: 2
- repo_context_artifact_outside_chat_reliability: 25
- source_change_outside_chat_reliability: 21
- stale_generated_report_noise_outside_chat_lock: 38
- support_inbox_truth_review: 2
- test_artifact_expected: 2
- test_artifact_outside_chat_reliability: 15
- unrelated_agent_context_file_to_ignore: 1
- validator_artifact_expected: 2

## Next Exact Steps

- Collect formal runtime/provider smoke and admin truth evidence outside this source-only lock.
- Keep future chat activity distinct from source readiness; do not fake runtime evidence.

## Validation Failures

- None.
