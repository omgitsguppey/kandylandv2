# Launch PR Triage

Status: Active triage report  
Recorded: 2026-05-01  
Baseline: `main` at `9b435162`  
Scope: open PRs plus latest 20 commits

## 2026-05-03 Current Resolution

Open bot PRs must be cherry-picked by current-source relevance. Duplicate Bolt/Jules branches should not be merged wholesale. Public beta fixes prioritize current source-of-truth, no UI regression, and targeted validation over broad stale branch merges.

This pass did not merge stale branches. It manually applied or confirmed only current-source-relevant hunks:

- #214 `useDrops` optimization is the survivor for #201/#203/#207/#211/#214: filtering and next-expiration detection run in one pass and the refresh timer depends on primitive `nextExpiryMs`. `.jules` notes and stale audit doc noise were not imported.
- #210 is the survivor for #206/#210: Creator Experiences expandable modules expose `aria-expanded`; true selected request category and booking type toggles expose `aria-pressed`; no visual or commerce logic changed.
- #208 is already present on `main`: the admin analytics refresh POST route includes `requireTrustedOrigin: true` while preserving admin auth, preauth, and rate limits.
- #202/#212 source-of-funds PRs are not merged raw because their wallet UI text/design changes are not accepted. The accounting truth is handled by current `gumdrop-ledger`/PayPal capture source-of-funds logic without wallet copy regressions.
- #209/#213 were cherry-picked only for exact current-source cleanup: no `Coins` vocabulary drift, no empty telemetry catch blocks in the touched admin uploader, and admin truth badges/labels degrade to `Needs review`/`degraded` instead of false healthy/live states.
- #204 was not merged raw. Only narrow telemetry rescue was retained: critical wallet/preview/viewer/follow events flush immediately when allowed, and wallet close-incomplete is classified without bypassing consent or changing checkout/payment behavior.

Original 2026-05-01 baseline note: No PR was merged, closed, rebased, or edited during this pass.

## Executive Summary

- First manual review: PR #208, the admin analytics refresh CSRF fix.
- Clean low-risk merge candidate: PR #206, creator experiences ARIA state attributes.
- Duplicate group: PR #207, #203, and #201 all optimize `src/hooks/useDrops.ts`; only one should survive. Prefer #207 if this optimization is accepted.
- Human review required: PR #202 and #204 touch purchase/drop telemetry or source-of-funds truth during launch freeze.
- Do not merge as-is: PR #205 is dirty, adds `pnpm-lock.yaml`, and predates the current admin copy and DropCard launch fixes.
- Recent analytics truth and hot-cache commits must remain authoritative. Older PRs must not reintroduce realtime-first loading, generic waiting, fake pass states, raw backend copy, or public/private cache confusion.

## Open PR Classification

| PR | Classification | Risk | Launch relevance | Recommendation |
| --- | --- | --- | --- | --- |
| #208 Sentinel CSRF admin analytics refresh | Launch blocker, merge candidate | High | P0 security/admin route protection | Review first and merge after refresh-route tests. |
| #207 Bolt useDrops perf | Needs verification, merge candidate | Medium | P1 Drops performance | Prefer this as the only surviving useDrops optimization if accepted. |
| #206 Creator Experiences ARIA | Merge candidate | Low | P1 creator accessibility | Merge after quick TypeScript/accessibility check. |
| #205 Doctrine drift cleanup | Post-launch, risky/human review | High | Admin truth, Drop cards, wallet UI | Do not merge as-is; remove `pnpm-lock.yaml` and cherry-pick only if still needed. |
| #204 Onboarding friction telemetry | Risky/human review, needs verification | High | Purchase/drop telemetry | Rebase manually only if launch-critical; verify telemetry contract. |
| #203 Bolt useDrops perf | Duplicate/superseded | Medium | P1 Drops performance | Supersede with #207. |
| #202 Package source-of-funds truth | Risky/human review, needs verification | High | P0 wallet/purchase truth | Manually review; apply narrowly only if current UI still misstates paid vs bonus GumDrops. |
| #201 Bolt useDrops perf | Duplicate/superseded | Medium | P1 Drops performance | Supersede with #207. |

