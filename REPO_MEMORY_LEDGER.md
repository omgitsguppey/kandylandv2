# Repo Memory Ledger

Status: Canonical repository-memory and architecture-decision ledger
Last refreshed: 2026-04-11
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
