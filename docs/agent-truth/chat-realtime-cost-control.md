# Chat Realtime Cost Control

Generated: 2026-05-24T02:07:16.522Z

## Listener Scope

- Thread list listener: viewer_scoped_thread_list, limit 250
- Message listener: selected_thread_messages_only, limit 250
- Broad all-message listener: forbidden
- Detach on unmount/thread switch: verified

## Propagation States

- send_attempted
- send_api_accepted
- optimistic_rendered
- listener_observed
- reconciled
- failed
- stale

## Telemetry

- chat_realtime_listener_attached: Chat realtime, support_materializer
- chat_realtime_listener_detached: Chat realtime, support_materializer
- chat_realtime_listener_error: Chat realtime, support_materializer
- chat_message_send_attempted: Chat realtime, support_materializer
- chat_message_api_accepted: Chat realtime, support_materializer
- chat_message_optimistic_rendered: Chat realtime, support_materializer
- chat_message_listener_observed: Chat realtime, support_materializer
- chat_message_reconciled: Chat realtime, support_materializer
- chat_message_reconcile_failed: Chat realtime, support_materializer
- chat_thread_unread_updated: Chat realtime, support_materializer
- chat_thread_read_marked: Chat realtime, support_materializer

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 91.7 | 91.7 | target_met | No score action needed for this dimension. |
| runtimeHealth | 66.75 | 66.75 | below_target | Attach formal runtime/debug/cost evidence through existing score lanes; do not treat missing future chat activity as a failure. |
| evidenceCompleteness | 38.25 | 38.25 | below_target | Attach formal runtime/debug/cost evidence through existing score lanes; do not treat missing future chat activity as a failure. |
| freshness | 62.86 | 62.86 | below_target | Attach formal runtime/debug/cost evidence through existing score lanes; do not treat missing future chat activity as a failure. |
| costRisk | 42 | 42 | below_target | Attach formal runtime/debug/cost evidence through existing score lanes; do not treat missing future chat activity as a failure. |
| regressionRisk | 42 | 42 | below_target | Attach formal runtime/debug/cost evidence through existing score lanes; do not treat missing future chat activity as a failure. |

## Old Logic Classification

- ChatExperience Firestore thread listener: still_required - Viewer-scoped thread listener owns thread list and unread propagation.
- ChatExperience Firestore selected-thread message listener: still_required - Selected-thread-only listener owns realtime message reconciliation without all-message fan-out.
- ChatExperience RTDB presence listener: still_required - Presence/typing uses RTDB onDisconnect cleanup for ephemeral state.
