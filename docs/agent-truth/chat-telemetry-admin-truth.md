# Chat Telemetry Admin Truth

Generated: 2026-07-16T04:24:51.532Z

## Admin Summary

- Lane: Chat telemetry/admin truth
- Event facts: analytics_event_facts
- Thread source: creator_message_threads
- Raw message content default: false
- Transcript truth: guarded_drilldown
- Drilldown target: /admin/moderation

## Metrics

- activeChatUsers
- sendAttempts
- successfulSends
- blockedSends
- failedSends
- paidGdGateViews
- purchaseCtaClicks
- attachmentAttempts
- moderationBlocks

## Event Families

- chat_surface_viewed: activeChatUsers, chat_actions
- chat_thread_list_loaded: activeChatUsers, chat_actions
- chat_thread_opened: activeChatUsers, chat_actions
- chat_compose_sheet_opened: activeChatUsers, chat_actions
- chat_creator_selected: activeChatUsers, chat_actions
- chat_message_send_attempted: sendAttempts, chat_actions
- chat_message_sent: successfulSends, chat_actions
- chat_message_failed: failedSends, chat_actions
- chat_message_blocked: blockedSends, chat_actions
- chat_attachment_upload_started: attachmentAttempts, chat_actions
- chat_attachment_upload_failed: attachmentAttempts, chat_actions
- chat_presence_connected: activeChatUsers, chat_actions
- chat_typing_started: activeChatUsers, chat_actions
- chat_typing_stopped: activeChatUsers, chat_actions
- chat_read_marked: activeChatUsers, chat_actions
- chat_unread_updated: activeChatUsers, chat_actions
- chat_paid_gd_gate_viewed: paidGdGateViews, chat_actions
- chat_purchase_cta_clicked: purchaseCtaClicks, chat_actions

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 83.6 | 83.6 | target_met | No score action needed for this dimension. |
| runtimeHealth | 50.22 | 50.22 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not expose private transcript content in broad summaries. |
| evidenceCompleteness | 45 | 45 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not expose private transcript content in broad summaries. |
| freshness | 59.38 | 59.38 | below_target | Attach formal runtime/admin/cost evidence through existing score lanes; do not expose private transcript content in broad summaries. |
| costRisk | 92.5 | 92.5 | target_met | No score action needed for this dimension. |
| regressionRisk | 94 | 94 | target_met | No score action needed for this dimension. |

## Old Logic Classification

- Chat UI-only event aliases: superseded - Legacy chat_new_message and chat_thread_* aliases remain accepted while canonical chat telemetry families feed admin truth.
- Broad admin transcript dumps: removed - Broad admin summaries expose counts and source states only; transcript content stays behind guarded drilldown.
- Chat behavioral event facts: still_required - Chat events normalize through event facts and hydrate chat_actions person metrics.
- Blocked/failed chat attempts: still_required - Blocked, failed, paid-GD gate, and purchase CTA signals remain visible in admin/debug summaries.
