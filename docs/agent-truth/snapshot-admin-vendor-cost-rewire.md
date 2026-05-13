# Snapshot/Admin/Vendor/Cost Rewire

This Phase 4 contract turns the earlier analytics rewire maps into a simplification authority plan. It is static/local only: it reads the Phase 1 truth-lane inventory, Phase 2 identity/privacy/raw-ledger report, and Phase 3 lost-data recovery dry run. It does not prove production data, change runtime behavior, query Firebase, scan BigQuery, call GA4/PostHog, or deploy anything.

## Why This Exists

KandyDrops has multiple analytics truth lanes that can describe the same operator-facing concept. Phase 4 decides which authority should win before any UI, route, or materializer runtime refactor happens.

The contract exists to:

- collapse duplicate snapshot authority;
- stop Admin Analytics from using raw collections as compact display truth;
- keep Admin Debug as the first surface for formulas, source details, recovery evidence, and drift;
- keep GA4, PostHog, and BigQuery as evidence/export/estimate lanes rather than product truth;
- identify cost simplification work without adding reads, listeners, jobs, provider calls, or scans.

## Canonical Snapshot Authority

`analytics_admin_metric_snapshots` is the recommended canonical Admin Analytics display snapshot layer.

`analytics_aggregate_stats/realtime_summary` is legacy/fallback/live-pulse/evidence unless a specific route explicitly owns it. It must be demoted behind `analytics_admin_metric_snapshots` for module display truth.

Raw collections such as `analytics_event_facts`, `analytics_guest_batches`, `analytics_sessions`, `analytics_watch_sessions`, and `behavioral_timeline_facts` are raw ledger inputs, materializer inputs, bounded fallback evidence, or Admin Debug evidence. They are not compact Admin Analytics display truth.

## Admin Analytics Responsibility

Admin Analytics shows compact operator truth. It should prefer verified snapshots and clear state labels.

Allowed:

- `analytics_admin_metric_snapshots`;
- stale verified snapshots when labeled;
- bounded fallback when labeled and fake-zero protected;
- vendor estimates only when labeled as estimates and never overriding first-party truth.

Forbidden:

- direct raw event display;
- raw guest batch/session/watch display as product truth;
- GA4/PostHog/BigQuery as product truth;
- fake zero;
- fake live;
- unlabeled estimates;
- missing sample as zero;
- stale snapshot as live.

Every display source must carry source/freshness labels such as `live`, `verified_cache`, `stale_cache`, `estimated`, `fallback`, `unavailable`, or `debug_only`. A zero value is valid only when source sample or denominator evidence exists.

## Admin Debug Responsibility

Admin Debug is the first surface for:

- recovery lanes;
- raw collection details;
- source formulas;
- mapping warnings;
- confidence labels;
- missing samples;
- stale snapshots;
- vendor parity;
- cost warnings;
- duplicate authorities;
- fallback reasons.

High-value recovered data must appear in Admin Debug before it is promoted to Admin Analytics. Debug should explain source paths, identity keys, consent requirements, mapping warnings, confidence, drift, and blockers.

## Vendor Evidence Boundary

GA4 is evidence/estimate/debug parity only. Intraday or realtime values are directional and must be labeled.

PostHog is vendor evidence only. It cannot override first-party product truth and must not become a readiness dependency.

BigQuery is export/evidence only. It must not become runtime/Admin Analytics display truth, and `LIMIT` must not be treated as cost control for raw scans.

## Cost Simplification Rules

Future runtime simplification should:

- remove or demote repeated admin raw reads;
- keep Admin Analytics snapshot-first;
- route formulas and raw details to Admin Debug;
- avoid duplicate materializers and duplicate display authorities;
- avoid vendor/provider calls in readiness checks;
- avoid BigQuery as runtime truth;
- avoid realtime listener dependence for display truth;
- use bounded snapshots and explicit stale/fresh labels.

This phase only records candidates. It does not remove listeners, routes, materializers, or UI behavior.

