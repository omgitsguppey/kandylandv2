# Analytics Ecosystem Parity

Status: Phase 4 parity doctrine
Last updated: 2026-04-30

## Purpose

Analytics ecosystem parity checks whether KandyDrops tracking lanes agree well enough to use recovered or snapshot data. Parity does not make old data perfect. It tells Admin Debug which sources agree, which sources drift, and which values require manual review before Admin Analytics can trust them.

Parity jobs are non-blocking. They can update Debug metadata and snapshot parity fields after a snapshot renders, but they must not block the Admin Analytics hot-cache-first display path.

## Parity Lanes

Raw ledger vs hot cache snapshots: canonical first-party event records and business records should explain snapshot values. A snapshot can be stale or unavailable, but it must not show fake zeros or unlabeled fallback data.

First-party vs GA4/BigQuery: first-party telemetry is product truth. GA4 daily exports are stable historical validation. GA4 intraday exports are directional and incomplete. GA values can support confidence but cannot overwrite first-party product records.

Purchase parity: internal transaction/payment records must reconcile with purchase telemetry and GA commerce events. Low-confidence purchase telemetry must keep commerce parity in Debug until provider/internal records agree.

Unlock parity: unlock transactions, unlock telemetry, and viewer/watch access should align. Unlock records without viewer/watch evidence are still useful, but Debug must expose the mismatch.

Task parity: user task state and lifecycle logs are preferred over raw task telemetry. Raw task events cannot be labeled canonical lifecycle unless user/task identity linkage proves assigned, started, completed, and failed state order.

Notification parity: notification records should reconcile with push attempts, skipped reasons, opens, reads, clears, duplicate prevention, and web delivery unknowns. Web push delivery can be unknown and must be labeled.

Onboarding parity: onboarding starts and completions come from onboarding step facts. Auth sign-ups are a comparison lane, not the onboarding-start source. A mismatch between auth sign-ups and onboarding starts can be expected.

Guest/auth parity: guest, anonymous visitor, session, and authenticated user lanes stay separate unless an `identity_linked` event connects them. Guest history is not erased when a user signs in.

Admin exclusion parity: admin and system events must not appear in user or guest behavior analytics. This admin exclusion rule applies even when global event tracking keeps the original admin/system event with actor classification preserved.

Creator separation parity: creator behavior must stay in a creator lane unless a module explicitly compares creator activity against another lane.

Snapshot parity: hot cache snapshots include parity rows, warnings, formulas, source breakdown, confidence, and stale/unavailable reasons. Long parity work updates Debug asynchronously.

Legacy mapping parity: legacy records must map into canonical shape with `legacySource`, `legacyId`, `mappingConfidence`, `mappingWarnings`, `sourceMode = legacy_mapped`, and server-confirmed false. Unmapped and low-confidence records stay visible.

Data Validation / Debug parity: validation failures belong in Admin Debug. The full Data Validation card list must not return to Admin Analytics.

## Acceptable Mismatches

- GA4 intraday is lower than first-party current-day product records because intraday export is incomplete.
- Guest quality metrics are unavailable when consented guest quality batches are missing.
- Auth sign-ups differ from onboarding starts because they measure different events.
- Push delivery is unknown on web while notification sent/open/read records are still available.
- Total completed tasks differ from timed completions when some start or completion timestamps are missing.

## Unacceptable Mismatches

- authenticated-only totals labeled as audience totals
- admin events included in user behavior
- guest traffic omitted without a visible label
- stale cache labeled live
- fake zeros for missing metrics
- raw task events labeled canonical lifecycle
- raw funnel event ratios labeled ordered conversion
- unknown source shown as pass
- Data Validation rendered in Analytics instead of Debug
- purchase or unlock parity marked pass when telemetry captures only a small fraction of business records

## Confidence Scoring

This is the confidence scoring rule for parity and legacy recovery:

High confidence means the source is first-party, identity/object/timestamp fields exist, and parity checks pass.

Medium confidence means the record has useful first-party or stable provider evidence but still needs lane-specific reconciliation.

Low confidence means important actor, object, timestamp, or source information is missing.

Directional confidence means the source can explain trends but not exact product truth. GA4 intraday, guest batches without quality evidence, and route snapshots are usually directional.

Unknown confidence means the source did not provide enough structure to classify safely.

## Debug Responsibilities

Admin Debug owns the full parity record: lane, source A, source B, expected relationship, actual values, delta, confidence, severity, recommended fix, self-healing flag, manual-review flag, and snapshot parity row. Debug also owns legacy inventory status, legacy mapping status, earliest/latest recovered dates, mapped/skipped/low-confidence counts, highest-severity mismatches, and write mode state.

## UI Responsibilities

Admin Analytics should show compact analytics insights from verified hot-cache snapshots. It should not show raw parity audit rows. If a module consumes a parity-affected snapshot, it must label stale, fallback, intraday, estimated, unavailable, or mixed source modes plainly and prevent fake zeros.

## Self-Healing Policy

Self-healing is allowed only when it is deterministic and preserves source labels. Examples include using an event catalog to map a display label, suppressing a duplicate legacy candidate by dedupe key, or keeping a stale snapshot visible while Debug runs parity. Self-healing cannot silently promote low-confidence legacy records, merge guest and user history without `identity_linked`, or mark a stale/fallback source as live.

Future agents must not hide parity failures, reintroduce stale validation as pass, or allow legacy mapped records to become server-confirmed current truth.
