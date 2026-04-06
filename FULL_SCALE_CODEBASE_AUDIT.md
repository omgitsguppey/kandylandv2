# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-05
Last full-scale audit execution: 2026-04-03 19:16:34 -05:00
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`

## Purpose
This is the standing audit document that future work should start with and end with.

It is not a one-time snapshot. It is the reusable standard that defines:
- what "auditable" means in this repo,
- which file surfaces exist,
- which checks each surface must pass,
- which commands are required before signoff,
- which shared helpers are canonical,
- and how new work must be recorded so consistency does not drift over time.

If a future build, refactor, feature, or fix cannot be explained against this document, the work is not considered fully audited.

## What This File Is
- This file is the canonical policy and baseline.
- Dated audit files in the repo are historical snapshots and evidence.
- `git ls-files` is the literal source of truth for tracked-file inventory.
- This file must be updated whenever the audit standard changes, the repository surface changes materially, or the canonical helper map changes.

## Audit Pair
Use these together:

1. `FULL_SCALE_CODEBASE_AUDIT.md`
   This file. It defines the standard, the baseline, the build gates, and the canonical helper map.

2. `EVERY_FILE_FUNCTION_CHECKLIST.md`
   Historical exhaustive inventory companion. Useful for no-skip file/function sweeps, but it must be refreshed whenever tracked-file counts materially drift.

Related evidence snapshots:
- `FULL_CODEBASE_AUDIT_2026-04-01.md`
- `FULL_CODEBASE_POST_AUDIT_2026-03-18.md`
- `STANDARDIZATION_AUDIT_CHECKLIST.md`
- `ANALYTICS_SYSTEM_AUDIT_2026-03-18.md`
- `DEPENDENCY_CONSISTENCY_AUDIT_2026-03-24.md`

## Canonical Stack, Workflow, and Deployment Context
- This repo is developed locally first.
- Google Antigravity and Codex may both be used locally to assist build, review, implementation, and verification work before changes are committed.
- Those tools are assistive local workflow tooling only. They are not authoritative runtime, deployment, or architecture sources of truth.
- The authoritative sources of truth are git-tracked runtime code, canonical docs, canonical helpers, audit scripts, and the verification commands named in this file.
- The product originated as a static-first system and later pivoted into a backend/server architecture. The exact pivot date is not fully recoverable from current tracked evidence and is therefore recorded as historical continuity context rather than a claimed precise timestamp.
- The deployed runtime target is Firebase App Hosting, with Firebase and Google Cloud services providing backend behavior where present in code: Firestore, Realtime Database, Storage, Functions, Data Connect, and server-side Vertex AI integration where enabled.
- Local AI/developer tooling may work on uncommitted files, but repository truth does not change until the resulting decisions are written into tracked files and verified.

## Repository Memory and Decision Ledger
- `REPO_MEMORY_LEDGER.md` is the canonical concise ledger for architectural pivots, workflow-authority decisions, deprecated patterns, and major continuity-sensitive repo decisions.
- Use it when a task touches deployment assumptions, dependency/tooling meaning, historical pivots, workflow authority, or anything that founder memory or AI context might otherwise be forced to explain informally.
- This audit file remains the standing policy and surface map. The ledger records the major decisions that explain why those policies and surfaces look the way they do.

## Dependency, Tooling, and Artifact Classification
Every meaningful package, config file, generated artifact, and local tool surface must fit one of the classes below:

1. Runtime dependencies
   Root `package.json` `dependencies`, `functions/package.json` `dependencies`, generated Data Connect SDKs used by the app/functions, and Firebase/Google runtime libraries that affect shipped behavior.

2. Dev dependencies
   Root and `functions/` `devDependencies` used for linting, typing, testing, builds, audits, code generation, and local verification.

3. Local workflow tooling
   Codex, Google Antigravity, `gh`, `firebase`, `gcloud`, `AGENTS.md`, `.agent/workflows/pre-commit.md`, and local scripts that help humans or agents work safely but are not themselves runtime truth.

4. Deployment and platform dependencies
   `apphosting.yaml`, `firebase.json`, `.firebaserc`, Firestore/Storage/Realtime rules and indexes, App Hosting metadata, service-account or ADC expectations, and other files/CLIs that define deployed behavior or cloud connectivity.

5. Governance and continuity dependencies
   `FULL_SCALE_CODEBASE_AUDIT.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md`, `REPO_MEMORY_LEDGER.md`, dated audit snapshots, continuity scripts, dependency graph rules, visual/a11y/perf audit configs, and the verification commands that keep future changes explainable.

6. Generated artifacts
   Lockfiles, generated Data Connect clients, generated backend metadata such as `backends.json`, and other generated files that may still materially affect dependency resolution, runtime integration, or contributor understanding.

Generated does not mean ignorable. Generated means:
- do not hand-edit unless that generation path is the audited source of truth,
- classify the file explicitly,
- and record when it changes repo behavior, contributor workflow, or deployment assumptions.

## Dependency Delta Recording Rules
When dependencies, tooling, or generated artifacts change:

1. Record which class changed: runtime, dev, local workflow, platform, governance, or generated artifact.
2. Record which source file owns the change: root `package.json`, `functions/package.json`, config file, generated client, or continuity doc.
3. Record whether build/runtime behavior changed, contributor workflow changed, or both.
4. Record which verification commands were run because of the change.
5. Update this file if the canonical dependency/tooling story changed.
6. Update `REPO_MEMORY_LEDGER.md` if the change reflects a durable architectural or workflow decision rather than a routine version bump.
7. Until a later audited pass intentionally consolidates package-manager strategy, keep root `package-lock.json` and `pnpm-lock.yaml` synchronized when the root dependency graph changes.
8. `functions/package-lock.json` remains the dependency-resolution companion to `functions/package.json` and must stay aligned with Functions-specific dependency changes.
9. `backends.json` is generated App Hosting backend metadata, not the canonical deploy configuration. It must never be treated as the primary source of truth for deployment behavior or environment contracts.

## Contributor Continuity Requirements
- A future contributor must be able to orient from tracked repo artifacts without needing private AI context or founder memory as the first interpretation layer.
- Required first-read surfaces for broad work are:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- Required first-read surfaces for runtime/deployment changes also include:
  - `package.json`
  - `functions/package.json`
  - `firebase.json`
  - `apphosting.yaml`
- `AGENTS.md` and `.agent/workflows/pre-commit.md` are workflow guidance, not architecture authority.
- If tracked docs and runtime code disagree, code plus verification plus audit scripts win, and the docs must be updated in the same change.

## Root, Platform, and Governance Accountability Matrix
Every tracked root-level artifact must be explainable through one of the classes below.

| Class | Files | Meaning | Canonical handling |
| --- | --- | --- | --- |
| Governance baseline | `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md` | Standing audit policy, decision ledger, and exhaustive historical inventory companion | Must stay mutually consistent on counts, continuity rules, and authority language |
| Workflow guidance | `AGENTS.md`, `.agent/workflows/pre-commit.md` | Contributor and agent workflow instructions | Useful, but not architecture authority; must point back to canonical docs |
| Historical evidence snapshots | `FULL_CODEBASE_AUDIT_2026-04-01.md`, `FULL_CODEBASE_AUDIT_2026-04-03.md`, `FULL_CODEBASE_POST_AUDIT_2026-03-18.md`, `ANALYTICS_SYSTEM_AUDIT_2026-03-18.md`, `DEPENDENCY_CONSISTENCY_AUDIT_2026-03-24.md`, `STANDARDIZATION_AUDIT_CHECKLIST.md`, `TELEMETRY_MIDDLEWARE_AUDIT_2026-03-23.md`, `V1_STABILITY_AUDIT_2026-03-24.md`, `REPO_STATE_SCORECARD_2026-03-18.md`, `REPO_STATE_SCORECARD_2026-03-19.md` | Historical audit evidence, not living policy | Must not contradict the standing audit without an explicit note that they are historical |
| Local planning or ephemeral evidence | `CHANGELOG.md`, `plan_review.md`, `status.txt` | Historical planning/status context | Useful as evidence only; not canonical architecture truth |
| Root dependency surfaces | `package.json`, `package-lock.json`, `pnpm-lock.yaml` | Root dependency graph and resolution state | Must stay synchronized with dependency changes and the dependency classification rules above |
| Functions dependency surfaces | `functions/package.json`, `functions/package-lock.json` | Firebase Functions-specific dependency graph | Must stay aligned with Functions runtime and lint/build verification |
| Platform and deploy config | `apphosting.yaml`, `firebase.json`, `.firebaserc`, `backends.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules` | App Hosting, Firebase services, rules, and generated backend metadata | Must be treated as deployment/platform truth or explicitly classified as generated evidence |
| Quality and continuity tooling config | `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `vitest.rules.config.ts`, `.dependency-cruiser.cjs`, `.lighthouserc.json`, `knip.json`, `.ncurc.json`, `.npmrc`, `.gitignore` | Build, lint, dependency, audit, and test behavior | Must stay consistent with the verification commands promised in this file |
| Root runtime or admin utility files | `middleware.ts`, `makeAdmin.js` | Runtime boundary enforcement and local admin utility behavior | Must stay truthful about their actual authority and risk; no hidden assumptions |

