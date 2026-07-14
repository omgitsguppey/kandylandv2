# Creator Monetization Settings Truth

Generated: 2026-07-14T16:06:28.627Z
Current head: dc4dad82c
Status: fail

## Coverage

- Contract: pass
- Resolver: pass
- Consumers: pass
- Telemetry: pass
- Person metrics: pass
- Feature registration: pass
- Debug lane: Creator monetization settings
- Payment runtime: changed
- Payout math: changed
- GumDrop math: unchanged

## User-Facing Consumers

- public_creator_profile
- creator_profile_timeline
- creator_experiences_panel
- chat_pricing
- fan_pass_access
- broadcasts
- drop_manager

## Telemetry Events

- creator_monetization_settings_viewed
- creator_monetization_setting_changed
- creator_monetization_save_succeeded
- creator_monetization_save_failed
- creator_monetization_user_surface_applied
- creator_monetization_mismatch_detected

## Remaining Gaps

- Fix the first failing resolver, consumer, telemetry, or dirty-file scope assertion.
