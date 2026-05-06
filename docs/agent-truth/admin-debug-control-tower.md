# Admin Debug Control Tower

Status: public beta admin debug doctrine  
Recorded: 2026-05-04  
Primary UI: `src/app/admin/debug/components/DebugControlTower.tsx`  
Model: `src/lib/admin-debug-control-tower.ts`  
API: `GET /api/admin/debug/control-tower`

## Doctrine

Admin Debug v2 is the mobile-first Control Tower. It surfaces generated public-beta reports, live debug evidence, stale/missing state truth, cost/security/device/telemetry/economy/watch-time/support findings, and deterministic next actions. Missing or stale data must never be shown as healthy. Heavy raw JSON stays collapsed. Existing ops health and creator lane parity remain, but they no longer define the whole debug truth.

## Information Architecture

### Beta Readiness

Shows public beta score, speed/security score, codebase hardening score, device UI dry audit score, Google cost score, content protection score, telemetry parity score, stale report count, and critical count across reports.

### Live Issues

Shows redacted runtime evidence and pre-catcher summaries for active critical issues, support permissions, route failures, wallet/payment failures, booking/Fan Pass typed error failures, chat shell errors, viewer/watch-session failures, analytics ingest failures, and cost guard warnings.

### Device + UI

Shows device UI dry audit, device layout score, chat shell status, wallet density status, image optimization status, preview/content protection status, and the top device findings.

### Money + Cost

Shows GumDrops economy truth, Google cost bleed, Cloud Run/SQL/BigQuery guardrails, Data Connect/Cloud SQL status, BigQuery export/import status, Firestore rate-limit risk, and Storage/media egress risk.

### Telemetry + Behavior

Shows telemetry parity, watch-time truth, analytics ingest health, event catalog drift, unsupported/missing event counts, and behavior scoring confidence.

### Support + Creator Monetization

Shows support admin thread/message access, support route failures, creator booking typed error status, Fan Pass paid-GD truth, creator subscription route health, creator bookings route health, and Creator Lane parity.

## Truth Rules

- Fresh generated reports are those updated within 24 hours.
- Reports older than 24 hours render as stale.
- Beta-critical reports older than 72 hours create a major next action.
- Required beta-critical reports that are missing create critical findings.
- Missing, stale, failed, unavailable, and unknown states must never render as healthy/live.
- Recent diagnostics and downstream writers must separate `currentWindow`, `recentWindow`, `loadedSample`, and `freshnessState`. Current 0 errors / 0 warnings cannot render as ERROR unless the source itself failed.
- Loaded sample errors and warnings are historical sample context. They must be labeled as "Loaded sample history" and may move a channel to review, but they must not mark the current window as ERROR.
- Stale channel sources must show stale or expired freshness even when current counts are clean. Commerce diagnostics that were last seen days ago must not render as fully live unless a documented no-traffic rule is also shown.
- Known loaded sample counts must render as a count, not WAIT.
- Downstream writers must expose `DownstreamWriterTruth`: tracked/configured state, expected activity, freshness, error state, display state, and explanation. Traffic-dependent writers with no activity and no failures render as QUIET, not LIVE or WAIT. Stale writer freshness must not render as LIVE.
- Repeated diagnostics cluster by channel, message, route context, and error name. The default panel row shows cluster count, first/last seen UTC, route context, error name, severity, and suggested action; individual events stay collapsed.
- Every score card exposes `data-truth-state`, `data-debug-report-source`, and `data-debug-report-freshness`.
- Diagnostic channel rows expose `data-debug-diagnostics-channel`, `data-debug-current-window-state`, `data-debug-recent-window-state`, `data-debug-sample-history-state`, `data-debug-channel-freshness`, `data-debug-channel-overall-state`, and `data-debug-last-seen-at-utc`.
- Writer rows expose `data-debug-writer-id`, `data-debug-writer-tracked`, `data-debug-writer-freshness`, `data-debug-writer-error-state`, `data-debug-writer-display-state`, and `data-debug-writer-expected-activity`.
- Diagnostic cluster rows expose `data-debug-diagnostic-cluster-key` and `data-debug-diagnostic-cluster-count`.
- Panel status by section uses `DebugSectionStatus` and typed signals. Inventory and activity counts such as bug intake, rollout entries, release entries, and tracked telemetry render as INFO unless a risk threshold is breached. Signal totals are shown separately from needs-review counts.
- ERROR is reserved for active errors, active critical findings, source failures, required missing reports, and high-risk stale runtime lanes. REVIEW is used for active warnings, actionable repairs, orphaned telemetry, stale runtime samples, and recent non-active errors that need inspection.
- Task Issues Attribution rows must expose `expectedSource`, `foundSource`, `issueType`, `sourceFreshness`, and task eligibility. "Expected X tasks, found Y" is incomplete without source provenance. User task assignment state is the canonical found source for assignment gaps; telemetry samples may support diagnosis but must not create ERROR by themselves. Known diagnostic values must not render as WAIT.
- Repairs available now must render one card per canonical source path, repair kind, and missing-context reason. Duplicate proposals collapse into a single card with `duplicateCount`, duplicate ids, first/last seen UTC, source context state, missing context fields, and actionability. Inspect-only proposals are review items, not actionable repairs, and must not show Apply as the primary action.
- Raw generated evidence must stay capped and collapsed. The overview must not render giant JSON dumps.

## Critical Reports

The Control Tower treats these as beta-critical:

- `agent/state/public-beta-score.generated.json`
- `agent/state/speed-security-hardening.generated.json`
- `agent/state/codebase-hardening.generated.json`
- `agent/state/device-ui-dry-audit.generated.json`
- `agent/state/content-protection-score.generated.json`
- `agent/state/google-cost-bleed.generated.json`
- `agent/state/cloudrun-sql-bigquery-guardrails.generated.json`
- `agent/state/gumdrop-economy-score.generated.json`
- `agent/state/telemetry-parity-score.generated.json`

## Mobile Layout

The first screen is a compact card stack: summary card, horizontal chip rail, top findings, live issues, grouped score cards, and recommended next actions. Touch targets are at least 44px. Tablet and desktop may use two or three card columns, but mobile remains one-column-first with no primary table view and no horizontal scrolling except the filter chip rail.

## Validation

Use:

- `npm run check:admin-debug-control-tower`
- targeted Control Tower unit tests
- `npm run typecheck` if TypeScript changed

Do not use Playwright, Lighthouse, Cypress, full `npm run check`, or broad UI audit lanes for this source-level admin debug refresh.