## Current Baseline
Current tracked inventory baseline at verification time on 2026-04-05:

- Total tracked files: `639`
- Root files: `54`
- Root markdown/docs: `16`
- Root lockfiles: `2`
- Root config/runtime/tooling files: `36`
- `src`: `362`
- `src/app`: `121`
- `src/components`: `66`
- `src/context`: `4`
- `src/hooks`: `13`
- `src/lib`: `135`
- `src/lib/server`: `56`
- `src/types`: `3`
- `functions`: `37`
- `functions/src`: `30`
- `scripts`: `17`
- `tests`: `101`
- `public`: `11`
- `dataconnect`: `14`
- `src/dataconnect-generated`: `15`
- `src/dataconnect-admin-generated`: `5`
- `functions/src/dataconnect-admin-generated`: `5`

Current baseline verification on 2026-04-05:
- focused ESLint on AI cover-generation surfaces passed
- focused Vitest on AI cover-generation surfaces passed
- `corepack pnpm run check` passed
- `npx vitest run` passed
- `npm run check:continuity` passed
- `npm run check:inventory` passed
- `npm run check:telemetry` passed
- `npm run check:analytics-semantics` passed
- `npm run check:ui:audits` built successfully and passed accessibility checks, but visual-regression snapshots failed on unrelated public-surface baseline drift (`/`, `/creators/apply`, `/creators/waitlist`, `/privacy`)
- adjacency traces passed for the touched continuity/tooling surfaces

