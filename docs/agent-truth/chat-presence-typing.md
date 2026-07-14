# Chat Presence Typing

Generated: 2026-07-14T04:25:57.008Z

## Ephemeral State

- Presence path: chat_presence/{creatorId}/{userId}/{uid}
- Typing path: chat_presence/{creatorId}/{userId}/{uid}/typing
- Typing write throttle: 3000ms
- Typing stop timeout: 4000ms
- Stale typing max age: 10000ms
- Presence TTL: 45000ms
- onDisconnect cleanup: required

## Debug Lane

- Lane: Chat presence/typing
- Write throttle active: true
- Stale typing cleanup active: true
- Cost risk: bounded

## Telemetry

- chat_typing_started: sampled=true, perKeystrokeAllowed=false, debugVisible=true
- chat_typing_stopped: sampled=true, perKeystrokeAllowed=false, debugVisible=true
- chat_presence_connected: sampled=true, perKeystrokeAllowed=false, debugVisible=true
- chat_presence_disconnected: sampled=true, perKeystrokeAllowed=false, debugVisible=true
- chat_presence_error: sampled=true, perKeystrokeAllowed=false, debugVisible=true

## Score Impact

| Dimension | Before | After | Status | Next action |
| --- | ---: | ---: | --- | --- |
| sourceHealth | 95.5 | 95.5 | target_met | No score action needed for this dimension. |
| runtimeHealth | 70.22 | 70.22 | below_target | Attach formal runtime/debug/cost evidence through existing score lanes; do not treat absence of live typing as a failure. |
| evidenceCompleteness | 80 | 80 | target_met | No score action needed for this dimension. |
| freshness | 92.5 | 92.5 | target_met | No score action needed for this dimension. |
| costRisk | 92.5 | 92.5 | target_met | No score action needed for this dimension. |
| regressionRisk | 94 | 94 | target_met | No score action needed for this dimension. |

## Old Logic Classification

- ChatExperience direct per-change typing write: superseded - Typing writes now pass through the throttled controller before RTDB writes.
- ChatExperience RTDB onDisconnect presence cleanup: still_required - Presence stays ephemeral and self-cleaning through RTDB onDisconnect and unmount removal.
- ChatExperience counterpart presence read: still_required - Counterpart presence remains a participant-scoped RTDB read and is normalized for stale typing expiry.
