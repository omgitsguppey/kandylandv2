# Event Fact Truth

KandyDrops behavioral analytics now uses a canonical event-fact layer before any admin ledger, recommendation, watch-time, or value scoring surface reads action data.

## Canonical fact

`BehavioralEventFact` lives in `src/lib/behavioral/event-fact-contract.ts`.

Every accepted fact carries:

- `eventId`
- raw `eventName`
- `normalizedAction`
- `timestampMs`
- `route`
- `sourceComponent`
- `source`
- `confidence`
- `dedupeKey`
- entity context when relevant

## Source rules

1. Identified telemetry writes canonical event facts into `analytics_event_facts`.
2. Guest analytics may derive legacy behavioral facts only when the event can be normalized with enough context.
3. Unknown events go to diagnostics, not production counts.
4. Raw event names are debug evidence only. Production counts, ledgers, and recommendation inputs use `normalizedAction`.

## Canonical normalized actions

- `onboarding_completed`
- `daily_checkin_claimed`
- `drop_viewed`
- `drop_preview_opened`
- `drop_unwrapped`
- `file_viewed`
- `watch_session_completed`
- `gumdrops_purchased`
- `creator_followed`
- `notification_opened`
- `support_ticket_created`
- `chat_message_sent`

## Dedupe doctrine

- `onboarding_completed`: 24h bucket
- `daily_checkin_claimed`: 20h bucket
- `drop_unwrapped`: permanent per actor + drop
- `gumdrops_purchased`: transaction or event id only
- `file_viewed`: 30s bucket
- `drop_viewed`: 10s bucket
- `notification_opened`: 5s bucket
- `chat_message_sent`: message or event id only

Retries must not inflate global counts, per-user counts, or the admin Action Ledger.

## Downstream consumers

- Admin user detail Action Ledger reads canonical event facts.
- Admin/global metric helpers count deduped normalized facts.
- Behavioral intelligence prefers normalized action facts over raw event-name branching.
- Watch time still comes from watch-session rollups first; legacy page duration remains a labeled fallback.

## Failure doctrine

- Unknown events are surfaced in diagnostics.
- Missing context should fail normalization instead of inventing production counts.
- Legacy fallbacks must be labeled `legacy`.
- No production card should derive user action truth directly from DOM event types, target ids, or random raw event names.
- Admin Debug event-flow diagnostics can show background/server/system/materialized relationship events as context, but those rows must carry eval eligibility reasons. Missing route/session is only a production-count blocker for foreground user telemetry unless the source contract says that server event must carry user/session ownership.