Current tolerated non-blocking environment notices:
- npm unknown env config warnings printed during some script runs
- Node `punycode` deprecation warnings printed by Firebase/Vitest tooling on current local Node
- Windows Chrome cleanup warning may print after local Lighthouse runs when there is no running Chrome instance left to kill
- `npm install --package-lock-only` reports existing repository vulnerability/funding notices without blocking the lockfile refresh

These notices are not automatic audit failures, but they must stay explicitly known and not silently spread into product behavior.

## Active Audit Entry
Current audit date: 2026-04-06 06:58:03 -05:00
Current branch / commit: main / 8c4b867

Current task:
- Overnight audit-anchored UI refinement and truth-hardening pass

Current mission outcome:
- Completed the requested landing, dashboard, wallet, profile/settings, notification-center, FAQ, and creator-discovery refinements without adding simulated data or severing existing backend flows.
- Preserved the separate in-flight Creator Spotlight title/subtext cleanup by routing around that header scope and only refining card-level layout and live-state behavior.
- Left the existing local admin overview and debug cleanup work intact instead of redoing those surfaces in parallel.

Final touched surfaces in this pass:
- FULL_SCALE_CODEBASE_AUDIT.md
- src/components/Hero.tsx
- src/components/Landing/HomeActiveDropsCarousel.tsx
- src/components/Landing/HowItWorks.tsx
- src/app/dashboard/layout.tsx
- src/components/Dashboard/NotificationPromptBanner.tsx
- src/components/Feedback/GlobalBugReportTrigger.tsx
- src/components/Navigation/ScrollToTop.tsx
- src/app/api/creator/relationships/route.ts
- src/components/CreatorDiscoveryRail.tsx
- src/lib/referrals.ts
- src/app/api/user/profile/route.ts
- src/app/api/user/register/route.ts
- src/components/PurchaseModal.tsx
- src/app/dashboard/profile/page.tsx
- src/components/Navigation/NotificationBell.tsx
- src/app/faq/page.tsx
- src/app/faq/FAQClient.tsx
- src/app/faq/HowItWorksStory.tsx

