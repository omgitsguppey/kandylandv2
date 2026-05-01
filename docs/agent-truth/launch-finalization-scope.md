# Launch Finalization Scope

Status: Active launch-scope freeze  
Recorded: 2026-05-01  
Branch baseline: `main` at `371b80cf`

## Purpose

KandyDrops is in launch finalization. The priority is stability, truth, recoverability, and preserving verified behavior. This is not a feature-expansion phase.

This document defines what is launch-critical, what is blocked, what is only a warning, what is deferred, and which code areas are frozen unless a launch blocker proves the change is required.

## Scope Doctrine

- Do not add new features.
- Do not redesign entire pages unless the current page blocks launch.
- Do not touch unrelated modules.
- Do not rewrite architecture unless a launch blocker proves it is required.
- Do not hide failures with cosmetic copy.
- Do not remove validation, source labels, audit metadata, or Debug truth.
- Payment, wallet, GumDrops economy, auth, and admin protection changes require explicit launch-blocker evidence before implementation.

## Launch-Critical Surfaces

- Auth and onboarding
- Drops discovery
- Drop detail
- Wallet and Gum Drops balance
- Purchase flow
- Unlock flow
- Viewer/content access
- Chat/messages
- Notifications
- Creator profile routing
- 404/recovery routes
- Admin overview/analytics/debug truth
- Security/payment/admin route protection
- Mobile bottom-nav and safe-area layout

## Status Categories

### Blocked

No launch blockers are recorded by this baseline. A future item may enter `blocked` only when verified runtime code, configuration, command output, or a failing targeted launch gate proves that launch cannot proceed.

### Warning

- Wallet, Gum Drops balance, purchase, and unlock flows are P0 risk because they affect money, entitlement, and content access.
- Auth, onboarding, viewer access, and protected admin/payment routes are P0 risk because incorrect state can expose data or block valid users.
- Notifications, chat/messages, creator routing, Drops discovery/detail, 404 recovery, and mobile safe-area layout are P1 risk because they affect core launch usage and recoverability.
- Admin overview, analytics, and Debug truth are P2 risk because they must stay truthful, snapshot-first, and human-readable without blocking customer launch paths.
- Recent migrations around hot cache, legacy parity, admin truth copy, notifications, task pipeline, chat routing, and drop card UI should be treated as stabilization zones, not feature-expansion targets.

### Deferred

- New analytics modules or expanded analytics architecture beyond launch truth fixes.
- New creator tools, merchandising systems, profile experiments, or discovery mechanics.
- AI generation feature expansion unless required to fix an existing launch blocker.
- A/B tests, conversion experiments, and speculative personalization.
- Broad visual redesigns, large component rewrites, and non-blocking performance experiments.
- Telemetry schema expansion unless required to keep launch-critical admin truth accurate.
- Non-critical cleanup of oversized modules unless a targeted launch fix already requires touching that file.

## Frozen Feature List

- GumDrops economy mechanics and source-of-funds behavior.
- PayPal and purchase contract semantics.
- Unlock entitlement semantics and viewer access rules.
- Admin Analytics architecture beyond verified snapshot/hot-cache truth fixes.
- Admin Debug evidence model beyond truth-preserving launch fixes.
- Creator profile routing behavior except broken route recovery.
- Chat/message routing behavior except launch-blocking delivery or navigation defects.
- Notification pipeline behavior except duplicate, missing, or false-state launch defects.
- Drops merchandising, ranking, and discovery feature behavior beyond correctness fixes.
- AI/admin generation behavior except launch-blocking failures or unsafe output handling.

## Allowed Change Types

- Verified launch-blocker bug fixes on a launch-critical surface.
- Security, payment, auth, admin route protection, or entitlement fixes backed by a failing check or direct code evidence.
- Truth-preserving copy or diagnostic corrections that expose the real state more clearly.
- Narrow hydration, mobile safe-area, accessibility, or recovery-route fixes required for launch use.
- Targeted tests, validation scripts, docs, and checklist updates tied to launch gates.
- Fixes that preserve existing snapshots, hot-cache truth, Debug metadata, and validation output.

## Forbidden Change Types

- New product features or feature expansion.
- Full-page redesigns or large visual overhauls.
- Architecture rewrites without verified launch-blocker evidence.
- Cosmetic copy that hides a failure, source delay, missing snapshot, or partial state.
- Removing validation, Debug truth, source labels, or audit evidence.
- Publicly caching private admin, payment, wallet, or user data.
- Fake zeros, fake pass states, fake live states, generic waiting, or silent fallbacks.
- Touching unrelated modules while fixing a launch surface.
- Changing wallet, PayPal, GumDrops, unlock, or entitlement semantics without explicit approval and proof.
- Deleting realtime listeners, legacy parity guards, or hot-cache fallbacks because they are inconvenient.

## Required Validation Gates

Use the narrowest relevant gate first. Do not run broad slow audits unless a launch blocker or signoff path requires it.

- Launch baseline: `npm run check:launch-finalization-baseline`
- TypeScript for code/tooling changes: `npm run typecheck -- --pretty false`
- Admin human-readable truth: `npm run check:human-readable-admin-copy`
- Refresh-based hot cache: `npm run check:refresh-based-hot-cache`
- Global loading performance: `npm run check:global-loading-performance`
- Admin truth contracts: `npm run check:admin-truth`
- Admin Analytics hot cache: `npm run check:admin-analytics-hot-cache`
- Notifications: `npm run check:notification-pipeline`
- Chat/profile routing: `npm run check:user-chat-shell-routing`
- Drops mobile/safe-area: `npm run check:drops-mobile-refinement`
- 404/recovery routes: `npm run check:not-found`
- UI coverage/runtime for UI launch fixes: `npm run check:ui:coverage` and `npm run check:ui:runtime`
- Firebase rules changes: `npm run check:firebase:rules`
- Functions changes: `npm --prefix functions run check`

## Risk Ranking

- P0: Auth and onboarding; Wallet and Gum Drops balance; Purchase flow; Unlock flow; Viewer/content access; Security/payment/admin route protection.
- P1: Drops discovery; Drop detail; Chat/messages; Notifications; Creator profile routing; 404/recovery routes; Mobile bottom-nav and safe-area layout.
- P2: Admin overview/analytics/debug truth; analytics hot-cache and parity reports; operational diagnostics.
- P3: Non-critical polish, AI expansion, broad performance exploration, creator tooling expansion, A/B tests, and speculative cleanup.

## Current PR And Commit Risk Notes

- Current branch: `main`.
- Current branch PR: none reported by `gh pr status` on 2026-05-01.
- Baseline commit: `371b80cf refactor(admin): add human-readable truth copy layer`.
- Recent local commits include the admin copy layer, refresh-based hot cache, global loading performance, drop card countdown typography, admin moderation security alert truth, Admin Analytics realtime dependency correction, and chat/profile routing fixes.
- Open adjacent PRs reported by `gh pr status`: #208 CSRF protection for admin refresh, #207/#203/#201 Drops filtering/expiry optimization, #206 creator experiences accessibility, #205 doctrine drift, #204 onboarding friction tracking, and #202 package/source-of-funds audit.
- Risk note: any merge from those PRs must be checked against this scope freeze before combining with launch-finalization work.

## Future-Agent Rule

Before making launch-period changes, classify the surface, prove the blocker or warning with code/config/command evidence, run the targeted gate, and update this baseline only if the launch scope itself changes. Scope expansion is not a default fix path.
