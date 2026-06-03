# Chat Telemetry Admin Truth

Generated: 2026-06-03T04:31:26.732Z

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
| sourceHealth | 100 | 100 | target_met | No score action needed for this dimension. |
| runtimeHealth | 87.4 | 87.4 | target_met | No score action needed for this dimension. |
| evidenceCompleteness | 84.6 | 84.6 | target_met | No score action needed for this dimension. |
| freshness | 91.88 | 91.88 | target_met | No score action needed for this dimension. |
| costRisk | 80.5 | 80.5 | target_met | No score action needed for this dimension. |
| regressionRisk | 88 | 88 | target_met | No score action needed for this dimension. |

## Old Logic Classification

- Chat UI-only event aliases: superseded - Legacy chat_new_message and chat_thread_* aliases remain accepted while canonical chat telemetry families feed admin truth.
- Broad admin transcript dumps: removed - Broad admin summaries expose counts and source states only; transcript content stays behind guarded drilldown.
- Chat behavioral event facts: still_required - Chat events normalize through event facts and hydrate chat_actions person metrics.
- Blocked/failed chat attempts: still_required - Blocked, failed, paid-GD gate, and purchase CTA signals remain visible in admin/debug summaries.