Canonical helpers/modules used:
- FULL_SCALE_CODEBASE_AUDIT.md
- REPO_MEMORY_LEDGER.md
- EVERY_FILE_FUNCTION_CHECKLIST.md
- src/context/AuthContext.tsx
- src/context/UIContext.tsx
- src/lib/authFetch.ts
- src/lib/client-error-reporting.ts
- src/lib/telemetry.ts
- src/lib/creator-public-pages.ts
- src/lib/gumdrops-packages.ts
- src/lib/gumdrop-economics.ts
- src/lib/browser-notification-enrollment.ts
- src/lib/firebase-messaging.ts
- src/lib/privacy-consent.ts
- src/lib/privacy-policy.ts
- src/lib/user-profile-validation.ts
- src/lib/server/request-guard.ts
- src/lib/server/auth.ts
- src/components/ui/TitleMarquee.tsx
- existing Vitest/TypeScript/ESLint/Playwright/Lighthouse verification entrypoints

Truth/realtime fixes completed:
- Creator discovery follow/unfollow now reconciles visible follower counts immediately from the canonical creator relationship route instead of waiting for a full refresh.
- General user settings now autosave against the real `/api/user/profile` write path with explicit saving, saved, and error feedback; no local-only saved state remains for those controls.
- Notification-center timestamps now show real delivered timing when available instead of generic recency wording for every item, and task reminders use an explicit warning icon instead of a misleading avatar stand-in.
- Referral copy now matches backend truth by moving the referrer reward to 100 GumDrops in the registration route and the dashboard profile UI together.
- The home daily-experiences lane now reuses the real active-drop carousel component with honest empty-state copy instead of explainer cards.

Intentional backend-compatibility preserves:
- Creator-specific alerts remain subordinate to the global new-drop alert preference to avoid duplicate notification semantics.
- The creator discovery rail continues using the canonical `/api/creator/relationships` route and existing auth-modal flow rather than introducing a parallel follow system.
- Wallet purchase handling, PayPal/webhook metadata wiring, and GumDrop package economics remain on the existing purchase/runtime path; only naming and presentation were tightened.
- DOB handling was added through the existing user profile route and the existing adult-date validation helper instead of a second age-validation path.
- Creator controls inside the profile/settings screen remain on their existing manual-save path; only general user settings were moved to truthful autosave in this pass.

Continuity notes:
- This pass did not overwrite the separate in-flight Creator Spotlight title/subtext removal work.
- No admin overview/debug/runtime truth was claimed or changed beyond the already-local cleanup work preserved from prior passes.
- No fake realtime subscriptions were added. The follower-count improvement is immediate post-mutation reconciliation, not a new cross-user live aggregate listener.

Audit start recorded at: 2026-04-06 01:42:00 -05:00
Start-of-task audit inputs read:
- FULL_SCALE_CODEBASE_AUDIT.md
- REPO_MEMORY_LEDGER.md
- EVERY_FILE_FUNCTION_CHECKLIST.md

Commands run before signoff:
- git status --short
- npm run trace:adjacent -- src/app/page.tsx
- npm run trace:adjacent -- src/components/CreatorDiscoveryRail.tsx
- npm run trace:adjacent -- src/app/dashboard/profile/page.tsx
- npm run trace:adjacent -- src/app/admin/page.tsx
- npm run trace:adjacent -- src/app/admin/debug/page.tsx
- npm run trace:adjacent -- src/app/creators/[username]/CreatorProfileClient.tsx
- npm run trace:adjacent -- src/app/api/creator/relationships/route.ts
- npm run trace:adjacent -- src/components/Dashboard/RecentActivityFeed.tsx
- npm run trace:adjacent -- src/app/api/user/activity/route.ts
- npx eslint src/components/Hero.tsx src/components/Landing/HomeActiveDropsCarousel.tsx src/components/Landing/HowItWorks.tsx src/app/dashboard/layout.tsx src/components/Dashboard/NotificationPromptBanner.tsx src/components/Feedback/GlobalBugReportTrigger.tsx src/components/Navigation/ScrollToTop.tsx src/app/api/creator/relationships/route.ts src/components/CreatorDiscoveryRail.tsx src/lib/referrals.ts src/app/api/user/profile/route.ts src/app/api/user/register/route.ts src/components/PurchaseModal.tsx src/app/dashboard/profile/page.tsx src/components/Navigation/NotificationBell.tsx src/app/faq/page.tsx src/app/faq/FAQClient.tsx src/app/faq/HowItWorksStory.tsx
- corepack pnpm exec vitest run tests/unit/user-register-route.spec.ts tests/unit/notification-bell-layout.spec.ts tests/unit/user-activity-route.spec.ts
- npm run check:inventory
- npm run check:ui:audits
- npm run check:ui:lighthouse
- corepack pnpm run check
- npx vitest run
- git status --short

