# Billing spike radar

Status: deterministic source-level billing multiplier map for runtime, database, logging, media/storage, analytics, materializers, fanout, upload, import/export, and release churn.

Report artifact: `agent/state/billing-spike-radar.generated.json`  
Contract owner: `src/lib/cost/billing-spike-contract.ts`  
Risk math: `src/lib/cost/billing-spike-risk-score.ts`  
Scorer: `npm run score:billing-spikes`  
Validator: `npm run check:billing-spikes`

## Required formulas

1. `risk = activeListeners * averageDocsPerSnapshot * reconnectRate * updateRate`
2. `risk = eventsPerMinute * avgLogBytes * dedupeMissRate`
3. `risk = sessionsPerMinute * eventsPerSession * writesPerEvent`
4. `risk = viewsPerMinute * avgMediaBytes * uncachedRate`
5. `risk = recipients * writesPerRecipient * retryMultiplier`
6. `risk = commitsPerDay * buildMinutesPerDeploy * deployTriggeredRate`
7. `risk = usersScanned * docsReadPerUser * runsPerDay`
8. `risk = filesPerBatch * avgFileBytes * retryCount`

## Surfaces

- `firestore_realtime_listeners`
- `firestore_rules_dependent_reads`
- `firestore_offset_pagination`
- `firestore_unbounded_collection_reads`
- `cloud_logging_debug_evidence_volume`
- `four_xx_logging_volume`
- `app_hosting_uncached_bandwidth`
- `cloud_run_dynamic_route_requests`
- `cloud_run_slow_route_cpu_memory`
- `cloud_build_deploy_churn`
- `artifact_registry_image_retention`
- `secret_manager_access_churn`
- `storage_media_egress`
- `storage_upload_retries`
- `image_optimization_variants`
- `analytics_guest_ingest_volume`
- `analytics_identified_ingest_volume`
- `watch_session_tick_volume`
- `daily_task_reset_materializer_loops`
- `notification_fanout_retry_storms`
- `creator_broadcast_fanout`
- `admin_snapshot_refresh_cadence`
- `behavioral_rebuild_jobs`
- `import_export_bigquery_dataconnect_sync_jobs`
- `release_note_version_update_loops`

## Critical fail doctrine

- Unbounded collection scan in materializer is a critical fail.
- Realtime listener for admin business totals is a critical fail.
- Repeated 4xx/debug logging without dedupe is a critical fail.
- Media routes missing cache/byte/rate caps are a critical fail.
- Notification/broadcast fanout without dedupe/retry caps is a critical fail.
- Upload retry loops without max retries are a critical fail.
- Release-note/version automation that can loop deploys is a critical fail.
- Import/export mutation without dry-run/idempotency is a critical fail.
- Firestore offset pagination on growing collections is a critical fail.
- Rules dependent reads on high-frequency paths without documentation are a critical fail.

## Promo week watchlist

Top watchlist should include all `critical` and `high` surfaces from the generated report, sorted by risk score. The debug control tower may consume this as the “billing spike watchlist” for release week readiness.

## Verification

Run:

```bash
npm run score:billing-spikes
npm run check:billing-spikes
npm run typecheck
```

Do not run Playwright, Lighthouse, Cypress, full `npm run check`, deploy commands, `gcloud`, or Firebase deploy in this lane.
