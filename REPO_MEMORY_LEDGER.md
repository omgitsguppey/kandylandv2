# Repo Memory Ledger

Status: Canonical repository-memory and architecture-decision ledger
Last refreshed: 2026-05-02
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`

## 2026-05-04 Watch time truth and behavioral scoring

Watch time is foreground visible content engagement, not page duration. Viewer watch sessions start only after loaded content is at least 50 percent visible in a visible document, use coarse 5s visible ticks, exclude hidden/offscreen/modal-covered/idle time, and score image/video sessions through `src/lib/watch-time-scoring.ts`. `/api/viewer/watch-session` writes consent-aware rollups with `watchScoreSource: "watch_session_rollup"` and no internal content URLs. Behavioral intelligence prefers watch rollups and labels page-duration-only history as `legacy_page_duration`. `npm run check:watch-time-truth` validates the lane.

## 2026-05-04 Fan Pass paid-source GumDrops truth

Fan Pass is a paid-source GumDrops subscription. Daily/task/reward GumDrops cannot start or renew Fan Pass. Paid package bonus GumDrops count as paid-source only if credited to purchased balance by wallet capture truth. Expected Fan Pass failures must return typed safe errors, never generic internal server errors. `src/app/api/creator/subscriptions/route.ts` keeps `spendCreatorExperienceGumdrops(balance, priceGd, "subscription")`, writes `purchasedOnly: true`, short-circuits duplicate active subscriptions before charging, keeps cancel no-charge, and adds renewal-readiness fields without running renewals. `src/lib/problem-state-copy.ts` owns `getCreatorSubscriptionProblemCopy(...)`; `npm run check:fan-pass-gumdrops-truth` validates this lane.

## 2026-05-04 Creator booking typed error truth

Creator booking expected failures must never surface as generic internal server errors. Availability, missing booking-hour configuration, slot conflicts, paid-GD shortfalls, disabled booking lanes, and creator availability must return typed safe error codes with human-readable client copy. `src/app/api/creator/bookings/route.ts` aborts expected Firestore transaction failures through a typed booking problem response while preserving paid-only GumDrops spending, idempotency, creator accrual, and ledger writes for valid bookings. `src/lib/problem-state-copy.ts` owns `getCreatorBookingProblemCopy(...)`, and `npm run check:creator-booking-error-copy` validates that expected booking failures do not rely on plain thrown errors or user-facing internal-server fallbacks.

## 2026-05-04 Orphaned logic score

KandyDrops orphaned logic scoring is deterministic and source-only. It detects duplicate normalizers/truth helpers, legacy preview ownership drift, duplicate useDrops/PR audit notes, broken generated doc chunks, route migration leftovers, stale docs, wrong GumDrops vocabulary, obsolete realtime patterns, duplicate telemetry intent names, and dead imports in public beta surfaces without browser audits or broad terminal sweeps. `npm run score:orphans` writes `agent/state/orphaned-logic-score.generated.json`; `npm run check:orphaned-logic` validates the report, package scripts, scorer rules, full-page preview doctrine, launch PR triage doctrine, telemetry duplicate-intent evidence, and governance docs. Cleanup is advisory only unless TypeScript and exact-text evidence prove a safe unused import or duplicate broken doc chunk.

## 2026-05-04 Google cost bleed score

Google cost-bearing surfaces must be declared before use. Firestore, Storage, Google Analytics Data API, Vertex AI, Cloud Run/App Hosting, and any SQL/Data Connect runtime must have route-level cost contracts, budget guards, bounded rate limits, cache policies, and debug evidence. The app must fail audits before it surprises billing. `src/lib/server/api-cost-contract.ts` owns `ApiCostContract` and route classifications; `npm run score:google-cost` writes `agent/state/google-cost-bleed.generated.json`; `npm run check:google-cost` validates the report, contracts, docs, scripts, classified API routes, and forbidden-command budget. The score lane is advisory-only and must not auto-fix auth, payment, media, AI, analytics, SQL, or business logic.

Firebase Data Connect is not absent. `dataconnect/dataconnect.yaml` targets Cloud SQL instance `kandydrops-db`, PostgreSQL database `kandydrops_db`, in `us-central1`. The allowed classification is `sql_dataconnect_agent_context_mirror` for `dataconnect/dataconnect.yaml`, `dataconnect/schema/*.gql`, `dataconnect/example/*`, `scripts/agent/sync-sql.ts`, `agent/state/sql-sync.payload.generated.json`, and `agent/state/sql-mirror-status.generated.json`. This cost-bearing surface is allowed only for agent/repo intelligence mirror use. User, payment, Drop, chat, support, and creator runtime flows must not use SQL/Data Connect unless an explicit owner-approved `ApiCostContract` classifies that route. Source proves configuration, not provider billing state; active/paused/deleted/billed state for `kandydrops-db` remains owner-confirmed.

KandyDrops uses Firebase Data Connect with Cloud SQL only as an agent-context mirror unless explicitly promoted. Cloud Run max instances and concurrency must protect Cloud SQL and AI surfaces. BigQuery exports/imports must be validated, documented, and blocked from mutating runtime balances/transactions unless an explicit dry-run/idempotent import contract exists. `src/lib/server/cloud-cost-contract.ts` owns `CloudRunServiceGuardrail`, `SqlCostSurface`, and `BigQueryPipelineContract`; `npm run score:cloud-cost` writes `agent/state/cloudrun-sql-bigquery-guardrails.generated.json`; `npm run check:cloud-cost` validates the report and docs. The lane suggests Cloud Console/gcloud actions as documentation only and must not execute deploy/provider jobs.

## 2026-05-04 Locked content protection score

KandyDrops locked content protection scoring is deterministic. Locked preview and guest/user surfaces may show cover art, safe metadata, file counts, and public social proof, but must never render internal content URLs, internal thumbnails, blurred internal previews, or raw storage URLs before entitlement. Viewer and content APIs must prove entitlement before fetching or streaming content. `npm run score:content-protection` writes `agent/state/content-protection-score.generated.json`; `npm run check:content-protection` validates the report, scorer, package scripts, `sanitizeDropForClient`, safe preview fields, content proxy entitlement, viewer gating, legacy modal safety, and targeted tests without browser audits or broad terminal sweeps. Content-protection findings are not auto-fixed by default.

## 2026-05-04 Telemetry parity score

KandyDrops telemetry parity scoring is deterministic and source-only. Critical UI actions must use cataloged, consent-aware telemetry through canonical `trackEvent` or server tracking, include `source_component`, rely on route/session/auth enrichment, carry entity ids such as `drop_id`, `creator_id`, `thread_id`, `ticket_id`, `notification_id`, or `task_id` when relevant, and include reason context for blocked or failed paths. `npm run score:telemetry` writes `agent/state/telemetry-parity-score.generated.json`; `npm run check:telemetry-parity-score` validates the report, scorer, package scripts, telemetry client consent/enrichment anchors, catalog coverage, and docs without browser audits or broad terminal sweeps.

## 2026-05-04 MSW user flow scenarios

KandyDrops MSW scenarios are deterministic API fixtures, not production fallback state. They model wallet, Drops, chat, notifications, support, and creator profile user-side states without Firebase, browser automation, or live network access. `tests/mocks/scenarios.ts` owns the named fixture states, `tests/mocks/handlers.ts` maps user-side API routes, and `tests/mocks/server.ts` exposes the reusable Node MSW server for targeted Vitest tests.

## 2026-05-04 GumDrops economy score

GumDrops economy scoring is deterministic. Paid package base and bonus GumDrops are paid-source balance, reward/task/referral/onboarding/admin grants are reward-source balance, creator monetization spends purchased balance only, and normal Drops may use total source-aware balance. `npm run score:economy` writes `agent/state/gumdrop-economy-score.generated.json`; `npm run check:gumdrop-economy` validates the report, scorer, package scripts, source truth, and targeted tests without browser audits or broad suite runs. Economy findings are not auto-fixed because source-of-funds, payment, creator monetization, and unlock behavior require owner review and targeted tests.

## 2026-05-04 Component behavior tests

KandyDrops component tests verify behavior and state truth, not screenshots. Fast UI tests should use shared auth/profile/drop states, exercise real component affordances where practical, and preserve telemetry/source-of-truth contracts without changing product behavior. `tests/unit/utils/kandydrops-test-states.ts` owns common guest, user, admin, GumDrops, and owned Drop fixtures; current targeted tests cover Drop card CTA/affordability state, DailyCheckIn dashboard/experiences variants, and notification read-state behavior.

## 2026-05-04 Ast-grep source rules

KandyDrops ast-grep rules are deterministic source guardrails. They catch forbidden shell, safe-area, preview content-protection, diagnostics, timer, and breakpoint patterns from source files without replacing targeted tests or broad runtime validation. The canonical command is `npm run check:ast-grep-rules`; `ast-grep.yml` documents rule ids/severity/category/fixes, `sgconfig.yml` anchors language globs, and `scripts/agent/run-ast-grep-rules.ts` uses `@ast-grep/napi` plus path-scoped source scans for actionable file/line findings.

## 2026-05-04 Hydration performance lanes

KandyDrops hydration uses staged priority lanes. Critical shell and first actions hydrate first. Telemetry/session/privacy truth remains connected. Diagnostics, overlays, bridges, cookie UI, bug reports, onboarding helpers, notification runtime, and PWA enhancement load after paint or idle unless required by the current interaction. No public-beta performance fix may disconnect tracking, privacy consent, parity truth, or source-of-truth debug surfaces. `CoreLayoutWrapper` owns the `critical`, `afterPaint`, `idle`, `interactionOpened`, `adminOnly`, and `routeOnly` lane contract, `HomeClient` owns idle homepage diagnostics, and `npm run score:hydration` plus `npm run check:hydration-performance` provide the deterministic source-only validation lane.

## 2026-05-04 Device layout score and safe repair

KandyDrops layout scoring is deterministic. It detects violations of Google-style structure and Apple-style cohesion using hardcoded file/path/pattern rules. It can auto-fix exact safe token/string replacements only. It must escalate anything involving payments, auth, locked content exposure, keyboard runtime behavior, visual judgment, or product intent. The source-only score path is `npm run score:layout`; safe repair is dry-run through `npm run repair:layout` and apply-gated through `npm run repair:layout -- --apply`. Apply mode scores after each individual repair and reverts that repair if the score decreases or a new critical finding appears. Validation is `npm run check:device-layout-score`.

## 2026-05-04 Device layout contract

Google owns structural language: breakpoints, adaptive layout, PWA display mode, viewport units. Apple owns style/cohesion: safe areas, floating tab bars, sidebars on larger screens, glass hierarchy, stable top-level navigation. KandyDrops agents must use `src/lib/device-layout-contract.ts`, `src/lib/user-mobile-shell.ts`, and `npm run check:device-layout-contract`, not freestyle layout physics. The contract defines xs-phone through ultra-wide classes, allowed browser/standalone-PWA/fullscreen/unknown display modes, bottom-nav and safe-area shell rules, and critical touch/chat/preview sizing constants.

## 2026-05-03 Open public beta PR triage

Open bot PRs must be cherry-picked by current-source relevance. Duplicate Bolt/Jules branches should not be merged wholesale. Public beta fixes prioritize current source-of-truth, no UI regression, and targeted validation over broad stale branch merges. Current triage closed duplicate `useDrops` PRs after applying the #214 single-pass filtering/next-expiry primitive dependency, handled #210 ARIA state semantics without visual changes, confirmed #208 trusted-origin protection already present, applied only current admin truth/vocabulary cleanup from #209/#213, and treated #202/#212 wallet source-of-funds PRs as superseded by the accounting-truth implementation that preserved wallet UI copy/design.

## 2026-05-03 Wallet modal compact density

The wallet modal uses compact public-beta density. Package cards show total delivered GumDrops, package label, price, and purple bonus chip only. The visible paid/bonus explanatory subcopy is removed to reduce vertical sprawl. The balance chip shows source-aware free GD and paid GD. Backend source-of-funds accounting and telemetry remain unchanged. The compact balance display uses explicit `gumDropsRewardBalance` and `gumDropsPurchasedBalance` through `readSourceAwareBalance`; legacy total-only profiles follow the canonical helper fallback instead of guessing a free/paid split.

## 2026-05-03 Debug evidence pipeline and support permissions

KandyDrops debug evidence is structured, fingerprinted, stored, and injected into deterministic audits. Runtime issues already detected by the app must become pre-catcher issue candidates before relying on manual bug reports. Support uses one unified inbox model, with admin routes able to list/read/reply to all support threads and users scoped only to their own threads. Debug evidence writes must never block user flows. Canonical buckets are `debug_evidence`, `debug_evidence_rollups`, and existing `runtime_warning_records`; public generated audit artifacts must stay redacted. Admin Support Workspace uses verified admin support API routes for list/detail/reply rather than direct client Firestore listeners.

## 2026-05-03 Mathematical public beta scoring

KandyDrops public beta scoring is deterministic and mathematical. It exists to reduce terminal audit sprawl. Agents must use score:beta/check:beta-score and targeted tests first. Heavy browser audits are forbidden by default unless a finding explicitly escalates to runtime visual verification. The shared scoring model lives under `src/lib/agent-score/*`; it weights layout, hydration, economy, telemetry, content protection, orphaned logic, accessibility touch, and testing coverage findings with severity, confidence, recency, and blast-radius penalties. `repair:beta` is dry-run by default and can apply only exact high-confidence safe fixes outside payment/auth/economy/unlock/content enforcement.

## 2026-05-03 Paid package bonus source-of-funds truth

Paid package bonus GumDrops are paid-source GumDrops. They count toward `gumDropsPurchasedBalance` and can be used for paid-only creator monetization surfaces. Reward-source GumDrops are only non-purchase rewards such as check-ins, tasks, referrals, onboarding, or admin reward adjustments. Wallet UI may display total delivered package value, but backend source-of-funds truth must preserve paid vs reward source correctly. `src/lib/gumdrop-ledger.ts` owns the canonical purchase credit helper and classifier behavior; PayPal capture credits delivered paid package value into purchased balance while preserving `paidGumDrops`, `bonusGumDrops`, and purchase bonus audit metadata.

## 2026-05-03 Mobile chat stable viewport and composer sizing

The chat route bypasses normal page bottom reservation and owns its own stable mobile viewport shell. Chat list and thread views must remain anchored below the navbar across browser, standalone PWA, keyboard focus, and blur. Composer height must be compact and bottom-nav-safe. Diagnostics must not block tap/focus paths. `src/lib/user-mobile-shell.ts` owns chat top, viewport, bottom-reserve, list-control, and compact-composer tokens; `ChatRouteShell` syncs a lightweight visual viewport CSS variable and restores layout on unmount; `ChatExperience` keeps list/thread scrolling internal and exposes compact focus-stability debug markers without changing paid chat pricing, send APIs, thread ids, or message ordering.

## 2026-05-03 Full-page locked Drop preview

Locked Drop preview is a dedicated full-page conversion surface, not a bottom sheet. It keeps the global app shell and bottom nav visible, uses safe preview fields only, never exposes internal content thumbnails before unlock, adapts urgency by timer state, collects lightweight feedback, and after successful unwrap hands users to My KandyDrops with the new Drop targeted while also offering Keep Unwrapping. Unlock, payment, ledger, and content entitlement authority remain server-truth through the existing routes.

## 2026-05-02 Featured Drop polish

Featured drop CTAs and chips are cover-aware through deterministic metadata-based accent mapping, not runtime pixel sampling. Featured social proof shows unwraps only after total unwraps exceed 10; otherwise it shows views. Drop grid view counts remain unchanged. All truncated drop/card titles use the shared TitleMarquee animation, sped up by 50%, with reduced-motion respected. Video file chips use a 🎥 camera indicator for clarity.

## 2026-05-02 Drop cover visibility truth

Drop cover blur is product-state driven, not loading-state driven. Guests may see protected/blurred covers. Authenticated users and admins see clear covers when they have enough total GumDrops for a normal drop. Authenticated users only see affordability blur when they need a refill for that specific drop. Featured carousel chips use adaptive glass styling and the timer pill does not include a progress bar. The client helper `src/lib/drop-card-visibility.ts` owns card/carousel presentation state only; server unlock, payment, entitlement, and source-aware spend logic remain unchanged.

## 2026-05-02 Experiences compact daily hub

DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared. The `/experiences` page remains the retention/action hub and keeps Creator Spotlight, DailyCheckIn, DailyTasksModule, Live Drops For You, and the GumDrops wallet CTA in the normal mobile shell reservation.

## 2026-05-02 Mobile chat shell compact spacing

The chat route bypasses normal page bottom-nav reservation and owns its own mobile shell spacing. Inbox controls, floating compose controls, and thread composer must sit above the mobile bottom nav in Safari browser and standalone PWA modes using shared chat shell tokens, not per-screen hardcoded offsets. The canonical shell tokens live in `src/lib/user-mobile-shell.ts`; `src/components/Chat/ChatExperience.tsx` consumes them for list controls, scroll padding, thread composer clearance, compact debug markers, and the public beta density contract. Chat send, GumDrops pricing, thread IDs, and creator accrual logic remain owned by the existing chat server/runtime helpers.

## 2026-05-02 Mobile guest home hero shell centering

The guest home hero is shell-centered on mobile. It must center within available visual height between fixed top nav and mobile bottom nav/browser/PWA chrome using shell-aware viewport math, not a fixed vh-plus-nav estimate. The canonical implementation lives in `src/components/Hero.tsx`, reuses `--root-shell-top-spacing` and `--user-mobile-bottom-nav-reserved-height`, preserves `HomeHeroActions` CTA truth and `hero_cta_clicked`, and is guarded by `npm run check:home-mobile-hero-shell`. Homepage deep telemetry remains idle-gated through `CoreLayoutWrapper`, while auth and purchase overlays stay on the after-paint gate so the hero signup CTA can open promptly.

## 2026-05-02 Creator lane debug parity

Creator lane parity now routes through `src/lib/server/creator-onboarding-diagnostics.ts`. Admin Debug exposes a `Creator Lane` group with source snapshot counts, mismatch rows, history coverage, last queue materialization time, recommended fixes, and `canSelfHeal`; Admin Roster receives only short operator warnings: `Review queue out of sync`, `Role needs review`, `Agreement evidence missing`, `ID record needs review`, and `Settings need review`. Parity checks cover canonical onboarding, history, review queue, user projection, role, agreement signature evidence, ID documents, owner override reason, creator settings/restrictions, and creator experience records. Full technical details belong in Debug, not the roster row.

## 2026-05-02 Creator lane old logic removal gate

Creator lane regression blocking now routes through `scripts/agent/validate-creator-lane-old-logic-removal.ts` and `npm run check:creator-lane-old-logic-removal`. The gate scans for old creator/onboarding/roster patterns: arbitrary Admin Roster `creatorApplication` blob PUTs, raw enum labels in primary creator UI, role-only intake filters, agreement completion without version/hash evidence, owner override without reason, lifecycle actions without actor markers, creator paid writes without idempotency, hardcoded creator profile routes, unsafe view-as auth replacement, and synthetic creators without markers. Remaining compatibility exceptions are named in `agent/state/creator-lane-old-logic-cleanup.generated.json` with owner, allowed reason, removal plan, and risk. `users/{uid}.creatorApplication` remains projection only.

## 2026-05-02 Creator public profile routing

Creator public/admin/review profile navigation now routes through `src/lib/creator-profile-routing.ts`. Public creator links must use `buildCreatorPublicHref(...)`, admin user-record links must use `buildCreatorAdminHref(...)`, and Admin Roster focus links must use `buildCreatorReviewHref(...)`. The public route is `/creators/[username]`, so public links prefer username/handle/creatorUsername and do not fall back to uid. If no valid public slug exists, UI should render a non-link state with `explainCreatorProfileRouteMissing(...)`, emit `creator_profile_link_missing`, and expose Debug metadata rather than sending users to a 404. Chat headers, CreatorDiscoveryRail, Admin Roster view-as controls, creator-experience telemetry, creator notification links, and creator account-control profile paths are covered by this helper.

## 2026-05-02 Creator experience transaction truth

Fan Pass, private chat, custom request, and live-time booking commerce now use deterministic creator experience idempotency helpers in `src/lib/server/creator-experiences.ts`. Paid creator routes compute price and spend server-side, write source-aware user transactions, fan-facing records, and `creator_ledger_accruals`, and expose debug parity fields including `userTransactionId`, `creatorAccrualId`, `creatorExperienceRecordId`, `priceGd`, `platformShareGd`, `creatorShareGd`, `idempotencyKey`, `duplicatePrevented`, and source-aware balance before/after. Client CTAs may pass idempotency keys, but they do not deduct GumDrops. Do not reintroduce random paid transaction IDs or client-authoritative balance deduction for creator experiences.

## 2026-05-02 Creator admin action route consolidation

Admin Roster creator lifecycle actions now use the typed route `src/app/api/admin/creators/[userId]/action/route.ts`, action contract `src/lib/server/creator-admin-action-contract.ts`, and executor `src/lib/server/creator-admin-actions.ts`. The roster no longer builds broad mutable `creatorApplication` blobs for legal, ID, approval, rejection, changes, owner override, role activation, or agreement send/countersign actions. The action route requires admin auth and trusted origin, protects owner-only override actions, validates transitions on the server, writes canonical `creator_onboarding/{uid}`, rebuilds `users/{uid}.creatorApplication` plus `creator_review_queue/{uid}`, appends history, and emits actor-marked telemetry. `/api/admin/users` must not be reintroduced as the Admin Roster lifecycle mutation path.

## 2026-05-02 Creator agreement version truth

Creator agreement version and evidence truth now routes through `src/lib/creator-agreement-version.ts`. That resolver owns the active version, active template fallback, native full-text source reference, agreement hash fallback, user agreement resolution, evidence completeness checks, and signed-vs-active comparison. New creator signatures and admin countersigns must carry agreement version, hash, source, source snapshot/reference, dispatch, signer, IP, and user-agent evidence. Active template changes do not mutate old signed records; `legal_signed` requires creator/admin signature version/hash parity unless an owner override records an explicit reason.

## 2026-05-02 Legacy creatorApplication migration adapter

Old `users/{uid}.creatorApplication` records now have a bounded server adapter at `src/lib/server/creator-onboarding-legacy-adapter.ts`. The adapter can read legacy nested projections, map them into canonical `creator_onboarding/{uid}` shape, rebuild the `users.creatorApplication` projection from canonical data, explain mapping confidence, and skip any user that already has canonical onboarding. Legacy legal/signature status flags are not enough to mark canonical legal completion; signed state requires timestamp, signer, and agreement identity evidence. The dry-run inventory script is `scripts/creators/inventory-legacy-creator-applications.ts`, and it writes `agent/state/legacy-creator-application-inventory.generated.json` without mutating data. `users.creatorApplication` remains projection only.

## 2026-05-02 Creator review queue materializer

`creator_review_queue/{uid}` is now explicitly materialized by `src/lib/server/creator-review-queue.ts` from canonical `creator_onboarding/{uid}` records. `syncCreatorOnboardingDocuments(...)` owns the transaction path, so creator signup, intake, agreement, ID, approval, owner override, role activation, and admin lifecycle updates keep queue projections in sync. Queue records expose `queueMaterializedAt`, `sourceOnboardingUpdatedAt`, `projectionLagMs`, `queueParityOk`, and `queueParityDelta`; Admin Debug diagnostics flag `queue_parity_mismatch` when the projection drifts. Do not hand-build queue status blobs or filter review applicants by creator role only.

## 2026-05-02 Creator onboarding projection normalizer

Creator onboarding display truth now routes through `src/lib/creator-onboarding-projection.ts`. Admin Roster decision buckets, primary action labels, visible status labels, admin user detail projection display, and Debug evidence should use this helper instead of parsing raw `creatorApplication` enum values locally. Raw enum values remain available in `rawStatusValues` and Debug detail, but primary UI labels must use the normalized labels such as `Waiting for signature`, `Agreement not sent`, `ID ready for review`, and `Needs changes`.

## 2026-05-02 Creator lane legacy truth inventory

Creator onboarding truth is inventoried across canonical, projection, legacy, mixed, and unknown paths in `agent/state/creator-lane-legacy-truth-inventory.generated.json`. The current canonical creator intake/legal/ID/approval/owner/synthetic/role activation record is `creator_onboarding/{uid}`; lifecycle audit truth is `creator_onboarding/{uid}/history/{eventId}`. `creator_review_queue/{uid}` is an Admin Roster projection. `users/{uid}.creatorApplication` is a creator-facing and legacy-compatible projection, not the future canonical source when `creator_onboarding/{uid}` exists. Creator fan-experience settings currently remain on `users/{uid}.creatorSettings` and `users/{uid}.creatorRestrictions` using the shared `CreatorSettings`/`CreatorRestrictions` model in `src/lib/creator-experiences.ts`.

## 2026-05-02 Creator onboarding audit trail hardening

Creator intake, agreement, ID, approval, account-control, fan-experience, synthetic creator, and admin view-as actions use the existing `creator_onboarding/{uid}/history` subcollection as the audit trail. `src/lib/server/creator-onboarding.ts` owns `buildCreatorOnboardingHistoryEntry(...)` for deterministic event shape, actor marker evidence, target user/creator IDs, and agreement version/hash plus IP/user-agent evidence for signatures. Admin Roster shows the collapsed audit trail with the latest 3 events first and technical metadata inside Details; Admin Debug/user detail keeps raw evidence available.

## 2026-05-02 Synthetic creators and safe creator view-as

Owner-created synthetic creators now carry explicit `isSyntheticCreator`, `syntheticCreatorType`, creator/created-at/reason, and human-operator marker fields across the user profile, creator onboarding canonical record, and creator review queue projection. Admin creator QA uses a session-scoped view-as simulation with `performedAs: admin_view_as_creator`; it does not replace Firebase auth identity or share passwords. The global return banner clears simulation state, and `authFetch` blocks payment, wallet, unlock, and creator state-changing writes while view-as is active.

## 2026-05-02 Creator fan experience settings

Creator fan experience settings are now admin-editable from the Admin Roster selected creator record, but the source model remains `CreatorSettings` and `CreatorRestrictions` in `src/lib/creator-experiences.ts`. The collapsed `Fan experience settings` section delegates to `src/components/Admin/CreatorFanExperienceSettingsPanel.tsx` and the guarded route `src/app/api/admin/creator-fan-experience-settings/route.ts`. GD pricing, live time minimums, request prices, availability windows, and creator restrictions are server-validated; restriction pauses require confirmation, emit identity-marked admin-on-behalf telemetry, and write creator onboarding history.

## 2026-05-02 Admin Roster account controls

Admin Roster account controls are guarded admin-on-behalf actions, not client-side profile edits. The collapsed `Account controls` section in `src/app/admin/roster/page.tsx` delegates to `src/components/Admin/CreatorAccountControlsPanel.tsx` and the server-only route `src/app/api/admin/creator-account-controls/route.ts`. Email, password reset, temporary password, role, and status changes require confirmation, use Firebase Admin SDK on the server, emit identity-marked admin telemetry, and write `admin_account_updated` creator onboarding history. Non-owner admins cannot grant admin role access.

## 2026-05-02 Creator agreement signature UX

Creator-facing agreement signature now requires a structured full agreement review, not summary-only signing. The focused UI component is `src/components/Creators/CreatorAgreementReview.tsx`; shared acknowledgement/status/readiness/telemetry helpers live in `src/lib/creator-agreement-signature-ux.ts`; the guarded signature route remains `src/app/api/creator/onboarding/contract-signature/route.ts`. A creator cannot sign unless the active dispatch, agreement version, agreement hash, signer identity, content source, and all four acknowledgements are present. Signature evidence now stores source details, IP/user agent, and acknowledgement values, while preserving prior dispatch/version records.

## 2026-05-02 Creator agreement document manager

The creator agreement document manager is now the launch path for creator agreement source, dispatch, signature, and countersign evidence. Templates are versioned in `creator_agreement_templates`; active template metadata seeds creator onboarding canonical fields; creator-specific dispatches live under creator onboarding; signature evidence stores matching `agreementVersion`, `templateId`, `agreementHash`, and `dispatchId`. Admin Roster exposes collapsed `Agreement document` and `Agreement templates` sections without raw storage paths. Do not mutate prior signed records when a new template becomes active; send an updated agreement dispatch instead.

## 2026-05-02 Creator Intake Flow

Creator-facing intake is a five-step guided mobile flow, not a technical application form. The canonical contract is `src/lib/creator-intake-flow.ts`; UI rendering is `src/components/Auth/CreatorIntakeFlow.tsx`; registration still posts through `/api/user/register` and `ensureCreatorOnboardingSubmission`. New intake fields live on the existing creator onboarding canonical/projection state: `creatorMonetizationGoals`, `creatorFollowerRange`, `creatorPostingFrequency`, `fansAlreadyAskForAccess`, `creatorRecommendedSetup`, `intakeVersion`, `intakeSubmittedAt`, and `intakeSource: creator_site`. Do not create a parallel intake collection or expose legal/compliance machinery before the agreement step.

## 2026-05-02 Creator Identity Marker Hardening

Creator identity markers are canonical for creator intake, Admin Roster, creator experience, and creator account/admin actions. The canonical helper is `src/lib/identity/actor-markers.ts`; it classifies `guest`, `user`, `creator`, `admin`, `owner_admin`, `system`, and `unknown`, and it emits explicit `performedAs`, target, route, surface, action, dedupe, source, and Debug fields. Unknown actors must not be promoted to user/creator/admin, owner overrides must be marked `owner_admin` plus `owner_override`, and admin-on-behalf events must include a target user.

## 2026-05-02 Admin Roster Decision Queue

Admin Roster is a decision queue for launch. Its primary tabs are `Needs Review`, `Waiting`, `Approved`, and `Create`; legal, ID, audit, notes, and owner controls stay collapsed until needed. The page must keep creator onboarding truth and owner override controls intact while avoiding raw enum labels, fake chips, and old mixed-cockpit tab language.

## Purpose

This file records major architectural pivots, workflow-authority decisions, and continuity-sensitive repo rules that future contributors should not have to reconstruct from founder memory, private AI context, or scattered commit history alone.

Use this file together with:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`

This file is not a changelog. It is the concise ledger for durable decisions that shape how the repo should be understood and extended.

## How To Use This Ledger

1. Read this file when a task touches architecture, deployment assumptions, dependency/tooling meaning, workflow authority, or historical pivots.
2. If a change creates a new durable repo rule, add or update an entry here in the same change.
3. Do not invent exact dates if the repo cannot prove them. Record uncertainty explicitly.
4. When this file and runtime code disagree, runtime code plus verification wins and this file must be updated immediately.

## Decision Entries

### 1cw. Final launch readiness is launchable with warnings

- Approximate date: Recorded explicitly on 2026-05-02 from the final KandyDrops launch readiness report
- Status: Active final launch go/no-go rule
- Decision: KandyDrops is `LAUNCHABLE WITH WARNINGS` after the final targeted gate pass. The hard-stop gates are green: user critical path, payment/unlock/content entitlement, security role boundaries, and Firebase rules. No unresolved blocker is recorded in `agent/state/final-launch-readiness-report.generated.json`.
- Implementation: `agent/state/final-launch-readiness-report.generated.json` records each required gate status, evidence files, validations run, blockers, warnings, launch recommendation, and post-launch tasks. `docs/agent-truth/final-launch-readiness-report.md` is the human-readable report. `scripts/agent/validate-final-launch-readiness-report.ts` and `npm run check:final-launch-readiness-report` verify the final report structure and hard-stop launch rules.
- Non-blocking warnings: open PRs remain a human merge gate, live production smoke was not performed locally for PayPal/FCM/App Hosting/GA4/PWA, the local `npm run check:deployment` health smoke was unavailable, several recovery paths still require provider console or manual DB/Storage intervention, demo fixtures do not include a seed runner, and true global runtime kill switches were not added.
- Required next action: deploy only from this commit or a later commit that reruns affected gates. Before public announcement, run production smoke for PayPal refill, GumDrops credit, Drop unlock, protected content access, real-device push, PWA refresh/install behavior, deployed App Hosting health, and Admin Debug/Analytics snapshot visibility.
- Consequence for future work: Do not merge unrelated PRs, alter payment/unlock/content/security/user-path code, or change launch-critical config after this report without rerunning affected gates and updating the final readiness report if the launch decision changes.

### 1cv. Rollback and incident response is launch-mapped

- Approximate date: Recorded explicitly on 2026-05-02 from the rollback, kill switch, and incident response launch plan
- Status: Active launch rollback, incident response, kill-switch honesty, and manual-intervention rule
- Decision: KandyDrops must not claim emergency switches that are not implemented. Launch incidents first stop new harm, preserve route/provider/Firestore/Admin Debug evidence, roll back a bad App Hosting/Firebase/Functions revision when code or config caused the issue, and recover data from verified server/provider facts. Manual DB intervention must be explicitly marked when no guarded product action exists.
- Implementation: `agent/state/rollback-incident-response.generated.json` maps incident playbooks for payments broken, wallet crediting broken, unlock double-charge, locked content leak, notification duplicate/spam, notification missing, analytics refresh storm, admin route/security issue, service-worker stale app shell, Drop queue malfunction, chat outage, and creator profile 404 spike. `docs/agent-truth/rollback-incident-response.md` documents the human-readable launch incident doctrine. `scripts/agent/validate-rollback-incident-response.ts` and `npm run check:rollback-incident-response` validate required mitigations, real switch scope, deployment rollback documentation, service-worker stale-cache plan, analytics refresh storm plan, and manual-intervention markers.
- Verified switch truth: PayPal client readiness is deploy-time and partial only; admin queue toggle is per Drop; analytics refresh dedupe mitigates storms but is not a global off switch; notification preferences are per-recipient and not a global kill switch; service-worker cache versioning is deploy mitigation; creator messaging settings are per creator; Storage deny is baseline protection, not a leak-revocation switch.
- Required validation: `npm run check:rollback-incident-response`, `npm run typecheck` when scripts/docs schema change, and `git diff --check`.
- Consequence for future work: Do not add or document emergency controls without precise scope, owner, safe default, audit trail, and tests. Do not erase payment locks, transaction rows, notification locks, queue heartbeats, route warnings, refresh metadata, or Debug evidence during first response.

### 1cu. Test fixtures and demo states are launch-mapped

- Approximate date: Recorded explicitly on 2026-05-02 from the test fixtures, seed data, and demo account launch audit
- Status: Active launch QA/demo fixture, local-test data, and no-live-write rule
- Decision: Launch QA must not depend on random production state. The default fixture posture is static local/test contracts plus emulator or mock execution, not production user creation or live Firestore/Storage/PayPal/FCM writes. Demo accounts may be configured only in an explicit emulator/staging process that does not commit passwords, tokens, API keys, or provider credentials.
- Implementation: `tests/fixtures/launch-demo-fixtures.json` defines the repeatable launch fixture contract for guest, new user, zero-GD user, GD-balance user, unlocked-drop user, failed-purchase user, creator public profile, admin, notification read/unread user, chat-thread user, expired/queued/live-ending-soon/archived/missing-cover/locked-assets Drops, notifications, chat threads, transactions, and critical paths. `agent/state/test-fixtures-demo-audit.generated.json` records the audit map. `docs/agent-truth/test-fixtures-demo-accounts.md` documents the safe fixture doctrine. `scripts/agent/validate-test-fixtures-demo.ts`, `tests/unit/test-fixtures-demo.spec.ts`, and `npm run check:test-fixtures-demo` enforce the contract.
- Launch-critical evidence: Existing focused tests cover unlock idempotency and paid/reward spend, PayPal duplicate credit suppression, notification read persistence, chat thread participant routes, creator profile public payloads, protected Viewer/content access, and Firebase emulator rules. The new fixture contract ties those lanes to named demo states.
- Known fixture limits: This pass intentionally does not add an executable seed runner. A future runner must default to dry-run, reject production projects by default, require explicit safe-write configuration, and generate Auth users outside git.
- Required validation: `npm run check:test-fixtures-demo`, `npx vitest run tests/unit/test-fixtures-demo.spec.ts`, `npm run typecheck` when scripts/tests change, and `git diff --check`.
- Consequence for future work: Do not create launch QA paths that rely on live production randomness, committed credentials, client-authoritative money/access state, or fixture Drops that expose protected asset URLs. Keep paid, bonus, reward, and admin-granted GumDrops separated in fixtures.

### 1ct. Legal/payment user-trust copy is launch-audited

- Approximate date: Recorded explicitly on 2026-05-02 from the legal/payment disclosure and user-trust copy audit
- Status: Active launch payment, GumDrops, unlock, expiration, notification, legal-link, and support-copy rule
- Decision: User-facing payment and access copy must be clear before launch without inventing legal claims. GumDrops are currency-like product units for KandyDrops access, not cash. Wallet refill copy must show USD amount, total GumDrops, and paid versus bonus GumDrops. Unlock copy must show the GD cost before confirmation. Expiration copy must distinguish public Drop availability from owned Library access. Notification prompts must say what alerts are for. Terms, Privacy, and Support paths must remain reachable or documented as a launch risk.
- Implementation: `agent/state/legal-payment-copy-audit.generated.json` maps the required clarity lanes. `docs/agent-truth/legal-payment-user-trust-copy.md` records the doctrine and current launch truth. `scripts/agent/validate-legal-payment-copy.ts` and `npm run check:legal-payment-copy` enforce the audit, visible wallet paid/bonus split, unlock cost copy, legal/support route reachability, expiration consistency, and notification permission purpose.
- Launch-critical fixes: `src/components/PurchaseModal.tsx` now separates paid GumDrops from bonus GumDrops in package rows before checkout. `src/components/Auth/OnboardingHelpers.ts` now says expired live Drops leave the public Drops page and tells users to unwrap before expiry to keep Library access, avoiding conflict with FAQ and Library truth.
- Known trust-copy risks: The legal page intentionally uses `Gum Drops` in its legal-definition copy while product doctrine prefers `GumDrops`; do not rewrite legal wording without a legal/product decision. The public 404 currently returns users to the app but does not include direct support contact; signed-in support and FAQ support email exist.
- Required validation: `npm run check:legal-payment-copy`, `npm run typecheck` when code or scripts change, and `git diff --check`.
- Consequence for future work: Do not add wallet, purchase, promo, unlock, expiration, notification, support, or creator access copy that implies cash value, hides paid/bonus split, omits unlock cost, promises Drop return/refunds/realtime earnings, or contradicts owned Library access.

### 1cs. Support recovery flows are mapped before launch

- Approximate date: Recorded explicitly on 2026-05-01 from the support and recovery flow launch audit
- Status: Active launch support recovery, operator action, audit-log, and manual-intervention rule
- Decision: Launch support actions must be evidence-first and actor-safe. Operators should use Admin Users, Admin user detail, transaction history, balance adjustment, Admin Support Workspace, Admin Drops, Admin Analytics, and Admin Debug before touching money/access/account state. When no protected product action exists, the recovery path must explicitly say manual DB intervention or external provider action is required.
- Implementation: `agent/state/support-recovery-flow-audit.generated.json` maps payment, unlock, entitlement, viewer asset, notification, chat, creator profile, login, onboarding, refund/manual credit, resend, manual grant, freeze, and transaction-history scenarios. `docs/agent-truth/support-recovery-flows.md` documents operator steps, audit requirements, and manual DB intervention rules. `scripts/agent/validate-support-recovery-flows.ts` and `npm run check:support-recovery-flows` enforce audit/doc/code coverage.
- Launch-critical evidence: `/api/admin/balance` is admin/trusted-origin protected and logs `admin_adjustment` rows with admin/reason metadata; Admin user detail exposes transactions, purchase/unlock rows, support readiness, security summary, and creator operations; Admin Support Workspace is admin guarded; notification diagnostics expose dedupe/read/skip truth; protected content and unlock routes remain server-mediated.
- Known recovery risks: manual entitlement grant is protected and creates an admin-grant transaction but does not yet require reason/admin UID metadata, account status changes lack a separate immutable audit row, PayPal refunds are external, wallet-only freeze is not a launch feature, and arbitrary creator chat transcript inspection is intentionally not exposed.
- Required validation: `npm run check:support-recovery-flows`, touched-file TypeScript when script/code changes, and `git diff --check`.
- Consequence for future work: Do not add support recovery buttons that bypass server guards, client-authoritative balance/entitlement state, provider confirmation, or audit logging. Do not hide manual DB intervention behind vague copy; document the operator, reason, before/after values, and support thread.

### 1cr. Event catalog telemetry naming is launch-gated

- Approximate date: Recorded explicitly on 2026-05-01 from the event catalog and telemetry naming launch audit
- Status: Active launch telemetry catalog, payload contract, actor/source/object separation, and admin-exclusion rule
- Decision: Every emitted telemetry event must be cataloged, every catalog event must have a detected emitter or explicit audit coverage, canonical event names are lowercase snake_case, and launch-critical event families must declare actor/object/surface payload requirements. Admin/system/unknown actors may be stored for Debug/global evidence but must not update user behavior or active-user lanes.
- Implementation: `src/lib/telemetry-catalog.ts` owns `TELEMETRY_EVENT_PAYLOAD_CONTRACTS`, event family classification, casing/alias normalization, and payload key alias normalization. `src/lib/analytics-client-engine.ts` mirrors camel-case payload keys to canonical snake_case. `src/app/api/analytics/ingest-identified/route.ts` and `src/lib/server/analytics.ts` attach actor-lane metadata and gate `analytics_active_users` writes behind `includeInUserBehavior`.
- Required validation: `npm run check:event-catalog-telemetry`, `npm run check:telemetry`, focused telemetry/analytics contract tests, touched-file TypeScript, and `git diff --check`.
- Consequence for future work: Do not emit uncataloged events, add catalog events without emitter/audit coverage, let casing drift bypass aliases, omit canonical ids from drop/unlock/purchase/notification/chat events, or let admin telemetry enter user behavior analytics.

### 1cq. Admin CMS Drop workflow is server-validated before launch publication

- Approximate date: Recorded explicitly on 2026-05-01 from the creator/admin CMS workflow launch audit
- Status: Active launch admin/creator Drop publishing, queue, notification, entitlement, and attribution rule
- Decision: Admin and creator Drop CMS workflows may not rely on client form validation alone. The server must verify publish readiness before creating, approving, or status-affecting edits: title, description, cover/public preview, non-negative GD price, valid live window, content assets for content Drops, safe promo/external destination, creator assignment for creator-submitted Drops, and creator assignment for subscriber-only Drops.
- Implementation: `src/lib/server/drop-mutations.ts` owns `validateDropPublishState` and `shouldValidateDropPublishPayload`. `src/app/api/admin/drops/route.ts` applies the gate on create and publish-affecting update/approval. `src/app/api/creator/drops/route.ts` applies the same gate with caller-owned creator assignment. `agent/state/admin-cms-workflow-audit.generated.json`, `docs/agent-truth/admin-cms-drop-workflow.md`, `scripts/agent/validate-admin-cms-workflow.ts`, and `npm run check:admin-cms-workflow` record and enforce the workflow map.
- Launch-critical fixes: server-side Drop publish validation now blocks incomplete direct API writes, negative prices, missing cover/media, invalid live windows, missing content assets, unsafe promo/external action URLs, missing creator assignment for creator submissions, and subscriber-only Drops without a creator. Current archive behavior is documented as hard delete; reversible archive remains deferred.
- Required validation: `npm run check:admin-cms-workflow`, `npx vitest run tests/unit/admin-cms-workflow.spec.ts tests/unit/admin-drop-form.spec.ts tests/unit/drop-queue-lifecycle.spec.ts tests/unit/push-notifications.spec.ts`, touched-file TypeScript, and `git diff --check`.
- Consequence for future work: Do not add another CMS write route, creator submission path, queue publish action, or admin approval path that bypasses `validateDropPublishState`. Do not add return-live notifications from the CMS UI; queue runtime owns return-live idempotency.

### 1cp. Content/media launch gate is server-mediated and public-safe

- Approximate date: Recorded explicitly on 2026-05-01 from the content and media pipeline launch audit
- Status: Active launch content, media, storage, viewer entitlement, and upload-validation rule
- Decision: Protected Drop content must never be exposed through public payloads or direct client Storage access. Public surfaces may show cover, preview, thumbnail, creator avatar, and creator banner media only after protected `contentUrl`/`contentUrls` are sanitized away. Unlock/viewer content bytes are served through the guarded `/api/drops/content` proxy.
- Implementation: `agent/state/content-media-pipeline-audit.generated.json` records protected content proxy, public creator profile, Drop cards, owned library, viewer, storage rules, upload validation, expired/archive, thumbnail order, docs, and validation lanes. `docs/agent-truth/content-media-pipeline.md` documents the rule. `scripts/agent/validate-content-media-pipeline.ts` and `npm run check:content-media-pipeline` enforce the gate.
- Launch-critical fixes: the public creator profile route now sanitizes Drop payloads before returning Drops, the content proxy accepts server-written unlock timestamps as entitlement evidence, admin content upload now validates file size/type, and Drop/owned/viewer cover fallbacks use the current `/candy-3d-glass.png` asset instead of missing placeholders.
- Required validation: `npm run check:content-media-pipeline`, focused content/viewer/creator/admin-content tests, touched-file TypeScript, Firebase Storage rules tests when `storage.rules` changes, and `git diff --check`.
- Consequence for future work: Do not return raw Drop `contentUrl`/`contentUrls` from public routes, use public Storage reads for protected content, trust client entitlement state as the access boundary, add missing placeholder image paths, or accept arbitrary upload types without a server guard and validator update.

### 1co. Design system drift is launch-gated

- Approximate date: Recorded explicitly on 2026-05-01 from the design system drift launch audit
- Status: Active launch UI consistency, badge, chart, countdown, asset, and shell-spacing rule
- Decision: KandyDrops launch UI may not drift through repeated random palette utilities, overflowing badges, fake interactive static chips, local chart palettes, old starter asset references, terminal-style countdown fonts, or negative-margin shell spacing fixes. Shared primitives own repeated visual contracts.
- Implementation: `agent/state/design-system-drift-audit.generated.json` records fixed and deferred drift issues. `docs/agent-truth/design-system-drift.md` documents the launch rule. `src/lib/design-system.ts` exports `LAUNCH_BADGE_CONTAINMENT_CLASSNAME`, `LAUNCH_STATIC_BADGE_CLASSNAME`, and `KANDYDROPS_CHART_COLORS`. `scripts/agent/validate-design-system-drift.ts` and `npm run check:design-system-drift` enforce the gate.
- Launch-critical fixes: central admin status badges moved loading/cached states to brand purple and unavailable to neutral gray, Drop grid/preview badges now use shared containment and static-chip helpers, Drop countdowns stay on inherited site font with countdown-only final-24h copy, and Admin Analytics charts use shared chart colors.
- Required validation: `npm run check:design-system-drift`, targeted design drift/unit tests, touched-file TypeScript, and visual audit for any changed launch surface.
- Consequence for future work: Do not add repeated one-off cyan/blue/pink palettes, button-looking static chips, local chart color constants, old starter icon references, monospace Drop timers, or page/shell negative-margin layout fixes without extending doctrine and the validator.

### 1cn. Accessibility and tap-target semantics are a launch gate

- Approximate date: Recorded explicitly on 2026-05-01 from the accessibility and tap-target launch audit
- Status: Active launch accessibility, mobile tap-target, keyboard control, and admin/user control-state rule
- Decision: Launch-critical KandyDrops controls must expose semantic roles, accessible names, visible/assistive state, and safe mobile tap areas. Product UI may stay visually compact, but controls cannot rely on visual state alone.
- Implementation: `agent/state/accessibility-tap-target-audit.generated.json` records the audited top nav, bottom nav, drops, drop cards, wallet purchase modal, unlock modal, viewer, chat/messages, notifications, auth/onboarding, creator profile, Admin Overview/Analytics/Debug, 404, and shared modal/drawer/tab/filter/icon-button surfaces. `docs/agent-truth/accessibility-tap-targets.md` documents the human-readable doctrine. `scripts/agent/validate-accessibility-tap-targets.ts` and `npm run check:accessibility-tap-targets` enforce the launch gate.
- Launch-critical fixes: active mobile/admin nav now exposes `aria-current`, icon-only profile/settings/wallet controls have accessible names, Drop preview buttons and viewer thumbnails have explicit labels/current state, Drop timers avoid live-region spam, Admin Analytics/Debug tabs expose pressed state, and the custom wallet modal now has dialog semantics, focus containment, Escape close, selector pressed states, and alert errors.
- Required validation: `npm run check:accessibility-tap-targets`, focused component/static tests, touched-file TypeScript, and UI coverage/runtime lanes when launch-critical controls change.
- Consequence for future work: Do not add clickable non-buttons, unnamed icon buttons, visual-only active tabs/filters/nav, live-announced countdowns, or undersized mobile controls without documenting the exception and extending the validator.

### 1cm. PWA service worker behavior is single-worker and notification-safe

- Approximate date: Recorded explicitly on 2026-05-01 from the PWA, service worker, and mobile install launch audit
- Status: Active launch PWA, mobile install, service-worker cache, notification, and safe-area rule
- Decision: KandyDrops uses `public/firebase-messaging-sw.js` as the single launch service worker for app-shell/offline behavior and Firebase Messaging background display. It must cache only public shell/static assets, exclude private API data, use deterministic notification tags, sanitize notification click routes, and respect the shared mobile safe-area shell.
- Implementation: `agent/state/pwa-service-worker-audit.generated.json` records manifest, icon, service-worker scope/cache/update, foreground/background push, notificationclick, token enrollment, standalone safe-area, return route, offline fallback, and install prompt lanes. `docs/agent-truth/pwa-service-worker-mobile.md` documents the human-readable doctrine. `scripts/agent/validate-pwa-service-worker.ts` and `npm run check:pwa-service-worker` enforce the launch gate.
- Launch-critical fix: `src/lib/firebase-messaging.ts` now uses a module-level single-flight service-worker registration promise so the app runtime bridge, notification enrollment, and foreground display reuse the same registration instead of repeatedly calling `navigator.serviceWorker.register`.
- Required validation: `npm run check:pwa-service-worker`, touched-file TypeScript, service-worker/manifest/not-found tests, notification tests when push behavior changes, and mobile visual checks when layout changes.
- Consequence for future work: Do not add a second service worker, random notification tags, FCM auto-display plus manual service-worker display, API/private-data service-worker caching, stale shell caches without versioning, or page-local safe-area hacks.

### 1cl. Background job idempotency is a launch gate

- Approximate date: Recorded explicitly on 2026-05-01 from the background jobs, cron, queue, and idempotency launch audit
- Status: Active launch scheduled-job, queue, notification, reward, refresh, and diagnostics rule
- Decision: KandyDrops background work is treated as at-least-once. A scheduled function, cron route, Firestore trigger, queue transition, notification dispatch, reward grant, wallet credit, unlock, analytics refresh, cleanup, or manual rebuild is launch-safe only when a retry no-ops or completes without duplicating user-visible side effects.
- Implementation: `agent/state/background-job-idempotency-audit.generated.json` enumerates 31 job/lifecycle lanes with trigger source, schedule, inputs, outputs, writes, idempotency key, retry safety, duplicate/stale risk, user impact, Debug/failure visibility, required fix, and tests. `docs/agent-truth/background-jobs-idempotency.md` defines the human-readable doctrine. `scripts/agent/validate-background-job-idempotency.ts` and `npm run check:background-job-idempotency` validate registered jobs, deterministic drop notification identity, reward/payment/unlock receipts and locks, analytics refresh dedupe, runtime diagnostics, and governance coverage.
- Launch-critical fix: the Functions scheduled drop notification path now matches the app-server path with deterministic notification ids, idempotency keys, browser tags, data-only FCM payloads, duplicate token suppression, invalid-token cleanup diagnostics, and recorded dispatch outcomes. PayPal capture now has an explicit duplicate-lock test.
- Required validation: `npm run check:background-job-idempotency`, focused notification/queue/analytics/payment/unlock tests, touched-file TypeScript, `npm run check:functions` when Functions code changes, and `git diff --check`.
- Consequence for future work: Do not add generated notification ids, FCM auto-display payloads, random browser tags, duplicate-prone reward/payment/unlock writes, refresh storms, or job writes without diagnostic/error capture. Do not enable retries on incremental rollup triggers without an explicit processed-event marker.

### 1ck. Environment and deployment truth is launch-gated

- Approximate date: Recorded explicitly on 2026-05-01 from the environment and deployment truth audit
- Status: Active launch deployment, App Hosting, Firebase, PayPal, GA4/BigQuery, FCM, domain, and secret-reference rule
- Decision: Production deployment truth is `apphosting.yaml`, `firebase.json`, tracked `.firebaserc`, verified runtime code, and generated audit evidence. The canonical production origin is `https://kandydrops.com`; `www.kandydrops.com` and the App Hosting `hosted.app` backend are aliases only. Runtime secrets that App Hosting must mount belong under `env` with `secret:` references, not raw values or top-level generated override values.
- Implementation: `agent/state/environment-deployment-truth-audit.generated.json` records config lanes, redacted current values, sources, production safety, mismatch risk, user impact, fix needs, and secret-exposure risk. `docs/agent-truth/environment-deployment-truth.md` documents the human-readable deployment contract. `scripts/agent/validate-environment-deployment-truth.ts` and `npm run check:environment-deployment-truth` validate canonical origin, Firebase project/auth domain, App Hosting secret form, PayPal live mode, route presence/documented webhook stance, Functions entrypoint/Node version, GA/BigQuery config, FCM/VAPID, service-worker scope/cache, manifest icons, trusted origins, and tracked metadata redaction.
- Launch-critical cleanup: PayPal App Hosting secret references were moved into the `env` secret form, `NEXT_PUBLIC_FIREBASE_VAPID_KEY` was added as an App Hosting secret reference, `.firebaserc` is tracked as project truth, and `backends.json` override values are redacted because generated provider snapshots must not carry raw values in git.
- Required validation: `npm run check:environment-deployment-truth`, touched-file TypeScript when scripts/config code changes, `npm run check:functions` if Functions config changes, Firebase rules only if rules change, and `git diff --check`.
- Consequence for future work: Do not print secret values, commit generated backend raw override values, make `www` canonical without verified DNS/domain mapping, add sandbox PayPal defaults to production code, configure PayPal webhooks without signed webhook route/tests, or service-worker-cache private/API data.

### 1cj. Security role boundaries are server-mediated by actor lane

- Approximate date: Recorded explicitly on 2026-05-01 from the security, rules, and role-boundary launch audit
- Status: Active launch security, Firebase rules, protected route, and actor-boundary rule
- Decision: KandyDrops actor lanes are explicit: guests get public/drop-preview-safe data only; authenticated users get owner-scoped data; creators get creator-owned submission and chat surfaces; admins get admin-only APIs and diagnostics; system jobs use scheduled functions or shared-secret cron adapters; unknown actors never become authenticated users.
- Implementation: `agent/state/security-role-boundary-audit.generated.json` records protected routes, Firebase rules, storage paths, realtime paths, admin/creator/wallet/unlock/chat/notification/content boundaries, exploit scenarios, and required tests. `docs/agent-truth/security-role-boundaries.md` is the human-readable doctrine. `scripts/agent/validate-security-role-boundaries.ts` and `npm run check:security-role-boundaries` enforce admin guards, trusted-origin state changes, server-only Drop assets, money/access route contracts, chat/notification ownership, and client/server module boundaries.
- Launch-critical fix: raw `storage:drops/**` client reads/writes are denied. Drop asset uploads are server-mediated through `/api/admin/content` and `/api/creator/drops/assets`; protected content reads stay behind `/api/drops/content` entitlement checks. The `/api/admin/analytics` redirect shim now has an explicit admin guard.
- Required validation: `npm run check:security-role-boundaries`, touched-file TypeScript, affected route tests, and Firebase rules tests when rules change.
- Consequence for future work: Do not add admin APIs without `auth: "admin"`, state-changing admin APIs without `requireTrustedOrigin: true`, direct client Drop storage access, client-authoritative wallet/unlock writes, public-readable admin/debug analytics, or client imports of server-only modules.

### 1ci. Launch readiness final gate is launchable with warnings

- Approximate date: Recorded explicitly on 2026-05-01 from the final launch readiness gate
- Status: Active launch go/no-go, validation, and PR intake rule
- Decision: KandyDrops is launchable with warnings from the readiness commit after all targeted launch gates, standard checks, Firebase/App Hosting/Functions/rules checks, serial full Vitest, continuity, UI audits, and generated-artifact cleanup pass. No unresolved blocker is recorded in `agent/state/launch-readiness-report.generated.json`.
- Implementation: `docs/agent-truth/launch-readiness-final.md` provides the human-readable final gate. `agent/state/launch-readiness-report.generated.json` records blockers, risks, tests run, limitations, open PR recommendations, tiny launch-blocking fixes, and go/no-go status. `scripts/agent/validate-launch-readiness-final.ts` and `npm run check:launch-readiness-final` verify the report, phase artifacts, trusted-origin refresh fix, and governance ledger updates.
- Required validation: `npm run check:launch-readiness-final` plus rerunning any affected launch gate if a launch-critical file changes after this commit.
- Consequence for future work: Do not merge open PRs #201-#208 into launch without reconciling them against the readiness report and rerunning affected gates. PR #208 is expected to be superseded by the readiness pass trusted-origin fix after review. Keep the report status at `launchable with warnings` unless a later commit reruns and updates the same gates.

### 1ch. User problem-state copy uses shared human-readable translations

- Approximate date: Recorded explicitly on 2026-05-01 from the human-readable admin and user problem-state copy finalization pass
- Status: Active launch copy, diagnostics, and user problem-state rule
- Decision: Visible page, payment, unlock, and notification failures must use shared human-readable copy that says what happened and what to do next. Raw API errors, exception messages, provider details, route/source names, environment variables, and backend diagnostics stay in client diagnostics, telemetry, Admin Debug, or developer evidence rather than primary user UI.
- Implementation: `src/lib/problem-state-copy.ts` owns page, payment, unlock, and notification problem-state translations. `src/app/error.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/PurchaseModal.tsx`, `src/components/DropCard.tsx`, `src/components/DropPreviewModal.tsx`, and `src/components/Navigation/NotificationBell.tsx` now render those translations. `scripts/agent/validate-human-readable-admin-copy.ts` and `tests/unit/problem-state-copy.spec.ts` guard the contract.
- Required validation: `npm run check:human-readable-admin-copy`, `npx vitest run tests/unit/admin-truth-copy.spec.ts tests/unit/problem-state-copy.spec.ts`, touched-file TypeScript, and touched-surface UI/runtime checks when visible surfaces change.
- Consequence for future work: Do not pipe `result.error`, `error.message`, provider/config strings, or route diagnostics directly into visible user copy. Add a new deterministic problem-state translation first, keep the technical reason for diagnostics, and test the visible copy.

### 1cg. Mobile safe-area reservation belongs to the shared shell

- Approximate date: Recorded explicitly on 2026-05-01 from the mobile layout safe-area finalization pass
- Status: Active launch mobile layout, shell spacing, and safe-area rule
- Decision: The public user mobile bottom-nav reserve is applied once by the shared app shell through `--user-mobile-bottom-nav-reserved-height`. Page routes may add small local breathing room, but they must not add another full `env(safe-area-inset-bottom)` or hardcoded bottom-nav spacer unless they own a fixed overlay outside normal document flow.
- Implementation: `src/app/layout.tsx` reads the shell variable, `src/components/CoreLayoutWrapper.tsx` sets it to `USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT` only when the public bottom nav is present, and admin/legal/chat routes set it to `0px`. `docs/agent-truth/mobile-shell-safe-area.md` and `agent/state/mobile-layout-safe-area-audit.generated.json` record the launch surface audit.
- Required validation: `npm run check:mobile-shell-safe-area`, `npm run check:user-chat-shell-routing`, `npm run check:drops-mobile-refinement`, `npm run check:admin-shell-spacing`, `npm run check:ui:mobile-doctrine`, `npm run check:not-found`, `npm run check:user-critical-path-launch`, UI coverage/runtime/audits, touched-file TypeScript, and focused touched-surface tests.
- Consequence for future work: Do not fix mobile overlap with negative margins, translate hacks, duplicated safe-area padding, page-local bottom-nav spacers, or `100vh` chat containers. Fixed modals may own their own safe-area padding; route surfaces should use the shared shell reserve.

### 1cf. Global speed and hydration use refresh-based display retention

- Approximate date: Recorded explicitly on 2026-05-01 from the global speed hydration cache finalization pass
- Status: Active global loading, route-cache, and hydration rule
- Decision: Verified data stays visible until a newer verified payload replaces it or correctness invalidation records a reason. Age changes labels and refresh priority only. Refresh failure, stale age, realtime failure, or one optional module failure must not blank unrelated UI or delete the last verified display payload.
- Implementation: `agent/state/global-speed-hydration-cache-audit.generated.json` records audited Admin Analytics, Admin Overview, dashboard, Drops, wallet packages, chat/messages, experiences, notifications, app shell, user activity API, and service-worker data-freshness behavior. `/api/user/activity` now uses `readThroughStaleWhileRevalidateEphemeralRouteCache` with per-user/view keys, private response headers, cache/debug timing metadata, and stale-but-verified retention.
- Required validation: `npm run check:global-speed-hydration-cache`, `npm run check:global-loading-performance`, `npm run check:refresh-based-hot-cache`, targeted route-cache/user-activity tests, touched-file TypeScript, and critical mobile smoke checks.
- Consequence for future work: Do not reintroduce TTL display eviction, generic waiting with previous data, refresh-state clearing, router.refresh-as-invalidation, public caching of private data, or serial first-render waterfalls when independent/partial payloads are available.

### 1ce. Admin Analytics and Debug launch finalization keeps Analytics compact and Debug evidentiary

- Approximate date: Recorded explicitly on 2026-05-01 from the Admin Analytics launch finalization pass
- Status: Active launch admin truth, copy, hot-cache, and Debug rule
- Decision: Admin Overview and Admin Analytics must use operator-friendly, snapshot-first labels while Admin Debug owns technical source evidence, parity, legacy recovery, refresh metadata, formulas, actor-lane separation, and recovery details. Realtime and refresh remain upgrade paths and must not blank verified values.
- Implementation: `agent/state/admin-analytics-finalization.generated.json` records the finalized surfaces. `docs/agent-truth/admin-analytics-launch-final.md` records the launch rule. `scripts/agent/validate-admin-analytics-finalization.ts` adds the targeted guard. Admin Overview labels now use Updated, Showing last verified data, Refreshing overview, Live updates delayed, and Waiting for first overview snapshot.
- Required validation: `npm run check:admin-analytics-finalization` plus the existing hot-cache, no-pure-realtime, snapshot-migration, legacy-recovery, refresh-cache, human-copy, and module-specific admin analytics checks.
- Consequence for future work: Do not put Data Validation full lists, raw backend paths, listener/source jargon, parity dumps, or giant diagnostic paragraphs back into Analytics. Do not make stale cache look live, clear snapshots during refresh, show generic Waiting when a snapshot exists, or label authenticated-only data as total audience.

### 1cd. Notification return loop is deterministic and source-truth backed

- Approximate date: Recorded explicitly on 2026-05-01 from the notification return-loop hardening pass
- Status: Active launch-critical notifications, queue, PWA, and admin truth rule
- Decision: Drop/live/return-live notifications must use deterministic idempotency keys for Firestore creation, deterministic browser tags for visible alerts, and structured FCM dispatch diagnostics for delivery/skip truth. Read and clear-all actions must update local unread UI immediately, persist through `/api/notifications`, broadcast cross-tab sync, and reconcile persistence failures.
- Implementation: `src/lib/server/push-notifications.ts` owns drop notification idempotency and activation replay suppression, `src/lib/server/fcm-utils.ts` exposes `broadcastFCMWithReport`, `public/firebase-messaging-sw.js` owns manual tagged display/click return, `src/hooks/useNotifications.ts` owns unread local state, and `src/lib/notification-local-state.ts` owns read/clear reconciliation helpers.
- Required docs/artifacts: `docs/agent-truth/notification-pipeline.md` and `agent/state/notification-return-loop-audit.generated.json`.
- Required validation: `npm run check:notification-return-loop`, `npm run check:notification-pipeline`, and focused push/FCM/local-state/service-worker/notification-route/funnel tests.
- Consequence for future work: Do not add notification paths with random document IDs or browser tags, FCM notification auto-display plus manual SW display, local-only clear-all state, generic fake-zero funnel counts, or queued-drop return-live sends that bypass activation reservation and dispatch outcome debug.

### 1cc. Payment wallet unlock entitlement is server-truth only

- Approximate date: Recorded explicitly on 2026-05-01 from the payment wallet unlock entitlement launch-hardening pass
- Status: Active launch-security, commerce, wallet, unlock, and viewer-access rule
- Decision: The client is never authoritative for balance, paid/bonus Gum Drops, revenue, unlock status, or content entitlement. PayPal capture credit must be server-confirmed and bound to the authenticated order `custom_id`; unlock and admin balance changes must be Firestore transaction ledger writes; secure content proxy access requires verified unlock or creator ownership.
- Implementation: `src/app/api/paypal/capture/route.ts` requires PayPal `custom_id` user/package binding before credit, `src/app/api/drops/unlock/route.ts` keeps source-aware spend metadata, `src/app/api/drops/content/route.ts` mirrors creator entitlement, and `src/app/api/admin/balance/route.ts` records structured admin adjustment audit metadata.
- Required docs/artifacts: `docs/agent-truth/payment-wallet-unlock-entitlement.md` and `agent/state/payment-unlock-security-audit.generated.json`.
- Required validation: `npm run check:payment-unlock-security` plus focused PayPal, unlock, content entitlement, admin balance, ledger, package, and Gum Drops economics tests.
- Consequence for future work: Do not credit captures missing the server-created identity binding, do not count promo/bonus/admin grants as revenue, do not expose raw private content URLs before entitlement, and do not change payment/write flows without targeted route tests and audit doc updates.

### 1cb. Launch PR triage is a manual decision gate

- Approximate date: Recorded explicitly on 2026-05-01 from the launch PR and recent-commit triage pass
- Status: Active launch governance and PR intake rule
- Decision: Open PRs must be classified for launch relevance, duplication, risk, tests, and conflict potential before any merge or close action. No PR was merged, closed, rebased, or edited during the triage pass.
- Implementation: `agent/state/launch-pr-triage.generated.json` records all open PRs at triage (#208 through #201), latest 20 commits, duplicate groups, required tests, files touched, risk, source-of-truth doc/validator impact, and recommendations. `docs/agent-truth/launch-pr-triage.md` provides the human-readable triage summary.
- Required validation: `npm run check:launch-pr-triage`.
- Consequence for future work: Review PR #208 first as launch-critical security hardening. If a `useDrops` optimization is accepted, choose one survivor only, currently PR #207, and supersede PR #203 and PR #201. Do not merge dirty or stale PRs that contradict the launch scope freeze, hot-cache truth, admin copy layer, DropCard timer/card work, or package-manager truth.

### 1ca. Launch finalization scope is frozen

- Approximate date: Recorded explicitly on 2026-05-01 from the launch-finalization scope-freeze pass
- Status: Active launch governance and validation rule
- Decision: Launch work must prioritize stability over expansion. Auth/onboarding, Drops discovery/detail, wallet/GumDrops balance, purchase, unlock, viewer access, chat/messages, notifications, creator routing, recovery routes, Admin overview/analytics/debug truth, route protection, and mobile bottom-nav/safe-area are the launch-critical surfaces.
- Implementation: `docs/agent-truth/launch-finalization-scope.md` defines blocked, warning, deferred, frozen, allowed, forbidden, validation, and risk-ranking rules. `agent/state/launch-finalization-baseline.generated.json` provides machine-readable scope state.
- Required validation: `npm run check:launch-finalization-baseline`.
- Consequence for future work: Do not add features, redesign pages, rewrite architecture, hide failures, remove Debug/validation truth, or touch unrelated modules during launch finalization unless verified launch-blocker evidence proves the change is required.

### 1bz. Admin truth copy has operator and developer layers

- Approximate date: Recorded explicitly on 2026-05-01 from the human-readable admin truth hardening pass
- Status: Active admin UI, Debug, validation, and agent rule
- Decision: Primary admin UI must use plain-English operator copy. Technical source names, route names, collection names, formulas, parity deltas, raw event keys, and backend lane language belong in Debug technical evidence.
- Implementation: `src/lib/admin-copy/admin-truth-copy.ts` maps technical states to operator states; `src/lib/admin-copy/admin-copy-registry.ts` owns copy patterns and approved short badges.
- Required docs: `docs/agent-truth/admin-copy-style-guide.md` and `docs/agent-truth/human-readable-admin-truth.md`.
- Validation: `npm run check:human-readable-admin-copy`.

### 1by. Refresh-based hot cache replaces time-limit display gating

- Approximate date: Recorded explicitly on 2026-05-01 from the full-system refresh-cache refactor
- Status: Active loading, hydration, cache, and admin truth rule
- Decision: Verified snapshots and validated backend route payloads remain displayable until a verified replacement is written or an explicit `invalidationReason` blocks display. Time age changes labels and refresh priority (`stale_but_verified`), but it does not blank values. Realtime and router refresh are UI/update mechanisms, not first-render source truth.
- Implications: Cache records must expose cache key, refresh/source versions, refresh timestamps, invalidation reason, source/truth state, confidence, parity warnings, estimate flags, and legacy flags. Manual/background refresh preserves old values, increments `refreshVersion` only after completion, and records failures without clearing display. Admin Debug owns detailed proof.
- Canonical docs: `docs/agent-truth/refresh-based-hot-cache.md`, `agent/state/refresh-cache-loading-audit.generated.json`, `src/lib/cache/refresh-cache-contract.ts`.

### 1bx. Admin Analytics loading must preserve verified hot-cache values through realtime and refresh delays

- Approximate date: Recorded explicitly on 2026-05-01 from the global loading performance audit pass
- Status: Active admin UI, analytics truth, and loading-performance rule
- Decision: Admin Analytics top cards and reusable analytics modules must render verified hot-cache/snapshot values first whenever they exist. Realtime listeners, manual refresh, and backend recompute are upgrade paths and must not blank or replace those values with generic waiting cards.
- Implications: Waiting copy must name the reason (`Waiting for first snapshot`, `No verified data yet`, or `Source unavailable`). Manual/background refresh failure preserves stale snapshot state and surfaces Debug metadata. Private admin routes remain `private, no-store`; speed comes from internal hot cache/snapshot reads, not public CDN caching of sensitive analytics.
- Canonical docs: `docs/agent-truth/global-loading-performance.md`, `agent/state/global-loading-performance-audit.generated.json`, and `docs/agent-truth/admin-analytics-hot-cache.md`.

### 1bw. Drops mobile density must preserve telemetry while following Apple-aligned KandyDrops doctrine

- Approximate date: Recorded explicitly on 2026-05-01 from the Drops mobile Apple-aligned refinement pass
- Status: Active user-surface UI and telemetry rule
- Problem/context: The Drops page used duplicated shell spacing, a tall featured carousel on mobile, a large empty state, per-card timer intervals, and an oversized Drop card file. Reducing the UI risked losing detail/unlock/impression telemetry if the visual refactor was treated as purely cosmetic.
- Decision made: The Drops page now uses compact mobile density (`compact_mobile_apple_2026`), a smaller featured carousel on mobile, a compact sticky search/filter bar, tighter grid spacing, a truthful empty state, split Drop card parts, a shared `useNow` timer lane, and deferred Firestore runtime subscription after server/SWR content renders.
- What became canonical:
  - Apple-aligned mobile refinement means current official Apple HIG principles interpreted through KandyDrops doctrine, not Apple branding.
  - Every reduced Drops component must preserve or improve telemetry with source component and UI density fields.
  - Fake local affordances such as non-persistent notification buttons are not allowed on the Drops empty state.
  - Firestore runtime updates are a progressive upgrade for Drops, not the first-render dependency.
  - Compact mobile card, chip, timer, and CTA radii must use the Drops compact radius scale instead of arbitrary giant rounding.
- Consequence for future work:
  - Do not reintroduce a full-height mobile featured hero, per-card timer intervals, a `min-h-[500px]` Drops body, or untracked reduced CTAs.
  - If Drops controls are added or reduced, update the telemetry contract and `docs/agent-truth/drops-mobile-refinement.md`.

### 1bv. Authenticated analytics ingest must canonicalize before writing event facts

- Approximate date: Recorded explicitly on 2026-05-01 from the full-scale telemetry orphan cleanup audit
- Status: Active telemetry ingress rule
- Problem/context: `npm run check:telemetry` proved the client/server literal emitters and catalog were aligned, but `/api/analytics/ingest-identified` could still accept arbitrary posted `eventName` values and write them into `analytics_event_facts`, creating a back door for orphaned telemetry outside the catalog.
- Decision made: `src/app/api/analytics/ingest-identified/route.ts` now resolves every submitted event through `resolveTrackedTelemetryEvent` before writing. Unsupported events are skipped with route diagnostics, compatibility aliases write under their canonical event name, and legacy `admin_ui_error` is kept as a server diagnostic rather than a product analytics fact.
- What became canonical:
  - A catalog check at emit time is not enough; authenticated ingest must also reject uncataloged names.
  - `analytics_event_facts` and `analytics_event_stats` may not receive arbitrary client-posted event names.
  - Compatibility aliases are allowed only when stored with canonical event names and legacy metadata.
  - Diagnostics are not product analytics events unless the diagnostic event is explicitly cataloged.
- Consequence for future work:
  - Do not add an ingest route or callable that writes event facts without shared catalog resolution.
  - The remaining Functions callable should be tightened through a shared generated telemetry manifest, not by hand-copying a second catalog.

### 1bu. Admin Analytics realtime is upgrade-only after a hot-cache display state resolves

- Approximate date: Recorded explicitly on 2026-05-01 from the Admin Analytics realtime dependency audit pass
- Status: Active admin analytics source-order rule
- Problem/context: Live Pulse could still display `ERROR`/unavailable copy from failed Firestore realtime listeners even when the page banner and backend route indicated a last validated backend snapshot or hot cache was available.
- Decision made: `src/lib/analytics/admin-analytics-display-state.ts` now centralizes source-order resolution. `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` applies it to Live Pulse before the module model renders.
- What became canonical:
  - Verified snapshot or backend hot cache renders first.
  - Realtime failure annotates a rendered snapshot; it does not blank a module.
  - Graph/source gaps can be scoped to the graph area while metric cards remain visible from snapshot values.
  - Full listener failures and source details belong in Admin Debug/client debug metadata.
  - Fake zeros remain blocked when a value is unavailable or zero is not source-confirmed.
- Consequence for future work:
  - Do not pass raw realtime listener `failed` state directly into module top-level availability when a verified snapshot/hot cache exists.
  - New Admin Analytics modules must use the display-state policy or document an equivalent snapshot-first source-order resolver.

### 1bt. Drop notification idempotency must suppress both in-app creation and FCM dispatch

- Approximate date: Recorded explicitly on 2026-04-30 from the last-20-commit full-scale truth audit
- Status: Active notification pipeline truth rule
- Problem/context: The notification pipeline used deterministic idempotency keys to prevent duplicate in-app notification documents, but the dispatch path still attempted the matching FCM push when that duplicate document already existed.
- Decision made: `src/lib/server/push-notifications.ts` now treats duplicate deterministic notification documents as a full duplicate-send result for drop-live and queued-drop-return-live dispatches. It returns duplicate prevention metadata and does not call `broadcastFCM` for that already-created notification event.
- What became canonical:
  - Idempotent drop notification creation and push dispatch are one truth boundary.
  - `duplicateCreatedPrevented=true` with no newly queued in-app notification must also mean `duplicatePushPrevented=true`, `duplicateBrowserDisplayPrevented=true`, and `fcmDelivered=false`.
  - Queued drops returning live use the same duplicate suppression rule as normal global drop-live notifications.
- Consequence for future work:
  - Do not treat browser notification tags as the only duplicate defense; backend dispatch must avoid sending duplicate FCM payloads for the same deterministic notification event.
  - Any new notification type with an idempotency key must define whether duplicate creation suppresses push, replaces display, or intentionally re-sends, and that rule must be tested.

### 1bs. Admin Analytics uses snapshot-first migration metadata before realtime upgrades

- Approximate date: Recorded explicitly on 2026-04-30 from the Analytics Truth Layer v2 Phase 5 Admin Analytics snapshot migration pass
- Status: Active admin analytics UI and Debug migration doctrine
- Problem/context: Phase 3 created the verified hot-cache snapshot contract and Phase 4 added legacy/parity validation, but Admin Analytics still needed a shared snapshot-first UI registry, manual refresh exposure, and Admin Debug migration metadata before module-by-module behavior can fully leave old realtime/historical route dependencies.
- Decision made: Phase 5 adds `src/hooks/useAdminAnalyticsSnapshotRegistry.ts`, wires it into `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`, publishes `window.__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__`, and exposes `adminAnalyticsSnapshotMigration` in `/api/admin/debug`.
- What became canonical:
  - Every Admin Analytics module has a snapshot registry entry for source mode, truth state, last verified time, refresh status, debug path, first snapshot timing, and manual refresh.
  - Realtime and historical route data are compatibility/upgrade lanes; they must not be the only first-render truth when a verified snapshot exists.
  - Admin Analytics shows compact operator controls and labels, while Admin Debug owns formulas, source breakdown, parity, legacy recovery, lane failures, actor separation, and validation detail.
  - Full Data Validation stays in Admin Debug; Analytics may only show a compact Data Health summary/link.
- Consequence for future work:
  - Do not add new Admin Analytics modules without registering their snapshot key and Debug path.
  - Do not reintroduce realtime-only blank loading, fake zeros, fake live labels, raw backend jargon, or repeated degraded badge spam.
  - Do not bypass the snapshot refresh route for manual refresh unless the new path has equivalent dedupe, auth, and Debug metadata.

### 1br. Analytics legacy recovery remains dry-run until parity proves source truth

- Approximate date: Recorded explicitly on 2026-04-30 from the Analytics Truth Layer v2 Phase 4 legacy recovery and ecosystem parity pass
- Status: Active analytics recovery and parity doctrine
- Problem/context: Phase 2 defined legacy event mapping and Phase 3 defined hot-cache snapshots, but the repo still needed executable dry-run recovery, generated reports, parity lanes, and Debug metadata before old analytics/business records could be safely considered for snapshots.
- Decision made: Phase 4 adds `src/lib/analytics/legacy-recovery-contract.ts`, `scripts/analytics/inventory-legacy-sources.ts`, `scripts/analytics/map-legacy-events.ts`, `scripts/analytics/check-analytics-ecosystem-parity.ts`, `scripts/agent/validate-analytics-legacy-recovery.ts`, generated report outputs under `agent/state/`, and Admin Debug `adminAnalyticsLegacyParity` metadata.
- What became canonical:
  - Legacy inventory and mapping are dry-run by default.
  - Write mode requires an explicit `--write` flag and `ANALYTICS_LEGACY_WRITE_ENABLED=true`; the typed target is `analytics_legacy_recovered_events`, but production writes remain disabled.
  - Recovered records carry `legacySource`, `legacyId`, `legacyTimestamp`, `mappedEventName`, `mappingConfidence`, `mappingWarnings`, `recoveredAt`, actor/object confidence, `sourceMode=legacy_mapped`, snapshot inclusion state, and server-confirmed false.
  - Ecosystem parity lanes include purchases, unlocks, tasks, notifications, onboarding, guest/auth separation, admin exclusion, creator separation, snapshots, legacy mapping, GA4/BigQuery comparison, and Debug validation relocation.
  - Parity updates Debug/snapshot metadata asynchronously and must not block Admin Analytics rendering.
- Consequence for future work:
  - Do not run destructive legacy backfills until dry-run reports, duplicate checks, and parity lanes pass for the selected source.
  - Do not mix legacy mapped rows into live/server-confirmed truth.
  - Do not hide low-confidence or unmapped records; keep them in Admin Debug.
  - Do not use old GA4 intraday, stale snapshots, authenticated-only totals, or raw task/funnel events as verified Analytics values without explicit labels and parity.

### 1bq. Admin Analytics snapshots are the Phase 3 display cache contract

- Approximate date: Recorded explicitly on 2026-04-30 from the Analytics Truth Layer v2 Phase 3 verified hot-cache snapshot pass
- Status: Active admin analytics hot-cache doctrine
- Problem/context: Admin Analytics had hot-cache doctrine and some route-local cache behavior, but no canonical persisted per-module/per-range snapshot model or manual refresh contract.
- Decision made: Phase 3 adds `src/lib/analytics/admin-metric-snapshot.ts`, `src/lib/server/admin-analytics-snapshots.ts`, `src/lib/server/admin-analytics-materializers.ts`, `/api/admin/analytics/refresh`, and `src/hooks/useAdminAnalyticsSnapshot.ts`. The persisted storage lane is `analytics_admin_metric_snapshots`.
- What became canonical:
  - Source modes are `live`, `verified_cache`, `stale_cache`, `intraday`, `estimated`, `fallback`, `unavailable`, and `mixed`.
  - Snapshot ranges are `24h`, `7d`, `14d`, `30d`, and `all`.
  - Snapshots must carry values, formulas, source breakdown, confidence, truth state, refresh lifecycle fields, warnings, parity, legacy metadata, and Debug path.
  - Manual refresh requires admin auth, dedupes refresh storms, returns metadata, and keeps the last verified snapshot visible if refresh fails.
  - A module with no safe materializer must return `unavailable` with a reason; it must not invent values or mark a snapshot verified.
  - Admin Debug exposes snapshot metadata from `analytics_admin_metric_snapshots`.
- Consequence for future work:
  - Migrate Admin Analytics modules to read `useAdminAnalyticsSnapshot` first, then upgrade from realtime/server-confirmed data.
  - Do not auto-run cold GA4/BigQuery/Data API or broad Firestore reads on page load when a verified snapshot exists.
  - Do not coerce unavailable metrics to zero; snapshot values must use `null` plus `fakeZeroPrevented=true`.
  - Do not delete old realtime/historical routes until module-by-module snapshot parity proves replacement coverage.

### 1bp. Analytics Truth Layer v2 event contract separates identity lanes before UI refactors

- Approximate date: Recorded explicitly on 2026-04-30 from the Analytics Truth Layer v2 Phase 2 event contract and identity-lane pass
- Status: Active analytics event contract doctrine
- Problem/context: Phase 1 established hot-cache-first analytics doctrine, but later module refactors needed a typed event and identity spine so guest, anonymous session, authenticated user, creator, admin, and system activity are not mixed.
- Decision made: Phase 2 adds `src/lib/analytics/analytics-event-contract.ts`, `src/lib/analytics/legacy-event-mapping.ts`, and client-session identity helpers before refactoring Admin Analytics modules. The canonical event shape includes actor ids, source lane, consent state, dedupe key, object context, legacy mapping fields, and Debug metadata.
- What became canonical:
  - `identity_linked` is the only sanctioned bridge from guest/session lineage to authenticated user history; it preserves guest history instead of rewriting it.
  - Admin and system events are excluded from user/guest behavior lanes by helper contract, while global event tracking can include every actor type with classification preserved.
  - Creator events remain creator lane by default and are not ordinary fan behavior.
  - Legacy records can be shaped into canonical candidates only with `legacySource`, `legacyConfidence`, and `mappingWarnings`; they remain directional until a verified backfill promotes them.
  - Event catalog compatibility aliases cover the Phase 2 required names without renaming existing live events.
- Consequence for future work:
  - Wire future telemetry emitters, hot-cache materializers, validators, and Debug surfaces through this contract instead of creating parallel actor/source classifiers.
  - Do not merge guest and user history without `identity_linked`.
  - Do not count admin/system/unknown actor records in user behavior lanes.
  - Do not use legacy mapper output as server-confirmed product truth without a later dry-run, parity, and versioned backfill.

### 1bo. Analytics Truth Layer v2 starts from verified hot cache, not realtime-only loading

- Approximate date: Recorded explicitly on 2026-04-30 from the Analytics Truth Layer v2 Phase 1 doctrine, file inventory, module map, and validation pass
- Status: Active admin analytics architecture doctrine
- Problem/context: Admin Analytics had accumulated module-by-module fixes but still needed one repo-wide source-of-truth contract for hot cache, realtime upgrade, manual refresh, legacy recovery, actor separation, Debug parity, and fake-zero prevention.
- Decision made: Phase 1 establishes the doctrine and blast-radius map before production behavior changes. Admin Analytics should render verified hot cache snapshots first, upgrade with realtime only when metadata proves truth, allow manual refresh, and route detailed parity validation to Admin Debug.
- What became canonical:
  - `docs/agent-truth/analytics-truth-layer-v2.md` owns the top-level doctrine.
  - `docs/agent-truth/analytics-source-hierarchy.md` defines product truth, hot cache, realtime upgrade, GA4/BigQuery daily verification, GA4 intraday directional data, and Debug parity.
  - `docs/agent-truth/analytics-actor-taxonomy.md` separates guest, anonymous visitor, session, authenticated user, creator, admin, system, and unknown lanes.
  - `docs/agent-truth/analytics-module-map.md` maps Admin Analytics and Admin Debug modules, including whether each stays in Analytics or belongs in Debug.
  - `docs/agent-truth/analytics-file-inventory.md` maps the repo-wide analytics blast radius.
  - `agent/index/analytics-truth-layer-v2.json` gives future agents a machine-readable summary, and `scripts/agent/validate-analytics-truth-layer-v2.ts` guards the contract.
- Consequence for future work:
  - Do not implement later analytics behavior refactors without starting from the Phase 1 docs and index.
  - Do not reintroduce realtime-only dashboard loading, unlabeled stale/fallback states, fake zeros, or admin/system events mixed into user/guest analytics.
  - GA4 intraday/current-day data remains directional; GA4 daily/BigQuery export remains verification unless reconciled against first-party facts.

### 1bn. App Hosting uses apex domain as canonical origin and secrets under `env`

- Approximate date: Recorded explicitly on 2026-04-30 from the App Hosting origin, navigation secret, and Realtime Database rules deploy gap closure pass
- Status: Active production-config rule
- Problem/context: Production App Hosting was healthy at `https://kandydrops.com`, but `www.kandydrops.com` did not resolve while both `apphosting.yaml` and `src/lib/site-origin.ts` treated `www` as canonical. Also, `NAVIGATION_COOKIE_SECRET` existed in Secret Manager but was not mounted into the App Hosting runtime because it lived under a top-level `secrets:` block instead of the documented App Hosting `env` secret reference form.
- Decision made: The apex domain is canonical until `www` DNS/domain mapping is confirmed, and App Hosting secrets that the runtime needs must be declared under `env` with `secret:`.
- What became canonical:
  - `NEXT_PUBLIC_SITE_ORIGIN`, `SITE_ORIGIN`, and `PRIMARY_SITE_ORIGIN` use `https://kandydrops.com`.
  - `https://www.kandydrops.com` remains an alias only, not the redirect target.
  - `NAVIGATION_COOKIE_SECRET` is an App Hosting `env` secret reference; PayPal App Hosting config remains out of scope until a payment-specific pass.
- Consequence for future work:
  - Do not reintroduce `www` as canonical until DNS and App Hosting/custom-domain mapping prove it serves the same backend.
  - Do not rely on top-level App Hosting `secrets:` entries for runtime variables; use the documented `env` secret form.

### 1bm. Firebase framework deploys need both current CLI deps and Windows symlink privilege

- Approximate date: Recorded explicitly on 2026-04-30 from the Firebase CLI toolchain and Windows symlink readiness pass
- Status: Active deploy-tooling rule
- Problem/context: Local `firebase deploy --only hosting` for the Next.js/Firebase framework path built the app but failed while packaging the SSR function because Windows denied symlink creation under `.firebase/.../.next/node_modules`.
- Decision made: Keep Firebase CLI dependencies current and satisfy framework bundler peers, but do not treat dependency updates as sufficient proof that classic local Hosting deploys can run on Windows.
- What became canonical:
  - Root `firebase-tools` is pinned to `^15.16.0`, matching the globally installed Firebase CLI used by `firebase`.
  - Root `esbuild` is a direct dev dependency at `^0.27.7`, satisfying `vite@8.0.8`'s peer range and removing the stale framework-packaging warning.
  - Local Windows symlink readiness must be tested separately before relying on classic local Hosting deploys.
- Consequence for future work:
  - If the symlink smoke test fails with `Administrator privilege required for this operation.`, deploy SSR/admin UI through Firebase App Hosting rollouts, Cloud Shell, CI, Windows Developer Mode, or an elevated trusted shell.
  - Do not misclassify the symlink failure as a Firebase package-install failure after dependency truth passes.

### 1bk. Admin realtime analytics must be hot-materialized before cold provider reads

- Approximate date: Recorded explicitly on 2026-04-30 from the Google Analytics, Cloud, SQL Connect, and Admin Analytics Hot-Truth Hardening pass
- Status: Active admin analytics hydration rule
- Problem/context: `/api/admin/analytics/realtime` could read `analytics_aggregate_stats/realtime_summary`, but no Functions writer kept that document current. When the cache was missing or slightly stale, the admin panel could block on cold GA4 Data API calls and raw Firestore reads, then show degraded/fallback state even when first-party facts existed.
- Decision made: Realtime admin analytics must have a scheduled backend hot-summary materializer and the route must serve fresh or stale hot truth immediately with explicit source labels before attempting cold reads.
- What became canonical:
  - `functions/src/analytics-realtime-summary.ts` materializes `analytics_aggregate_stats/realtime_summary` every minute from first-party active users, event facts, guest batches, watch sessions, and watch assets.
  - `/api/admin/analytics/realtime` treats hot cache under 5 minutes as `fresh`, cache under 30 minutes as `stale`, and only falls through to GA4/Data API plus raw Firestore reads when the hot cache is missing or expired.
  - Cold route rebuilds persist the hot summary asynchronously, and admin UI labels the card `Active Now` with hot-cache/stale/fallback source hints instead of implying GA4 is always the source.
  - Per-user admin analytics fact reads must order by the indexed timestamp fields so user detail recovery uses the latest canonical facts first.
- Consequence for future work:
  - Do not add admin analytics surfaces that cold-query GA4, BigQuery, SQL Connect, or large Firestore scans before a validated hot read model.
  - Stale hot cache is acceptable only with `[stale]` truth labels and visible source details.
  - First-party Firestore facts remain canonical for product/user behavior; GA4 and BigQuery are comparison/export layers unless a reconciliation job proves parity.

### 1bl. Google analytics and cloud dependencies have explicit doctrine

- Approximate date: Recorded explicitly on 2026-04-30 from official Google/Firebase documentation review
- Status: Active setup and dependency rule
- Problem/context: GA4 Measurement Protocol, GA4 Data API, GA4 BigQuery export, BigQuery cached/materialized reads, Cloud Run warm instances, Firestore indexes/aggregations, scheduled Functions, and Firebase SQL Connect were being discussed as if they were interchangeable analytics truth sources.
- Decision made: Google/Firebase analytics dependencies must be documented as explicit capabilities with setup examples and limits before future admin truth changes are made.
- What became canonical:
  - `docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md` defines required env vars, Secret Manager values, App Hosting min-instance expectations, scheduled hot summary patterns, BigQuery export heartbeat expectations, and Firebase SQL Connect/Cloud SQL boundaries.
  - `control-tower/08-DOCTRINE-INDEX.md` points analytics/cloud work to that doctrine.
  - `scripts/agent/check-dependency-truth.ts` now verifies root GA4/Data API/auth dependencies and Functions BigQuery/Firebase dependencies.
- Consequence for future work:
  - Provider docs and verified config outrank assumptions about GA4 or Google Cloud behavior.
  - Measurement Protocol 2xx responses are not delivery proof; admin truth must use first-party facts and explicit delivery heartbeats.
  - SQL/Data Connect remains a derived retrieval plane unless explicitly promoted by schema, writer, and reconciliation evidence.

### 1bj. BigQuery warehouse export must have an admin-visible heartbeat

- Approximate date: Recorded explicitly on 2026-04-29 from the Telemetry Export, GA4, SQL Mirror, and Parity Audit
- Status: Active analytics export observability rule
- Problem/context: The Cloud Functions BigQuery export trigger for `analytics_event_facts` could succeed or fail only in Functions logs. Admin Debug materializer health, analytics continuity, and the SQL/Data Connect retrieval plane could not prove whether first-party event facts were reaching the downstream warehouse.
- Decision made: BigQuery raw-event export remains downstream from canonical Firestore `analytics_event_facts`, but its delivery status must be visible as an admin truth signal.
- What became canonical:
  - `functions/src/analytics-bigquery-export.ts` writes `analytics_export_status/bigquery_raw_events` on success and failure, with dataset/table id, last event id, last exported/failed timestamps, counts, and last error detail.
  - The BigQuery dataset/table ids may be configured with `BQ_ANALYTICS_DATASET_ID` / `BIGQUERY_ANALYTICS_DATASET_ID` and `BQ_ANALYTICS_RAW_EVENTS_TABLE_ID` / `BIGQUERY_ANALYTICS_RAW_EVENTS_TABLE_ID`; defaults remain `kandydrops_canonical_analytics.raw_events`.
  - `/api/admin/debug` loads `analytics_export_status`, and `buildAdminOpsHealth` tracks `analytics_bigquery_raw_events` as a downstream materializer.
  - `scripts/check-analytics-continuity.ts` blocks regressions where the exporter, heartbeat, governance collection, admin read, or ops materializer drift apart.
  - `scripts/agent/extract-runtime-observability.ts` models `analytics_export_status` so the SQL/Data Connect mirror can retrieve the export-health lane.
- Consequence for future work:
  - Do not add warehouse/export jobs that only log to provider consoles; every export must publish a visible source-state heartbeat.
  - Do not treat BigQuery as stronger truth than first-party Firestore facts unless a separate reconciliation job proves parity.
  - Missing export heartbeat must stay degraded, not live.

### 1bh. Admin historical analytics cached snapshots must be explicit

- Approximate date: Recorded explicitly on 2026-04-29 from the Admin Analytics Historical Cache and Legacy Validation pass
- Status: Active admin analytics hydration rule
- Problem/context: Historical admin analytics can be expensive to hydrate because the route combines GA4, Firestore rollups, telemetry facts, commerce summaries, diagnostics, and section-specific payload shaping. Serving cached data without a distinct label would violate admin truth doctrine.
- Decision made: Historical analytics response caching is allowed only when the response is validated and the admin UI receives explicit cache metadata.
- What became canonical:
  - `src/lib/server/ephemeral-route-cache.ts` provides a stale-while-revalidate route cache with validation and in-flight refresh deduping.
  - `/api/admin/analytics/historical` wraps scoped historical responses in that validated backend cache and returns `cacheState`, `cacheAgeMs`, `cacheSourceLabel`, validation issues, and refresh state.
  - `src/lib/admin-parity.ts`, `AdminStatusBadge`, and `AdminModuleVerificationCard` recognize `[cached]` as distinct from `[live]`, `[fallback]`, and `[stale]`.
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` surfaces healthy fresh cache hits as `[cached]` and stale cache hits as `[stale]`.
- Consequence for future work:
  - Do not label cached historical analytics as live.
  - Any new admin backend cache must validate payload shape and expose source state to the UI.
  - Stale-while-revalidate behavior is acceptable only when stale state and refresh status remain visible to admins.

### 1bi. Legacy page rollups must recover date and view fields before estimation

- Approximate date: Recorded explicitly on 2026-04-29 from the Admin Analytics Historical Cache and Legacy Validation pass
- Status: Active historical analytics compatibility rule
- Problem/context: Older `analytics_page_daily` documents may omit `dayKey` or use legacy view fields such as `viewCount` or `views`. Treating those docs as missing causes long-range historical analytics to fall back toward GA estimation or bucket views into the request start day.
- Decision made: Historical traffic must derive the rollup date from the document id when `dayKey` is absent and must accept legacy numeric view field names before estimating guest/public traffic.
- What became canonical:
  - `src/lib/server/admin-analytics-historical-traffic.ts` derives `YYYY-MM-DD` from page rollup document ids and reads page views from `pageViews`, `viewCount`, `views`, or `eventCount`.
  - `tests/unit/admin-analytics-historical-traffic.spec.ts` covers legacy rollup date and view recovery.
- Consequence for future work:
  - Keep historical analytics tolerant of old rollup shapes while clearly labeling source quality.
  - Prefer adding explicit compatibility readers over silently dropping historical documents.

### 1bf. Debug stat cards must declare loaded truth states explicitly

- Approximate date: Recorded explicitly on 2026-04-29 from the Admin Debug Task Refresh Truth Fix
- Status: Active admin truth UI rule
- Problem/context: Admin Debug stat cards could display concrete metric values while still showing `[loading]` because `StatCard` defaulted missing `truthState` props to loading.
- Decision made: Debug stat cards must pass an explicit `AdminSurfaceState`; loading is valid only while the source request is still in flight.
- What became canonical:
  - `src/app/admin/debug/components/DebugPrimitives.tsx` requires `truthState` for `StatCard`.
  - `src/app/admin/debug/page.tsx`, `DebugAdvancedBehavior.tsx`, and `DebugAdvancedTruth.tsx` declare loaded, degraded, failed, or unavailable states per metric.
  - `scripts/check-admin-truth-contracts.ts` blocks debug `StatCard` usages without explicit truth states and blocks reintroducing a loading default.
- Consequence for future work:
  - Do not rely on component defaults for admin truth badges when a metric is loaded.
  - If a debug metric has a number, its badge must describe the metric source state, not the component lifecycle.

### 1bg. Daily task refresh timestamps use a shared timestamp reader

- Approximate date: Recorded explicitly on 2026-04-29 from the Admin Debug Task Refresh Truth Fix
- Status: Active daily task telemetry/debug rule
- Problem/context: Task refresh audits and some profile normalization paths treated only plain numbers as valid refresh timestamps, so Firestore Timestamp-shaped `nextRefreshMs` and `lastResetMs` values could be flagged as sampled refresh warnings.
- Decision made: Daily task refresh metadata must be normalized through `readTaskTimestampMs` before validation or comparison.
- What became canonical:
  - `src/lib/tasks/task-timestamps.ts` handles number, numeric string, Date, Firestore Admin/client `toMillis()`, and seconds/nanoseconds timestamp shapes.
  - `src/lib/server/daily-tasks.ts`, `src/lib/user-utils.ts`, and `/api/admin/debug` use the shared reader for daily task refresh metadata.
  - `/api/admin/debug` emits exact refresh issue codes so real task state problems remain visible.
- Consequence for future work:
  - Do not use `Number(...)` or `Number.isFinite(...)` directly on daily task timestamp fields.
  - Refresh warnings must distinguish malformed data from valid Firestore timestamp shapes.

### 1be. Historical guest/public analytics must prefer first-party rollups before GA estimation

- Approximate date: Recorded explicitly on 2026-04-29 from the Admin Analytics Realtime Fallback Root-Cause Fix
- Status: Active admin analytics historical rule
- Problem/context: Historical analytics could label guest/public traffic as estimated from GA totals minus identified first-party traffic even when KandyDrops had exact anonymous first-party evidence in `analytics_page_daily` or `analytics_sessions`.
- Decision made: Historical guest/public traffic must use raw `analytics_guest_batches`, persisted `analytics_page_daily` page rollups, and `analytics_sessions` session docs before using GA-minus-identified estimation.
- What became canonical:
  - `src/lib/server/admin-analytics-historical-traffic.ts` treats `analytics_page_daily` page views and unique `analytics_sessions` keys as exact guest/public evidence.
  - `src/app/api/admin/analytics/historical/route.ts` passes `guestSessionsSnapshot.docs` into the historical traffic builder.
  - `src/components/CoreLayoutWrapper.tsx` starts `DeepTracker` after paint so the homepage writes first-party anonymous page-view batches early enough to align with GA4.
  - `scripts/check-analytics-continuity.ts` blocks removing the first-party guest rollup/session inputs before GA estimation.
- Consequence for future work:
  - Do not show GA-minus-identified guest/public estimates when first-party guest rollups or anonymous sessions are present.
  - Keep homepage first-party telemetry early and non-visual; defer heavier overlays, not the initial analytics collector.
  - If guest-session storage changes, update historical analytics, realtime analytics, continuity guards, and tests together.

### 1bd. `analytics_active_users` is a written first-party live lane

- Approximate date: Recorded explicitly on 2026-04-29 from the Admin Analytics Realtime Fallback Root-Cause Fix
- Status: Active admin analytics realtime rule
- Problem/context: `/api/admin/analytics/realtime` read `analytics_active_users` as its primary live identity source, but no canonical telemetry path wrote that collection. Admin analytics therefore fell back to event facts and watch sessions even when identified users were active.
- Decision made: Identified client ingestion and identified server analytics events must mirror latest user activity into `analytics_active_users`, and the admin realtime route treats that first-party lane as live when present.
- What became canonical:
  - `src/app/api/analytics/ingest-identified/route.ts` writes the latest event per payload to `analytics_active_users`.
  - `src/lib/server/analytics.ts` writes identified server events to `analytics_active_users`.
  - `src/app/api/admin/analytics/realtime/route.ts` uses `analytics_active_users` in first-party live buckets and does not degrade merely because GA4 realtime is empty while first-party live data exists.
  - `scripts/check-analytics-continuity.ts` blocks drift where the realtime route reads `analytics_active_users` without corresponding writers.
- Consequence for future work:
  - Do not add primary admin analytics read lanes without a verified writer path.
  - GA4 realtime can supplement the live panel, but first-party Firestore live activity is the source that must keep admin hydration stable.
  - If the active-user schema changes, update the identified ingest writer, server analytics writer, realtime route reader, and continuity guard together.

### 1bc. Client Firestore listeners require explicit read-only rules

- Approximate date: Recorded explicitly on 2026-04-29 from the Global Client Firestore Connectivity Audit
- Status: Active Firebase/admin hydration rule
- Problem/context: Admin analytics, overview, drops/queue, transactions, and debug panels had client Firestore listeners or reads for collections that were denied by `firestore.rules`, so panels could fail to hydrate even when backend API routes were healthy.
- Decision made: Every client-side Firestore collection read must have an explicit matching read-only rule, and admin dashboard collections must allow `isAdmin()` reads while keeping direct client writes denied.
- What became canonical:
  - `firestore.rules` grants admin read-only access to the admin UI telemetry/diagnostic/read-model collections already used by client listeners.
  - `tests/firebase/firestore.rules.spec.ts` proves admin read success, non-admin denial, and write denial for these admin realtime lanes.
  - `scripts/check-client-firestore-connectivity.ts` scans client Firestore usage and fails `npm run check:analytics:continuity` when a client collection lacks an explicit read-only rule.
- Consequence for future work:
  - Do not add `collection(db, ...)`, `doc(db, ...)`, `onSnapshot`, `getDocs`, or `getDoc` client reads without updating Firestore rules and emulator tests.
  - Keep all direct client writes denied unless a separate security review explicitly changes that contract.
  - For public user-facing data, prefer server readers/API routes unless an existing doctrine-backed realtime client contract exists.

### 1bb. Admin loading is a first-class truth state, not unavailable

- Approximate date: Recorded explicitly on 2026-04-29 from the Admin Loading Truth and Analytics Hydration Audit
- Status: Active admin UI/backend analytics truth rule
- Problem/context: Hydrating admin panels were using `[unavailable]` before the first verified snapshot arrived, making live user and analytics surfaces look unwired instead of still loading.
- Decision made: `loading` is a canonical `AdminSurfaceState`. Admin UI must use `[loading]` for in-flight source requests and reserve `[unavailable]` for no verified source snapshot after loading has resolved.
- What became canonical:
  - `src/lib/admin-parity.ts` includes `loading` and coerces `waiting`, `pending`, `hydrating`, and `connecting` to it.
  - `AdminStatusBadge` renders `[loading]`.
  - `scripts/check-admin-truth-contracts.ts` blocks loading-to-unavailable mappings in admin UI files.
- Consequence for future work:
  - Do not map `isLoading`, `loading`, `hydrating`, or reconnect states to `"unavailable"`.
  - Use `currentSource: "hydrating"` or a clear loading truth state for backend analytics debug metadata while requests are in flight.
  - Only show `[unavailable]` when a source is not wired or no verified snapshot exists after loading completes.

### 1ba. Telemetry module indexes derive from catalog event metadata

- Approximate date: Recorded explicitly on 2026-04-29 from the Telemetry Module Index Parity Audit
- Status: Active telemetry/admin debug rule
- Problem/context: `TELEMETRY_EVENT_OPTIONS.modules` and `TELEMETRY_MODULE_INDEXES.eventNames` could drift independently, causing admin/debug module slices to under-report cataloged events or include relationships the event metadata did not declare.
- Decision made: event `modules` metadata is the source of truth for module membership, and module index event lists must be derived from that metadata.
- What became canonical:
  - `src/lib/telemetry-catalog.ts` builds module index event names through `buildTelemetryModuleEventNames`.
  - `scripts/check-telemetry-parity-contracts.ts` enforces bidirectional event-module parity.
  - `npm run check:telemetry` blocks missing or extra event-module relationships.
- Consequence for future work:
  - Do not hand-maintain partial module event lists.
  - When adding a telemetry event, set `modules` truthfully; module dashboards inherit from that declaration.
  - If a module dashboard should include an event, update the event metadata instead of only editing the index.

### 1az. Route runtime targets must match live handlers and carry operational labels

- Approximate date: Recorded explicitly on 2026-04-29 from the Route Runtime Telemetry Parity and Debug Label Audit
- Status: Active runtime telemetry/admin debug rule
- Problem/context: Route runtime health still contained legacy/deleted target keys and many vague generated titles, which could make admin health dashboards show routes that no longer exist or labels that do not help triage.
- Decision made: `ROUTE_RUNTIME_HEALTH_TARGETS` must be a one-to-one registry for live API/proxy route handlers, except the intentionally untracked `/api/health` route. Runtime titles must be operational, not generated placeholders.
- What became canonical:
  - `scripts/check-route-runtime-parity.ts` compares route handlers with runtime targets and blocks stale/missing entries.
  - `npm run check:continuity` runs `check:route-runtime-parity`.
  - Route handlers must emit the same key as their concrete route path unless a documented exception is added to the parity script.
- Consequence for future work:
  - Do not add or rename API routes without keeping `ROUTE_RUNTIME_HEALTH_TARGETS` in sync.
  - Do not leave `Auto-generated for ...` runtime labels in admin diagnostics.
  - Do not preserve legacy runtime aliases once the concrete route key exists.

### 1ay. Telemetry catalog events must have emitters and semantic parity

- Approximate date: Recorded explicitly on 2026-04-29 from the Telemetry and Parity Gap Hardening pass
- Status: Active telemetry/admin truth rule
- Problem/context: Telemetry catalog entries could drift without emitters, and page-view events could exist in UI/admin analytics without matching app/server/Functions semantic rollup handling.
- Decision made: `npm run check:telemetry` must fail on cataloged events without emitters or explicit audit coverage, and must enforce PageViewEvent catalog/path/rollup parity across app, server, and Functions.
- What became canonical:
  - `scripts/audit-telemetry.ts` blocks orphan catalog events.
  - `scripts/check-telemetry-parity-contracts.ts` blocks module-index, admin-log, PageViewEvent, and semantic rollup drift.
  - `src/lib/analytics-semantics.ts`, `src/lib/server/analytics-semantics.ts`, and `functions/src/analytics-semantics.ts` must stay aligned for page-view rollups.
- Consequence for future work:
  - Do not add telemetry catalog events without a concrete emitter or explicit `auditCoveredBy` relationship.
  - Do not add a `PageViewEvent` without catalog coverage and semantic rollup coverage in app/server/Functions.
  - Admin chart interactions must emit both specific chart controls and generic chart-view telemetry when the catalog expects both.

### 1ax. 404 and error surfaces must use shared truth-first contracts

- Approximate date: Recorded explicitly on 2026-04-29 from the Final Consistency Audit and 404 Unification pass
- Status: Active route/error UI and API rule
- Problem/context: Global 404, creator-missing UI, and API 404 payloads drifted into one-off copy and response shapes. The global 404 also used banned "Looks like" phrasing.
- Decision made: Page-level 404s and entity-missing user surfaces use `NotFoundSurface`; API not-found responses use `buildNotFoundResponse` or `AuthError(..., 404, resource)` through `handleApiError`.
- What became canonical:
  - `src/components/ui/NotFoundSurface.tsx` owns user-facing 404 layout/copy.
  - `src/lib/server/not-found.ts` owns API not-found payload shape.
  - `scripts/check-not-found-contracts.ts` blocks banned 404/error copy, selected API helper drift, and direct `src/app/api` `status: 404` responses.
  - `npm run check:ui:runtime` runs `check:not-found`.
- Consequence for future work:
  - Do not add "Looks like", "Oops", "Page Not Found", or "Something went wrong" to user-facing route/error surfaces.
  - Do not hand-roll new API 404 JSON responses when the canonical helper or `AuthError` can express the missing resource; the static contract check scans `src/app/api`.
  - Preserve existing domain error codes only when a client or test already depends on them.

### 1av. Chat routes own viewport height and compact inbox scrolling

- Approximate date: Recorded explicitly on 2026-04-28 from the Doctrine Audit, Chat Mobile Scroll, and Mobile UI Runtime Guarding pass
- Status: Active mobile UI/runtime rule
- Problem/context: The compact chat inbox/search state could grow taller than the visible app area before a thread was opened, while the selected-thread message view stayed correct because it already used a bounded internal scroll owner.
- Decision made: `/dashboard/chat` must bound `main` to `100dvh`, keep document/body/main overflow locked for the route, and give the compact thread list exactly one nested `overflow-y-auto` owner. Compact input recovery must treat the chat route scroll lock as expected, not as a stale lock to clear.
- What became canonical:
  - `src/components/Chat/ChatRouteShell.tsx` owns route-level height/overflow locking and restoration.
  - `src/components/Chat/ChatExperience.tsx` owns compact inbox/list refs, bounded class contracts, and runtime layout diagnostics through `reportClientIssue`.
  - `src/lib/self-healing.ts` supports expected route-owned scroll locks through `isDocumentScrollLockExpected`.
  - `scripts/check-mobile-ui-doctrine.ts` blocks regressions and is part of `npm run check:ui:runtime`.
- Consequence for future work:
  - Do not add `h-screen`, `min-h-screen`, or raw `100vh` to chat inbox/list surfaces.
  - Do not clear chat-route document/main scroll locks from compact recovery code.
  - Any mobile fixed-shell surface with top/bottom chrome must name its scroll owner and make overflow diagnostics visible.

### 1aw. Firebase Admin bootstrap must not import Firestore-backed diagnostics

- Approximate date: Recorded explicitly on 2026-04-28 from the Doctrine Audit, Chat Mobile Scroll, and Mobile UI Runtime Guarding pass
- Status: Active server dependency rule
- Problem/context: `src/lib/server/firebase-admin.ts` imported route diagnostics while Firebase Admin was still initializing. Route diagnostics can reach Firestore-backed diagnostic writers, which import Firebase Admin, forming a dependency cycle and making bootstrap failure reporting recursively dependent on the failing bootstrap path.
- Decision made: Firebase Admin initialization failures must use direct bootstrap logging at that layer. Firestore-backed diagnostics are valid only after Admin initialization succeeds.
- What became canonical:
  - `src/lib/server/firebase-admin.ts` logs initialization failures directly with the `[firebase-admin-init]` label and rethrows.
  - `npm run check:continuity` and `npm run check:cycles` must remain clean after server diagnostic changes.
- Consequence for future work:
  - Do not import `route-diagnostics`, `server-diagnostics`, or other Firestore-backed writers into Firebase Admin bootstrap code.
  - If bootstrap diagnostics need durable storage later, write them through an external sink that does not depend on the Admin SDK instance being initialized.

### 1au. Homepage hydration work must be idle-aware, abortable, and guard-backed

- Approximate date: Recorded explicitly on 2026-04-28 from the Homepage Performance and Hydration Hardening pass
- Status: Active homepage performance/runtime rule
- Problem/context: Homepage scroll jank came from several small sources stacking together: eager deep telemetry, always-on carousel autoplay, immediate diagnostic observers, per-card resize observers, broad auth/UI context subscriptions, duplicate seeded creator loads, and server discovery relationship-count fan-out.
- Decision made: Homepage client work must subscribe narrowly, defer non-critical telemetry/diagnostics until idle, pause animation/timers when offscreen or hidden, abort stale discovery fetches, and keep regression checks in `npm run check:home-hydration`.
- What became canonical:
  - `src/components/HomepageRuntimeDiagnostics.tsx` owns idle-scheduled homepage layout/input/long-task diagnostics.
  - `src/components/Landing/HomeActiveDropsCarousel.tsx` owns visibility-aware carousel autoplay.
  - `src/components/CreatorDiscoveryRail.tsx` owns abortable/deferred creator rail hydration.
  - `src/context/UIContext.tsx` exposes `useUIActions()` so CTA surfaces can avoid modal-state rerenders.
  - `scripts/check-home-hydration-performance.ts` blocks regressions across these paths.

### 1at. Admin route verification must be evidence-based, not success-flag based

- Approximate date: Recorded explicitly on 2026-04-28 from the Second Admin Truth Remediation pass
- Status: Active admin route/debugging rule
- Problem/context: Route runtime verification could miss successful admin JSON payloads that did not include `success: true`, could stamp freshness from response time rather than payload evidence, and could return the original response quietly if verification injection failed.
- Decision made: Admin route verification must run for eligible admin JSON objects without depending on `success: true`, derive freshness from payload fields when present, degrade payloads that lack source-state evidence, and record injection failures through route diagnostics.
- What became canonical:
  - `src/lib/server/route-runtime-health.ts` owns evidence-based admin route verification injection.
  - `scripts/check-admin-truth-contracts.ts` blocks `success: true` gating, response-time freshness, and silent injection failure regressions.
- Consequence for future work:
  - Do not mark an admin route `[live]` only because HTTP returned 200.
  - Do not fabricate freshness with `Date.now()` inside verification envelopes.
  - Do not add admin JSON routes that bypass source-state evidence or runtime health recording.

### 1as. Admin analytics polling endpoints must implement ephemeral caching for read efficiency

- Approximate date: Recorded explicitly on 2026-04-26 from the Admin Analytics Resilience pass
- Status: Active admin performance/resilience rule
- Problem/context: Realtime analytics endpoints (`/api/admin/analytics/realtime`) were reading heavily from raw GA and Firestore aggregations on every poll. This introduced Thundering Herd risks and excessive reads when multiple admin instances or re-connections occurred simultaneously.
- Decision made: Expensive realtime aggregation reads must utilize a 5-minute server-side cache (`analytics_aggregate_stats`) to serve recent truth while protecting backend quotas. The cache must carry a `liveTruthLabel` so the UI knows if it is displaying `live` or `fallback` data.
- What became canonical:
  - `src/app/api/admin/analytics/realtime/route.ts` wraps its expensive reads in caching logic.
  - `analytics_aggregate_stats` is the designated cache collection.
- Consequence for future work:
  - Do not build uncached, heavy aggregation queries on endpoints intended for polling.
  - Always maintain UI awareness of data freshness via explicit `fallback` or `live` labels.

### 1ar. Admin overview/debug/analytics hydration must not wait on cold polling when hot Firestore truth exists

- Approximate date: Recorded explicitly on 2026-04-24 from the Admin Hydration + Realtime Janitorial Recovery pass
- Status: Active admin truth and hydration rule
- Problem/context: Admin overview and debug work had drifted toward short polling, incomplete refactor state, and one client hook importing server-only route-runtime health. Analytics had listener-derived live truth, but the merged response could still appear blocked behind the polled realtime route.
- Decision made: Hot admin dashboards should hydrate from canonical Firestore listeners as soon as listener snapshots are available. Server routes remain rollup/fallback companions and must not be required before live/partial realtime truth can render.
- What became canonical:
  - `src/hooks/useAdminOverviewRealtime.ts` owns overview listener hydration and source-state labeling.
  - `src/hooks/useAdminOverview.ts` delegates to the realtime overview hook.
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` can return listener-derived live analytics without waiting for the polled realtime route.
  - `src/lib/route-runtime-health.ts` exports the client-safe route runtime health collection key.
  - `src/app/admin/debug/hooks/useAdminDebugRealtime.ts` reads debug realtime health without importing server-only modules.
- Consequence for future work:
  - Do not restore top-level admin dashboards to polling-only hydration when a canonical listener lane exists.
  - Do not import `@/lib/server/*` from client hooks or UI.
  - Admin UI may show `[Partial]`, `[Failed]`, or `[Fallback]`, but it must not claim `[Live]` unless the relevant listener state proves it.

### 1aq. Admin realtime client hooks must derive visible selection and subscription targets from the same source

- Approximate date: Recorded explicitly on 2026-04-24 from the Admin Realtime Truth Review-Finding Remediation pass
- Status: Active admin truth and realtime UI rule
- Problem/context: The moderation console could visibly default to the first realtime thread while the transcript listener still subscribed with `null`, leaving the operator looking at a selected thread whose messages were not actually subscribed.
- Decision made: Admin realtime hooks that expose a selected entity and a detail subscription must derive one active key and use that key for both detail subscription and visible selection. If an explicit selected key is missing or invalid, the hook may derive a first-item active key from the realtime list, but it must not render one key while subscribing to another.
- What became canonical:
  - `src/hooks/useAdminModerationRealtime.ts` owns `activeThreadId` derivation for moderation threads.
  - `src/components/Admin/AdminModerationConsole.tsx` renders the selected moderation thread from that hook-owned active key.
  - Privacy preflight dedupe health only claims `live` when canonical event IDs prove document-level uniqueness.
- Consequence for future work:
  - Do not wire admin detail panels to page-local fallback selection when the listener uses a different key.
  - Do not report admin dedupe or source-state health as `live` unless the canonical key/source contract is proven.
  - Generated verification artifacts such as Playwright reports, Firebase debug logs, and test-result state files must stay out of tracked repo truth.

### 1ap. Admin truth surfaces must use one shared status contract and expose canonical source verification in route payloads

- Approximate date: Recorded explicitly on 2026-04-23 from the Admin Parity + Source Verification Hardening pass
- Status: Active admin truth and debugging rule
- Problem/context: Admin surfaces were drifting between `live`, `realtime`, `healthy`, `warn`, `partial`, `connecting`, `polled`, and hardcoded badge states. Several routes returned useful data but no uniform proof of canonical source, fallback source, freshness, or degraded reason.
- Decision made: Shared admin surfaces now standardize on `live`, `degraded`, `fallback`, `stale`, `unavailable`, and `failed`, and route payloads for key admin modules must return a verification envelope that names the canonical source, fallback source, freshness timestamp, degraded reason, and count composition when relevant.
- What became canonical:
  - `src/lib/admin-parity.ts`
  - `src/lib/server/admin-source-verification.ts`
  - `src/components/admin/AdminStatusBadge.tsx`
  - route-level `verification` payloads on major admin endpoints
  - `scripts/check-admin-parity.ts` as the fast structural gate for admin parity drift
- Consequence for future work:
  - Do not add new admin surfaces with bespoke status unions.
  - Do not claim `[live]` without a canonical source path.
  - If a module is fallback, stale, degraded, unavailable, or failed, the route and UI must say so explicitly.

### 1ao. Admin analytics live presence must subscribe to canonical first-party telemetry and treat polling as fallback, not primary truth

- Approximate date: Recorded explicitly on 2026-04-22 from the Admin Analytics Realtime Presence Hardening pass
- Status: Active admin analytics serving rule
- Problem/context: The repo already stored canonical live telemetry in Firestore (`analytics_event_facts`, `analytics_guest_batches`, `analytics_sessions`, `analytics_watch_sessions`), but `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` still consumed "realtime" through a short-interval polled route snapshot. This made GA feel like the only practical live source and hid real guest presence behind delayed admin refresh cycles.
- Decision made: For admin "who is here now / what are they doing now" surfaces, first-party Firestore listeners are the primary live lane. The server route remains a fallback and aggregate companion, not the only realtime transport.
- What became canonical:
  - `src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts` owns the live Firestore subscription path
  - `src/lib/admin-analytics-live-runtime.ts` deterministically derives the live roster, surface mix, and live pulse from canonical Firestore docs
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` merges listener-driven live truth over the polled route only when the realtime lane is healthy or partially healthy
  - guest presence is first-class in the live roster instead of being implied only by delayed history
  - polling for `/api/admin/analytics/realtime` is reduced to a slower fallback cadence rather than a 5-second primary lane
- Truth lives in:
  - Firestore canonical collections for live activity
  - `src/lib/admin-analytics-live-runtime.ts`
  - `src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts`
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
- Consequence for future work:
  - Do not build new admin live cards by shortening polling alone if a canonical live collection already exists.
  - If a live lane fails, fail closed, self-snitch, and fall back explicitly.
  - Keep GA as a useful companion for external analytics, not the sole operator truth for live on-site presence.

### 1an. Analytics/runtime truth should self-snitch at framework boot and on degraded serving paths, not only after delayed hydration or console inspection

- Approximate date: Recorded explicitly on 2026-04-21 from the Analytics Self-Snitching + Early Runtime Diagnostics Hardening pass
- Status: Active diagnostics and truth-surface rule
- Problem/context: KandyDrops already had client diagnostics, route diagnostics, runtime warnings, and self-healing helpers, but critical failures could still hide in two places:
  - early client boot or hydration windows before deferred diagnostics mounted
  - analytics/runtime fallback paths that exposed `issues` in payloads but did not always escalate those degraded states into canonical runtime warnings
- Decision made: Install diagnostics at framework boot using Next.js instrumentation hooks, and treat degraded analytics truth as a canonical warning lane rather than an operator-only interpretation problem.
- What became canonical:
  - `src/instrumentation-client.ts` and `src/lib/client-boot-diagnostics.ts` install client diagnostics before the app becomes interactive
  - `src/instrumentation.ts` and `src/lib/server/framework-request-diagnostics.ts` bridge framework request errors into server diagnostics and runtime warning records
  - analytics routes should escalate fallback/partial/failed truth into `runtime_warning_records` through `src/lib/server/analytics-runtime-warning.ts`
  - user-activity query fallbacks now escalate into canonical runtime warnings instead of only warning diagnostics
- Truth lives in:
  - `src/instrumentation-client.ts`
  - `src/lib/client-boot-diagnostics.ts`
  - `src/instrumentation.ts`
  - `src/lib/server/framework-request-diagnostics.ts`
  - `src/lib/server/analytics-runtime-warning.ts`
  - `src/lib/server/runtime-warning-store.ts`
- Constraints:
  - Do not mark fallback analytics as healthy
  - Do not invent recovered precision; warnings should describe degraded truth, not mask it
  - Keep diagnostics inside existing canonical stores instead of creating shadow dashboards

### 1am. Heavy admin analytics/history reads should use short-lived server caching and slower cold-data polling instead of live-style refetch loops

- Approximate date: Recorded explicitly on 2026-04-21 from the User/Admin Loading Audit + Analytics Historical Pull Tightening pass
- Status: Active admin loading/performance rule
- Problem/context: Admin analytics and debug surfaces were treating expensive historical and operational reads too much like realtime data. The historical analytics route already supported section-scoped responses, but the shared source helper still fanned out into the same broad GA + Firestore read set on every scoped request. Client polling also revalidated heavy historical/admin reads too frequently and on focus, which made hydration and repeat loads more expensive than the truth model required.
- Decision made: Keep live pulse fast, but treat historical and operational admin reads as cold-ish data. Use short-lived server-side caching with in-flight dedupe for repeated heavy route payloads, slow heavy polling intervals, and avoid focus-triggered revalidation for those lanes. Client shells should also avoid hydrating large admin analytics tab modules before the operator actually opens them.
- What became canonical:
  - `src/lib/server/ephemeral-route-cache.ts` provides short-lived, in-flight-deduped route payload caching
  - `src/lib/server/admin-analytics-data.ts` now caches expensive historical source bundles
  - `src/app/api/admin/analytics/realtime/route.ts` now uses a short-lived cached payload window for repeated realtime/admin pulse reads
  - `src/app/api/user/activity/route.ts` now uses a short-lived cached payload window for repeated recent-activity summary/history reads
  - `src/app/admin/analytics/AnalyticsHelpers.tsx`, `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`, `src/hooks/useAdminOverview.ts`, and `src/app/admin/debug/page.tsx` now use slower polling and disable focus-triggered revalidation on heavy historical/admin lanes
  - `src/app/admin/analytics/page.tsx` now loads tab modules and heavy admin modules dynamically
- Truth lives in:
  - `src/lib/server/ephemeral-route-cache.ts`
  - `src/lib/server/admin-analytics-data.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/app/api/admin/analytics/realtime/route.ts`
  - `src/app/api/user/activity/route.ts`
  - `src/app/admin/analytics/AnalyticsHelpers.tsx`
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/hooks/useAdminOverview.ts`
  - `src/app/admin/debug/page.tsx`
- What is now disallowed or deprecated:
  - treating full historical analytics payloads as if they need 15-second polling plus focus revalidation
  - forcing repeated admin historical/realtime rebuilds inside the same short operator window when a cached payload is still fresh
  - eagerly hydrating every large admin analytics tab/module before the operator opens that tab

### 1am. Next App Router entry files must not export helper values, test hooks, or shared types

- Approximate date: Recorded explicitly on 2026-04-21 from the deployment audit pass
- Status: Active deployment/build rule
- Problem/context: The repo had several App Router entry modules exporting helper symbols (`MODULE_DEFAULTS`, route helper functions, `__test`, and a shared page-level type). Next 16 rejects arbitrary exports from `page.tsx` and `route.ts` entry files during production type generation, which created a real build/deploy blocker even though the production backend itself was live.
- Decision made: Entry modules may export only Next-supported route/page exports plus the route handlers themselves. Shared helpers, test helpers, and cross-file types must live in adjacent non-entry modules and be imported from there by both runtime code and tests.
- What became canonical:
  - `src/app/admin/ai/admin-ai-state-exports.ts`
  - `src/app/api/creator/bookings/booking-timezone.ts`
  - `src/app/api/user/activity/activity-route-test-helpers.ts`
  - `src/app/dashboard/profile/profile-page-types.ts`
- Enforcement implication: When a build fails on `.next/types/app/**` with an index-signature or invalid-entry-export error, audit the corresponding App Router entry file first before changing deployment infrastructure.

### 1al. Analytics truth is now modeled in explicit raw, validated, finalized, estimated, and serving/debug layers

- Approximate date: Recorded explicitly on 2026-04-21 from the Analytics Truth Recovery + Telemetry Hardening pass
- Status: Active telemetry/admin truth rule
- Problem/context: KandyDrops already had canonical event facts, guest batches, mutable watch-session/watch-asset docs, and admin analytics rollups, but it still lacked a truth model that separated fast observed telemetry from deduped truth, reconciled historical truth, and estimated recovery. That made watch time, views, and behavioral inputs vulnerable to duplicate remount noise, delayed or missing closes, and legacy-broken identified ingest.
- Decision made: Analytics truth must be stored and surfaced in explicit layers. Raw observed telemetry stays append-only and never overwritten. Validated truth removes obvious duplicate noise while preserving real repeat behavior. Finalized truth is generated by scheduled reconciliation. Estimated recovery stays separate, labeled, queryable, and confidence-scored. Admin/debug and downstream ranking/profile consumers must be able to see the quality and origin of the telemetry they rely on.
- What became canonical:
  - `functions/src/analytics-event-facts.ts` now accepts batched identified events and dedupes them by stable event ID
  - `src/app/api/viewer/watch-session/route.ts` now writes append-only `analytics_watch_observations` keyed by `watchSessionId + sessionSequence`
  - `functions/src/analytics-truth-contract.ts`, `functions/src/analytics-truth-runtime.ts`, and `functions/src/analytics-truth-schedule.ts` define and build the explicit truth layers
  - `analytics_truth_global_metrics`, `analytics_truth_drop_metrics`, `analytics_truth_user_metrics`, `analytics_truth_session_metrics`, `analytics_truth_repairs`, and `analytics_truth_status` are the canonical serving/debug outputs for telemetry truth recovery
  - `src/lib/server/analytics-truth-recovery.ts` is the server-side read helper for admin/debug surfaces
  - `src/app/api/admin/debug/route.ts` and `src/app/admin/debug/page.tsx` expose truth-layer counts, repaired-data ratios, repair records, and metric quality labels
  - `src/lib/server/behavioral-intelligence.ts` now carries telemetry quality labels into deterministic recommendation outputs
  - `src/lib/viewer-watch-session.ts` keeps replay-recovered sessions labeled `replayed` for provenance, but the degraded-health budget now only counts unresolved `gap_detected`, `flush_degraded`, and `close_missing` states
  - `src/lib/admin-analytics-truth.ts` now allows optional legacy guest-history sources to be marked healthy when the guest lane is idle, so admin truth does not warn on `analytics_guest_batches` or `analytics_page_daily` when no guest sessions landed in the selected window
  - `src/app/api/admin/analytics/realtime/route.ts` now uses recent identified event facts, guest batches, and watch sessions as a truthful first-party fallback when GA realtime or `analytics_active_users` is unavailable, and it labels that fallback explicitly in the response
- Truth lives in:
  - `functions/src/analytics-event-facts.ts`
  - `src/app/api/viewer/watch-session/route.ts`
  - `functions/src/analytics-truth-contract.ts`
  - `functions/src/analytics-truth-runtime.ts`
  - `functions/src/analytics-truth-schedule.ts`
  - `src/lib/server/analytics-truth-recovery.ts`
  - `src/app/api/admin/debug/route.ts`
  - `src/app/admin/debug/page.tsx`
  - `scripts/rebuild-analytics-truth.ts`
- What is now disallowed or deprecated:
  - treating mutable watch-session docs or high-level rollups as if they were the same thing as raw observed telemetry
  - overwriting estimated recovery into the exact/finalized numbers without explicit labeling
  - treating duplicate viewer-open/remount noise as legitimate view growth
  - feeding downstream ranking/profile systems historical behavior without exposing telemetry quality/confidence
  - batching identified client telemetry into `{ events: [...] }` while the callable ingest path only understands a single raw event payload

### 1ak. Agent implementation should start from a generated fast-start packet, and verification should be split into fast-loop versus signoff lanes

- Approximate date: Recorded explicitly on 2026-04-21 from the Agent Fast-Path + Deterministic Verification Lane Split pass
- Status: Active repo-intelligence workflow rule
- Problem/context: The repo already had task-context generation and verification metadata, but agent implementation loops still tended to widen into broad checks too early because task-context output exposed one flattened verification list instead of a deterministic fast loop versus signoff split. That slowed narrow and moderate implementation work and made cloud/local agents more likely to run repo-wide sweeps than the touched surface justified.
- Decision made: Agent work should start from `git status --short`, `agent:fast-start`, and the generated verification split before broad signoff. Verification is now modeled in two lanes: a fast implementation loop for targeted checks and a signoff loop for broad continuity, UI audits, rules, and runtime continuity when the touched surface actually requires them.
- What became canonical:
  - `scripts/agent/verification-selector.ts` derives `fastCommands` and `signoffCommands` from repo inventory, surface-map, UI coverage, and verification-command metadata
  - `scripts/agent/fast-start.ts` bundles git status, task-context generation, adjacency tracing, verification selection, and an issue-style task spec
  - `scripts/agent/build-task-context.ts` now emits `fastVerificationCommands`, `signoffVerificationCommands`, `verificationAdvisories`, and `forbiddenSurfaces`
  - `AGENTS.md` and `agent/README.md` now document `agent:fast-start` and `agent:verify` as the default low-token implementation path
  - `.github/instructions/*.instructions.md` and `.claude/agents/test-specialist.md` provide path-specific agent instructions for analytics, admin/debug, functions/runtime, and tests
- Truth lives in:
  - `scripts/agent/verification-selector.ts`
  - `scripts/agent/fast-start.ts`
  - `scripts/agent/build-task-context.ts`
  - `scripts/agent/run-evals.ts`
  - `AGENTS.md`
  - `agent/README.md`
  - `.github/copilot-instructions.md`
- What is now disallowed or deprecated:
  - defaulting narrow or moderate implementation tasks to `npm run check`, `npm run check:continuity`, or UI audits before running the targeted fast lane
  - treating one flattened verification list as sufficient guidance for agent implementation
  - skipping explicit forbidden-surface guidance when handing a task to an agent
  - relying on generic agent prompting when the repo can generate an issue-style task spec and deterministic verification plan first

### 1aj. Viewer watch close intent must survive flush failure, and closed recovered sessions are not permanently flush-degraded

- Approximate date: Recorded explicitly on 2026-04-18 from the Viewer Watch Close-Intent Repair pass
- Status: Active viewer continuity rule
- Problem/context: A failed terminal watch-session close flush could still fall back to heartbeat retries, which dropped the close intent and left canonical sessions open forever. The capture-state helper also treated any flush failure as permanently degraded, even after the session had been repaired to a terminal close.
- Decision made: Preserve close intent across flush failure, retry the terminal close explicitly, and classify flush-degraded state only while the session is still open. Once the terminal close is recorded, the session may remain replayed or otherwise degraded in history, but it should no longer be counted as an unresolved flush-degraded continuity failure.
- What became canonical:
  - `src/hooks/useViewerWatchSession.ts` now schedules a close retry instead of downgrading a failed close into a heartbeat retry
  - `src/lib/viewer-watch-session.ts` exports `shouldRetryViewerWatchCloseFlush(...)` and only counts flush-degraded state while a session is still open
  - `scripts/repair-viewer-watch-close-missing.ts` can backfill canonical close-missing sessions by writing the terminal close source truth and logging the repaired docs
  - `scripts/check-analytics-continuity.ts` now observes the repaired canonical truth and passes with only the expected legacy-history warnings
- Truth lives in:
  - `src/hooks/useViewerWatchSession.ts`
  - `src/lib/viewer-watch-session.ts`
  - `src/lib/server/admin-analytics-capture-health.ts`
  - `scripts/repair-viewer-watch-close-missing.ts`
  - `scripts/check-analytics-continuity.ts`
  - `tests/unit/viewer-watch-session.spec.ts`
  - `tests/unit/admin-analytics-capture-health.spec.ts`
- What is now disallowed or deprecated:
  - letting a failed close flush silently degrade into a heartbeat retry that drops terminal close intent
  - counting a closed-and-recovered watch session as permanently flush-degraded just because it once had flush failures
  - fixing continuity by weakening the checker instead of repairing or classifying the source truth

### 1ai. Viewer unwrapped/static watch time should resolve from visible dwell time, while media remains playback-progress truth

- Approximate date: Recorded explicitly on 2026-04-18 from the Viewer Unwrapped Watch-Time Refactor pass
- Status: Active viewer engagement rule
- Problem/context: The viewer session code still treated watch time as a fixed bucket for all assets. That undercounted unwrapped/static content where the user’s actual visible dwell time is the truth source, while media content still needed playback-progress accounting.
- Decision made: Add a shared resolver that computes watch seconds from playback progress for media and from visible dwell time for static/unwrapped assets. Static/unwrapped viewer assets must accumulate elapsed visible time on cleanup/finalization instead of replacing the session bucket with a floor value.
- What became canonical:
  - `src/lib/viewer-watch-session.ts` now exposes `resolveViewerWatchSeconds(...)`
  - `src/app/dashboard/viewer/ViewerClient.tsx` starts and commits visible-time windows for non-media assets and preserves playback-based timing for video/audio assets
  - the static asset auto-complete timer now resolves its telemetry/watch seconds through the shared helper instead of hard-coding a fixed 6-second bucket
  - watch-time updates for unwrapped/static content should be additive to the session tally, not a fixed minimum bucket
- Truth lives in:
  - `src/lib/viewer-watch-session.ts`
  - `src/app/dashboard/viewer/ViewerClient.tsx`
  - `tests/unit/viewer-watch-session.spec.ts`
- What is now disallowed or deprecated:
  - treating static/unwrapped viewer watch time as a fixed placeholder duration when the viewer can prove actual visible dwell time
  - applying visible-window accumulation to media playback content when playback progress is the more truthful source
  - keeping a hard-coded 6-second static auto-complete bucket after the shared resolver exists

### 1ah. Loaded admin health cards must downgrade on stale or unseen snapshots, and fallback support labels must not overstate certainty

- Approximate date: Recorded explicitly on 2026-04-18 from the UI Truthfulness Refinement + Chart Health Freshness Downgrade pass
- Status: Active UI truthfulness rule
- Problem/context: Some shared admin health cards could still appear healthy when the source timestamp was stale or missing, and the support-state fallback label used a more confident word than the underlying state justified.
- Decision made: Treat stale or unseen snapshots as warn-level truth in the shared admin chart-health helper, with the freshness issue surfaced first in the issue list. Fallback support-state labels must remain conservative and avoid claiming readiness for unexpected values.
- What became canonical:
  - `src/lib/admin-ui-chart-health.ts` now downgrades stale or unseen loaded sections to `warn` and emits a freshness-specific issue message
  - `src/lib/support-readiness.ts` now falls back to `Open` for unexpected support states instead of `Ready`
  - admin-facing copy in the drops, support, transactions, and AI surfaces should prefer direct source/current-state wording over vague or overly confident labels
- Truth lives in:
  - `src/lib/admin-ui-chart-health.ts`
  - `src/lib/support-readiness.ts`
  - `src/components/Admin/AdminDropsAtGlancePanel.tsx`
  - `src/components/Admin/AdminSupportQueue.tsx`
  - `src/components/Admin/RecentTransactionsPanel.tsx`
  - `src/app/admin/page.tsx`
  - `src/app/admin/ai/page.tsx`
  - `tests/unit/admin-ui-chart-health.spec.ts`
  - `tests/unit/support-readiness.spec.ts`
- What is now disallowed or deprecated:
  - allowing a loaded admin card to remain healthy when its latest verified snapshot is stale or missing
  - using a fallback support-state label that implies readiness when the code cannot prove it
  - leaving obvious encoding artifacts in visible status separators when they reduce scanability

### 1ag. Analytics truth must separate required canonical sources from optional legacy-history support, and admin health must penalize stale downstream writers explicitly

- Approximate date: Recorded explicitly on 2026-04-18 from the Admin Analytics Parity + State-of-Truth Hardening pass
- Status: Active analytics/debug continuity rule
- Problem/context: Admin analytics and admin debug health exposed stale or partial analytics state inconsistently. The debug health score did not include stale downstream writers/materializers, while the analytics parity layer did not distinguish required canonical sources from optional legacy-history support sources. That made state-of-truth problems harder to interpret and caused the no-build continuity lane to over-fail on legacy-support gaps.
- Decision made: Treat analytics truth in two layers. Required canonical sources must stay continuity-blocking, while optional legacy-history support sources remain explicit warnings. Admin ops health must penalize stale downstream writers/materializers directly so the score reflects analytics freshness/state-of-truth drift instead of only diagnostics and pipeline incidents.
- What became canonical:
  - `src/lib/admin-analytics-truth.ts` is the shared analytics truth/freshness summarizer for canonical vs legacy-history support sources
  - `src/lib/server/admin-analytics-historical-validation.ts` now includes creator-spend parity, historical freshness, and legacy-history coverage in the analytics validation lane
  - `scripts/check-analytics-continuity.ts` now validates creator-spend parity and required analytics source freshness, while surfacing optional legacy-history support gaps as warnings instead of false hard blockers
  - `src/lib/server/admin-ops-health.ts` now includes downstream writer/materializer freshness in `opsHealth.score`, with `materializerSummary` and `scoreBreakdown` for debug/admin inspection
- Truth lives in:
  - `src/lib/admin-analytics-truth.ts`
  - `src/lib/server/admin-analytics-historical-validation.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/lib/server/admin-ops-health.ts`
  - `scripts/check-analytics-continuity.ts`
  - `tests/unit/admin-analytics-truth.spec.ts`
  - `tests/unit/admin-ops-health.spec.ts`
- What is now disallowed or deprecated:
  - treating every legacy/history-support analytics source as a hard continuity blocker regardless of whether it is optional support data
  - reporting admin analytics health without accounting for stale downstream writers/materializers
  - evaluating creator spend parity only informally instead of through canonical transaction-source checks

### 1af. Compact/mobile UI lockups should use the shared interaction-recovery guard and emit structured UI diagnostics when self-healing fires

- Approximate date: Recorded explicitly on 2026-04-18 from the Compact Interaction Recovery Hardening pass
- Status: Active client-side self-healing rule
- Problem/context: Fixing the chat search untappable regression removed the immediate layout bug, but the repo still had no reusable client-side recovery lane for compact/mobile focused-input release failures or stale document-level overflow locks.
- Decision made: Add a shared compact/mobile interaction-recovery guard in `src/lib/self-healing.ts`. When a surface has verified compact/mobile input-release risk, it should use this helper to recover stale focus/document locks safely and record a structured `ui` diagnostic when recovery actually happens.
- What became canonical:
  - `src/lib/self-healing.ts` now exposes `createCompactInteractionRecoveryGuard(...)`
  - the guard may clear stale compact/mobile `html`/`body`/`main` overflow and overscroll locks only when no real dialog/modal is open
  - recovery use should emit structured `ui` diagnostics so later debugging can distinguish real layout bugs from recovered interaction-release incidents
  - `scripts/agent/extract-runtime-observability.ts` now exposes `compact_interaction_recovery` as a machine-readable client-side observability lane
- Truth lives in:
  - `src/lib/self-healing.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `scripts/agent/extract-runtime-observability.ts`
  - `tests/unit/self-healing.spec.ts`
- What is now disallowed or deprecated:
  - re-implementing ad hoc compact/mobile interaction-release recovery logic in each surface when the shared helper fits
  - silently auto-healing a compact/mobile interaction lockup without recording a structured UI diagnostic
  - clearing document-wide locks while a real modal/dialog is open

### 1ae. Compact/mobile chat must use local overflow containment, not document-wide scroll locks or viewport-wide fixed shells

- Approximate date: Recorded explicitly on 2026-04-18 from the Mobile Messages Search Overlay Untappable Regression pass
- Status: Active canonical mobile chat UI rule
- Problem/context: The mobile messages surface could leave the site untappable after focusing and exiting the thread search input. The root cause was not a dedicated modal overlay, but the combination of a viewport-wide fixed chat page wrapper and a chat route shell that locked `html`, `body`, and `main` overflow even on compact/mobile viewports.
- Decision made: Keep the chat shell locally contained on mobile. Compact/mobile chat must not rely on document-wide overflow locks or viewport-wide fixed wrappers for its normal route layout, and compact thread-search inputs must explicitly release focus when leaving the thread list path.
- What became canonical:
  - `src/app/dashboard/chat/page.tsx` now uses local height containment on mobile instead of a viewport-wide fixed wrapper
  - `src/components/Chat/ChatRouteShell.tsx` only applies document/body/main overflow locking on non-compact viewports
  - `src/components/Chat/ChatExperience.tsx` explicitly releases thread-search focus when entering a selected thread and on unmount
  - `tests/unit/chat-route-shell.spec.tsx` is the regression guard for compact-vs-desktop overflow locking
- Truth lives in:
  - `src/app/dashboard/chat/page.tsx`
  - `src/components/Chat/ChatRouteShell.tsx`
  - `src/components/Chat/ChatExperience.tsx`
  - `tests/unit/chat-route-shell.spec.tsx`
- What is now disallowed or deprecated:
  - wrapping the normal compact/mobile chat route in a viewport-wide fixed shell when a local height-constrained container is sufficient
  - applying document-wide overflow locks to compact/mobile chat as a default layout behavior
  - leaving mobile chat search focus cleanup implicit when a route transition or unmount can release it deterministically

### 1ad. Firestore-backed continuity scripts now pin the Admin transport stack off the deprecated `punycode` path, while Functions runtime truth stays on Node 22

- Approximate date: Recorded explicitly on 2026-04-18 from the Verification Blocker Remediation + Runtime Continuity Truth Alignment pass
- Status: Active package-manager/runtime continuity rule
- Problem/context: The runtime continuity scripts read canonical Firestore admin data on the local workstation. Under Node 24, the previous Admin transport stack (`@google-cloud/firestore@7.x -> google-gax@4.x -> node-fetch@2 -> whatwg-url@5 -> tr46@0.0.3`) emitted a `node:punycode` deprecation warning on every live Firestore-backed continuity run, which left the verification pass with a truthful residual warning even after the queue/runtime logic itself was fixed.
- Decision made: Keep the deployed Functions runtime target at Node 22, but update root and `functions` package-manager overrides so `firebase-admin` resolves `@google-cloud/firestore@8.5.0` and `google-gax@5.0.6` for local/admin continuity execution. This removes the deprecated `punycode` chain from the Firestore-backed verification path without changing the repo's runtime authority order.
- What became canonical:
  - root `package.json`/`package-lock.json` and `functions/package.json`/`functions/package-lock.json` now override `@google-cloud/firestore` to `^8.5.0` and `google-gax` to `^5.0.6`
  - Firestore-backed continuity scripts (`scripts/runtime-admin.ts`, `scripts/check-scheduler-freshness.ts`, `scripts/check-queue-runtime.ts`, `scripts/check-runtime-continuity.ts`) should run cleanly on the local Node 24 workstation without the prior `node:punycode` deprecation
  - `functions/package.json` still truthfully targets Node 22 for deployed/runtime compatibility, and local install-time `EBADENGINE` notices on Node 24 do not outrank that runtime truth
- Truth lives in:
  - `package.json`
  - `package-lock.json`
  - `functions/package.json`
  - `functions/package-lock.json`
  - `scripts/runtime-admin.ts`
  - `scripts/check-scheduler-freshness.ts`
  - `scripts/check-queue-runtime.ts`
  - `scripts/check-runtime-continuity.ts`
- What is now disallowed or deprecated:
  - carrying a known Firestore-backed `node:punycode` verification warning forward as unavoidable when the repo can remove it with package-manager overrides
  - changing the Functions Node engine away from 22 just to silence a local install-time engine notice on a Node 24 workstation

### 1ac. Scheduler freshness now trusts canonical scheduler heartbeats first and uses static wiring only as the local empty-state fallback

- Approximate date: Recorded explicitly on 2026-04-18 from the Verification Blocker Remediation + Runtime Continuity Truth Alignment pass
- Status: Active canonical runtime continuity rule
- Problem/context: The new no-build runtime continuity lane correctly required canonical queue scheduler heartbeats, but the first implementation treated the absence of any live heartbeat documents as an unconditional failure. That broke truthful local verification even when the repo could statically prove the Firebase scheduled jobs and heartbeat writers were wired correctly. At the same time, queue heartbeats did not record execution-layer provenance, which meant a manual adapter run could be misread as canonical scheduler health.
- Decision made: Canonical scheduler freshness now trusts persisted heartbeats only when they exist with `executionLayer: "scheduler"`. If no canonical scheduler heartbeats exist yet, local verification may fall back to static wiring proof that the scheduled exports and heartbeat writers are present. Manual/adapter heartbeats must never satisfy scheduler freshness truth.
- What became canonical:
  - `shared/runtime/runtime-warning-contract.ts` includes `executionLayer` and `surface` on `QueueJobHeartbeat`
  - `src/lib/server/runtime-warning-store.ts` and `functions/src/runtime-warning-store.ts` persist execution-layer provenance on heartbeat writes
  - `src/lib/server/queue-runtime.ts` and `functions/src/queue-runtime.ts` propagate execution-layer/source metadata on every queue heartbeat write
  - `scripts/check-scheduler-freshness.ts` accepts static wiring only when no canonical scheduler heartbeats exist and otherwise fails on missing, stale, or failed scheduler docs
  - `tests/unit/check-scheduler-freshness.spec.ts` is the regression guard for static fallback vs canonical scheduler truth
- Truth lives in:
  - `shared/runtime/runtime-warning-contract.ts`
  - `src/lib/server/runtime-warning-store.ts`
  - `functions/src/runtime-warning-store.ts`
  - `src/lib/server/queue-runtime.ts`
  - `functions/src/queue-runtime.ts`
  - `scripts/check-scheduler-freshness.ts`
  - `tests/unit/check-scheduler-freshness.spec.ts`
- What is now disallowed or deprecated:
  - treating manual or adapter-triggered queue runs as proof of scheduler freshness
  - failing local scheduler verification solely because canonical heartbeat docs have not yet been produced, when the static scheduler wiring is present
  - recording queue heartbeat provenance without execution-layer/source metadata

### 1ab. Viewer watch/session analytics now carry canonical capture-health truth, and agent task context uses explicit hot/warm/cold tiers

- Approximate date: Recorded explicitly on 2026-04-17 from the Token-Efficiency Fabric Hardening + Watch/Session Analytics Deepening pass
- Status: Active canonical analytics/context rule
- Problem/context: Viewer watch/session analytics previously recorded watch depth without enough continuity metadata to explain replay recovery, flush degradation, close-path misses, or visibility gaps. In parallel, the repo-intelligence task compiler still forced agents to infer what to read first because all ranked context was effectively a single flat list.
- Decision made: Persist canonical watch capture-health fields directly on watch-session/watch-asset documents, expose a shared capture-health summary in admin analytics and a no-build analytics continuity lane, and extend the task-context compiler with explicit hot/warm/cold context tiers plus exclusion metadata.
- What became canonical:
  - `src/lib/viewer-watch-session.ts`, `src/hooks/useViewerWatchSession.ts`, `src/app/dashboard/viewer/ViewerClient.tsx`, and `src/app/api/viewer/watch-session/route.ts` now define and persist capture-quality, replay-recovery, flush, gap, visibility, seek, wait, playback-rate, and muted-session watch metadata
  - `src/lib/server/admin-analytics-capture-health.ts` is the shared summarizer for canonical watch capture health across admin analytics and continuity checks
  - `npm run check:analytics:continuity` is the lightweight signoff lane for canonical viewer capture quality
  - `scripts/agent/build-task-context.ts` emits `hotContextFiles`, `warmContextFiles`, `coldContextFiles`, and `excludedContext` so repo-native prompts stop over-reading broad context by default
- Truth lives in:
  - `src/lib/viewer-watch-session.ts`
  - `src/hooks/useViewerWatchSession.ts`
  - `src/app/dashboard/viewer/ViewerClient.tsx`
  - `src/app/api/viewer/watch-session/route.ts`
  - `src/lib/server/admin-analytics-capture-health.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/app/api/admin/analytics/realtime/route.ts`
  - `scripts/check-analytics-continuity.ts`
  - `scripts/agent/build-task-context.ts`
  - `agent/state/task-context.generated.json`
- What is now disallowed or deprecated:
  - treating viewer watch depth as complete truth without checking capture quality
  - allowing replay/flush/close degradation to remain visible only in client memory
  - using flat, giant task-context payloads when the generated hot/warm/cold context tiers are available

### 1aa. Queue lifecycle is now canonically scheduled in Firebase Functions, and runtime continuity uses a no-build lane first

- Approximate date: Recorded explicitly on 2026-04-17 from the Self-Debugging Hardening + Queue Runtime Canonicalization pass
- Status: Active canonical runtime/debugging rule
- Problem/context: Queue reactivation and activation notifications were still owned by Next App Route cron endpoints, which left scheduler wiring ambiguous, made heartbeats invisible, and required heavier audits to discover silent runtime drift. The repo also lacked a lightweight runtime continuity lane that could fail fast on stale schedulers, queue drift, missing notification outcomes, and repeated warning classes.
- Decision made: Move canonical queue execution into Firebase Functions scheduled jobs, keep the Next cron routes only as legacy/manual-trigger adapters over the same shared runtime, and add blocking no-build runtime continuity commands for scheduler freshness, queue invariants, warning budgets, and runtime continuity.
- What became canonical:
  - `functions/src/index.ts` exports the scheduled `processQueueLifecycle` and `notifyActiveDropsLifecycle` jobs
  - `functions/src/queue-runtime.ts`, `src/lib/server/queue-runtime.ts`, and `shared/runtime/*` define one queue lifecycle family with shared scheduling math, invariant detection, heartbeat writes, and notification outcome persistence
  - `src/app/api/cron/process-queue/route.ts` and `src/app/api/cron/notify-active-drops/route.ts` are compatibility/manual-trigger adapters only and must emit legacy-adapter warnings when used
  - `runtime_warning_records`, `queue_job_heartbeats`, and `notification_dispatch_outcomes` are the runtime continuity surfaces for queue drift and scheduler health
  - `npm run check:scheduler:freshness`, `npm run check:queue:runtime`, `npm run check:warnings`, and `npm run check:runtime:continuity` are the first-line runtime drift checks before build-heavy audits
- Truth lives in:
  - `shared/runtime/runtime-warning-contract.ts`
  - `shared/runtime/queue-runtime.ts`
  - `src/lib/server/queue-runtime.ts`
  - `src/lib/server/push-notifications.ts`
  - `functions/src/queue-runtime.ts`
  - `functions/src/index.ts`
  - `scripts/check-scheduler-freshness.ts`
  - `scripts/check-queue-runtime.ts`
  - `scripts/check-warnings.ts`
  - `scripts/check-runtime-continuity.ts`
  - `agent/index/runtime-observability.json`
- What is now disallowed or deprecated:
  - treating the Next cron routes as the source of queue truth
  - allowing activation notifications to complete without a persisted dispatch outcome
  - treating missing scheduler heartbeats or repeated legacy-adapter warnings as non-blocking noise

### 1z. UI signoff is now driven by the generated UI surface coverage ledger and runtime continuity checks

- Approximate date: Recorded explicitly on 2026-04-17 from the Repo-Wide UI Continuity Fabric pass
- Status: Active canonical UI verification rule
- Problem/context: UI continuity knowledge was fragmented across a small hardcoded Playwright target list, partial component-level diagnostics, and ad hoc prompt context. That allowed hydration-sensitive creator/admin surfaces to drift without a machine-readable signoff contract.
- Decision made: Add `agent/index/ui-surface-coverage.json` as the canonical machine-readable UI coverage ledger, generate it from repo truth, and require UI-sensitive work to use the generated coverage/runtime lanes before signoff.
- What became canonical:
  - `agent/index/ui-surface-coverage.json` is the repo-native record of concrete UI surfaces, coverage ownership, hydration mode, runtime canary state, and blocking audit eligibility
  - `npm run agent:ui-index`, `npm run check:ui:coverage`, and `npm run check:ui:runtime` are required UI continuity lanes alongside existing `check:ui:audits` and `check:ui:lighthouse`
  - blocking public UI surfaces must have generated audit ownership, and missing coverage is a signoff failure
  - the first hardening wave uses `src/lib/ui-continuity.ts` and `src/components/ui/UiContinuityNotice.tsx` for per-module settled loading, visible warnings, and client diagnostics instead of silent all-or-nothing hydration
- Truth lives in:
  - `agent/index/ui-surface-coverage.json`
  - `scripts/agent/build-ui-surface-coverage.ts`
  - `scripts/agent/check-ui-surface-coverage.ts`
  - `scripts/agent/build-ui-runtime-audit.ts`
  - `src/lib/ui-continuity.ts`
  - `src/components/ui/UiContinuityNotice.tsx`
  - `AGENTS.md`
- What is now disallowed or deprecated:
  - relying on hardcoded tiny UI audit target lists as the only UI continuity source
  - shipping hydration-sensitive creator/admin surfaces without generated runtime canary metadata or visible degraded-state handling
  - signing off on broad UI work without the generated UI coverage lane

### 1y. `/agent/` is the committed machine-readable context layer; `/.agent/` remains workflow tooling, and the SQL mirror is secondary

- Approximate date: Recorded explicitly on 2026-04-17 from the Repo Intelligence Fabric pass
- Status: Active canonical cross-agent workflow rule
- Problem/context: Repo continuity truth already existed across code, manifests, audits, and workflow notes, but agents still had to reread large markdown ledgers or infer task scope from partial prompts. The repo also needed a retrieval-friendly structured layer without promoting SQL or generated artifacts above repo truth.
- Decision made: Add a committed `/agent/` layer generated from verified repo truth. Keep governance in markdown, keep `/.agent/` as workflow-only tooling, and treat the Data Connect / SQL mirror as a derived retrieval plane over generated local truth rather than an authority.
- What became canonical:
  - `agent/index/*.json` is the default low-token repo context surface for agents
  - `agent/state/task-context.generated.json` plus `agent/prompts/*.md` are the deterministic task-context outputs
  - `/.agent/` remains advisory workflow tooling and auto-run notes
  - Data Connect mirror freshness matters, but repo truth still outranks the mirror and generated artifacts
  - narrow tasks should use generated context packs first instead of giant freeform prompt payloads
- Truth lives in:
  - `agent/README.md`
  - `agent/index/*.json`
  - `agent/state/*.json`
  - `agent/prompts/*.md`
  - `scripts/agent/*.ts`
  - `dataconnect/schema/agent-context.gql`
  - `AGENTS.md`
- What is now disallowed or deprecated:
  - treating `/.agent/` as the machine-readable repo memory layer
  - treating the SQL/Data Connect mirror as stronger truth than repo code/config/output
  - defaulting to giant repeated governance-doc prompts when a generated context pack exists

### 1x. Creator settings summaries must use Firestore aggregates, and recoverable route warnings must flow through structured diagnostics

- Approximate date: Recorded explicitly on 2026-04-16 from the open PR reconciliation pass
- Status: Active canonical route-handling rule
- Problem/context: Creator settings summary metrics were still materializing full Firestore query snapshots and then reducing/filtering them in process memory, while some recoverable route-level issues were still emitted via raw `console.warn`, which bypassed the repo's structured runtime diagnostics surfaces.
- Decision made: Use Firestore server-side `count()` and `aggregate()` queries for creator summary metrics whenever the route only needs counts or sums, and send recoverable warning paths through `recordRouteWarning(...)` so they land in the canonical diagnostics pipeline.
- What became canonical:
  - creator stats routes should not download entire collections just to compute simple counts or sums
  - recoverable route warnings should use `recordRouteWarning(...)`, not raw `console.warn(...)`
  - direct PR reconciliation against a dirty mainline can preserve unique low-risk deltas locally instead of merging stale overlapping branches
- Truth lives in:
  - `src/app/api/creator/settings/route.ts`
  - `src/app/api/analytics/ingest/route.ts`
  - `src/app/api/admin/user/[userId]/route.ts`
  - `src/lib/server/route-diagnostics.ts`
- What is now disallowed or deprecated:
  - route-local snapshot scans for creator summary totals when Firestore aggregate queries can answer the same question
  - raw `console.warn(...)` in server routes for recoverable operational warnings that should be visible in structured diagnostics

### 1w. Contract tests run on a dedicated Vitest config with test-only Firebase/Vertex SDK stubs

- Approximate date: Recorded explicitly on 2026-04-16 from the error and warning remediation pass
- Status: Active canonical test-infrastructure rule
- Problem/context: The repo’s contract suite was being executed through the shared Vitest workspace config that also declared Storybook/browser projects. That increased import pressure, amplified first-load timeouts, and pulled real `firebase-admin` and `@google-cloud/vertexai` dependency trees into unit tests, producing deprecated `punycode` noise unrelated to application logic.
- Decision made: Keep the contract/unit suite isolated on `vitest.contracts.config.ts` and alias server SDKs to explicit test stubs. Storybook/browser projects remain in the workspace config for their own use, but normal contract verification must not initialize them or the real Admin/Vertex SDKs.
- What became canonical:
  - `npm run test:contracts` and `npm run test:contracts:watch` run through `vitest.contracts.config.ts`
  - contract tests use test-only stubs for `firebase-admin`, `firebase-admin/firestore`, and `@google-cloud/vertexai`
  - unit/contract verification should not depend on live Google/Firebase SDK initialization just to import route modules
- Truth lives in:
  - `vitest.contracts.config.ts`
  - `tests/support/firebase-admin.mock.ts`
  - `tests/support/firebase-admin-firestore.mock.ts`
  - `tests/support/google-cloud-vertexai.mock.ts`
  - `package.json`
- What is now disallowed or deprecated:
  - routing normal contract verification through the shared Storybook/browser Vitest workspace
  - allowing unit tests to pull real Admin/Vertex SDK dependency trees unless a test is explicitly integration-scoped

### 1v. Analytics telemetry now serves from Firestore facts and consumed rollups only; verified-unused RTDB and SQL sidecars were removed

- Approximate date: Recorded explicitly on 2026-04-16 from the telemetry redundancy cleanup pass
- Status: Active canonical architecture fact
- Problem/context: The repo had accumulated canonical Firestore event facts, Firestore rollups, RTDB telemetry mirrors, scheduled dashboard-cache documents, and a Data Connect analytics export connector. After tracing the actual readers, the RTDB telemetry mirrors and SQL/export layers were not serving product code in-repo, while one drop-daily writer was also using a mismatched document key.
- Decision made: Serve analytics truth in-repo from canonical Firestore facts plus explicitly consumed Firestore rollups/session aggregates. Remove verified-unused RTDB analytics mirrors, dashboard cache materializers, guest target/heatmap sidecars, and Data Connect export/generated SDK surfaces rather than preserving them as speculative infrastructure.
- What became canonical:
  - `analytics_event_facts` is the canonical per-event ledger for authenticated telemetry
  - admin and user analytics flows must not read `telemetry/events/*` or `telemetry/users/*` RTDB mirrors for freshness tails
  - verified-unused analytics storage layers should be deleted, not left as write-only baggage
  - `analytics_drop_daily` document IDs use the canonical `dayKey_dropId` format
  - functions workspace lockfiles must stay synchronized across npm and pnpm when dependency cleanup lands
- Truth lives in:
  - `src/lib/server/admin-analytics-shared.ts`
  - `src/app/api/telemetry/track/route.ts`
  - `src/app/api/admin/user/[userId]/route.ts`
  - `src/app/api/drops/impression/route.ts`
  - `functions/src/analytics-event-facts.ts`
  - `functions/src/analytics-guest-batches.ts`
  - `functions/src/analytics-security-events.ts`
  - `functions/src/analytics-task-events.ts`
  - `functions/src/analytics-transactions.ts`
  - `functions/tsconfig.json`
- What is now disallowed or deprecated:
  - writing or reading RTDB telemetry mirrors for admin/user analytics truth
  - keeping analytics export connectors, dashboard cache jobs, or guest target/heatmap projections without a verified reader
  - inventing alternate `analytics_drop_daily` key shapes

### 1u. Analytics SQL/Data Connect and dashboard-cache layers are sidecars until a verified serving path exists

- Approximate date: Recorded explicitly on 2026-04-16 from the telemetry and SQL surface audit
- Status: Active canonical architecture fact
- Problem/context: The repo now contains multiple analytics persistence layers: Firestore canonical facts, Firestore rollups, Realtime Database mirrors, scheduled dashboard-cache documents, and Data Connect/PostgreSQL export tables. Within this repo, admin and user-facing reads still come from Firestore, GA, and limited Realtime Database mirrors; they do not read the SQL export or scheduled cache as primary sources.
- Decision made: Treat Firestore canonical facts and explicitly consumed Firestore rollups as the serving analytics source inside this repo. Treat Data Connect/PostgreSQL export tables and scheduled dashboard-cache documents as sidecar/export layers only until a concrete read path is implemented and verified.
- What became canonical:
  - do not add new SQL/Data Connect analytics tables unless they have a verified reader or a documented external consumer
  - do not preserve scheduled dashboard-cache documents solely because they exist; they should either back a verified read path or be removed
  - treat Realtime Database telemetry mirrors as freshness/debug overlays, not the canonical event ledger
- Truth lives in:
  - `src/lib/server/admin-analytics-data.ts`
  - `src/app/api/admin/analytics/realtime/route.ts`
  - `src/app/api/telemetry/track/route.ts`
  - `functions/src/analytics-schedules.ts`
  - `functions/src/analytics-export-sync.ts`
  - `dataconnect/schema/schema.gql`

### 1s. Visual audit masks for live metrics must target explicit stable wrappers

- Approximate date: Recorded explicitly on 2026-04-16 from the home-hero audit remediation pass
- Status: Active canonical UI-audit rule
- Problem/context: The home hero visual audit masked a live count by crawling ancestor selectors from dynamic text content. The UI had not materially regressed, but the masked region width changed with the live metric and caused false visual failures.
- Decision made: Any visual regression mask applied to live counters, runtime badges, or other variable-width UI should target an explicit stable wrapper element rather than a text-derived ancestor chain.
- What became canonical:
  - add explicit audit hooks such as `data-testid` on the wrapper that should be masked
  - prefer stable wrapper masking over dynamic text ancestry for variable content
- Truth lives in:
  - `src/components/Hero.tsx`
  - `tests/ui-audits/visual-regression.spec.ts`
- What is now disallowed or deprecated: Masking variable-width live content by traversing from text nodes and assuming ancestor dimensions will stay constant over time.

### 1t. Landing-page Firebase media can bypass local Next image optimization when audit stability matters

- Approximate date: Recorded explicitly on 2026-04-16 from the landing media timeout fix
- Status: Active canonical landing-media rule
- Problem/context: The marketing home surface was loading Firebase Storage drop art through the local Next image optimizer during UI audits. That made audit reliability depend on upstream image fetch latency and produced server-side timeout noise unrelated to the audited hero itself.
- Decision made: Landing-only Firebase Storage media may be served unoptimized from the browser when that avoids audit/runtime instability and the surface does not depend on server-side transformation benefits.
- What became canonical:
  - use a helper to detect Firebase Storage media URLs
  - apply `unoptimized` intentionally on the landing ticker/carousel rather than globally
- Truth lives in:
  - `src/lib/media-hosts.ts`
  - `src/components/HomeDropTicker.tsx`
  - `src/components/Landing/HomeActiveDropsCarousel.tsx`
- What is now disallowed or deprecated: Treating local Next image optimization as mandatory for every Firebase-hosted marketing asset when it introduces avoidable audit/runtime instability.

### 1r. Generated verification outputs must never become lint input

- Approximate date: Recorded explicitly on 2026-04-16 from the Antigravity findings remediation pass
- Status: Active canonical verification-workflow rule
- Problem/context: Local verification commands such as Storybook builds produce generated output trees like `storybook-static/`. If ESLint scans those outputs, `npm run check` can fail on generated vendor code even when source code is correct.
- Decision made: Generated verification outputs must be ignored by source linting while still being cleaned before sign-off.
- What became canonical:
  - `eslint.config.mjs` ignores `storybook-static/**`
  - `npm run check:generated-artifacts` remains the source of truth for whether build artifacts were cleaned before completion
- Truth lives in:
  - `eslint.config.mjs`
  - `scripts/check-generated-artifacts.ts`
- What is now disallowed or deprecated: Letting local build output directories become part of the source lint surface, or treating generated vendor code failures as application-source regressions.

### 1q. Dense UI refactors must delete hidden data fan-out, not just hide the module

- Approximate date: Recorded explicitly on 2026-04-16 from the Antigravity committed-state review
- Status: Active canonical dashboard-performance rule
- Problem/context: The compressed Creator Workspace redesign successfully removed several rendered modules, but it left their backing state, fetches, and effects active. That means the dashboard still loads subscriptions, payout history, broadcast history, and eager thread detail even when the UI no longer renders those surfaces.
- Decision made: When a dashboard or admin surface is compacted, any removed module must also lose its backing state, network fan-out, and side effects unless that data still powers a visible affordance.
- What became canonical:
  - visible cards and controls define the minimum required fetch set
  - hidden or removed modules must not keep producing load failures, stale state, or background requests
  - preview-only chat summaries must not eagerly fetch full thread detail unless the detail is actually rendered
- Truth lives in:
  - `src/components/Dashboard/CreatorWorkspacePanel.tsx`
  - any future dense operational shells that replace larger legacy modules
- What is now disallowed or deprecated: Leaving `Promise.allSettled(...)` fan-out, state setters, or effects alive for modules that were removed from the visible UI during a density refactor.

### 1p. Tooling-only imports added under `src/` must update continuity allowlists in the same change

- Approximate date: Recorded explicitly on 2026-04-16 from the Storybook integration review
- Status: Active canonical continuity rule
- Problem/context: The repo now keeps Storybook stories under `src/`, and those stories legitimately import tooling-only specifiers such as `storybook/test`. Our continuity cycle audit treats unexpected skipped imports as failures, so adding these imports without updating the allowlist breaks `npm run check:continuity`.
- Decision made: Any non-runtime import intentionally introduced under `src/` must be reflected in `scripts/check-cycles.ts` allowlists or exclusions in the same change that adds it.
- What became canonical:
  - Storybook, test-only, and other tooling-only imports under scanned source trees are part of the continuity contract
  - continuity tooling must be kept in sync with approved non-runtime imports
- Truth lives in:
  - `scripts/check-cycles.ts`
  - `src/stories/*.stories.ts`
- What is now disallowed or deprecated: Landing new non-runtime imports under scanned source roots and expecting `npm run check:continuity` to stay green without updating the cycle-audit config.

### 1o. All API route POST handlers must wrap request.json() in try/catch

- Approximate date: 2026-04-13
- Status: Active canonical server-side pattern
- Problem/context: If a client sends a malformed or empty body, `request.json()` throws a native parse error that falls through to the generic `handleApiError` 500 path. This turns a client mistake into a server error in logs and telemetry.
- Decision made: Every POST route handler must wrap `await request.json()` in its own try/catch, returning `400 malformed_body` on parse failure, before passing the parsed result to Zod validation.
- What became canonical:
  - `let rawBody: unknown; try { rawBody = await request.json(); } catch { return 400 malformed_body; }`
  - Zod validation then runs on `rawBody`, returning its own `400` for schema mismatches
- Truth lives in:
  - `src/app/api/chat/threads/[threadId]/messages/route.ts`
  - `src/app/api/chat/attachments/prepare/route.ts`
  - `src/app/api/chat/attachments/complete/route.ts`
  - `src/app/api/creator/messages/route.ts`
- What is now disallowed: Calling `safeParse(await request.json())` inline without a surrounding try/catch for the `.json()` call.

### 1n. Server error-handler diagnostics must never crash the error handler itself

- Approximate date: Recorded explicitly on 2026-04-13 from the chat 500 crash diagnosis
- Status: Active canonical runtime-safety rule
- Problem/context: `sanitizeDetail()` in `route-diagnostics.ts` called `JSON.stringify(value).slice(0, 500)` without guarding against `JSON.stringify()` returning `undefined`. Because this function runs inside `handleApiError()`, a crash in diagnostics serialization killed the entire API error handler, causing Vercel to return an empty 500 with no JSON body. This silently broke ALL error responses platform-wide.
- Decision made: The server diagnostics/logging layer must never throw. Any serialization, stringify, or formatting call in the error-handling path must be wrapped or guarded so that a telemetry bug cannot mask or replace the original API error.
- What became canonical:
  - `sanitizeDetail()` guards `JSON.stringify()` results before calling string methods
  - Any future additions to the diagnostics serialization path must follow the same defensive pattern
  - Client-side response parsing must read `response.text()` first and then `JSON.parse()`, never `response.json()` followed by `response.text()`, because the response stream can only be consumed once
- Truth lives in:
  - `src/lib/server/route-diagnostics.ts`
  - `src/lib/server/auth.ts` (handleApiError)
  - `src/components/Chat/ChatExperience.tsx`
- What is now disallowed or deprecated: Calling `.slice()`, `.trim()`, or any string method on the raw output of `JSON.stringify()` without guarding for `undefined`. Calling `response.json()` as a primary parse attempt followed by `response.text()` as a fallback (the stream is consumed after the first call).

### 1m. Supplemental behavioral auto-capture relies on PostHog

- Approximate date: Recorded explicitly on 2026-04-11 from the supplemental tracking analytics pass
- Status: Active canonical analytics rule
- Problem/context: While our custom `telemetry.ts` and GOOGLE ANALYTICS pipeline handles backend-associated interactions perfectly, they failed to passively track frontend user behaviors (rage clicks, drop-off, layout maps).
- Decision made: Utilize `posthog-js` inside the client layer to passively map unstructured layouts and session replays without interfering with the manual server interaction signals.
- What became canonical:
  - `CSPostHogProvider.tsx` dictates passive tracking behavior mapped across `usePathname` explicitly so standard NextJS routing remains compatible.
  - Telemetry manual events shouldn't be duplicated if PostHog naturally covers the visual click context.
- Truth lives in:
  - `src/components/Analytics/CSPostHogProvider.tsx`
  - `src/app/layout.tsx`
- What is now disallowed or deprecated: Building massive unstructured `trackEvent(...)` cascades for simple UI hover/click events which clutter telemetry payloads when passive trackers catch this flawlessly out-of-the-box.

### 1l. Non-drops admin pages should default to compact operational copy and tighter shells

- Approximate date: Recorded explicitly on 2026-04-11 from the admin copy-density pass
- Status: Active canonical admin-UX rule
- Problem/context: Most admin surfaces had correct functionality but spent too much vertical space on repeated explanation blocks, multi-clause subtitles, and oversized headers/modules, which made mobile admin workflows slower to scan and harder to operate.
- Decision made: Admin pages outside `/admin/drops` should prefer compact headers, one-sentence subtitles, and tighter module shells so screen space is reserved for operational data instead of prose.
- What became canonical:
  - `AdminPageHeader` supports opt-in compact mode for non-drops admin surfaces
  - expandable admin modules and analytics cards should use tighter padding and smaller description copy by default
  - admin page and module subtitles should be one sentence unless extra detail is essential to operate the surface safely
  - explanatory copy should move behind detail toggles or stay embedded in the data itself rather than leading every module with a paragraph
  - `/admin/drops` and the Create Drop flow remain exempt from this specific compaction rule unless explicitly redesigned later
- Truth lives in:
  - `src/components/Admin/AdminPageHeader.tsx`
  - `src/components/Admin/AdminDashboardModule.tsx`
  - `src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx`
  - `src/app/admin/ai/page.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/app/admin/debug/page.tsx`
  - `src/app/admin/queue/page.tsx`
  - `src/app/admin/roster/page.tsx`
  - `src/app/admin/users/page.tsx`
  - `src/app/admin/user/[userId]/page.tsx`
- What is now disallowed or deprecated: Adding new admin modules with paragraph-length operational subtitles by default, or relying on oversized headers to communicate context that could be expressed in one sentence

### 1k. Dense admin layouts must be shrink-safe and horizontally contained by default

- Approximate date: Recorded explicitly on 2026-04-11 from the admin AI safe-zone overflow fix
- Status: Active canonical admin-layout rule
- Problem/context: `/admin/ai` exposed a shared admin-shell weakness: nested grids, module shells, and long dynamic text/media blocks were not consistently enforcing `min-w-0` and overflow containment, which allowed content to bleed past the right safe zone on narrower admin viewports.
- Decision made: Admin shells and dense admin modules must default to shrink-safe containers, explicit overflow containment, and word-breaking for dynamic content instead of relying on page-level luck.
- What became canonical:
  - admin page wrappers should clip horizontal overflow instead of allowing safe-zone bleed
  - shared admin headers and modules must expose `min-w-0` boundaries so nested grids and actions can shrink safely
  - custom dense grid tracks should prefer `minmax(0, ...)` when long dynamic content is possible
  - prompt text, diagnostics, metadata strings, and history chips in admin surfaces must break or wrap instead of widening the page
- Truth lives in:
  - `src/app/admin/ai/page.tsx`
  - `src/components/Admin/AdminDashboardModule.tsx`
  - `src/components/Admin/AdminPageHeader.tsx`
- What is now disallowed or deprecated: Admin modules that assume implicit shrink behavior under long content, or admin page shells that allow horizontal bleed past the viewport safe zone

### 1m. Live chat resilience relies purely on Firebase WebSocket SDK; manual polling fallbacks are banned

- Approximate date: Recorded explicitly on 2026-04-11 from the chat stabilization drop.
- Status: Active canonical chat-network rule
- Problem/context: Chat previously relied heavily on a brittle fallback layer orchestrating manual API polling with intervals and error scopes whenever native `onSnapshot` WebSockets disconnected over edge networks. This caused infinite looping, memory leaks, high backend read volume, and UX-destroying toast cascades.
- Decision made: All chat logic (message rendering and unread badge status) must strictly run through pure Firebase SDK websockets. Any transient connectivity issues must silently fail back to the inherent JS SDK offline/retry management layer.
- What became canonical:
  - No `setInterval` backend REST routes polling lists during websocket degradation logic.
  - Native fallback loops arrays tracking realtime error strings are fully purged. 
  - Silently trigger `reportRealtimeIssue` under the hood if connection drops completely, trusting `onSnapshot` logic to resurrect the feed naturally.
- Truth lives in:
  - `src/components/Chat/ChatExperience.tsx`
  - `src/hooks/useChatUnreadStatus.ts`
- What is now disallowed or deprecated: Building forced REST API polling loops as a fallback mechanism when a Firebase real-time subscription throws an error block.

### 1j. Chat realtime must auto-reconnect after browser Firestore failures instead of degrading until refresh

- Approximate date: Recorded explicitly on 2026-04-10 from the live-thread degradation recovery pass
- Status: Active canonical chat realtime rule
- Problem/context: Chat already downgraded to polling after browser Firestore listener failures, but it did not automatically recreate the failed listeners. A transient client-side failure could therefore leave `/dashboard/chat` and unread indicators stuck in degraded mode until a manual refresh or unrelated route churn happened to remount the listeners.
- Decision made: Chat realtime listeners must retry automatically with bounded backoff, and degraded messaging must stay scoped to the lane that is still failing.
- What became canonical:
  - chat thread-list, selected-thread, and message listeners retry automatically after client-side Firestore failures
  - unread badge realtime retries automatically on the chat route as well
  - polling fallback remains active while reconnect attempts are in flight
  - degraded UI copy must stay truthful to the currently failing scope instead of preserving a stale fallback message after partial recovery
  - bounded reconnect delays are centralized so chat realtime recovery is consistent across surfaces
- Truth lives in:
  - `src/lib/chat-realtime.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/hooks/useChatUnreadStatus.ts`
  - `tests/unit/chat-realtime.spec.ts`
  - `tests/unit/use-chat-unread-status.spec.tsx`
- What is now disallowed or deprecated: One-way listener degradation that requires refresh to restore chat realtime, or degraded banners that describe the wrong still-failing lane after partial recovery

### 1h. Public shell surfaces should avoid non-essential Firestore listeners, and auth profile reads must degrade to server fallback

- Approximate date: Recorded explicitly on 2026-04-10 from the creator-page Firestore assertion fix
- Status: Active canonical shell/runtime rule
- Problem/context: Public creator-page visits were still mounting signed-in shell Firestore listeners that were not essential to the page itself, including unread-badge, notification-runtime, and auth-profile realtime reads. That increased the chance of browser Firestore SDK assertion failures surfacing during ordinary navigation.
- Decision made: Firestore realtime in the shell should be reserved for surfaces that materially need it. Public/non-chat surfaces must prefer server polling and explicit fallback behavior over keeping extra browser Firestore listeners alive.
- What became canonical:
  - `/dashboard/chat` remains the primary place where chat realtime is guaranteed through Firestore listeners
  - unread badge state should use Firestore realtime only inside chat; outside chat it should poll the server thread list
  - notifications should not depend on client Firestore runtime-signal documents for freshness
  - auth profile reads must have a canonical server fallback route and should prefer polling on public creator/non-dashboard surfaces
  - Firestore browser assertion failures must degrade the shell to polling instead of staying opaque
- Truth lives in:
  - `src/context/AuthContext.tsx`
  - `src/hooks/useChatUnreadStatus.ts`
  - `src/hooks/useNotifications.ts`
  - `src/app/api/user/profile/route.ts`
  - `src/lib/firestore-client-errors.ts`
- What is now disallowed or deprecated: Mounting unnecessary Firestore listeners on public creator pages or treating public signed-in shell pages as if they require full dashboard-grade realtime

### 1i. Chat at-rest values are soft-sealed, while moderation remains server-visible only

- Approximate date: Recorded explicitly on 2026-04-10 from the chat security hardening pass
- Status: Active canonical chat-security rule
- Problem/context: Even after moderation moved server-side, chat message documents still stored raw text, preview, and attachment URL fields in Firestore, and direct client admin reads of moderation/security collections were broader than needed.
- Decision made: Chat-at-rest values should be soft-sealed without new dependencies, moderation/security visibility should be server-backed only, and rules should enforce that client access stays participant-scoped.
- What became canonical:
  - chat text, preview, and attachment URL/name fields are stored in Firestore using the scoped soft-seal helper
  - server chat readers and server moderation readers are responsible for unsealing those fields before returning them
  - Firestore client rules must not allow direct admin reads of moderation/security documents
  - this soft seal is not a claim of end-to-end encryption or real confidentiality against trusted code/operators
- Truth lives in:
  - `src/lib/chat-soft-seal.ts`
  - `src/lib/server/chat.ts`
  - `src/lib/server/admin-moderation.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `firestore.rules`
  - `tests/unit/chat-soft-seal.spec.ts`
  - `tests/firebase/firestore.rules.spec.ts`
- What is now disallowed or deprecated: Storing raw chat preview/text/asset URL fields in Firestore as the canonical at-rest form, or letting client-side admin sessions read moderation/security collections directly

### 1g. Chat attachment uploads must be cleanup-backed, and compatibility sends must mirror native send truth

- Approximate date: Recorded explicitly on 2026-04-10 from the chat hardening sweep
- Status: Active canonical chat runtime rule
- Problem/context: Chat attachment uploads could succeed in storage before the message write completed, which meant a failed send could leave orphaned uploaded files behind. At the same time, the legacy creator-message compatibility route still discarded the structured native send result and returned only `{ success: true }`, which hid warnings and pricing updates from compatibility callers.
- Decision made: Chat attachments must follow a prepare -> finalize -> cleanup-backed lifecycle, and any compatibility send path must return the same source-of-truth result shape as the native chat send path.
- What became canonical:
  - chat only accepts image and video attachments through explicit shared attachment-type rules
  - malformed chat attachment or message payloads must return stable chat-specific `400` errors, not generic server failures
  - uploaded chat attachments must be removable through a server-backed cleanup route when finalize or send fails
  - chat UI must attempt best-effort cleanup for finalized attachments if the downstream message send fails
  - the legacy `/api/creator/messages` send route must forward the structured native send result, including warnings and pricing, rather than collapsing success into a boolean
- Truth lives in:
  - `src/lib/chat-attachments.ts`
  - `src/app/api/chat/attachments/prepare/route.ts`
  - `src/app/api/chat/attachments/complete/route.ts`
  - `src/app/api/chat/attachments/cancel/route.ts`
  - `src/app/api/chat/threads/[threadId]/messages/route.ts`
  - `src/app/api/creator/messages/route.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `tests/unit/chat-attachments-route.spec.ts`
  - `tests/unit/chat-thread-messages-route.spec.ts`
  - `tests/unit/creator-messages-route.spec.ts`
- What is now disallowed or deprecated: Leaving finalized chat uploads orphaned after a failed send, or letting compatibility send callers lose native chat warnings and pricing state

### 1f. Browser Firestore listener failures must degrade to polling with explicit diagnostics

- Approximate date: Recorded explicitly on 2026-04-10 from the Firestore internal-assertion hardening pass
- Status: Active canonical realtime rule
- Problem/context: Browser Firestore listeners in chat and unread-state surfaces could fail with opaque SDK assertions such as `Unexpected state (ID: b815)` and `Unexpected state (ID: ca9)`, while the UI had no plain-English recovery path and operators could not easily distinguish SDK-state failures from auth or permission problems.
- Decision made: Firestore browser-listener failures must be normalized into explicit diagnostics and must degrade to polling for the current session instead of simply failing closed until refresh.
- What became canonical:
  - Firestore internal assertions are treated as browser SDK state failures, not generic realtime warnings
  - chat thread list/detail listeners fall back to server polling when realtime breaks
  - unread-badge state falls back to `/api/chat/threads` polling when realtime breaks
  - assertion IDs from Firestore error messages are recorded in client diagnostics for future triage
  - chat realtime listeners should not depend on selected-thread state in a way that forces resubscribe churn on normal updates
- Truth lives in:
  - `src/lib/firestore-client-errors.ts`
  - `src/lib/client-error-reporting.ts`
  - `src/lib/client-diagnostics.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/hooks/useChatUnreadStatus.ts`
  - `tests/unit/firestore-client-errors.spec.ts`
  - `tests/unit/use-chat-unread-status.spec.tsx`
- What is now disallowed or deprecated: Letting browser Firestore listener failures stay opaque, or relying on refresh-only recovery after realtime listener failure

### 1e. Chat route owns its own viewport and scroll containment rules

- Approximate date: Recorded explicitly on 2026-04-10 from the chat zoom-lock and nested-scroll pass
- Status: Active canonical chat UX/runtime rule
- Problem/context: The generic app shell allowed page-level scroll and scroll chaining outside the chat frame, and mobile chat inputs used sub-16px text sizing that triggered iOS focus zoom.
- Decision made: `/dashboard/chat` must be treated as a contained interaction surface with its own viewport and overflow rules instead of inheriting the generic page-scroll contract.
- What became canonical:
  - chat route exports route-scoped viewport settings rather than changing the global app viewport
  - chat route locks document/main overflow while mounted so only chat-owned nested regions scroll
  - chat thread lists and message panes use `min-h-0` plus contained scroll regions, not viewport-ish `min-h` hacks
  - mobile chat text inputs that can receive focus must be at least `16px` to prevent iOS keyboard zoom
- Truth lives in:
  - `src/app/dashboard/chat/layout.tsx`
  - `src/components/Chat/ChatRouteShell.tsx`
  - `src/components/Chat/ChatExperience.tsx`
- What is now disallowed or deprecated: Letting `/dashboard/chat` rely on generic page scroll, scroll chaining, or sub-16px mobile input text sizing

### 1d. Chat send UI must reconcile against the successful server response immediately

- Approximate date: Recorded explicitly on 2026-04-10 from the realtime chat send hardening pass
- Status: Active canonical chat runtime rule
- Problem/context: Chat text sends could remain rendered as local optimistic `Sending...` bubbles until the user left and re-entered the thread, even though the server write had already succeeded.
- Decision made: Successful chat sends must immediately reconcile the selected thread, persisted message, and pricing state from the server response instead of waiting for Firestore snapshots or a thread remount.
- What became canonical:
  - optimistic send placeholders must be replaced with the persisted message returned by the send route
  - attachment sends should append the persisted server message immediately without waiting for snapshot churn
  - immediate thread send responses must preserve unchanged read-state fields from the stored thread, not rebuild from the write patch alone
  - pricing state shown in the composer should update from the same successful send response
- Truth lives in:
  - `src/lib/chat-send-realtime.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/lib/server/chat.ts`
  - `tests/unit/chat-send-realtime.spec.ts`
  - `tests/unit/server-chat-send.spec.ts`
- What is now disallowed or deprecated: Treating successful chat sends as snapshot-only UI updates when the server already returned the persisted thread and message

### 1c. Client-hook tests use a scoped jsdom harness, not a global browser-suite switch

- Approximate date: Recorded explicitly on 2026-04-10 from the unread-hook direct-test pass
- Status: Active canonical test rule
- Problem/context: The repo previously had no direct hook-test path for client hooks like `useChatUnreadStatus`, so hook correctness had to be inferred from route and helper tests.
- Decision made: Client hooks that require DOM or React lifecycle behavior should use a reusable jsdom-backed hook harness and a per-file Vitest environment override, while the suite default remains `node`.
- What became canonical:
  - reusable hook harness lives in `tests/unit/utils/renderHook.tsx`
  - hook specs that need DOM should opt in with `// @vitest-environment jsdom`
  - Vitest test globs include both `*.spec.ts` and `*.spec.tsx`
- Truth lives in:
  - `vitest.config.ts`
  - `tests/unit/utils/renderHook.tsx`
  - `tests/unit/use-chat-unread-status.spec.tsx`
- What is now disallowed or deprecated: Treating indirect route coverage as sufficient for client-hook correctness when the hook has meaningful DOM/subscription behavior

### 1b. Chat viewer role must be resolved from creator eligibility, not raw role checks

- Approximate date: Recorded explicitly on 2026-04-10 from PR `#168` post-merge hardening
- Status: Active canonical chat rule
- Problem/context: Several chat surfaces started keying unread state and realtime thread queries off `role === "creator"` only. That breaks approved legacy creators whose profile role may still be `user` even though the platform now treats them as creator-eligible for messaging.
- Decision made: All chat viewer-role decisions must use creator-eligibility resolution, not raw role checks.
- What became canonical:
  - approved creator applications plus creator settings/restrictions can make a user a creator-side chat viewer
  - direct creator deep-links still force user-view semantics for the requesting fan side
  - unread badges and realtime thread/message subscriptions must share the same viewer-role rule as the server route
- Truth lives in:
  - `src/lib/chat.ts`
  - `src/app/api/chat/threads/route.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/hooks/useChatUnreadStatus.ts`
  - `tests/unit/chat-threads-route.spec.ts`
- What is now disallowed or deprecated: Ad hoc `role === "creator"` checks to choose chat thread ownership or unread-query fields

### 1a. Auth Outcome Split must treat failed-attempt history as real data

- Approximate date: Recorded explicitly on 2026-04-09 from the admin analytics auth-outcome refactor
- Status: Active canonical analytics rule
- Problem/context: The historical Auth Outcome Split module previously hid valid historical windows whenever the selected range had zero successful auth completions, even if failures and raw attempts existed.
- Decision made: Treat any tracked auth attempts, failures, or unfinished attempts as real module data; successful completions are not the only valid signal.
- What became canonical:
  - Auth Outcome Split now uses an attempt-based derived model with:
    - successes
    - failures
    - unfinished attempts
  - Chart-health for this module must use attempt/outcome presence, not success-only presence
- Truth lives in:
  - `src/lib/admin-auth-outcome-chart.ts`
  - `src/app/admin/analytics/page.tsx`
  - `tests/unit/admin-auth-outcome-chart.spec.ts`
- What is now disallowed or deprecated: Gating the entire auth-outcome visualization on `successes > 0`

### 1. Static-first origin, later backend/server pivot

- Approximate date: Exact pivot date is not recoverable from current tracked evidence. This continuity context is now explicitly recorded on 2026-04-03 from operator context plus current repo structure.
- Status: Active canonical context
- Problem/context: The product did not begin as the current backend-heavy system. Without recording that pivot, future contributors can misread newer server/runtime layers as accidental complexity or try to simplify the repo back toward earlier static assumptions.
- Decision made: Treat the current codebase as a backend/server application, not a static site with incidental APIs.
- What became canonical: Next App Router route handlers, server-only helpers, Firebase runtime integrations, Functions, diagnostics, admin observability, and Data Connect all count as first-class architecture.
- What is now disallowed or deprecated: Treating backend behavior as optional garnish, or assuming UI output alone is sufficient proof of product truth.
- Truth lives in:
  - `src/app/api/**`
  - `src/lib/server/**`
  - `functions/src/**`
  - `firebase.json`
  - `apphosting.yaml`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Exact historical pivot date is still unresolved.

### 2. Firebase App Hosting is the deployed application runtime

- Approximate date: Present by current tracked config; App Hosting evidence is recoverable from `apphosting.yaml`, `firebase.json`, and `backends.json`
- Status: Active canonical deployment context
- Problem/context: Contributors can easily confuse legacy Hosting assumptions with the current App Hosting deployment path if the deploy target is not recorded explicitly.
- Decision made: Treat Firebase App Hosting as the primary deployed runtime context for the Next application.
- What became canonical:
  - `apphosting.yaml`
  - `firebase.json`
  - `.firebaserc`
  - Firebase/Google Cloud CLI-based local verification
- What is now disallowed or deprecated: Assuming the repo is deployed as a purely static Hosting site or that local branch names automatically equal the live App Hosting branch.
- Truth lives in:
  - `apphosting.yaml`
  - `firebase.json`
  - `backends.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Preview/live branch and rollout assumptions must still be recorded explicitly in future audit evidence whenever deployment behavior is part of the task.

### 3. Local-first workflow is canonical

- Approximate date: Recorded explicitly on 2026-04-03 from operator continuity context and existing repo workflow files
- Status: Active canonical workflow context
- Problem/context: The repo is worked on locally before commit, but that operating reality was previously only partially implied in workflow files.
- Decision made: Treat local development, local verification, and local tool-assisted changes as the normal path before git history becomes authoritative evidence.
- What became canonical: Local audit-first workflow, local verification commands, local Firebase/Google CLI use, local build/test before push.
- What is now disallowed or deprecated: Treating cloud output, chat history, or deploy state as more authoritative than the verified local tracked repo.
- Truth lives in:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `.agent/workflows/pre-commit.md`
  - `AGENTS.md`
  - `package.json`
- Follow-up gaps: Auth-bound emulator and admin-route local seams still need more work.

### 4. Codex and Antigravity are assistive local tooling, not authorities

- Approximate date: Recorded explicitly on 2026-04-03 from operator continuity context
- Status: Active canonical workflow-authority rule
- Problem/context: AI-assisted local work can create founder-memory and tool-memory dependence if the repo does not explicitly separate assistive tools from authoritative sources of truth.
- Decision made: Codex and Google Antigravity may assist locally, but they do not define runtime truth, deployment truth, or architecture truth.
- What became canonical: Git-tracked code, canonical docs, canonical helpers, audit scripts, and required verification commands are the authoritative sources of truth.
- What is now disallowed or deprecated: Treating private AI context, chat memory, or an assistant's prior state as sufficient architectural documentation.
- Truth lives in:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `AGENTS.md`
  - `.agent/workflows/pre-commit.md`
- Follow-up gaps: Repo docs must continue to be expanded whenever private memory would otherwise be carrying a system explanation.

### 5. Telemetry event naming is centrally canonized

- Approximate date: Present by 2026-04-03 audit evidence
- Status: Active canonical behavior
- Problem/context: Analytics and telemetry drift quickly when routes, tasks, and admin/debug surfaces invent local event names or aliases.
- Decision made: Event naming, alias normalization, metadata, and tracked-source semantics must route through the telemetry catalog and governance helpers.
- What became canonical:
  - `src/lib/telemetry-catalog.ts`
  - `src/lib/telemetry.ts`
  - `src/lib/server/analytics.ts`
  - `src/lib/server/analytics-governance.ts`
- What is now disallowed or deprecated: Ad hoc event names, duplicated semantic dialects, or silently emitting ungoverned event facts.
- Truth lives in:
  - `src/lib/telemetry-catalog.ts`
  - `src/lib/server/analytics.ts`
  - `src/lib/server/analytics-governance.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Broader user-journey truth is still only partially canonical beyond the event inventory itself.

### 6. Daily task catalog and observability are canonical

- Approximate date: Strengthened and explicitly recorded by the 2026-04-03 task-system audit passes
- Status: Active canonical behavior
- Problem/context: Task guidance, telemetry, completion, reward claims, and admin/debug visibility previously risked drifting apart.
- Decision made: Built-in and custom/admin-authored tasks must stay on one canonical task/telemetry dialect with shared observability.
- What became canonical:
  - `src/lib/tasks/task-catalog.ts`
  - `src/lib/task-guidance.ts`
  - `src/lib/server/daily-tasks.ts`
  - `src/lib/tasks/task-observability.ts`
- What is now disallowed or deprecated: Separate semantic dialects for built-in versus custom tasks, or task guidance that cannot explain its own action path and tracking basis.
- Truth lives in:
  - `src/lib/tasks/task-catalog.ts`
  - `src/lib/task-guidance.ts`
  - `src/lib/server/daily-tasks.ts`
  - `src/lib/tasks/task-observability.ts`
  - `src/app/api/admin/debug/route.ts`
- Follow-up gaps: Live production runtime sampling still depends on authenticated admin inspection.

### 7. Runtime actions and navigation actions are intentionally different

- Approximate date: Explicitly hardened by the 2026-04-03 task-guidance audit
- Status: Active canonical behavior
- Problem/context: Guidance and action wiring break when navigation-only tasks are treated like runtime actions or vice versa.
- Decision made: Runtime-capable actions and navigation-backed actions must remain explicitly separated in task guidance and observability.
- What became canonical: Guidance only activates pending runtime actions that can actually execute from the current surface; navigation tasks remain truthful route guidance rather than fake in-place actions.
- What is now disallowed or deprecated: Force-mapping navigation tasks into runtime task actions or letting action-mode ambiguity silently disable guidance.
- Truth lives in:
  - `src/lib/task-guidance.ts`
  - `src/lib/tasks/task-catalog.ts`
  - `src/lib/tasks/task-observability.ts`
- Follow-up gaps: If future action modes are added, all three helpers must be updated together.

### 8. Admin/debug should surface ambiguity instead of force-mapping it away

- Approximate date: Strengthened during the 2026-04-03 observability passes
- Status: Active canonical observability rule
- Problem/context: Over-attributing noisy or shared facts creates dashboards that look confident but are less truthful.
- Decision made: When task, telemetry, or parity facts are ambiguous, admin/debug surfaces should say so explicitly instead of force-classifying them into the wrong bucket.
- What became canonical: Ambiguous shared-event mappings, unmatched reward claims, and fallback statuses are surfaced as ambiguity or drift rather than hidden.
- What is now disallowed or deprecated: Silent force-mapping that makes admin/debug output appear cleaner than the underlying truth.
- Truth lives in:
  - `src/lib/tasks/task-observability.ts`
  - `src/app/api/admin/debug/route.ts`
  - `src/lib/server/diagnostic-read-fallbacks.ts`
- Follow-up gaps: Wider analytics/admin surfaces still need more of this ambiguity discipline.

### 9. Firebase App Check is not part of the current runtime contract

- Approximate date: Explicitly removed and recorded in the 2026-04-03 continuity pass
- Status: Active canonical runtime rule
- Problem/context: Half-enabled or implied App Check behavior created misleading runtime assumptions.
- Decision made: Treat App Check as absent from the current runtime contract unless a later fully audited pass reintroduces it end to end.
- What became canonical: Runtime config, auth fetch paths, docs, and checks no longer assume active App Check initialization or validation.
- What is now disallowed or deprecated: Assuming App Check headers, keys, or validation are currently active.
- Truth lives in:
  - `src/lib/firebase.ts`
  - `src/lib/firebase-runtime.ts`
  - `src/lib/authFetch.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: A future reintroduction would need complete client/server/config/doc coverage, not a partial toggle.

### 10. Root package-manager reality is dual-lockfile until intentionally changed

- Approximate date: Present in current tracked repo state; recorded explicitly on 2026-04-03
- Status: Active continuity rule
- Problem/context: The root repo currently carries both `package-lock.json` and `pnpm-lock.yaml`, while verification commonly runs through `corepack pnpm`. Without an explicit rule, contributors can update one lockfile and silently drift the other.
- Decision made: Until a future audited pass intentionally consolidates package-manager strategy, root dependency changes must keep both lockfiles in sync.
- What became canonical:
  - root dependency graph: `package.json` + `package-lock.json` + `pnpm-lock.yaml`
  - Functions dependency graph: `functions/package.json` + `functions/package-lock.json`
- What is now disallowed or deprecated: Treating one root lockfile as disposable without an audited package-manager consolidation decision.
- Truth lives in:
  - `package.json`
  - `package-lock.json`
  - `pnpm-lock.yaml`
  - `functions/package.json`
  - `functions/package-lock.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: A future consolidation pass could simplify this, but not by accident.

### 11. Generated platform metadata is evidence, not deploy authority

- Approximate date: Recorded explicitly on 2026-04-03 after root-surface review
- Status: Active continuity rule
- Problem/context: Generated platform metadata files can look authoritative even when they are snapshots or evidence artifacts rather than canonical configuration.
- Decision made: Treat `backends.json` and similar generated platform metadata as evidence/supporting context only, not as the primary source of deployment truth.
- What became canonical: Deploy/runtime configuration comes from tracked config plus verified cloud/runtime behavior, not from stale generated snapshots.
- What is now disallowed or deprecated: Hand-editing generated backend metadata or treating it as the first place to discover canonical environment contracts.
- Truth lives in:
  - `apphosting.yaml`
  - `firebase.json`
  - `.firebaserc`
  - `backends.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: `backends.json` should continue to be handled carefully because generated platform snapshots can contain operationally sensitive metadata.

### 12. Creator onboarding is a staged audited intake, not a queue-position workflow

- Approximate date: Canonical sequence finalized and recorded on 2026-04-04
- Status: Active canonical product flow
- Problem/context: Creator onboarding had drifted across waitlist copy, admin review controls, legacy queue language, segment assumptions, and partially disconnected compliance/legal steps.
- Decision made: Treat creator onboarding as one staged intake flow: creator signup and basic info, short creator/fan intro acknowledgment, full identity verification package, native MGSA review and creator signature, admin countersign, manual approval/return/rejection, then creator dashboard unlock.
- What became canonical:
  - creator-facing stages are stage-based only, with no numeric queue position
  - the intro acknowledgment is required and part of the audit trail
  - the identity verification package requires front of ID, back of ID, face with ID, and a short video with government name plus current date
  - approval is separate from countersign and cannot happen before prerequisites unless owner override is explicitly used
  - segment assignment is no longer an onboarding-critical blocker
- What is now disallowed or deprecated:
  - queue-position language on creator-facing surfaces
  - treating segment assignment as an approval prerequisite
  - approving creators before intro acknowledgment, identity verification, and both agreement signatures without owner override
- Truth lives in:
  - `src/lib/creator-onboarding.ts`
  - `src/lib/creator-application.ts`
  - `src/lib/server/creator-onboarding.ts`
  - `src/lib/creator-contract.ts`
  - `src/app/creators/apply/page.tsx`
  - `src/app/creators/waitlist/page.tsx`
  - `src/app/api/creator/onboarding/intro/route.ts`
  - `src/app/api/creator/onboarding/id-submission/route.ts`
  - `src/app/api/creator/onboarding/contract-signature/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Admin countersign and template selection are present in the roster flow, but the system still uses native product UI rather than a third-party e-sign platform, and richer template-choosing UX can still improve later without changing the sequence.

### 13. Creator administration belongs in creator roster/intake, not generic user management

- Approximate date: Canonical separation recorded on 2026-04-04
- Status: Active canonical admin UX rule
- Problem/context: Creator onboarding and creator operations had bled into generic user-management detail pages, creating duplicate controls, vertical-spaghetti review UX, and unclear authority boundaries.
- Decision made: Treat creator intake/live operations as roster-owned flows. Generic user management should hand off into the creator record rather than carrying duplicate creator onboarding controls.
- What became canonical:
  - compact Intake / Live / Create Creator roster navigation
  - direct creator creation from roster with owner-only bypass/live-path controls
  - user management retains only a clean handoff into the creator record
- What is now disallowed or deprecated:
  - piling creator onboarding controls into generic user drilldowns as a parallel admin surface
  - showing every possible creator action inline on every list row
- Truth lives in:
  - `src/app/admin/roster/page.tsx`
  - `src/app/api/admin/roster/route.ts`
  - `src/app/admin/user/[userId]/page.tsx`
  - `src/app/api/admin/users/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Legacy hidden creator sections still exist in the user-management page for safety, and can be deleted in a later cleanup pass once this handoff model has had enough runtime usage.

### 14. Gum Drop economics are backend source-aware even though the client shows one balance

- Approximate date: Existing code path explicitly audited and recorded on 2026-04-04
- Status: Active canonical economics rule
- Problem/context: Creator experiences, messaging, and booking flows need to distinguish paid versus non-paid Gum Drops even when the visible wallet balance stays unified.
- Decision made: Preserve one client-visible Gum Drop balance, but keep backend/source-aware accounting separate for purchased and reward balances, with creator-experience spend rules deciding whether reward balance is allowed.
- What became canonical:
  - source-aware balance reads and writes through the canonical Gum Drop ledger helpers
  - reward sources remain explicitly classified, including at least task rewards and check-in rewards
  - creator messages, subscriptions, bookings, and custom requests enforce purchased-only spend policies
- What is now disallowed or deprecated:
  - collapsing creator-experience restricted spend into a single undifferentiated balance internally
  - treating reward and purchased Gum Drops as interchangeable for creator-restricted spend
- Truth lives in:
  - `src/lib/gumdrop-ledger.ts`
  - `src/lib/server/gumdrop-ledger.ts`
  - `src/lib/server/creator-experiences.ts`
  - `src/app/api/checkin/route.ts`
  - `src/lib/server/daily-tasks.ts`
  - `src/app/api/creator/messages/route.ts`
  - `src/app/api/creator/bookings/route.ts`
  - `src/app/api/creator/subscriptions/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Spend priority across mixed balances, refund rules, expiry, and payout-linkage policy still need to stay explicitly documented when product direction finalizes those choices.

### 15. Manual Firebase sign-in accepts username or email through server-side resolution

- Approximate date: Canonicalized and recorded on 2026-04-04
- Status: Active canonical auth rule
- Problem/context: The product identity model is username-heavy, but Firebase email/password authentication is email-based. Leaving manual sign-in email-only caused real users to retry with usernames, which could fall through as invalid credentials and escalate into Firebase `auth/too-many-requests` throttling.
- Decision made: Keep Firebase email/password as the canonical underlying auth mechanism, but allow the manual sign-in surface to accept either email or username by resolving usernames to the canonical account email through a trusted-origin, rate-limited server lookup before the Firebase sign-in call.
- What became canonical:
  - the sign-in UI accepts `Email or username`
  - username normalization routes through the existing username helper
  - username lookup happens server-side only
  - unresolved usernames still return generic invalid-credential behavior instead of leaking account existence
  - Firebase throttle behavior remains truthful and visible rather than being disguised as success or empty state
- What is now disallowed or deprecated:
  - treating manual sign-in as email-only on the client while the rest of the product encourages username identity
  - sending arbitrary username strings straight into Firebase email/password auth
  - inventing a second credential system outside the canonical Firebase flow
- Truth lives in:
  - `src/context/AuthContext.tsx`
  - `src/components/Auth/AuthModal.tsx`
  - `src/lib/auth-errors.ts`
  - `src/lib/user-utils.ts`
  - `src/app/api/auth/manual-sign-in-lookup/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: If remote Firebase Authentication anti-abuse settings still throttle legitimate users after this fix, that remaining issue must be investigated in the Firebase/Google Cloud project configuration rather than by re-fragmenting the local auth flow.

### 16. Creator alert controls avoid duplicate writes when global new-drop alerts are already active

- Approximate date: Recorded explicitly on 2026-04-05 from current tracked creator-profile behavior
- Status: Active canonical UX/runtime rule
- Problem/context: The creator profile follow/alert surface risked double-writing or redundantly toggling creator-specific alert state when the user had already enabled global new-drop alerts.
- Decision made: When global new-drop alerts are already enabled, the creator alert UI should reflect the active state without issuing duplicate writes that pretend a second backend toggle is needed.
- What became canonical:
  - creator-profile alert controls respect the existing global notification signal
  - UI may present the creator alert state as satisfied when the broader notification setting already covers it
  - redundant backend writes are avoided instead of being treated as required user actions
- What is now disallowed or deprecated:
  - duplicate alert mutations that only restate an already-active global notification preference
  - making the creator alert control appear broken when the broader setting already fulfills the user intent
- Truth lives in:
  - `src/app/creators/[username]/CreatorProfileClient.tsx`
  - `src/lib/notifications.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Global-versus-creator notification precedence should continue to stay explicit anywhere new alert controls are added.

### 17. AI drop-cover generation is server-side, title-driven, and admin-only

- Approximate date: Canonicalized and recorded on 2026-04-05
- Status: Active canonical AI/runtime rule
- Problem/context: The first real AI layer could easily drift into prompt-box UX, client-side secrets, fake “live training,” or decorative admin pages that do not expose actual runtime truth.
- Decision made: Treat AI drop-cover generation as an admin-only, server-side Vertex image-generation workflow that uses title-driven actions, persisted job history, honest cost estimation, and real feedback logging without exposing prompts or secrets to the client.
- What became canonical:
  - generation happens server-side only through a dedicated Vertex image path using ADC or Google-managed credentials
  - the admin UI offers button actions only: generate, regenerate, like, dislike, and use as cover
  - generated art is the visual background/hero layer, while production-safe text treatment remains deterministic in the app rather than model-rendered
  - runtime status, toggle state, job history, feedback signals, latency, and aggregate estimated cost are visible in the Admin AI page
  - feedback collection is real dataset history; instant live training is not claimed
- What is now disallowed or deprecated:
  - public prompt fields for cover generation
  - client-side model calls or hardcoded API keys
  - text-only models pretending to generate production cover assets
  - fake runtime, fake training, or fake cost precision
- Truth lives in:
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/api/admin/ai/drop-covers/route.ts`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `src/app/api/admin/ai/drop-covers/feedback/route.ts`
  - `src/app/admin/ai/page.tsx`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `src/components/Admin/CreateDropModal.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Billing truth is still estimated from vendor pricing plus stored job metadata rather than direct billing export, and richer model-evaluation/tuning workflows remain future work.

### 18. AI cover “training” is reference-guided customization, not live fine-tuning

- Approximate date: Canonicalized and recorded on 2026-04-06
- Status: Active canonical AI/runtime rule
- Live-note: Entry 27 now governs the current catalog-cover rule; this entry remains the higher-level "reference-guided, not live training" decision.
- Problem/context: Admin operators want the cover generator to follow a fixed KandyDrops house style and existing catalog covers, but claiming live retraining or hidden fine-tuning would overstate what the Vertex image stack is actually doing.
- Decision made: Treat AI cover “training” as a truthful reference-guided generation workflow. The admin AI page can upload one template image and optionally use the retained drop-cover library as additional style references, while the generation runtime keeps the feedback history as a future evaluation dataset instead of pretending live fine-tuning exists.
- What became canonical:
  - current-runtime note: the live additional non-AI input is the latest reusable catalog cover, not a broad drop-cover library
  - admin operators can upload and remove a single AI cover template from the Admin AI page
  - the runtime can use that template and retained successful AI references for generation, with catalog-cover reuse governed by the current live rule
  - reference-guided mode is recorded in settings, runtime state, job history, and admin UI
  - the product continues to say “reference-guided” or “style references” instead of falsely claiming live model training
  - accepted/liked/disliked generation history remains real feedback data for later tuning work
- What is now disallowed or deprecated:
  - calling the current reference-image workflow “live retraining” or “fine-tuning”
  - pretending existing drop covers are being used when no reference source is actually available
  - leaving the admin AI page unable to show which reference inputs are active
- Truth lives in:
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/api/admin/ai/drop-covers/route.ts`
  - `src/app/api/admin/ai/drop-covers/template/route.ts`
  - `src/app/admin/ai/page.tsx`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Reference-guided generation still depends on actual project access to the Vertex customization model, and the system does not yet do deterministic post-generation frame compositing from a template image.

### 19. Create Drop chooses between two Gemini image models per generation

- Approximate date: Canonicalized and recorded on 2026-04-06
- Status: Active canonical AI/runtime rule
- Problem/context: One fixed image model was too rigid for drop operations. Operators need a faster lower-cost default and a higher-cost quality option at generation time without forking the rest of the create-drop flow.
- Decision made: Keep admin AI settings responsible for enablement and reference inputs, but let Create Drop choose between two supported Gemini image models per generation: `gemini-2.5-flash-image` and `gemini-3-pro-image-preview`.
- What became canonical:
  - the create-drop AI panel exposes the model choice inline next to Generate
  - `gemini-2.5-flash-image` is the default operator path
  - `gemini-3-pro-image-preview` is available as a per-generation preview-quality override
  - cost shown in the create-drop panel is tied to the selected model instead of a fake flat price
  - the server route validates requested models against the bounded allowlist instead of accepting arbitrary model ids from the client
  - job history records the actual model used for each generation
- What is now disallowed or deprecated:
  - pretending one fixed model handles every cover-generation use case equally well
  - accepting arbitrary client-supplied model ids in the create-drop generation route
  - flattening preview-model lifecycle/cost risk into the same operator language as the default GA model
- Truth lives in:
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: `gemini-3-pro-image-preview` remains preview-stage and may need a future replacement path if Google changes availability, pricing, or lifecycle.

### 20. Admin dashboard hydration health is reported back into debug as a canonical client-to-server signal

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active canonical admin-debug rule
- Problem/context: Admin overview and analytics pages had real loading/degradation logic, but those failures were trapped in local page state. The debug panel could not tell operators which admin modules were currently loaded, degraded, empty, or failed across the dashboard surfaces.
- Decision made: Add a canonical admin UI chart-health contract that lets admin overview modules and analytics sections report their latest hydration state back to the server, and let the debug route consume that reported state to build truthful analytics/overview panel logs.
- What became canonical:
  - admin overview modules and analytics sections report structured health items with:
    - page
    - category
    - source
    - status
    - hydration state
    - data presence
    - issue list
    - last updated time
  - those reports are persisted in `admin_ui_chart_health`
  - `/api/admin/debug` returns the latest admin UI chart-health items and category summaries
  - the debug panel shows exact reported module/chart health instead of simulated readiness copy
  - overview mixed-source modules stay explicit about whether they are snapshot, realtime, or mixed-client-live
- What is now disallowed or deprecated:
  - treating local admin page loading banners as sufficient observability for debug
  - debug summaries that imply analytics coverage exists when the matching admin surface has not reported in
  - claiming a chart is healthy when its current read path is degraded or failed in the client
- Truth lives in:
  - `src/lib/admin-ui-chart-health.ts`
  - `src/lib/server/admin-ui-chart-health.ts`
  - `src/app/api/admin/ui-chart-health/route.ts`
  - `src/hooks/useAdminUiChartHealthReporter.ts`
  - `src/app/admin/page.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/app/admin/debug/page.tsx`
  - `src/app/api/admin/debug/route.ts`
  - `src/lib/server/admin-panel-system-logs.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: The signal is latest-state reporting, not a long-lived historical time series, and section cards are the current granularity rather than individual sub-chart primitives within a card.

### 21. Creator operations live on the user dashboard, but route reads must stay ownership-scoped

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active creator/runtime rule
- Problem/context: Creator workflows already existed on the backend for requests, bookings, inbox threads, subscriptions, broadcasts, payouts, and onboarding review state, but the user dashboard did not expose those operations clearly. At the same time, two creator GET routes were leaking too much data: public creator booking reads could expose other fans' bookings, and direct thread reads could expose messages to unrelated users.
- Decision made: Treat `/dashboard` as the canonical creator operations workspace for approved creators and creator applicants, while enforcing ownership checks on creator fan-work reads at the route boundary.
- What became canonical:
  - the main user dashboard shows a creator workspace when the user is a creator or has a creator application
  - creator applicants see backend-backed approval and blocker state there instead of empty creator tooling
  - approved creators see live route-backed queues for requests, bookings, messages, subscribers, payouts, and broadcasts there
  - `/api/creator/bookings?creatorId=...` only returns a fan's own booking relationship to the creator unless the caller is the creator owner or admin
  - `/api/creator/messages?threadId=...` only returns message history to the creator owner, the participant, or admin
  - `/dashboard/profile#creator-tools` remains the settings/control surface for deeper creator settings and drop submission
- What is now disallowed or deprecated:
  - burying creator operations exclusively inside profile/settings
  - allowing public creator-page hydration routes to leak another fan's creator-experience records
  - returning a creator thread by id without verifying caller ownership
- Truth lives in:
  - `src/app/dashboard/DashboardClient.tsx`
  - `src/components/Dashboard/CreatorWorkspacePanel.tsx`
  - `src/app/dashboard/profile/page.tsx`
  - `src/app/api/creator/bookings/route.ts`
  - `src/app/api/creator/messages/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: The workspace is route-backed rather than realtime-streamed per queue, and creator settings still keep their existing manual-save path in the profile view.

### 22. AI drop-cover execution is Gemini-only; old Imagen ids survive only as migration aliases

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active canonical AI/runtime rule
- Problem/context: The AI cover stack had already moved to Gemini, but older Imagen model ids were still present in settings/history normalization. Without an explicit rule, contributors could mistake those aliases for an active second execution path and accidentally resurrect stale provider logic.
- Decision made: Treat the live AI drop-cover runtime as Gemini-only. Old Imagen model/location strings may remain only inside normalization helpers so persisted settings and historical jobs can migrate cleanly onto the Gemini defaults.
- What became canonical:
  - server-side generation executes through the Gemini `generateContent` path only
  - old Imagen ids are accepted only for normalization/migration, not execution
  - Admin AI truth surfaces must describe retained references, feedback, and polling cadence honestly without implying hidden training or dual-provider routing
- What is now disallowed or deprecated:
  - reintroducing Imagen execution branches as if they are still first-class runtime behavior
  - treating normalization aliases as proof that legacy provider routing is still supported live
  - simulative Admin AI wording about model introspection, live training, or opaque “smartness”
- Truth lives in:
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/admin/ai/page.tsx`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Provider-side step streaming still does not exist for this runtime; the admin page remains a persisted-state polling surface.

### 23. Cost-heavy admin AI and live analytics routes use adaptive user-count rate limiting

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active canonical cost-control rule
- Problem/context: Fixed request budgets were acceptable at small scale, but they became too blunt once the product crossed 200 users. Expensive admin AI generation and high-frequency live admin reads needed a cost-aware limit that tightens over time without breaking the existing request-guard contract.
- Decision made: Keep the canonical request-guard boundary, but allow route policies to resolve adaptively against the registered user count. Admin AI dashboard reads, control writes, generation requests, debug assistant reads, and realtime analytics reads now tighten at `200`, `500`, and `1000` registered users.
- What became canonical:
  - adaptive policies resolve through the shared server rate-limit helper
  - the registered `users` count is cached briefly and used as the scaling input
  - routes still declare one canonical policy through `request-guard`; they do not hand-roll their own scaling logic
  - tighter budgets happen server-side only and do not fabricate client-visible quotas
- What is now disallowed or deprecated:
  - copying bespoke adaptive logic into individual routes
  - assuming expensive admin AI/read paths should stay on one flat limit forever
  - weakening the request-guard contract by bypassing canonical rate-limit resolution
- Truth lives in:
  - `src/lib/server/rate-limit.ts`
  - `src/lib/server/request-guard.ts`
  - `src/app/api/admin/ai/drop-covers/route.ts`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `src/app/api/admin/ai/drop-covers/template/route.ts`
  - `src/app/api/admin/ai/drop-covers/feedback/route.ts`
  - `src/app/api/admin/debug/assistant/route.ts`
  - `src/app/api/admin/analytics/realtime/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: The scaling input is registered-user count, not direct billing export or traffic forecasting; future passes can refine tiers if real usage patterns diverge.

### 24. Signed-in support is in-site only and runs through support threads, not mailto links

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active user/admin support rule
- Problem/context: The signed-in product still exposed dead `mailto:` support redirects even though no real support inbox email existed. The repo already had latent `support_threads` / `support_messages` scaffolding, but no live in-site support foundation for users or admins.
- Decision made: Make signed-in support in-site only. The canonical support foundation is now a dashboard support inbox for users and an admin support queue for operators, backed by `support_threads` top-level documents and `support_messages` subcollections. Bug reports remain a separate intake signal, not a second ticketing system.
- What became canonical:
  - signed-in support entry points route to `/dashboard/support`
  - creator-application support deep-links into the same inbox with prefilled subject/category context
  - admin support operations live at `/admin/support`
  - `support_threads` holds the thread summary and ownership fields
  - `support_messages` subcollections hold the thread conversation
  - user replies move a thread to `waiting_on_support`
  - admin replies move a thread to `waiting_on_user`
  - resolved threads stay visible and can be reopened
  - admin user detail support readiness now reflects real in-site support state instead of future-placeholder copy
- What is now disallowed or deprecated:
  - signed-in support mailto links
  - treating `platform_feedback` as the primary support system
  - describing the admin support lane as a future integration when real in-site threads exist
- Truth lives in:
  - `src/lib/support-readiness.ts`
  - `src/lib/server/support-threads.ts`
  - `src/app/api/support/threads/route.ts`
  - `src/app/api/support/threads/[threadId]/route.ts`
  - `src/app/api/admin/support/threads/route.ts`
  - `src/app/api/admin/support/threads/[threadId]/route.ts`
  - `src/app/dashboard/support/page.tsx`
  - `src/components/Support/SupportInbox.tsx`
  - `src/app/admin/support/page.tsx`
  - `src/components/Admin/AdminSupportQueue.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: The support inbox/queue is polling-backed rather than socket-streamed, and signed-out public/legal support still routes users into authenticated in-site support instead of a separate guest intake path.

### 25. Positive admin balance adjustments are reward-backed, not purchased-backed

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active canonical Gum Drop integrity rule
- Problem/context: Manual admin balance adjustments were crediting purchased balance, which let goodwill/manual adjustments masquerade as paid currency and bypass purchased-only creator experience restrictions.
- Decision made: Positive manual admin balance adjustments credit reward balance only. Purchased balance should move only through verified purchase flows unless a future audited pass adds an explicit purchased-credit admin pathway with separate intent and audit semantics.
- What became canonical:
  - admin balance route positive credits increase `gumDropsRewardBalance`
  - admin balance route negative adjustments still spend from the source-aware total according to the canonical spend helper
  - admin adjustment transactions remain visible as `admin_adjustment` ledger records without pretending they are purchases
- What is now disallowed or deprecated:
  - treating manual goodwill/admin grants as purchased balance
  - using the generic admin balance tool to mint creator-spendable purchased credits
- Truth lives in:
  - `src/app/api/admin/balance/route.ts`
  - `src/lib/gumdrop-ledger.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: If operators ever need to grant purchased-equivalent balance intentionally, that needs a separate audited route and explicit UI language rather than overloading the current manual adjustment tool.

### 26. AI drop-cover reuse briefly pulled from the full drop catalog, not a recent-only sample

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Superseded on 2026-04-07 by entry 27
- Problem/context: The create-drop flow was already feeding accepted AI jobs back into the retained AI reference pool, but the non-AI cover reference side still sampled only a small recent `validFrom` window of drop covers. That excluded older legacy covers and made the Admin AI page overstate the breadth of the reusable cover library.
- Decision made: Treat drop-cover references as a full catalog, not a recent feed. The create-drop form remains responsible for linking accepted AI jobs to saved drops, and the shared AI reference library now scans the full drop catalog so current and legacy uploaded covers can both seed future generations.
- What became canonical:
  - accepted AI covers from the create-drop flow feed the retained AI reference pool once they are liked or accepted and linked to saved drops
  - drop-cover library references are built from the full `drops` collection instead of a recent-only `validFrom` sample
  - legacy timestamp shapes are normalized through the shared drop timestamp helper before reference ranking
  - the Admin AI page describes this input truthfully as a drop-cover library spanning current and legacy catalog covers
  - reference selection can use creator id, creator name, title/flavor similarity, and positive operator feedback without pretending the model trained itself
- What is now disallowed or deprecated:
  - describing a recent-only sample as the full reusable cover library
  - assuming `validFrom` is the only trustworthy recency signal for legacy drop covers
  - leaving accepted create-drop AI jobs disconnected from the saved drop they were chosen for
- Truth lives in:
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/lib/drop-status.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Superseded by entry 27 after the full-catalog scan proved too expensive for the single non-AI cover reference the runtime actually needs.

### 27. Latest-cover AI reuse supersedes the brief full-catalog scan

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active canonical AI/runtime rule
- Problem/context: The full-catalog AI cover scan was truthful but too expensive for one extra human-made cover reference, especially because accepted AI covers already form the durable retained reference pool after create-drop save.
- Decision made: Keep accepted AI covers as the historical retained pool, but narrow non-AI cover reuse to the latest reusable catalog cover from a bounded recent query window. This entry supersedes the earlier full-catalog scan rule for live runtime behavior.
- What became canonical:
  - the create-drop form still links accepted AI jobs back to saved drops through the canonical feedback path
  - non-AI cover reuse now means the latest reusable catalog cover, not a full drop-cover library
  - Admin AI copy and stats must describe this as the latest catalog cover rather than a broad library
- What is now disallowed or deprecated:
  - scanning the entire `drops` collection for every AI reference refresh just to find one extra human-made cover reference
  - calling the latest-cover shortcut a full catalog library
- Truth lives in:
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/admin/ai/page.tsx`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: If operators need broader human-cover reuse again, the next step should be a canonical summarized reference index rather than another full collection scan.

### 28. Queue scheduling and activation notifications must normalize Timestamp-shaped drop timing on both cron paths

- Approximate date: Canonicalized and recorded on 2026-04-07
- Status: Active canonical drop-runtime rule
- Problem/context: Fixing `cron/process-queue` alone was not enough. Legacy drops with Firestore Timestamp-shaped `validFrom` / `validUntil` could still miss activation, expiry, requeue, or return-notification handling if `cron/notify-active-drops` kept using numeric-only timing assumptions.
- Decision made: Both queue cron paths must normalize drop timing through `getFiniteDropTimestamp(...)` and `resolveDropStatusFromTiming(...)` before making lifecycle decisions or generating activation keys.
- What became canonical:
  - `cron/process-queue` and `cron/notify-active-drops` both normalize legacy Timestamp-like timing values
  - return notifications for queued/reactivated drops continue to rely on the real `activationCount >= 1` signal
  - activation notification keys must use normalized millis so return activations dedupe correctly without collapsing to `0`
- What is now disallowed or deprecated:
  - numeric-only `Number(raw.validFrom)` / `typeof validUntil === "number"` lifecycle logic in queue cron routes
  - relying on Firestore range queries alone to determine whether legacy scheduled/active drops are due
- Truth lives in:
  - `src/app/api/cron/process-queue/route.ts`
  - `src/app/api/cron/notify-active-drops/route.ts`
  - `src/lib/drop-status.ts`
  - `src/lib/drop-queue-lifecycle.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Other non-queue consumers that still query by raw numeric `validFrom` / `validUntil` should be audited separately if legacy Timestamp-shaped drops must remain visible there too.

### 29. Manual email sign-up is explicit-profile-first and must not silently auto-suggest around user input

- Approximate date: Canonicalized and recorded on 2026-04-08
- Status: Active canonical auth rule
- Problem/context: Firebase email/password account creation finishes before KandyDrops profile bootstrap. Without an explicit guard, fallback profile bootstrap can race the sign-up flow, and server registration can silently replace the requested username with an auto-suggested fallback.
- Decision made: Keep Firebase email/password as the manual auth backbone, but treat manual sign-up as an explicit profile-registration flow that blocks fallback bootstrap while it is in flight, preserves the requested normalized username when it is available, and only rolls back the just-created auth user on confirmed registration failures.
  - What became canonical:
    - manual sign-in still supports username-or-email resolution through the server lookup path
    - the manual sign-in lookup path must return a Google sign-in instruction when the matched account is Google-only and has no password provider
    - manual sign-up checks the requested username directly and returns a truthful conflict if it is no longer available
    - `/api/user/register` no longer silently swaps a requested username for an auto-suggested fallback during explicit manual registration
    - password reset now belongs to the same manual-auth helper surface rather than living only as modal-inline logic
    - fallback profile auto-bootstrap must yield while explicit manual sign-up is in flight
- What is now disallowed or deprecated:
  - racing fallback profile bootstrap against explicit manual sign-up
  - silently changing a requested username during manual registration
  - scattering manual email/password helper behavior across modal-only implementations
- Truth lives in:
  - `src/context/AuthContext.tsx`
  - `src/components/Auth/AuthModal.tsx`
  - `src/lib/auth-errors.ts`
  - `src/lib/manual-email-auth.ts`
  - `src/app/api/user/register/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: This rule now depends on the server-side reservation contract recorded in entry 30 and should not be interpreted as permission to fall back to point-in-time username checks.

### 30. Username ownership is enforced by a server-side reservation map with legacy backfill

- Approximate date: Canonicalized and recorded on 2026-04-08
- Status: Active canonical user-identity rule
- Problem/context: Point-in-time `users.where("username" == ...)` checks were not durable enough to prevent concurrent claims, and legacy accounts with stored usernames had no canonical reservation row yet.
- Decision made: Treat `username_reservations` as the canonical ownership map for usernames. New registrations and profile updates reserve usernames through server-side transactions, availability checks backfill missing reservations from legacy user docs, and account deletion releases the reservation owned by the deleted user.
- What became canonical:
  - username availability resolves through the reservation map first
  - missing reservation rows for legacy user docs are backfilled server-side instead of leaving legacy accounts outside the contract
  - explicit registration and profile updates reserve/release usernames transactionally
  - account deletion releases the owned username reservation after document cleanup
  - generated username suggestions use the same reservation-backed availability contract as explicit usernames
- What is now disallowed or deprecated:
  - relying on raw `users.where("username" == ...)` checks as the only uniqueness guard
  - treating legacy user docs as exempt from username reservation rules
  - changing a username without releasing the caller’s previous reservation
- Truth lives in:
  - `src/lib/server/username-suggestions.ts`
  - `src/app/api/user/check-username/route.ts`
  - `src/app/api/user/register/route.ts`
  - `src/app/api/user/profile/route.ts`
  - `src/app/api/user/delete/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: If username history, moderation holds, or grace-period reclaim rules are added later, they must extend the reservation contract rather than bypassing it with direct writes to `users.username`.

### 31. Creator messaging is now a dedicated Chat product with compatibility adapters

- Approximate date: Canonicalized and recorded on 2026-04-08
- Status: Active canonical messaging/runtime rule
- Problem/context: Creator messaging had split into two competing surfaces: the public creator page composer and the creator dashboard workspace inbox. Both were refresh-driven, neither was the clear source of truth, and the insufficient-funds path was too generic for a paid-chat product.
- Decision made: Make `/dashboard/chat` the primary creator-conversation surface for both fans and creators. Preserve the existing one-thread-per-creator-user model and creator-message economics, add realtime thread/message/read-state behavior, and keep `/api/creator/messages` only as a compatibility adapter while the rest of the product hands off into Chat.
- What became canonical:
  - one creator-user thread remains the canonical conversation identity
  - `/dashboard/chat` is the primary inbox/chat surface
  - the public creator page `Message` action deep-links into Chat instead of sending inline messages there
  - the creator workspace message lane is summary-only and links into Chat
  - fan message pricing stays `1 / 5 / 10 GD` for `text / image / video`
  - creator replies remain free
  - purchased-only spend remains server-enforced
  - subscriber free chat still follows the creator setting `chatFreeForSubscribers`
  - insufficient-balance chat failures now return a structured payload instead of a generic error
  - realtime message/thread/read-state updates use Firestore, while ephemeral typing/presence uses RTDB under `chat_presence`
  - admin debug/runtime health tracks the new chat routes directly
- What is now disallowed or deprecated:
  - treating the public creator page as the primary chat surface
  - treating `CreatorWorkspacePanel` as a second full inbox
  - leaving paid chat failures as generic send-message errors
  - adding a second long-term messaging API alongside the dedicated chat routes
- Truth lives in:
  - `src/app/dashboard/chat/page.tsx`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/lib/chat.ts`
  - `src/lib/server/chat.ts`
  - `src/app/api/chat/threads/route.ts`
  - `src/app/api/chat/threads/[threadId]/route.ts`
  - `src/app/api/chat/threads/[threadId]/messages/route.ts`
  - `src/app/api/chat/threads/[threadId]/read/route.ts`
  - `src/app/api/creator/messages/route.ts`
  - `src/app/creators/[username]/CreatorProfileClient.tsx`
  - `src/components/Creators/CreatorExperiencesPanel.tsx`
  - `src/components/Dashboard/CreatorWorkspacePanel.tsx`
  - `firestore.rules`
  - `database.rules.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: RTDB presence reads are currently authenticated-wide rather than participant-scoped, and there is no dedicated RTDB-rules test suite yet.

### 32. Broad UI reviews require dated screenshot evidence packets

- Approximate date: Canonicalized and recorded on 2026-04-08
- Status: Active workflow rule
- Problem/context: Automated UI audits catch regressions, but they do not produce a clean human review packet for desktop, tablet, and mobile. Prior screenshot evidence also accumulated as mixed timestamped folders plus loose top-level images, which made cross-run review noisy and inconsistent.
- Decision made: Broad UI audits now produce one dated evidence packet under `qa-screenshots/ui-review-YYYY-MM-DD/` with separate `desktop`, `tablet`, and `mobile` page/component screenshots, a capture manifest, contact sheets, and a written review.
- What became canonical:
  - `qa-screenshots/` is the tracked evidence root for manual UI review packets
  - each visual audit run gets one dated folder
  - the packet must separate pages from components and separate device classes from each other
  - failed or unavailable captures must be recorded truthfully rather than faked
  - broad UI signoff should include both automated UI audits and a human-readable screenshot packet when layout/polish work is material
- What is now disallowed or deprecated:
  - leaving a broad UI pass without a clean dated evidence packet
  - mixing duplicate viewport/full-page images of the same surface into the same run
  - leaving partial screenshot runs or loose temporary artifacts in the review folder after signoff
- Truth lives in:
  - `UI_REVIEW_PROCESS.md`
  - `qa-screenshots/ui-review-2026-04-08/README.md`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Authenticated dashboard and admin surfaces still need a stable seeded review session so future packets can cover those routes without manual setup drift.

### 33. Viewer and dashboard regressions must surface through route runtime health

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active runtime-monitoring rule
- Problem/context: Manual bug submissions flagged `/dashboard/viewer` and `/dashboard`, but the affected server routes were only partially covered by admin-debug runtime health. That left owned-content proxy failures, viewer watch-session failures, creator discovery drift, and dashboard activity failures too easy to miss until a user reported them.
- Decision made: Expand route-runtime-health coverage to the viewer and dashboard-critical routes and keep dashboard-owned viewer rendering sourced from the raw drop record instead of the public-only loader.
- What became canonical:
  - `/dashboard/viewer` must load owned content from `getDropRaw(...)` and sanitize it for the client instead of depending on the public drop loader
  - the following routes are now first-class route-runtime-health surfaces:
    - `creator/discovery:GET`
    - `user/activity:GET`
    - `checkin:POST`
    - `drops/content:GET`
    - `viewer/watch-session:POST`
  - user-facing auth-required routes should return explicit `401` responses when `guardApiRequest(...)` does not yield a caller, instead of drifting into ambiguous empty or error states
- What is now disallowed or deprecated:
  - using the public drop loader as the dashboard viewer source of truth
  - leaving viewer and dashboard-critical routes outside admin-debug route health
  - allowing auth-required dashboard routes to continue with blank user ids after a missing caller
- Truth lives in:
  - `src/app/dashboard/viewer/page.tsx`
  - `src/lib/server/drops.ts`
  - `src/lib/route-runtime-health.ts`
  - `src/lib/server/route-runtime-health.ts`
  - `src/app/api/creator/discovery/route.ts`
  - `src/app/api/user/activity/route.ts`
  - `src/app/api/checkin/route.ts`
  - `src/app/api/drops/content/route.ts`
  - `src/app/api/viewer/watch-session/route.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: The dashboard still depends on client diagnostics for browser-only failures such as notification-permission UX; only the server-backed routes above are now visible in route-runtime-health.

### 34. Load-bearing user surfaces should be server-seeded first and only reconcile live changes after hydration

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active loading/runtime rule
- Problem/context: Home, experiences, dashboard, drops, and creator spotlight were paying unnecessary client waterfalls or delayed mount penalties even when the server already had enough truth to render the first screen. That created visible second-phase loading without adding new realtime correctness.
- Decision made: Treat server-seeded live snapshots as the default for load-bearing user surfaces, then let the client reconcile from realtime sources after hydration. Remove artificial deferred mounts for visible modules and do not immediately refetch the same payload on mount when SSR already supplied it.
- What became canonical:
  - home and experiences now receive server-seeded live drop data on first paint
  - dashboard, drops, and experiences receive server-seeded creator spotlight data
  - `CreatorDiscoveryRail` uses seeded data immediately and only falls back to client discovery fetches when no seed exists
  - `useDrops(...)` does not immediately revalidate the first page when `initialData` already came from the server
  - visible modules should prefer immediate render plus truthful loading placeholders over artificial `useDeferredClientReady(...)` delays
  - global chrome should not be lazy-loaded as a second-phase chunk when it is present on nearly every route
  - `drops/feed:GET` is a first-class route-runtime-health surface
- What is now disallowed or deprecated:
  - client-only first paint for load-bearing global drop surfaces when server data is already available
  - immediate post-SSR refetches of the first drop feed page without new truth to justify them
  - delaying visible core modules solely to smooth perceived load if the data is already present
  - lazy-loading the primary navbar or bottom navigation as optional chrome
- Truth lives in:
  - `src/app/page.tsx`
  - `src/app/HomeClient.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/DashboardClient.tsx`
  - `src/app/drops/page.tsx`
  - `src/app/drops/DropsClient.tsx`
  - `src/app/experiences/page.tsx`
  - `src/app/experiences/ExperiencesClient.tsx`
  - `src/components/CoreLayoutWrapper.tsx`
  - `src/components/CreatorDiscoveryRail.tsx`
  - `src/components/Dashboard/LiveDropsForYouCarousel.tsx`
  - `src/hooks/useDrops.ts`
  - `src/lib/server/creator-discovery.ts`
  - `src/app/api/drops/route.ts`
  - `src/lib/route-runtime-health.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Admin overview and some authenticated dashboard-only modules still rely on client fetch after shell render because they require user-scoped or admin-scoped state that is not yet server-seeded end to end.

### 35. Admin debug must expose missing runtime evidence instead of silently omitting it

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin observability rule
- Problem/context: The admin debug console already summarized route-runtime and client hydration health, but unobserved admin routes simply disappeared from the runtime ledger and the debug page itself did not report its own client-side hydration state. That made missing evidence look healthier than it was.
- Decision made: Treat missing runtime evidence as a first-class debug signal. Route-runtime-health should enumerate all canonical tracked targets, mark never-observed routes as visible warnings, and the debug page should report its own client hydration state through the same admin UI chart-health channel used by other admin surfaces.
- What became canonical:
  - `listRouteRuntimeHealth()` must merge persisted route samples with the full target registry instead of returning only observed routes
  - never-observed tracked routes must remain visible in admin debug as coverage gaps rather than disappearing from the health lane
  - the admin debug console now self-reports at least these client surfaces:
    - primary debug snapshot
    - overview dependency lane
    - AI assistant lane
    - route-runtime lane
  - admin-debug route summary counts must come from the canonical route-health summary helper, not ad hoc `lastResult` checks
- What is now disallowed or deprecated:
  - treating the absence of route samples as implicit health
  - letting the debug console observe every other admin surface without reporting its own hydration state
  - using custom route-health count logic in admin debug that can drift from the shared helper contract
- Truth lives in:
  - `src/lib/route-runtime-health.ts`
  - `src/lib/server/route-runtime-health.ts`
  - `src/lib/admin-ui-chart-health.ts`
  - `src/app/admin/debug/page.tsx`
  - `src/app/api/admin/debug/route.ts`
  - `src/lib/server/admin-panel-system-logs.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Route-runtime-health still distinguishes observed vs never-observed, but it does not yet split fresh vs stale historical success for low-traffic admin surfaces.

### 36. Debug diagnostics channels must separate current incidents from historical sample totals

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin-debug truth rule
- Problem/context: The admin debug diagnostics-channel lane was surfacing total per-channel errors and warnings from the loaded sample without separating active-window or recent-window counts. That let channels such as `runtime` or `auth` appear currently broken even when the loaded noise was mostly historical.
- Decision made: Treat per-channel active/recent counts as the primary debug signal and demote loaded-sample totals to secondary context.
- What became canonical:
  - `AdminOpsHealthChannelItem` now carries:
    - `activeErrorCount`
    - `activeWarnCount`
    - `recentErrorCount`
    - `recentWarnCount`
  - the admin debug diagnostics-channel lane should lead with active-window and recent-window counts first
  - loaded-sample totals remain visible for context but should not be presented as current incidents
- What is now disallowed or deprecated:
  - presenting week-sample channel totals as if they were current failures
  - sorting diagnostics channels only by total sample count when active or recent noise exists
- Truth lives in:
  - `src/lib/admin-ops-health.ts`
  - `src/lib/server/admin-ops-health.ts`
  - `src/app/admin/debug/page.tsx`
  - `tests/unit/admin-ops-health.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: There is still no long-lived channel materializer; the debug lane remains based on the bounded diagnostics query rather than historical per-channel rollups.

### 37. Notifications must carry a stable delivery timestamp and clear through a single server mutation

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active notifications runtime rule
- Problem/context: The notification bell was showing `Delivery time unavailable` for valid inbox items because the shared notification contract only recognized client-side Firestore timestamps, while inbox reads run on server-side admin snapshots. At the same time, the clear-all path fanned out one mark-read request per unread notification, which made partial failures likely under normal route limits.
- Decision made: Normalize notification timestamps by behavior, not by SDK class, persist `createdAtMs` on notification writes, and treat bulk mark-read as one server-side mutation instead of a burst of parallel requests.
- What became canonical:
  - `normalizeNotificationDoc(...)` must accept timestamp-like values from either Firebase Admin or client SDKs, and it must surface a stable `createdAtMs`
  - notification producers should persist both `createdAt` and `createdAtMs`
  - bulk clear from the client must use one `PUT /api/notifications` request with `notificationIds`
  - notifications route reads and writes are first-class route-runtime-health surfaces
- What is now disallowed or deprecated:
  - relying on `instanceof Timestamp` for server-side notification timestamp normalization
  - clearing many notifications by firing one request per notification from the client
  - adding new notification writers that omit `createdAtMs`
- Truth lives in:
  - `src/lib/notification-contracts.ts`
  - `src/lib/server/notification-inbox.ts`
  - `src/app/api/notifications/route.ts`
  - `src/lib/notifications.ts`
  - `src/hooks/useNotifications.ts`
  - `src/lib/route-runtime-health.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Existing historical notifications that lack both a timestamp-like `createdAt` and `createdAtMs` will still show no delivery time; fixing that would require a one-time backfill, not just runtime logic.

### 38. Admin moderation is server-polled API truth, not client Firestore truth

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin moderation rule
- Problem/context: The admin moderation console originally depended on client Firestore subscriptions for chat threads and security alerts. That surfaced permission errors directly in the UI and made “live” moderation depend on browser-side admin Firestore access instead of server-controlled reads.
- Decision made: Make moderation a server-backed admin API surface with automatic polling cadence. Chat threads, thread detail/files, and security alerts should all come from admin routes and report freshness/failure state explicitly in the UI.
- What became canonical:
  - moderation data sources are:
    - `GET /api/admin/moderation/threads`
    - `GET /api/admin/moderation/threads/[threadId]`
    - `GET /api/admin/moderation/security-alerts`
  - the moderation console should report server freshness timestamps and failed state per lane
  - security alerts belong operationally to moderation, not to the admin analytics page
- What is now disallowed or deprecated:
  - direct client Firestore subscriptions as the primary admin moderation source
  - treating analytics as the primary operational home for security alerts
- Truth lives in:
  - `src/lib/admin-moderation.ts`
  - `src/lib/server/admin-moderation.ts`
  - `src/components/Admin/AdminModerationConsole.tsx`
  - `src/app/api/admin/moderation/threads/route.ts`
  - `src/app/api/admin/moderation/threads/[threadId]/route.ts`
  - `src/app/api/admin/moderation/security-alerts/route.ts`
  - `tests/unit/admin-moderation-routes.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Moderation currently uses truthful server polling rather than push subscriptions; if sub-second live moderation becomes necessary, add a dedicated realtime transport instead of returning to browser-side Firestore reads.

### 39. Admin analytics time ranges are module-scoped and user-persisted

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin analytics rule
- Problem/context: The analytics page was originally organized around a global time range, which forced broad payload reloads and made it harder to compare modules independently. That shape also made discrepancy work between auth and onboarding harder to localize.
- Decision made: Move analytics time selection to per-module controls, persist those selections on the admin user record, and let each module refresh independently without a page-level time switch.
- What became canonical:
  - analytics module ranges live under `users/{uid}.adminPreferences.analytics.moduleRanges`
  - each module owns its own range control and displays its own active range
  - the viewer drilldown filter remains the only page-level analytics filter
  - security-specific analytics modules removed from the visible analytics surface stay owned by moderation instead
- What is now disallowed or deprecated:
  - relying on a single page-level time filter as the primary admin analytics control
  - storing analytics module ranges in session storage as the durable source of truth
- Truth lives in:
  - `src/lib/admin-analytics-preferences.ts`
  - `src/lib/server/admin-analytics-preferences.ts`
  - `src/app/api/admin/analytics/preferences/route.ts`
  - `src/app/admin/analytics/page.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: `activeTab` and the viewer drilldown filter still use client storage as convenience UI state; only module time ranges are canonicalized server-side today.

### 40. AI debug assistant settings must control the actual Vertex model invocation

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin AI debug rule
- Problem/context: The debug assistant had been upgraded to expose a configurable model and enablement settings, but the actual Vertex call still used the hardcoded default model and partially depended on env-level disablement.
- Decision made: Treat `adminSettings/debugAssistant` as the primary control plane for enablement and configured model, and pass the resolved runtime model into the live Vertex request.
- What became canonical:
  - assistant settings live in `adminSettings/debugAssistant`
  - disabled state should be explained as an admin-settings decision unless runtime prerequisites are missing
  - the resolved runtime model must be the model passed into Vertex
  - the default model remains `gemini-2.5-flash-lite` unless explicitly changed in settings
- What is now disallowed or deprecated:
  - exposing a configurable model in admin while still calling Vertex with a different hardcoded model
  - treating env-only toggles as the primary operator-visible explanation for assistant disablement
- Truth lives in:
  - `src/lib/ai-debug-assistant.ts`
  - `src/lib/server/ai-debug-assistant.ts`
  - `src/lib/server/admin-debug-settings.ts`
  - `src/app/api/admin/debug/assistant/route.ts`
  - `src/app/admin/debug/page.tsx`
  - `tests/unit/ai-debug-assistant.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Runtime readiness still depends on actual Vertex credentials and project configuration; settings can enable the assistant, but the fallback path remains the truthful result when runtime prerequisites are absent.

### 41. Route runtime health must distinguish unseen, stale, and chat traffic clusters

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin runtime rule
- Problem/context: Route runtime health originally treated missing samples and stale samples too loosely, and chat failures from the native route and the legacy compatibility route were mixed together operationally.
- Decision made: Track freshness explicitly, surface `stale` as a first-class route health state, and classify route keys into `native_chat`, `compatibility_chat`, or `other` for debug/system-log summaries.
- What became canonical:
  - `unseen` means no sample exists yet
  - `stale` means the last sample is older than the runtime freshness window
  - native chat and creator-message compatibility routes should be visible as separate runtime groupings in admin logs/debug
- Truth lives in:
  - `src/lib/route-runtime-health.ts`
  - `src/lib/server/admin-panel-system-logs.ts`
  - `src/app/admin/debug/page.tsx`
  - `tests/unit/route-runtime-health.spec.ts`
  - `tests/unit/admin-panel-system-logs.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Route health still summarizes from cumulative counters rather than windowed per-route time buckets.

### 42. Chat presence is participant-scoped in Realtime Database

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active chat privacy rule
- Problem/context: Chat presence originally lived under a thread-only RTDB path and allowed any authenticated user to read presence state, which was broader than the actual chat participant boundary.
- Decision made: Scope presence reads and writes to `chat_presence/{creatorId}/{userId}/{uid}` and allow access only to the two thread participants, with writers restricted to their own member node.
- What became canonical:
  - presence pathing derives from the canonical creator-thread id
  - only the creator or user for that thread can read presence
  - only the authenticated participant matching `$uid` can write their own presence node
- Truth lives in:
  - `src/lib/chat.ts`
  - `database.rules.json`
  - `tests/firebase/database.rules.spec.ts`
  - `scripts/run-database-rules-tests.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Presence rules do not yet cover richer payload validation beyond the current typing/activity/display fields.

### 43. Generated verification artifacts are continuity failures, not optional cleanup

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active repo hygiene rule
- Problem/context: Broad UI and emulator verification passes kept leaving local artifacts like `playwright-report/`, `test-results/`, and emulator debug logs behind, which made later audits ambiguous and let dirty-tree noise masquerade as code changes.
- Decision made: Add an explicit generated-artifact check and make it part of continuity so broad sign-off fails until those files are removed.
- What became canonical:
  - `check:generated-artifacts` must pass before broad work is signed off
  - continuity includes generated-artifact cleanup verification
  - tracked artifact set currently includes UI audit output, build logs, and Firebase emulator debug logs
- Truth lives in:
  - `scripts/check-generated-artifacts.ts`
  - `package.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: This check only covers known generated artifacts; add to the list if other recurring outputs start polluting the tree.

### 44. Admin debug preferences are persisted per admin user

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin runtime rule
- Problem/context: Admin debug state such as active tab and route-runtime filtering was local-only, which made the debug surface inconsistent across reloads and weakened operator continuity during incident work.
- Decision made: Persist debug preferences under `users/{uid}.adminPreferences.debug` and load/save them through dedicated admin APIs.
- What became canonical:
  - debug tab state is not session-only
  - route-runtime filter state is not session-only
  - debug preference persistence is user-scoped, not global admin config
- Truth lives in:
  - `src/lib/admin-debug-preferences.ts`
  - `src/lib/server/admin-debug-preferences.ts`
  - `src/app/api/admin/debug/preferences/route.ts`
  - `src/app/admin/debug/page.tsx`
  - `tests/unit/admin-debug-preferences-route.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Additional debug display preferences can be folded into the same subtree once they stop being purely cosmetic.

### 45. Chat attachments are server-issued and server-finalized

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active chat runtime rule
- Problem/context: Client-only attachment path generation and storage URL resolution made chat media tracking weaker and left room for path drift or untracked upload failures.
- Decision made: Move attachment preparation and completion into explicit server routes so storage paths, thread ownership, and final asset URLs are validated server-side.
- What became canonical:
  - clients request an upload target from the server before uploading
  - clients finalize uploads through the server after bytes land in storage
  - runtime health covers both prepare and complete attachment routes
- Truth lives in:
  - `src/app/api/chat/attachments/prepare/route.ts`
  - `src/app/api/chat/attachments/complete/route.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/lib/route-runtime-health.ts`
  - `tests/unit/chat-attachments-route.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: Attachment lifecycle still uses request/response polling rather than resumable-progress observability.

### 46. Legacy creator-message compatibility is explicit and time-bounded

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active migration rule
- Problem/context: The compatibility creator-message route was still operationally necessary, but there was no first-class runtime signal telling operators or clients that it was legacy traffic on a removal path.
- Decision made: Add explicit compatibility headers and a canonical removal target so the route advertises its migration state in-band.
- What became canonical:
  - legacy creator-message responses carry compatibility headers
  - removal timing is tracked in code, not only in chat history
  - native chat and compatibility chat should stay operationally separable in runtime health
- Truth lives in:
  - `src/lib/creator-message-compatibility.ts`
  - `src/app/api/creator/messages/route.ts`
  - `src/app/admin/debug/page.tsx`
  - `src/lib/server/admin-panel-system-logs.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: The route still exists; the next real milestone is a hard kill-switch once remaining callers are gone.

### 47. Admin analytics extraction now follows a module-plus-primitives pattern

- Approximate date: Canonicalized and recorded on 2026-04-09
- Status: Active admin analytics rule
- Problem/context: The admin analytics page had grown into a state-dense monolith where data-truth logic and chart rendering were too entangled to audit safely.
- Decision made: Continue extracting high-risk sections into dedicated module components backed by shared analytics primitives and pure view-model helpers.
- What became canonical:
  - onboarding/auth discrepancy rendering lives in a dedicated module component
  - task and notification sections live in a dedicated module component
  - shared analytics card/tooltip primitives live outside the page
- Truth lives in:
  - `src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx`
  - `src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx`
  - `src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `tests/unit/admin-auth-outcome-chart.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: More analytics sections still need the same extraction treatment before the page stops being a high-risk shared surface.

### 48. Date of birth cannot be removed through profile updates

- Approximate date: Canonicalized and recorded on 2026-04-10 while resolving PR #167
- Status: Active privacy/compliance rule
- Problem/context: The profile update API allowed `dateOfBirth` to be removed after registration by sending `null` or an empty string, which weakened the enforced 18+ platform gate after signup.
- Decision made: Treat DOB as a non-removable compliance field once the account exists; profile updates may correct it to another valid adult DOB, but may not clear it.
- What became canonical:
  - `PUT /api/user/profile` must reject `dateOfBirth: null`
  - `PUT /api/user/profile` must reject `dateOfBirth: ""`
  - valid adult DOB replacements remain allowed
- Truth lives in:
  - `src/app/api/user/profile/route.ts`
  - `src/lib/user-profile-validation.ts`
  - `tests/unit/user-profile-route.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: If support/admin ever need DOB remediation flows, those should exist as explicit elevated routes rather than reopening self-service deletion.

### 49. Admin AI cover generation now runs on a prompt-policy and reference-library model

- Approximate date: Canonicalized and recorded on 2026-04-10
- Status: Active admin AI runtime rule
- Problem/context: The original AI cover flow treated one template image as the main guidance source, capped references too low for Gemini 3 Pro Preview, and left prompt learning mostly implicit in job history. That made outputs too reference-subject-bound and kept the admin page too sparse to operate the system honestly.
- Decision made: move AI cover generation to a model-aware reference library plus prompt-policy system, with Gemini 3 Pro Preview allowed up to 14 references, editable locked/mutable prompt clauses, optimizer state, and visible rejected output review.
- What became canonical:
  - `gemini-3-pro-image-preview` supports up to `14` reference inputs
  - titles are interpreted as `Creator | Flavor` when possible
  - prompt construction separates stable style lock from mutable subject/palette lock
  - anti-anchoring clauses explicitly block copying the reference subject when the requested flavor differs
  - only liked/accepted or manually promoted assets are reusable by default
  - prompt policy, optimizer output, prompt history, and review-gallery state live outside transient job history
- Truth lives in:
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/api/admin/ai/drop-covers/references/route.ts`
  - `src/app/api/admin/ai/drop-covers/prompt-policy/route.ts`
  - `src/app/api/admin/ai/drop-covers/review-gallery/route.ts`
  - `src/app/admin/ai/page.tsx`
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-ops-routes.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: reference ranking is still previewed generically from the current library/pool, not yet simulated for a specific future `Creator | Flavor` request.

### 50. Admin UI module collapse state is persisted per admin user

- Approximate date: Canonicalized and recorded on 2026-04-10
- Status: Active admin operations rule
- Problem/context: Dense admin pages need collapsible modules to avoid vertical sprawl, but collapse state was otherwise lost on reload and operators had to repeatedly rebuild their working layout.
- Decision made: store collapsed-module state under `users/{uid}.adminPreferences.ui.collapsedModules` and expose it through dedicated admin UI preference APIs.
- What became canonical:
  - module-collapse state is not session-only
  - collapse state is user-scoped, not global admin config
  - `/admin/ai` is the first page using this preference path directly
- Truth lives in:
  - `src/lib/server/admin-ui-preferences.ts`
  - `src/app/api/admin/ui/preferences/route.ts`
  - `src/app/admin/ai/page.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: the remaining admin pages still need to adopt the same preference model instead of local-only section state.

### 51. Non-home, non-policy user surfaces should keep helper copy to one sentence by default

- Approximate date: Canonicalized and recorded on 2026-04-11
- Status: Active user-surface density rule
- Problem/context: Creator onboarding, support, and dashboard helper surfaces had grown vertically because module and hero copy was explaining workflows in multiple sentences instead of keeping the UI operational and scannable.
- Decision made: outside the home page and policy pages, user-facing modules and hero helpers should default to one sentence unless the text is itself the product content.
- What became canonical:
  - creator apply and waitlist helpers stay concise and action-first
  - support inbox hero, empty states, and thread-detail helpers stay compact
  - dashboard helper modules like daily tasks, creator workspace, and profile settings prefer one-sentence descriptions
  - copy reductions should be paired with modest spacing reductions when the height win is material on mobile
- Truth lives in:
  - `src/app/creators/apply/page.tsx`
  - `src/app/creators/waitlist/page.tsx`
  - `src/components/Support/SupportInbox.tsx`
  - `src/components/Creators/CreatorExperiencesPanel.tsx`
  - `src/components/Dashboard/DailyTasksModule.tsx`
  - `src/components/Dashboard/CreatorWorkspacePanel.tsx`
  - `src/app/dashboard/profile/page.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- Follow-up gaps: `src/app/creators/[username]/CreatorProfileClient.tsx` and some secondary dashboard surfaces can still be tightened further if product copy keeps expanding.

### 52. Text AI surfaces use a shared model registry and stable aliases where Google documents them

- Approximate date: Canonicalized and recorded on 2026-04-11
- Status: Active AI runtime rule
- Problem/context: text and image AI surfaces were carrying model aliases independently, which made stable-alias upgrades, pricing provenance, and runtime-truth display drift-prone.
- Decision made: centralize AI model metadata in one registry, use stable aliases for Flash-Lite text surfaces where Google documents them, and keep explicit preview ids only where the provider still exposes preview ids as the canonical path.
- What became canonical:
  - `gemini-2.5-flash-lite` is the default stable alias for:
    - admin debug assistant
    - drop description generation
    - drop description optimization
    - drop cover prompt optimization
  - preview image models remain explicit when preview ids are the documented source of truth
  - AI runtime truth should distinguish:
    - configured alias
    - provider-resolved runtime model version when available
    - runtime version not exposed when Vertex does not return one
- Truth lives in:
  - `src/lib/admin-ai-models.ts`
  - `src/lib/ai-debug-assistant.ts`
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/ai-drop-descriptions.ts`
  - `tests/unit/admin-ai-models.spec.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- What is now disallowed or deprecated: hardcoding Flash-Lite model aliases independently across AI surfaces when the shared registry can provide the alias, pricing basis, and capability metadata.

### 53. Create Drop AI history clearing is modal-local while canonical AI history stays in Admin AI

- Approximate date: Canonicalized and recorded on 2026-04-11
- Status: Active AI UX/data rule
- Problem/context: repeated in-form AI generations were cluttering the Create Drop workflow, but deleting server-side AI history would remove the operational learning trail needed in the Admin AI console.
- Decision made: Create Drop can clear AI history only for the current modal session; canonical AI generation history remains stored server-side for admin operations, auditability, and prompt learning.
- What became canonical:
  - description generation in Create Drop uses one compact action plus local session history
  - cover generation in Create Drop keeps local session history and supports local clear-history without deleting server records
  - accepted description jobs can be linked to the final saved drop after Create Drop succeeds
  - Admin AI remains the canonical place for prompt policy, full history, review gallery, and runtime truth
- Truth lives in:
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/components/Admin/AiDropDescriptionGeneratorPanel.tsx`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `src/components/Admin/AdminAiDescriptionOperations.tsx`
  - `src/lib/server/ai-drop-descriptions.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- What is now disallowed or deprecated: treating modal history clear as a server-side delete of canonical AI jobs, or forcing paragraph-length helper copy into the Create Drop AI controls.

### 54. Dependency security hardening prefers targeted overrides over risky major toolchain jumps

- Approximate date: Canonicalized and recorded on 2026-04-11
- Status: Active repo maintenance rule
- Problem/context: After the AI description rollout, the repo still had transitive audit issues and local install instability. Some were safely patchable with targeted overrides, while others required major toolchain upgrades that would change behavior or raise migration risk.
- Decision made: prefer safe direct updates plus version-targeted transitive overrides for security and stability fixes, and leave risky major upgrades as explicit reported holds until they can be migrated deliberately.
- What became canonical:
  - safe patch/minor dependency upgrades should be applied freely when verification stays green
  - transitive security fixes may use package-manager overrides when the target version is a compatible patch/minor within the existing dependency contract
  - risky major upgrades should stay reported in the audit instead of being forced to chase warnings during a stability pass
  - root and functions workspaces both need explicit audit coverage because they carry separate lockfiles and dependency trees
- Truth lives in:
  - `package.json`
  - `package-lock.json`
  - `pnpm-lock.yaml`
  - `functions/package.json`
  - `functions/package-lock.json`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- What is now disallowed or deprecated: forcing major toolchain upgrades just to clear warnings when the repo can instead be kept secure and stable through verified patch/minor upgrades and targeted overrides.

### 55. Chat realtime recovery must preserve the active surface and rate-limit repeated diagnostics

- Approximate date: Canonicalized and recorded on 2026-04-11
- Status: Active chat runtime rule
- Problem/context: chat listener recovery was mutating the route even when already in sync, background refreshes were blanking the active thread while polling fallback ran, and repeated Firestore listener failures could spam diagnostics before retry.
- Decision made: chat realtime recovery must be route-stable, background-safe, and failure-cooled. Failed listeners are torn down immediately, retries are scheduled with backoff, fallback polling preserves the active thread UI, and repeated identical chat realtime failures are rate-limited in client diagnostics.
- What became canonical:
  - selected-thread URL syncing only runs when the current URL is actually out of sync
  - fallback refreshes use background loads that do not clear the active thread detail or show repeated toast noise
  - fallback refreshes are scope-aware instead of always reloading both thread list and thread detail
  - failed Firestore listeners are explicitly unsubscribed before retry to avoid repeated error callbacks from a broken listener instance
  - repeated identical chat realtime failures are cooled down before being reported again
  - compose-from-followed-creators clears the current selected thread first so seeding the new thread stays deterministic
- Truth lives in:
  - `src/components/Chat/ChatExperience.tsx`
  - `src/hooks/useChatUnreadStatus.ts`
  - `src/lib/chat-realtime.ts`
  - `tests/unit/chat-realtime.spec.ts`
  - `tests/unit/use-chat-unread-status.spec.tsx`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- What is now disallowed or deprecated: background chat recovery that blanks the active thread every poll cycle, route self-replace loops for already-synced thread URLs, or repeated identical realtime diagnostics without cooldown.

### 56. Chat should prefer fewer Firestore listeners plus transport auto-detection over eager degraded warnings

- Approximate date: Canonicalized and recorded on 2026-04-11
- Status: Active chat/firestore runtime rule
- Problem/context: chat still showed `Realtime chat degraded` too often because one redundant selected-thread Firestore listener could fail independently of the main thread-list listener, and the UI surfaced degraded state on the first transient listener failure even when the next retry often recovered. Firestore was also using default transport setup instead of the documented auto-detect long-polling option.
- Decision made: initialize Firestore with transport auto-detection, keep the chat listener graph minimal, and only surface degraded-chat UI after a realtime scope fails past the first retry window.
- What became canonical:
  - Firestore initializes through `initializeFirestore(...)` with `experimentalAutoDetectLongPolling: true`
  - chat uses the live thread-list listener plus the live message listener; selected-thread metadata is synchronized from those sources instead of opening a redundant extra thread-doc listener
  - the user-facing degraded banner is for persistent listener failure, not the first transient blip
  - fallback polling remains truthful and active only when the issue persists
- Truth lives in:
  - `src/lib/firebase-data.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/hooks/useChatUnreadStatus.ts`
  - `src/lib/chat-realtime.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- What is now disallowed or deprecated: default Firestore transport initialization for this app’s chat runtime, redundant selected-thread Firestore listeners, or immediate degraded-chat banners for first-attempt listener hiccups.
### 57. Guest/public admin analytics must distinguish exact guest telemetry from estimated public traffic

- Approximate date: Canonicalized and recorded on 2026-04-21
- Status: Active admin analytics truth rule
- Problem/context: anonymous first-party telemetry is optional and off until a guest consents, but the admin dashboard was still reading `analytics_guest_batches` as if it represented all public traffic. That produced false `0 guest` states whenever consented guest batches were absent even though GA still showed live site traffic.
- Decision made: keep consented guest telemetry exact, but add an explicit estimated public-traffic lane for admin truth by comparing whole-site GA totals against identified first-party traffic. Never convert that estimate into fake exact guest quality metrics.
- What became canonical:
  - guest/public traffic volume can be `exact`, `estimated`, or `unknown`
  - `estimated` guest/public volume is sourced from `ga_total_minus_identified_first_party`
  - guest/public bounce and engagement quality stay unknown when anonymous semantic batches are absent
  - admin analytics issues must say when guest/public counts are estimated because the anonymous first-party lane did not land
- Truth lives in:
  - `src/lib/server/admin-analytics-historical-traffic.ts`
  - `src/app/api/admin/analytics/historical/route.ts`
  - `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx`
  - `src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx`
  - `src/types/admin-analytics.ts`
  - `FULL_SCALE_CODEBASE_AUDIT.md`
- What is now disallowed or deprecated: treating empty `analytics_guest_batches` as proof of zero public traffic, or showing guest/public bounce and engagement as `0` when the anonymous quality lane is unavailable.