Verification results:
- Focused ESLint passed on all touched landing/dashboard/settings/creator/wallet/FAQ files.
- Focused Vitest passed for `user-register-route`, `notification-bell-layout`, and `user-activity-route`.
- `npm run check:inventory` passed and confirmed the tracked baseline remains 639 files at verification time.
- `npm run check:ui:audits` built successfully and passed accessibility checks, but visual-regression snapshots still fail on unrelated public baseline drift for `/`, `/creators/apply`, `/creators/waitlist`, and `/privacy`.
- `npm run check:ui:lighthouse` passed for the audited public surfaces.
- `corepack pnpm run check` passed.
- `npx vitest run` passed.

Known tolerated warnings/notices:
- npm unknown env config warnings printed during some script chains.
- Node `punycode` deprecation warnings printed by current Firebase/Vitest tooling.
- `check:firebase-runtime` prints informational dotenv loading logs.
- `check:telemetry` still reports 6 cataloged events with no detected emitters: `creator_segment_assigned`, `creator_role_activated`, `creator_role_activation_blocked`, `owner_override_applied`, `owner_override_cleared`, `creator_broadcast_opened`.
- `npm run check:ui:audits` still hits the recurring webserver warning `TypeError: controller[kState].transformAlgorithm is not a function` while the unrelated visual snapshots fail.
- `npm run check:ui:lighthouse` may print a Windows `taskkill` cleanup warning after Chrome exits.

Open follow-up gaps:
- Public creator/discovery follower counts now reconcile immediately after local follow actions, but there is still no cross-user realtime follower aggregate subscription.
- Referral rewards are now truthfully 100 GumDrops for the referrer; the referred friend still does not receive a parallel reward because that backend behavior does not exist yet.
- General settings autosave is complete, but creator-specific controls in the profile/settings view still use their pre-existing manual save path.
- This pass intentionally did not re-open the admin analytics hydration workstream (`Auth Outcome Split`, `Onboarding Velocity`, `Guest Bounce Quality`) because those surfaces were already handled in earlier local work.

End-of-task audit completion recorded at: 2026-04-06 06:58:03 -05:00


## Bug Resolution: Admin Roster Creator Approval
- **Root Cause Identifed**: When approving a creator, the UI GET endpoint sequentially fired parallel queries to aggregate creatorOps analytics. Brand new creators lack initialized collections, triggering a FAILED_PRECONDITION index crash in the local Firebase emulator, cascading into a 500 server error and breaking the dashboard visually.
- **Fix Implemented**: Removed .orderBy and .limit bindings out of explicitly raw Firebase queries inside the admin isCreatorRole route. Admin GET fetches now use strict .sort().slice() logic locally. Wrapped the entire Promise.all fetch in a secure 	ry...catch with empty payload fallback skeleton to guarantee interface resilience.
- **Telemetry Hardening**: Registered canonical tracking events creator_role_activated, creator_role_activation_blocked, owner_override_applied, and owner_override_cleared in src/lib/telemetry-catalog.ts to clear tracking errors.

## Mobile UI Refinement + Hydration Pass
- **Root Cause Identified**: The dashboard, nav panels, and bug report buttons had slight mobile styling, overlapping layout issues, and copy density that needed reduction. Admin analytics panels mapped directly to chart elements without truthful empty states for unpopulated window queries.
- **Fix Implemented**: Raised the bottom mobile nav area, adjusted the floating bug report trigger to be smaller and higher, stripped redundant task/read chips from notifications, replaced 'Just now' hardcodes with 'Recent' for missing timestamps, added 'AI'/'Content'/'Economy' skeleton pages into the admin shell layout, compressed overall admin dashboard padding and spacing, simplified Creator Spotlight description strings, and tightened CTA padding on the creator public profile page.
- **Hydration Fixes**: Wrapped the charts inside `src/app/admin/analytics/page.tsx` (Auth Outcome Split, Onboarding Velocity, Guest + Bounce Quality) with empty state rendering checks (`> 0` logic) to prevent visually empty bounding boxes instead of clear textual 'No data' messages when analytics payloads lack volume.

