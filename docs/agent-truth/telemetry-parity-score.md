# Telemetry Parity Score

Status: canonical public-beta source scoring lane.

KandyDrops telemetry parity scoring is deterministic and source-only. It verifies that critical UI actions use cataloged, consent-aware telemetry through canonical `trackEvent` or server tracking. Critical action payloads must include `source_component`, rely on canonical route/session/auth enrichment, carry entity ids when relevant, and provide reason codes or equivalent failure fields for blocked and failed paths.

## Commands

- `npm run score:telemetry` writes `agent/state/telemetry-parity-score.generated.json`.
- `npm run check:telemetry-parity-score` validates the generated report, scorer source, package scripts, telemetry client consent/enrichment anchors, catalog coverage, and source-of-truth docs.
- `npm run check:event-catalog-telemetry` remains the lightweight catalog/source parity companion check.

Do not use Playwright, Lighthouse, Cypress, full `npm run check`, or broad UI audits for this scorer.

## Scored Surfaces

- Hero CTA: `hero_cta_clicked`.
- Mobile bottom nav: `navigation_click`.
- Drop cards: view, unwrap attempt, refill block, unlock success.
- Featured carousel: `featured_drop_clicked`.
- Locked preview page: page/open, CTA, reaction, unlock, open library, keep unwrapping.
- Wallet: package selection, checkout start, purchase, success, failure.
- Daily check-in: claim.
- Daily tasks: task action.
- Chat: thread open, send attempt, send failure, sent.
- Notifications: opened, marked read, mark all read.
- Support and bug reports: bug feedback submitted and support ticket submitted.
- Creator surfaces: follow, creator alerts, creator experience CTA.

## Payload Doctrine

Critical UI events should include `source_component` at the call site. `src/lib/telemetry.ts` owns global enrichment for `page_path`, `session_id`, viewport, timestamp, and `auth_state`. Surfaces still may provide explicit `route` or `page_path` when the semantic route differs from the current browser path.

Entity ids must be present when the interaction is about a concrete object:

- Drops: `drop_id`, and `creator_id` where available.
- Creators: `creator_id`.
- Chat: `thread_id` and `creator_id` where available.
- Notifications: `notification_id` or an idempotency key for mark-all operations.
- Support: `ticket_id` or the bug-report/support context id.
- Tasks: `task_id`.

Blocked or failed paths must carry `reason_code`, `reason_codes`, `failure_reason`, `error_code`, or a similarly explicit field. The scorer reports missing reason context because blocked paths are where public-beta diagnosis depends on exact user state.

## Consent And Privacy

`trackEvent` must continue to read the privacy-consent snapshot, respect anonymous and identified analytics gates, sanitize backend payloads, and queue/flush identified telemetry through the canonical client. This scorer must never encourage direct analytics calls that bypass consent or session ownership.

## Interpretation

The score starts at 100. Critical findings force `fail`; major findings reduce the score but do not auto-fail unless the threshold is crossed. The scorer does not auto-fix telemetry because the correct payload value usually depends on the current component state.

KandyDrops telemetry parity scoring is deterministic. Critical UI actions must remain cataloged, consent-aware, source-specific, and enriched through canonical session/privacy ownership. Heavy browser audits are forbidden by default unless a finding explicitly escalates to runtime verification.