## Required Tests By Candidate

- PR #208: `npm run check:refresh-based-hot-cache`, `npm run check:global-loading-performance`, `npx vitest run tests/unit/admin-analytics-refresh-route.spec.ts`, `npm run typecheck -- --pretty false`.
- PR #207: `npm run check:drops-mobile-refinement`, targeted drop tests including `drop-status` and `drop-countdown`, `npm run typecheck -- --pretty false`.
- PR #206: `npm run typecheck -- --pretty false` plus a targeted creator experiences render/accessibility check if present.
- PR #202: targeted PurchaseModal/economics tests, wallet smoke check, `npm run typecheck -- --pretty false`.
- PR #204: `npm run check:telemetry`, `npm run check:analytics-event-contract`, targeted PurchaseModal/DropPreviewModal tests, `npm run typecheck -- --pretty false`.
- PR #205: `npm run check:human-readable-admin-copy`, `npm run check:drops-mobile-refinement`, `npm run check:admin-truth-replacement`, `npm run typecheck -- --pretty false` after removing package-manager drift.

## Duplicate And Conflict Notes

- PR #207, #203, and #201 all modify `src/hooks/useDrops.ts` for the same single-pass filtering and expiry-timer calculation. Merging more than one would duplicate the same idea and risk subtle timer/filter regressions.
- PR #205 touches `src/components/DropCard.tsx`, but recent DropCard work split card pieces, changed countdown typography, and added validation. Treat the PR as stale.
- PR #204 and #202 both touch `src/components/PurchaseModal.tsx`; they need a manual combined decision because wallet and purchase semantics are frozen.
- PR #208 touches the same refresh route as recent hot-cache and global-loading commits. It is clean, but the route tests must confirm it does not break snapshot preservation.

## Latest 20 Commits

Latest 20 commits are tracked as the launch baseline commit window for this triage.

The latest 20 commits are included in `agent/state/launch-pr-triage.generated.json` with files, system area, risk, conflicts, tests, and recommendations.

High-level read:

- Launch governance, admin truth copy, refresh-based hot cache, global loading performance, Admin Analytics hot-cache migration, analytics event contract, and legacy parity are the current source-of-truth baseline.
- Chat/profile routing, not-found recovery, mobile shell spacing, notification dedupe, and Drop card timer typography are launch stabilization commits and should not be casually overwritten by older PRs.
- The analytics commits are high-blast-radius but already on `main`; protect them with their validation gates instead of reopening the architecture during launch freeze.

## Source-Of-Truth Docs And Validators

Every open PR classification records whether it touches source-of-truth docs or validators.

Notable items:

- PR #208 touches `.jules/sentinel.md`.
- PR #207, #203, and #201 touch `.jules/bolt.md`; #207 also touches `FULL_SCALE_CODEBASE_AUDIT.md`.
- PR #204 touches `FULL_SCALE_CODEBASE_AUDIT.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md`, and `src/lib/telemetry-catalog.ts`.
- PR #202 touches `FULL_SCALE_CODEBASE_AUDIT.md`.
- PR #205 does not add validation and introduces `pnpm-lock.yaml`, which is a package-manager risk.

## Recommendation Order

1. Review PR #208 first.
2. Review PR #206 if accessibility polish is desired before launch.
3. Decide whether `useDrops` performance optimization is launch-needed. If yes, use #207 and mark #203/#201 superseded.
4. Manually review #202 for current purchase UI truth. Apply only the minimal source-of-funds display fix if still needed.
5. Defer or manually rework #204 unless onboarding friction telemetry is declared launch-critical.
6. Do not merge #205 as-is.
