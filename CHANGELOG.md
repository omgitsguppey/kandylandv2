# Changelog

What's new in KandyDrops Beta (latest first).

Showing the last 25 public updates in pages of 5.

## 1.4.77 - 2026-05-26
- Fan Pass lifecycle
- Added Fan Pass lifecycle and access contracts.
- Connected Fan Pass visibility, access, chat bypass, telemetry, and debug truth.
- Kept payment runtime and GumDrop math unchanged.

## 1.4.76 - 2026-05-25
- Media discovery score lock
- Locked media upload, private access, creator discovery, and search telemetry readiness.
- Connected discovery and media events to debug, person metrics, and score.
- Kept private media and search data protected.

## 1.4.75 - 2026-05-25
- Search discovery telemetry cost
- Added search and discovery telemetry with cost-safe query behavior.
- Tracked zero-result searches, result clicks, and search failures.
- Protected raw search text from broad telemetry exposure.

## 1.4.74 - 2026-05-25
- Creator discovery relationship funnel
- Mapped creator discovery, recommendations, profile clicks, and follow actions into telemetry.
- Added person/global metrics for creator relationship funnels.
- Added debug visibility for creator relationship failures.

## 1.4.73 - 2026-05-25
- Private media access
- Added private media access reasons and telemetry.
- Protected chat, drop, and creator media behind explicit access checks.
- Added debug visibility for blocked and missing media.

## 1.4.72 - 2026-05-25
- Media upload lifecycle
- Hardened media upload prepare, storage, and completion lifecycle tracking.
- Added debug visibility for upload failures and orphan risks.
- Protected private storage paths from broad telemetry exposure.

## 1.4.71 - 2026-05-25
- Final parity telemetry lock
- Locked surface parity, telemetry parity, state feedback, and role permissions.
- Simplified debug lanes for product consistency.
- Reported score impact by dimension.

## 1.4.70 - 2026-05-25
- Role permission parity
- Standardized role and permission rules across user, creator, admin, and guest surfaces.
- Added telemetry for permission denials and route mismatches.
- Protected admin and creator controls from leaking into the wrong surfaces.

## 1.4.69 - 2026-05-25
- Surface state parity
- Standardized loading, empty, error, degraded, and permission states across surfaces.
- Connected surface states to telemetry and debug.
- Removed raw developer-facing state copy where safe.

## 1.4.68 - 2026-05-25
- Surface telemetry parity
- Standardized telemetry events across major product surfaces.
- Mapped surface state and action events into the canonical event envelope.
- Grouped missing telemetry parity issues in debug.

## 1.4.67 - 2026-05-25
- Surface parity doctrine
- Added canonical surface parity doctrine.
- Mapped major user, creator, admin, and public surfaces to roles, states, telemetry, and debug lanes.
- Retired stale parity logic where superseded.

## 1.4.66 - 2026-05-25
- Admin hot-cache heartbeat
- Moved admin surfaces toward hourly hot-cache snapshots and removed default realtime/raw-read behavior.
- Added shared admin heartbeat, hydration states, and cost-estimate evidence.
- Preserved user-facing chat realtime while preventing admin pages from polling themselves to death.

## 1.4.65 - 2026-05-25
- Compact Platform pulse
- Compact Platform pulse into six rolling-30-day stats with clear trend deltas.
- Removed success badges and debug subtext from pulse cards while preserving issue badges.
- Added GumDrops circulation and Support/Bugs metrics using summary-first source truth.

## 1.4.64 - 2026-05-25
- Behavior stack source reconstruction
- Rebuilt behavioral, task, telemetry, recovery, and experiment debug source contracts to eliminate loaded zero-shells.
- Added source windows, formula states, rebuild provenance, and deterministic baseline requirements.
- Separated real zero, no sample, missing source, stale rebuild, and formula-missing states across advanced debug panels.

## 1.4.63 - 2026-05-25
- Analytics module coverage repair
- Repaired global analytics module coverage source policies and module-specific evidence mapping.
- Separated required and optional module gaps, accepted substitute sources, and GA4 external evidence.
- Stopped Admin/Runtime/Notification/Task modules from being marked empty when canonical internal evidence exists.

## 1.4.62 - 2026-05-25
- Unlock and watch parity repair
- Repaired unlock, viewer start, and watch capture parity across transactions, telemetry, rollups, and journey metrics.
- Added server unlock telemetry and viewer start instrumentation without changing access or GumDrop math.
- Made replay recovery visible through explicit watch capture quality thresholds.

## 1.4.61 - 2026-05-25
- Commerce purchase parity repair
- Repaired commerce parity between purchase ledger, server telemetry, rollups, and journey metrics.
- Added canonical server purchase telemetry after verified PayPal capture without changing payment math.
- Kept creator spend source-of-funds restrictions passing.

## 1.4.60 - 2026-05-25
- Task guidance parity repair
- Repaired task guidance telemetry parity across UI instrumentation, event normalization, and admin validation.
- Separated task lifecycle/onboarding activity from task guidance UI evidence.
- Kept task reward, reset, and GumDrop math unchanged.

## 1.4.59 - 2026-05-25
- Telemetry parity gate repair
- Fixed telemetry parity pass gating for low-confidence samples and refresh diagnostics failures.
- Separated event sample presence from parity readiness.
- Mapped Analytics.IngestIdentified and unknown route diagnostics into blocking telemetry parity evidence.

## 1.4.58 - 2026-05-25
- Analytics source hierarchy repair
- Fixed analytics chart readiness hierarchy so source agreement failure blocks ready status.
- Separated GA4 report availability from usable chart data.
- Aligned Debug validation and Analytics tab source-of-truth states.

## 1.4.57 - 2026-05-25
- Bug validation truth cleanup
- Fixed Bug Report Truth terminal loading states and redacted source handling.
- Separated analytics chart readiness from source agreement and validation parity.
- Made blocked validation passes actionable without implying chart data is unavailable.

## 1.4.56 - 2026-05-25
- AI repair workbench
- Refactored AI Debug Assistant into an async repair workbench with bounded context, deterministic triage, critic review, and approval gates.
- Separated deterministic fallback summaries from repair proposals.
- Prevented live AI calls, raw sensitive context, and silent auto-apply without explicit approval.

## 1.4.55 - 2026-05-25
- Infrastructure dependency inventory
- Expanded infrastructure dependency inventory to include every root/functions dependency, override, external service, and expected-absent dependency.
- Separated package inventory from runtime connectivity checks.
- Replaced fake package updated timestamps with explicit timestamp-unavailable classification.

## 1.4.54 - 2026-05-25
- Queue drop metadata cleanup
- Resolved queue dispatch drop metadata enrichment and scheduler key timestamp parsing.
- Separated notification dispatch outcomes from debug metadata enrichment gaps.
- Replaced generic Unknown drop rows with bounded metadata status and fallback labels.

## 1.4.53 - 2026-05-24
- Queue continuity cleanup
- Separated queue heartbeat evidence from dispatch outcome readability.
- Classified missing queue heartbeats, dispatch outcomes, and legacy adapter drift.
- Prevented queue continuity from showing live when scheduler heartbeat evidence is missing.

## 1.4.52 - 2026-05-24
- Commerce source truth cleanup
- Added source-of-funds truth for unlock transactions and recent commerce feed display.
- Redacted full user IDs from default transaction summaries.
- Mapped same-user commerce sequences into bounded behavioral journey evidence.

## 1.4.51 - 2026-05-24
- No-sample route cohort cleanup
- Finalized no-sample route cohort classification.
- Removed false LIVE states from unseen route runtime cards.
- Added high-risk smoke plans and optional/manual/legacy route policies.