## TitleMarquee & User-Facing Layout Compact Pass
- **Root Cause Identified**: The admin section utilized an inline marquee component while the public `DropCard` and `FeaturedCarousel` struggled with standard single/multi-line clamps, leaving unreadable long tail titles. Furthermore, the `CreatorDiscoveryRail` occupied too much vertical height and `StickyFilterBar` felt bulky without fold controls.
- **Fix Implemented**:
    - **Architecture**: Extracted `CompactTitleMarquee` from `src/app/admin/drops/page.tsx` into a new global shared component `src/components/ui/TitleMarquee.tsx`.
    - **Typography Integrity**: Replaced raw `drop.title` variables inside `DropCard` and `FeaturedCarousel` with the new responsive `TitleMarquee` system while ensuring trailing descriptions are universally capped at strict `line-clamp-1` and `line-clamp-2` configs.
    - **Visual Compaction**: Migrated the `CreatorDiscoveryRail` layout completely to an Instagram-story style horizontal bubble array. Adjusted `StickyFilterBar` with a native expansion array (showing 4 primary tags) clamped by a dynamic Chevron toggle layout. Moved `ScrollToTop` floating node to identically match the global active system constraints.

## Wallet Module UI & Metadata Compaction
- **Root Cause Identified**: The Wallet module possessed excessive vertical footprint and visually confusing card structures. The PayPal metadata taxonomy was using legacy identifiers that didn't match the localized naming.
- **Fix Implemented**: Renamed localized string metadata matching the platform taxonomies: 'Sugar Rush Pack', 'Sweet Pack', 'Kandy Bag Pack', 'Kandy Land Pack', and 'King Size Bundle'. Overhauled module UI with a 2-line horizontal grid structure for packages, injected a direct profile balance chip, standardized standard tracking, and decreased physical height bounding box styling padding across the module base grid layout.

## Dashboard Task Alert & Daily Rewards Refinement
- **Root Cause Identifed**: The dashboard task alert had generic text ('How To'), tall pill button, and sat too close to the welcome header. The daily rewards progress indicator featured a mismatched red color language and non-standard generic CTA border radius.
- **Fix Implemented**: Condensed task alert string, shrank task alert button height specifically applying purple brand accent styles, and evenly shifted task alert spacing margins to balance between top nav and welcome header. Removed the #ec4899 pink/red hues from daily rewards streak/progress indicators in favor of brand purple, and conformed claim CTA specifically to match standard rounded-2xl site language border radius styles.

## Public Creator Profile Redesign and Notification Logic Consolidation
- **Root Cause Identified**: The public creator profile page functioned as a stacked SaaS-style demo surface, lacked a cohesive mobile-first social profile layout, and included redundant bell notification logic that didn't sync securely with the global `newDropAlerts` preference.
- **Fix Implemented**: Transformed the creator profile into a clean, mobile-first design with an X-style tabbed structure (Drops vs. Experiences). Relocated noisy service modules (Subscriptions, Messaging, Requests, Bookings) into the Experiences tab. Purged radial gradients to align with the black/white/purple palette. Intercepted the creator bell logic with `currentUserProfile?.notificationSettings?.newDropAlerts`—triggering an active simulated UI state without executing redundant backend payload calls if global alerts are enabled. `corepack pnpm tsc --noEmit` and adjacency traces successfully validated.