It also does not make runtime UI/route changes.

## Recovery Surfacing Gates

Recovered lanes from the dry-run report keep their Phase 3 rules:

- identity links, guest indexes, user journey indexes, behavioral timeline facts, notification facts, support/recovery facts, legacy recovered events, guest batches, sessions, and raw event facts are Debug-first by default;
- watch sessions may become Admin Analytics eligible only through watch-session rollups/snapshots;
- purchase facts may become Admin Analytics eligible only through server/payment/transaction truth snapshots;
- unlock facts may become Admin Analytics eligible only through entitlement/server truth snapshots;
- legacy recovered events remain Debug-only/needs review until mapping confidence and consent review pass.

## Future Runtime Phases

Use `agent/state/snapshot-admin-vendor-cost-rewire.generated.json` to scope later runtime work:

1. collapse Admin Analytics display reads behind `analytics_admin_metric_snapshots`;
2. demote `analytics_aggregate_stats/realtime_summary` to fallback/live-pulse/evidence;
3. move raw details and recovery evidence to Admin Debug;
4. add or verify source/confidence/freshness labels;
5. lock fake-zero and vendor-boundary behavior with validators.

## Phase 5 Runtime Collapse Note

The first runtime collapse pass applies this contract to `/api/admin/analytics/realtime`: it reads `analytics_admin_metric_snapshots/live_pulse:24h` before `analytics_aggregate_stats/realtime_summary`, labels `realtime_summary` as fallback evidence, and no longer rebuilds compact display truth from GA realtime or raw analytics collections when no verified snapshot exists. Broader historical-route and recovery-surfacing consolidation remains future work.

## Phase 6 Historical Route Note

The second runtime collapse pass applies the same source-order rule to compact `/api/admin/analytics/historical` sections. Historical display requests now check `analytics_admin_metric_snapshots` before GA/vendor/raw sources. If a verified snapshot payload is missing or lacks display evidence, the route returns an unavailable state and labels raw collections as `admin_debug_raw_evidence_only` instead of rebuilding compact display truth from `analytics_event_facts`, `analytics_guest_batches`, `analytics_sessions`, or watch/session logs. Admin Debug exposes the historical route authority metadata, fallback reason, vendor boundary, and recovery metadata rule, but it still does not surface recovered data as Admin Analytics truth.

## Phase 7 Debug Recovery Evidence Note

The Debug-first recovery pass adds an `adminAnalyticsRecoveryEvidence` payload to `/api/admin/debug` and renders it in the existing Admin Debug evidence stack. The payload reads the local Phase 3 dry-run report, lists required recovery lane keys, source paths, source truth labels, source confidence, consent requirements, blockers, mapping warnings, and promotion state. Every lane keeps `productionAllowedNow=false` and `adminAnalyticsPromotedNow=false`.

This downgrades the recovery-surfacing issue only to partial/Debug-landed status. It does not promote recovered values into compact Admin Analytics, does not backfill production data, and does not prove any lane is ready for canonical display. Later phases still need module-level vendor/source label review, confidence validation, snapshot promotion rules, and cost simplification.

## Phase 8 Module Label Note

The module label pass applies the vendor/source boundary to existing Admin Analytics module copy and data attributes. Audience, operations, and commerce modules now label first-party snapshot display as verified snapshot data, vendor-derived GA evidence as estimated/supporting evidence, and recovery evidence as Debug-only/review-only before promotion.

This does not add new charts, promote recovered data, query providers, or prove production recovery. It only makes module-level labels match the route authority collapse so GA4/PostHog/BigQuery and raw/recovered evidence cannot look like compact product truth.

## What This Report Must Not Be Used For

This report must not be used to claim production data was recovered, to approve a production backfill, to prove provider smoke, to mark screenshots complete, to change Admin UI, to alter API behavior, to add Firebase reads/listeners, or to run BigQuery/provider work. It is a local static planning contract and validator input only.
