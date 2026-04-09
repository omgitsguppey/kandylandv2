# Repo Memory Ledger

Status: Canonical repository-memory and architecture-decision ledger
Last refreshed: 2026-04-07
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`

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
