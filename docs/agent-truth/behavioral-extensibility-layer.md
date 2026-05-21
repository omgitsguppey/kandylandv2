# Behavioral Extensibility Layer

Status: pass

Behavioral telemetry now has a catalog-level extension contract. New features must register events in the telemetry catalog and resolve to a behavior feature, consent requirement, identity requirement, persistence lane, materializer lane, aggregation lane, owner, score/evidence impact, and debug visibility before the classifier accepts them as normal behavior.

## Coverage

- Catalog events: 400
- Extension metadata events: 400
- Behavior features: 18
- Required feature registry: drops, creator_profile, creator_timeline, broadcasts, fan_pass, wallet, daily_checkin, library, creator_settings, creator_drop_manager, notifications, admin_debug, search_discovery

## Guardrails

- Unregistered events are quarantined as `unregistered_event`.
- Minimal or necessary-only consent blocks behavioral personalization signals.
- Required purchase/account/security integrity events remain allowed when optional behavior tracking is declined.
- Events without identity requirements or materializer lanes fail validation.
- Debug-visible metadata is generated from the catalog, not from ad hoc tracker code.

## Sample Outcomes

- drop_card_impression with full behavioral consent: accepted
- drop_card_impression with minimal analytics: consent_blocked_behavioral_personalization
- purchase_verified with necessary-only consent: accepted
- unregistered event: unregistered_event

## Warnings

- creator_timeline is registered for future-safe tracking but has no current catalog events

## Failures

- None
