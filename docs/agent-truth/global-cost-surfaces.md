# Global Cost Surfaces

Status: deterministic source-only guardrail for non-Google-specific runtime, telemetry, logging, media, auth, CI/build, visual snapshot, notification, rebuild, and third-party analytics cost surfaces.

Report artifact: `agent/state/global-cost-surfaces.generated.json`  
Contract owner: `src/lib/server/global-cost-surface-contract.ts`  
Scorer: `npm run score:global-cost`  
Validator: `npm run check:global-cost`

## Doctrine

KandyDrops cost control is broader than Google API, Cloud SQL, and BigQuery usage. Runtime telemetry, debug evidence, server diagnostics, media proxying, auth abuse, notification fan-out, CI/build minutes, visual snapshot tooling, scheduled rebuilds, analytics materializers, dependency tooling, and future third-party analytics features all need explicit budgets before they can become normal execution paths.

## Hard Limits

- No 1s telemetry ticks. Watch/session visible ticks must be 5s or slower and flush on close, pagehide, or visibility hidden.
- Behavioral timeline ingest must cap low-value diagnostic event volume per session and prefer summary over per-interaction noise for hover/visibility/page-leave style signals.
- Upload telemetry must checkpoint at coarse milestones only, such as 25/50/75/100, and must not emit one event per percentage point.
- Debug evidence dedupes by fingerprint, caps event document writes per fingerprint per hour, rolls up repeats, and never blocks user flows.
- Cloud/server logging must cap detail previews, redact sensitive fields, and avoid full request/response payload logs.
- 4xx traffic must be deduped/sampled by fingerprint to avoid log storms and repeated debug evidence writes.
- Media proxy and signed-url routes require entitlement checks, allowed-host checks, private/no-store cache behavior, byte budgets, rate policies, and no raw asset URL telemetry.
- Auth/signup/login/reset routes require trusted-origin and rate/abuse policies; future phone auth is disabled until an SMS budget guard and fictional QA test-number policy exist.
- Notification fan-out requires idempotency, duplicate prevention, batch caps, recipient caps, retry caps, user preference gates, quality scoring, per-user daily caps, and same-type fatigue throttles.
- Browser audits and visual snapshots are forbidden in default CI and default agent lanes unless explicitly requested with a budget; browser audits stay opt-in.
- Scheduled rebuilds and analytics materializers require dry-run mode, max rows, max runtime, retry caps, bounded source windows, and no every-commit automatic rebuild.
- PostHog, GA, and future session replay must stay consent-aware; session replay is disabled by default until a privacy and budget contract exists.

## Cost Surfaces

- `telemetry_event_volume`
- `posthog_event_volume`
- `ga_event_volume`
- `session_replay_future`
- `cloud_logging_volume`
- `debug_evidence_volume`
- `firebase_storage_egress`
- `media_signed_url_access`
- `image_optimization`
- `firebase_auth_abuse`
- `phone_auth_sms_future`
- `fcm_notification_fanout`
- `cloud_build_minutes`
- `app_hosting_bandwidth`
- `artifact_registry_storage`
- `visual_snapshot_testing`
- `browser_audit_tooling`
- `scheduled_rebuild_jobs`
- `analytics_materializers`
- `dependency_tooling`
- `admin_export_import_jobs`

## Verification

Run:

```bash
npm run score:global-cost
npm run check:global-cost
npm run typecheck
```

Do not run Playwright, Lighthouse, Cypress, full `npm run check`, deploy commands, `gcloud`, Firebase deploys, or paid AI calls from this lane.