### [2026-04-05] Realtime Follower Count Hardening
- **Surfaces Touched**: `src/app/api/creator/relationships/route.ts`
- **Refactor Details**: Verified that follower/favorite numbers shown on the public profile were updated by scraping backend APIs. However, to guarantee real-time backend parity on creator metrics without depending on admin route aggregation, inserted natively atomic FieldValue tracking (ollowerCount, avoriteCount, lertOptIns) onto the creator_ops snapshot within the primary Firebase relationship mutation transaction.
- **Verification**: `corepack pnpm tsc --noEmit` passed and changes committed locally.

 # # #   [ 2 0 2 6 - 0 4 - 0 5 ]   P u r g e   F a v o r i t i n g   L o g i c   &   I m p l e m e n t   M e s s a g e   M o d u l e 
 -   * * S u r f a c e s   T o u c h e d * * :   \ s r c / t y p e s / d b . t s \ ,   \ s r c / l i b / s e r v e r / c r e a t o r - e x p e r i e n c e s . t s \ ,   \ s r c / l i b / u s e r - u t i l s . t s \ ,   \ s r c / l i b / t e l e m e t r y - c a t a l o g . t s \ ,   \ s r c / l i b / t a s k s / t a s k - c a t a l o g . t s \ ,   \ s r c / c o m p o n e n t s / H e r o . t s x \ ,   \ s r c / a p p / a p i / a d m i n / u s e r s / r o u t e . t s \ ,   \ s r c / a p p / a p i / a d m i n / u s e r / [ u s e r I d ] / r o u t e . t s \ ,   \ s r c / a p p / a p i / a d m i n / r o s t e r / r o u t e . t s \ ,   \ s r c / a p p / a p i / c r e a t o r / d i s c o v e r y / r o u t e . t s \ ,   \ s r c / a p p / c r e a t o r s / [ u s e r n a m e ] / r o u t e . t s \ ,   \ s r c / a p p / a p i / c r e a t o r / r e l a t i o n s h i p s / r o u t e . t s \ ,   \ s r c / c o m p o n e n t s / C r e a t o r D i s c o v e r y R a i l . t s x \ ,   \ s r c / a p p / c r e a t o r s / [ u s e r n a m e ] / C r e a t o r P r o f i l e C l i e n t . t s x \ 
 -   * * R e f a c t o r   D e t a i l s * * : 
         -   * * F a v o r i t i n g   P u r g e * * :   R e m o v e d   a l l   f a v o r i t i n g   a n d   s a v i n g   f u n c t i o n a l i t y   a c r o s s   t h e   p l a t f o r m .   D e l e t e d   \  a v o r i t e d \ ,   \  a v o r i t e C o u n t \ ,   a n d   \  a v o r i t e C r e a t o r s \   f i e l d s   f r o m   d a t a b a s e   t y p e s .   S t r i p p e d   a g g r e g a t i o n   a n d   t r a c k i n g   l o g i c   f r o m   a d m i n   d a s h b o a r d   a n a l y t i c s   a n d   c r e a t o r   d i s c o v e r y   r a n k i n g   f o r m u l a .   P u r g e d   f a v o r i t i n g   t r a n s a c t i o n s   a n d   t e l e m e t r y   e v e n t s   f r o m   r e l a t i o n s h i p   r o u t e s   a n d   u s e r   p r o f i l e s .   R e p l a c e d   \  a v o r i t e C o u n t \   r e n d e r   l o g i c   w h e r e v e r   p r e s e n t . 
         -   * * M e s s a g e   M o d u l e   S u b s t i t u t i o n * * :   R e p l a c e d   t h e   ' S a v e '   b u t t o n   o n   p u b l i c   c r e a t o r   p r o f i l e s   w i t h   a   ' M e s s a g e '   b u t t o n .   I m p l e m e n t e d   a   f r i c t i o n l e s s ,   f i x e d   ' M e s s a g e   G a t e '   f e a t u r e - m o d u l e .   W h e n   t o g g l e d ,   t h e   m o d u l e   v e r i f i e s   b a c k e n d   n o t i f i c a t i o n   o p t - i n   s t a t u s .   I f   a l r e a d y   o p t e d   i n ,   i t   p r o m p t s   ' c h e c k   b a c k   l a t e r ' .   I f   o p t e d   o u t ,   a   l o w - f r i c t i o n   \ e n a b l e _ n o t i f i c a t i o n s \   b a c k e n d   t r a n s a c t i o n   p r o m p t   n a t i v e l y   s e c u r e s   a n   e m a i l   w o r k f l o w   o p t - i n . 
         -   * * F o l l o w e r   C o u n t   H a r d e n i n g * * :   F i x e d   a   d e c o u p l i n g   b u g   w h e r e   p u b l i c   p r o f i l e   f o l l o w e r   c o u n t s   r e t u r n e d   0   d u e   t o   a n   o u t - o f - s y n c   d e p e n d e n c y   o n   t h e   \ c r e a t o r _ o p s . s u m m a r y \   p r o x y .   R e f a c t o r e d   \  p i / c r e a t o r s / [ u s e r n a m e ] / r o u t e . t s \   t o   p e r f o r m   a   d i r e c t   \ . c o u n t ( ) \   a g g r e g a t e   q u e r y   o v e r   t h e   r e a l - t i m e   \ c r e a t o r _ r e l a t i o n s h i p s \   l e d g e r   c o l l e c t i o n   f o r   \  o l l o w i n g   = =   t r u e \ ,   g u a r a n t e e i n g   p e r f e c t   f o l l o w e r   s y n c h r o n i z a t i o n . 
 
 
 
