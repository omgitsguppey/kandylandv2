# Telemetry Orphan Cleanup Audit

This audit covers the first-party telemetry paths that can create or consume analytics facts. The goal is not to delete every old event name. Compatibility aliases and legacy recovery mappings stay when they explain old records and remain classified.

## Doctrine

Telemetry is useful only when every event name has a known source, actor lane, consumer, and audit path. A clean catalog is not enough if an ingest route can still write arbitrary event names into `analytics_event_facts`.

Unsupported telemetry must be rejected before it becomes an analytics fact. Diagnostics can still be recorded as diagnostics. They must not be smuggled into product analytics under uncataloged event names.

Legacy events may remain as aliases when they are needed for recovery or historical parity. They must stay labeled through `legacy_event_name`, `legacySource`, `legacyConfidence`, or equivalent debug metadata.

## Audit Result

The existing literal telemetry audit passed before this cleanup: 287 literal or resolvable emitters were checked across 559 files, with zero catalog entries lacking detected emitters and 1187 parity-contract checks passing.

The gap was at the authenticated ingest boundary. The browser client rejects unsupported events, but `/api/analytics/ingest-identified` accepted any posted `eventName` and could write uncataloged rows into `analytics_event_facts`. That route now resolves every submitted event through the shared telemetry catalog before writing. Unsupported events are skipped, route diagnostics are recorded, and the response includes `skippedUnsupported`.

Compatibility aliases are canonicalized at ingest. For example, `notification_read` writes as `notification_marked_read` and keeps `legacy_event_name` in params.

Legacy `admin_ui_error` is not a product analytics event. If an old client posts it, the route records a server diagnostic and skips the analytics fact write.

## Surfaces Checked

- Client `trackEvent`: guarded by `prepareAnalyticsEvent` and catalog metadata.
- Server `trackServerEvent`: guarded by `resolveTrackedTelemetryEvent`.
- Authenticated ingest API: fixed in this pass.
- Anonymous guest ingest: separate semantic guest-batch lane, not catalog event facts.
- Task telemetry: task definitions resolve against the catalog; Debug reports true task mapping drift.
- Security telemetry: security records are separate; analytics telemetry uses descriptor `telemetryEventName`.
- Admin Debug orphan reporting: retained as a validation surface.
- Legacy recovery: retained with confidence and warnings.

## Residual Risk

`functions/src/analytics-event-facts.ts` remains an exported legacy callable that can write `analytics_event_facts` after auth, App Check, and privacy enforcement. No current repo client caller was found. This pass did not duplicate the app catalog into Functions because that would create a second source of truth. The correct follow-up is a shared generated telemetry manifest consumed by both app and Functions.

Future agents must not remove legacy aliases just because they lack direct current emitters. They also must not allow uncataloged event names into `analytics_event_facts`, `analytics_event_stats`, hot-cache snapshots, or Admin Analytics under any fallback path.
