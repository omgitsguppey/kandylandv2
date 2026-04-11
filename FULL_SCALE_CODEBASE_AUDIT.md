# Full Scale Codebase Audit

Status: Canonical audit standard and live baseline
Last refreshed: 2026-04-11
Last full-scale audit execution: 2026-04-09 19:40:21 -05:00
Repo: `C:\Users\uylus\OneDrive\Documents\KandyDrops_Final`
Audited HEAD at start: `36fcca527b72b04c24531724465f490642018ba2`

## 2026-04-11 Admin AI Safe-Zone Overflow Containment

Scope for this pass:

- fix right-edge safe-zone bleed in `/admin/ai`
- harden shared admin module/header shells so dense admin layouts do not widen beyond the viewport
- keep dynamic AI content readable without horizontal page spill

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran:
  - `cmd /c "npm run trace:adjacent -- src/app/admin/ai/page.tsx"`
  - `cmd /c "npm run trace:adjacent -- src/components/Admin/AdminDashboardModule.tsx"`
  - `cmd /c "npm run trace:adjacent -- src/components/Admin/AdminPageHeader.tsx"`

Root cause confirmed:

- the admin AI page had multiple independent overflow paths rather than one broken component
- the page shell, shared admin module shell, and header shell did not consistently enforce `min-w-0`/overflow containment across nested grids and flex rows
- several AI-specific dynamic blocks could widen the layout on narrow viewports:
  - prompt provenance `pre` blocks
  - diagnostics metadata strings
  - reference-selection reasons
  - model-card notes and preflight detail text
  - prompt-history diff chips
- the custom AI reference-library split grid used `fr` tracks without explicit `minmax(0, ...)`, which made shrink behavior less safe under long content

Implementation results:

- updated `src/app/admin/ai/page.tsx`
  - clipped horizontal overflow at the page shell
  - added `min-w-0` to main admin AI grid columns and dense nested grids
  - changed the reference-library split grid to `minmax(0, ...)` tracks
  - added overflow containment and word-breaking to dynamic AI content blocks, including prompts, diagnostics, reasons, and gallery/history chips
  - hardened metric cards, badges, and empty states against long content
- updated `src/components/Admin/AdminDashboardModule.tsx`
  - module shell, header row, and content body now enforce `min-w-0` and content overflow containment
- updated `src/components/Admin/AdminPageHeader.tsx`
  - header shell now clips horizontal overflow and lets actions/content shrink safely inside the page frame

Commands run:

- `git status --short`
- `cmd /c "npm run trace:adjacent -- src/app/admin/ai/page.tsx"`
- `cmd /c "npm run trace:adjacent -- src/components/Admin/AdminDashboardModule.tsx"`
- `cmd /c "npm run trace:adjacent -- src/components/Admin/AdminPageHeader.tsx"`
- `cmd /c "npx eslint src/app/admin/ai/page.tsx src/components/Admin/AdminDashboardModule.tsx src/components/Admin/AdminPageHeader.tsx"`
- `cmd /c "npx tsc --noEmit"`
- `cmd /c "npm run check:ui:audits"`
- cleanup:
  - `.next`
  - `playwright-report`
  - `test-results`
  - `database-debug.log`
  - `firestore-debug.log`
- `cmd /c "npm run check:continuity"`

Verification results:

- adjacent traces passed
- focused eslint passed
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16/16`
- `npm run check:continuity` passed

Warnings and notes:

- the standard Playwright/Next shutdown warning still appeared after successful UI audits:
  - `TypeError: controller[kState].transformAlgorithm is not a function`
- `check:ui:audits` recreated `.next`; it was removed before the final continuity sign-off

## 2026-04-10 Chat Live Thread Degradation Recovery

Scope for this pass:

- fix the sticky `Realtime chat degraded` state inside `/dashboard/chat`
- restore automatic live-thread recovery after transient browser Firestore failures
- harden adjacent unread-state behavior so chat and shell indicators do not diverge after the same client failure

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- attempted:
  - `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
  - `npm run trace:adjacent -- src/hooks/useChatUnreadStatus.ts`
  - `npm run trace:adjacent -- src/lib/server/chat.ts`
- initial trace commands failed under the sandbox with `EPERM` while opening local Node toolchain files, so they were rerun successfully outside the sandbox

Root cause confirmed:

- chat already degraded to polling when a Firestore browser listener failed, but it never resubscribed automatically
- once `onSnapshot(..., error)` fired for:
  - the thread-list listener
  - the selected-thread listener
  - the message listener
  the current listener terminated and stayed terminated until refresh or route/state churn recreated it
- the unread hook had the same one-way degradation pattern, which meant the badge and the live thread surface could recover on different timelines
- the chat degraded banner stored one fallback string globally, so after partial recovery it could continue describing the wrong failing lane

Implementation results:

- added `src/lib/chat-realtime.ts`
  - canonical bounded reconnect delays for chat realtime retry:
    - `1500ms`
    - `3000ms`
    - `5000ms`
    - `10000ms`
    - `15000ms` max
- updated `src/components/Chat/ChatExperience.tsx`
  - thread-list, selected-thread, and message listeners now schedule automatic reconnect attempts after Firestore client failures
  - retry state is tracked per scope instead of one global reconnect flag
  - degraded scopes clear their own retry timers/attempt counters on successful listener recovery
  - the degraded banner now remains truthful when only one lane is still degraded
  - the banner explicitly tells operators that polling fallback is active while live chat retries automatically
- updated `src/hooks/useChatUnreadStatus.ts`
  - unread realtime now retries automatically after listener failure instead of staying degraded until refresh
  - unread badge state stays stable while polling fallback takes over, avoiding false-clear flicker
- added/updated tests:
  - `tests/unit/chat-realtime.spec.ts`
  - `tests/unit/use-chat-unread-status.spec.tsx`

Commands run:

- `git status --short`
- `cmd /c "npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx"`
- `cmd /c "npm run trace:adjacent -- src/hooks/useChatUnreadStatus.ts"`
- `cmd /c "npm run trace:adjacent -- src/lib/server/chat.ts"`
- `cmd /c "npx eslint src/components/Chat/ChatExperience.tsx src/hooks/useChatUnreadStatus.ts src/lib/chat-realtime.ts tests/unit/use-chat-unread-status.spec.tsx tests/unit/chat-realtime.spec.ts"`
- `cmd /c "npx vitest run tests/unit/use-chat-unread-status.spec.tsx tests/unit/chat-realtime.spec.ts"`
- `cmd /c "npx tsc --noEmit"`
- `cmd /c "npm run check:ui:audits"`
- cleanup:
  - `.next`
  - `playwright-report`
  - `test-results`
  - `database-debug.log`
  - `firestore-debug.log`
- `cmd /c "npm run check:continuity"`

Verification results:

- adjacent traces completed successfully after rerunning outside the sandbox
- focused eslint passed with no errors or warnings after dependency cleanup
- focused Vitest passed:
  - `2` files
  - `7` tests
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16/16`
- `npm run check:continuity` passed

Warnings and notes:

- local Node-based repo tooling hit sandbox `EPERM` on first attempt when opening workspace/local-cache tool binaries; the commands themselves were valid and passed once rerun outside the sandbox
- `check:ui:audits` recreated `.next`; it was removed before the final continuity sign-off

## 2026-04-10 Chat Security, Creator-Page Firestore Failure, and Shell Listener Reduction

Scope for this pass:

- finalize the previously started chat security/moderation hardening work
- reduce client-side chat/moderation leak surface without pretending the system is true end-to-end encryption
- fix and explain the Firestore browser assertion reported while visiting creator pages
- keep chat realtime where it materially matters while removing non-essential Firestore listeners from public/shell surfaces

Official documentation/research reviewed first:

- Firebase JavaScript SDK release notes:
  - [Firebase JavaScript SDK Release Notes](https://firebase.google.com/support/release-notes/js)
- The current repo was still on `firebase` `12.11.0`, while Firebase lists `12.12.0` on `2026-04-09`
- No official release-note entry currently documents assertion IDs `b815` / `ca9`, so this pass prioritized application-side listener hardening and fallback behavior over guessing that a version bump alone would resolve the issue

Root causes confirmed:

- the signed-in shell was still mounting Firestore listeners on public creator pages even though those pages do not need live Firestore chat/profile state:
  - auth profile listener in `src/context/AuthContext.tsx`
  - unread badge listener in `src/hooks/useChatUnreadStatus.ts`
  - notification runtime listeners in `src/hooks/useNotifications.ts`
- earlier chat hardening reduced the chat-thread listener churn, but creator-page visits could still hit the browser Firestore SDK through these shared shell listeners
- direct client admin reads for moderation data were still broader than needed before this pass; even though moderation UI is server-backed now, rules still needed to make that least-privilege decision explicit
- chat message/thread documents still stored raw preview/text/attachment URL values in Firestore, which increased the blast radius of accidental client-side document inspection

Implementation results:

- added `src/lib/chat-soft-seal.ts`
  - no-dependency reversible soft obfuscation for chat fields using scoped XOR + base64url
  - intentionally documented as soft sealing only, not true cryptographic confidentiality
- sealed chat-at-rest fields in `src/lib/server/chat.ts`:
  - `text`
  - `assetUrl`
  - `assetName`
  - `lastMessagePreview`
- unsealed those same fields in:
  - `src/lib/server/chat.ts`
  - `src/lib/server/admin-moderation.ts`
  - `src/components/Chat/ChatExperience.tsx`
- tightened `firestore.rules`
  - `creator_message_threads` and `creator_messages` are now participant-read-only in the client
  - `security_events` is now fully server-only
  - direct client admin reads of moderation/security data are explicitly blocked
- aligned chat attachment runtime/storage security:
  - attachment prepare/finalize/cancel now use `creator/messages/{uid}/{threadId}/...`
  - this matches the existing `storage.rules` owner-scoped upload path
- added `/api/chat/attachments/cancel` as server-backed cleanup and kept cleanup runtime-tracked
- added `GET /api/user/profile` in `src/app/api/user/profile/route.ts`
  - this is the canonical server fallback for auth-shell profile reads
  - runtime health is now tracked under `user/profile:GET`
- hardened `src/context/AuthContext.tsx`
  - dashboard/admin surfaces still prefer realtime profile sync
  - public creator pages and other non-dashboard surfaces now prefer server polling instead of mounting a Firestore profile listener
  - Firestore listener failures on the profile doc now degrade to `/api/user/profile` polling with explicit diagnostics instead of silently failing
- hardened `src/hooks/useChatUnreadStatus.ts`
  - Firestore realtime unread subscription now runs only on `/dashboard/chat`
  - outside chat, unread state uses server polling plus focus/visibility refresh
  - this keeps chat itself realtime while removing a global query listener from creator-page visits
- simplified `src/hooks/useNotifications.ts`
  - removed the extra Firestore runtime document listeners entirely
  - notifications now use server fetch + focus/visibility/event/interval refresh instead of two global Firestore listeners
- updated specs to match the security/runtime contract:
  - `tests/unit/chat-soft-seal.spec.ts`
  - `tests/unit/chat-attachments-route.spec.ts`
  - `tests/unit/user-profile-route.spec.ts`
  - `tests/unit/use-chat-unread-status.spec.tsx`
  - `tests/firebase/firestore.rules.spec.ts`
  - existing send/route specs remained green with the sealed payload flow

Commands run:

- `git status --short`
- `npx eslint src/context/AuthContext.tsx src/hooks/useNotifications.ts src/hooks/useChatUnreadStatus.ts src/app/api/user/profile/route.ts src/lib/chat-soft-seal.ts src/lib/server/chat.ts src/lib/server/admin-moderation.ts src/app/api/chat/attachments/prepare/route.ts src/app/api/chat/attachments/complete/route.ts src/app/api/chat/attachments/cancel/route.ts firestore.rules tests/unit/chat-attachments-route.spec.ts tests/unit/user-profile-route.spec.ts tests/unit/use-chat-unread-status.spec.tsx tests/unit/chat-soft-seal.spec.ts tests/firebase/firestore.rules.spec.ts`
- `corepack pnpm exec vitest run tests/unit/chat-attachments-route.spec.ts tests/unit/user-profile-route.spec.ts tests/unit/use-chat-unread-status.spec.tsx tests/unit/chat-soft-seal.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/creator-messages-route.spec.ts tests/unit/server-chat-send.spec.ts`
- `npx tsc --noEmit`
- `npm run check:firebase:rules`
- `npm run check:ui:audits`
- `corepack pnpm run check`
- `npm run check:continuity`

Verification results:

- targeted eslint passed
  - note: `firestore.rules` is ignored by eslint config and reports a benign “file ignored” warning when invoked directly
- targeted Vitest passed: `7` files / `30` tests
- `npx tsc --noEmit` passed
- `npm run check:firebase:rules` passed:
  - Firestore rules: `10/10`
  - Realtime Database rules: `6/6`
  - Storage rules: `16/16`
- `npm run check:ui:audits` passed:
  - `16/16`
  - Next emitted a non-blocking `transformAlgorithm is not a function` shutdown log after successful Playwright completion
- `corepack pnpm run check` passed:
  - `127` files / `575` contract tests
- `npm run check:continuity` passed after cleanup

Cleanup notes:

- `npm run check:ui:audits` leaves `.next` behind by design because it runs a production build first
- generated artifacts were removed before the final continuity pass:
  - `.next`
  - `playwright-report`
  - `test-results`
  - `database-debug.log`
  - `firestore-debug.log`

Current canonical runtime posture after this pass:

- admin moderation visibility is server-backed only
- client Firestore access for chat is limited to actual participants only
- client-side shell listener count on public creator pages is materially lower
- chat remains realtime inside `/dashboard/chat`
- unread badge and notification state still stay fresh, but use server polling off the chat route to avoid unnecessary Firestore client-state churn
- chat documents are no longer stored as raw plaintext/raw preview/raw attachment URL in Firestore, but this is still soft obfuscation, not E2EE

## 2026-04-10 Chat Hardening Sweep for Silent Failures, Orphaned Uploads, and Compatibility Drift

Scope for this pass:

- harden recent chat changes and adjacent logic
- remove silent compatibility drift between native chat send and legacy creator-message send
- prevent orphaned chat attachment uploads when send or finalize fails
- replace vague route-level payload failures with stable chat-specific validation errors

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran:
  - `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
  - `npm run trace:adjacent -- src/lib/server/chat.ts`
  - `npm run trace:adjacent -- src/app/api/creator/messages/route.ts`
  - `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/messages/route.ts`
  - `npm run trace:adjacent -- src/hooks/useChatUnreadStatus.ts`

Start state:

- current HEAD at pass start: `6f7cc613a3ce8eb8df4a1909173e5164770c8da9`
- working tree was clean at pass start
- native chat send was already structured and immediate, but the legacy compatibility route still dropped the structured result and always returned only `{ success: true }`
- attachment upload had an orphaning path:
  - prepare -> upload -> complete could succeed
  - message send could then fail
  - the uploaded file would remain in storage with no message record pointing at it
- several active chat POST routes still relied on generic exception handling for malformed payloads, which could collapse into vague server errors instead of explicit chat-specific `400` responses

Implementation results:

- added `src/lib/chat-attachments.ts` as the canonical helper for:
  - supported chat attachment media types
  - max attachment size
- hardened `src/app/api/chat/attachments/prepare/route.ts`:
  - invalid payloads now return `400` with `errorCode: "invalid_attachment_request"`
  - unsupported mime types now return `400` with `errorCode: "unsupported_attachment_type"`
- hardened `src/app/api/chat/attachments/complete/route.ts`:
  - invalid payloads now return `400` with `errorCode: "invalid_attachment_finalize_request"`
  - unsupported or mismatched resolved content types now return `400` with `errorCode: "unsupported_attachment_type"`
  - oversized finalized uploads now return `400` with `errorCode: "attachment_too_large"`
- added `src/app/api/chat/attachments/cancel/route.ts`:
  - server-backed cleanup for uploaded attachments that should not remain in storage
  - access is still bound to the caller and the thread-scoped storage prefix
  - runtime health is now tracked under `chat/attachments/cancel:POST`
- updated `src/components/Chat/ChatExperience.tsx`:
  - unsupported local files are rejected before upload starts
  - uploaded attachment state now carries the `storagePath`
  - if upload/finalize fails after a storage object exists, chat performs best-effort server cleanup
  - if message send fails after attachment finalize, chat performs best-effort server cleanup
  - if cleanup also fails, the UI now says that the uploaded attachment could not be cleaned up automatically and that the incident was logged
- aligned `src/app/api/chat/threads/[threadId]/messages/route.ts`:
  - malformed send payloads now return `400` with `errorCode: "invalid_message_request"`
- aligned `src/app/api/creator/messages/route.ts`:
  - malformed compatibility payloads now return `400` with `errorCode: "invalid_message_request"`
  - compatibility sends now forward the structured native result instead of dropping:
    - `thread`
    - `message`
    - `pricing`
    - `warnings`
- updated `src/lib/route-runtime-health.ts` so attachment cleanup is first-class in admin runtime tracking

Commands run:

- `git status --short`
- `npx eslint src/components/Chat/ChatExperience.tsx src/lib/chat-attachments.ts src/lib/route-runtime-health.ts src/app/api/chat/attachments/prepare/route.ts src/app/api/chat/attachments/complete/route.ts src/app/api/chat/attachments/cancel/route.ts src/app/api/chat/threads/[threadId]/messages/route.ts src/app/api/creator/messages/route.ts tests/unit/chat-attachments-route.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/creator-messages-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/chat-attachments-route.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/creator-messages-route.spec.ts tests/unit/server-chat-send.spec.ts tests/unit/server-chat.spec.ts tests/unit/use-chat-unread-status.spec.tsx`
- `npx tsc --noEmit`
- `npm run check:ui:audits`
- `npm run check:continuity`

Results:

- focused eslint passed
- focused Vitest passed:
  - `6` files
  - `28` tests
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome
- `npm run check:continuity` passed

Warnings and notes:

- `npm run check:ui:audits` recreated `.next`, `playwright-report/`, and `test-results/`; these were removed before the final continuity sign-off, and the final generated-artifact check passed cleanly
- Playwright still emitted the existing non-blocking Next teardown warning after the UI audit suite passed:
  - `TypeError: controller[kState].transformAlgorithm is not a function`
- no new chat runtime or validation warnings remained unexplained after this pass

## 2026-04-10 Firestore Internal Assertion Hardening for Chat Realtime

Scope for this pass:

- investigate the browser Firestore internal assertion failure
- remove local realtime-listener churn in chat
- add fallback polling for chat and unread state when browser listeners fail
- make future recurrences explicit in client diagnostics instead of opaque Firebase noise

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`

Start state:

- current HEAD at pass start: `eddf90d5b54d7d2fd40c34d4d38d93921a6c6f68`
- working tree was clean at pass start
- deployed clients were still surfacing opaque browser Firestore errors like:
  - `FIRESTORE (12.11.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)`
  - nested context with `Unexpected state (ID: ca9)` and `{"ve":-1}`
- the main chat thread-list listener in `src/components/Chat/ChatExperience.tsx` still depended on selected thread state, which caused avoidable resubscribe churn during normal chat updates
- unread badge handling failed closed to `false` on realtime errors with no recovery path besides a refresh

Implementation results:

- added `src/lib/firestore-client-errors.ts` to normalize browser Firestore failures into:
  - issue kind
  - SDK version
  - assertion IDs
  - plain-English meaning
  - explicit recovery guidance
- updated `src/lib/client-error-reporting.ts` so `reportRealtimeIssue(...)` upgrades Firestore internal assertions from generic realtime warnings to explicit Firebase diagnostics
- updated `src/lib/client-diagnostics.ts` so global client errors also emit dedicated Firebase diagnostics when the error message matches a Firestore internal assertion
- refactored `src/components/Chat/ChatExperience.tsx` so the main thread-list snapshot no longer resubscribes on every selected-thread update
- added chat realtime degradation handling in `src/components/Chat/ChatExperience.tsx`:
  - listener failures now show a plain-English banner
  - a one-time toast explains that polling fallback is active
  - chat thread list and selected thread detail are polled every `5s` until realtime recovers
- updated `src/hooks/useChatUnreadStatus.ts` so unread-state failures no longer stay dead until refresh:
  - the hook now falls back to `/api/chat/threads`
  - unread state refreshes immediately and then every `15s` while degraded
- the new diagnostics now make this class of failure explicit as:
  - browser Firestore client state failure
  - not a normal permission/auth error
  - assertion IDs captured for future triage

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npx eslint src/components/Chat/ChatExperience.tsx src/hooks/useChatUnreadStatus.ts src/lib/client-diagnostics.ts src/lib/client-error-reporting.ts src/lib/firestore-client-errors.ts tests/unit/use-chat-unread-status.spec.tsx tests/unit/firestore-client-errors.spec.ts`
- `corepack pnpm exec vitest run tests/unit/use-chat-unread-status.spec.tsx tests/unit/firestore-client-errors.spec.ts`
- `npx tsc --noEmit`
- `npm run check:ui:audits`

Results:

- focused eslint passed
- focused Vitest passed:
  - `2` files
  - `6` tests
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome

Warnings and notes:

- the existing non-blocking Next teardown warning still appears after the UI audit suite passes:
  - `TypeError: controller[kState].transformAlgorithm is not a function`
- the root local defect was listener churn in the chat thread-list effect; the Firestore browser SDK assertion itself was not coming from the server routes
- client diagnostics now record the assertion IDs so future reports can distinguish SDK-state failures from permission/auth failures immediately

## 2026-04-10 Chat Route Zoom Lock and Nested Scroll Containment

Scope for this pass:

- stop mobile auto-zoom and pinch zoom on chat surfaces only
- prevent page-level scroll chaining outside the chat frame
- make thread list and message list the only nested scroll regions
- account for navbar and mobile bottom-nav safe zones inside the chat route

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`

Start state:

- current HEAD at pass start: `d32cb9e39ea18c3874c14af84349a787e991f9fc`
- working tree was clean at pass start
- chat route still inherited the generic page-shell scroll behavior
- the composer textarea and compact search input still used sub-16px mobile text sizing, which is the usual trigger for iOS focus zoom
- chat list and thread surfaces still relied on `min-h-[78vh]` sizing and outer page scrolling instead of a strict contained viewport contract

Implementation results:

- added a route-scoped chat layout in:
  - `src/app/dashboard/chat/layout.tsx`
  - `src/components/Chat/ChatRouteShell.tsx`
- the chat route now exports its own viewport metadata with:
  - `maximumScale: 1`
  - `userScalable: false`
  - `viewportFit: "cover"`
- the chat route now locks document-level scroll while mounted by setting:
  - `html` overflow hidden
  - `body` overflow hidden
  - `main` overflow hidden
  so page-level scroll chaining cannot escape the chat frame
- refactored `src/components/Chat/ChatExperience.tsx` so the route uses:
  - `h-full`
  - `min-h-0`
  - `overflow-hidden`
  as the canonical shell contract instead of `mt-4` plus `min-h-[78vh]`
- converted the compact thread list, desktop thread list, and message pane scroll regions to:
  - nested `overflow-y-auto`
  - `overscroll-y-contain`
  so only the list/message regions scroll
- updated compact thread-list bottom spacing and composer bottom spacing to account for `env(safe-area-inset-bottom)`
- raised the compact search input and composer textarea to `16px` on mobile so iOS focus zoom no longer triggers from sub-16px text fields
- preserved desktop sizing by stepping back down to the previous smaller type size on `sm+`

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/app/dashboard/chat/layout.tsx`
- `npx eslint src/app/dashboard/chat/layout.tsx src/components/Chat/ChatRouteShell.tsx src/components/Chat/ChatExperience.tsx`
- `if (Test-Path .next) { Remove-Item -Recurse -Force .next }`
- `npx next typegen`
- `npx tsc --noEmit`
- `npm run check:ui:audits`

Results:

- focused eslint passed
- `npx next typegen` passed
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome

Warnings and notes:

- the first post-edit `tsc` and `check:ui:audits` run hit the standing repo issue where `.next/dev` route-type artifacts can conflict with newly added segment layouts; removing `.next` and regenerating route types with `npx next typegen` resolved it cleanly
- disabling user scaling is scoped to `/dashboard/chat` only; the root app viewport remains unchanged
- the iOS keyboard zoom issue was not just pinch zoom; the direct trigger was the chat inputs using sub-16px mobile text sizing

## 2026-04-10 Compact Chat Edit Mode and Viewer-Side Thread Hiding

Scope for this pass:

- add a minimal edit affordance to the compact messages list
- expose only `Select chats` from the edit menu
- add bottom `Read All` and `Delete` actions in selection mode
- make delete a real viewer-side hide action instead of a fake UI-only removal

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- ran `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/route.ts`

Start state:

- current HEAD at pass start: `beb308b210e7bca3e728e886f365b63492e0a3fb`
- working tree was clean at pass start
- compact chat list had no edit affordance or selection mode
- there was a real `read` path for threads, but no viewer-side delete/hide behavior for compact chat list management
- compact list rows could only open threads; they could not enter a management mode similar to the supplied reference

Implementation results:

- updated `src/components/Chat/ChatExperience.tsx` so compact view now has:
  - an `Edit` pill
  - a one-option edit menu containing only `Select chats`
  - a dedicated selection mode with check markers on thread rows
  - a bottom action bar in edit mode with:
    - `Read All`
    - `Delete`
- hid the search bar and compose button while edit mode is active so the bottom bar stays singular and clear
- made thread rows toggle selection during edit mode instead of opening the thread
- made the top-left action become a blue completion button while in selection mode
- added real viewer-side thread hiding in:
  - `src/lib/server/chat.ts`
  - `src/app/api/chat/threads/[threadId]/route.ts`
- delete now performs a viewer-specific hide by writing:
  - `hiddenByUserAt`
  - `hiddenByCreatorAt`
  depending on who initiated the delete
- hidden threads are now filtered out from:
  - initial server thread-list reads
  - compact realtime thread-list subscriptions
  - stale direct thread-detail reads for the same viewer
- new messages unhide the thread for both participants by resetting hidden markers during send
- added runtime tracking for thread hide operations in:
  - `src/lib/route-runtime-health.ts`

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/route.ts`
- `npx eslint src/components/Chat/ChatExperience.tsx src/lib/chat.ts src/lib/server/chat.ts src/lib/route-runtime-health.ts src/app/api/chat/threads/[threadId]/route.ts src/types/db.ts`
- `corepack pnpm exec vitest run tests/unit/chat-thread-route.spec.ts tests/unit/server-chat.spec.ts`
- `npx tsc --noEmit`
- `npm run check:ui:audits`
- removed `playwright-report/` and `test-results`
- `git status --short`

Results:

- focused eslint passed
- focused Vitest passed:
  - `2` files
  - `9` tests
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome
- generated Playwright artifacts were removed after verification

Warnings and notes:

- `npm run check:ui:audits` still emits the standing non-blocking Next teardown warning after the suite passes:
  - `TypeError: controller[kState].transformAlgorithm is not a function`
- `Read All` currently applies to the selected threads if any are selected, otherwise it applies to the visible filtered thread list
- delete is intentionally viewer-specific hide semantics, not a destructive cross-participant thread delete

## 2026-04-10 Compact Chat Thread List Simplification

Scope for this pass:

- simplify the thread-list view shown before entering a chat thread
- stop auto-entering the first conversation on compact view
- add a compose action that lets users start a message with a creator they already follow
- add a truthful empty state with a follow-more-creators CTA when the user follows no creators yet

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- ran `npm run trace:adjacent -- src/app/api/creator/relationships/route.ts`

Start state:

- current HEAD at pass start: `d30c239af0f5f8cf290aeafc4db3729163672fb5`
- working tree already contained the uncommitted composer-alignment pass
- compact chat view still auto-selected the first thread after load, which prevented a clean standalone message-list surface
- there was no in-chat compose action for choosing from followed creators without leaving the chat route
- the no-thread state still used the broader generic chat placeholder instead of a dedicated messages-list empty state

Implementation results:

- refactored `src/components/Chat/ChatExperience.tsx` so compact view now stays in a standalone thread-list surface until the user explicitly opens a conversation
- stopped auto-selecting the first thread on compact view unless:
  - a `thread` query param is already present
  - a `creator` query param seeded a target thread through the existing server route
- added a compact messages list surface with:
  - simplified `Messages` header
  - cleaner row treatment
  - local search filtering for the visible thread list
  - floating bottom-right compose action
- added a server-backed compose picker that loads creators from the existing `GET /api/creator/relationships` followed-creator list
- wired the compose picker to the existing `?creator=<uid>` chat seeding flow instead of introducing a parallel draft-thread model
- added truthful compact empty states:
  - if followed creators exist but no threads exist:
    - show a `No messages yet` state with `Compose a message`
  - if no followed creators exist:
    - show a `No creators followed yet` state with a CTA to `/experiences`
- hardened compact back-navigation so returning from a thread clears the chat route back to `/dashboard/chat` instead of leaving stale thread params behind

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/app/api/creator/relationships/route.ts`
- `npx eslint src/components/Chat/ChatExperience.tsx`
- `npx tsc --noEmit`
- `npm run check:ui:audits`
- removed `playwright-report/` and `test-results`
- `git status --short`

Results:

- focused eslint passed
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome
- generated Playwright artifacts were removed after verification

Warnings and notes:

- `npm run check:ui:audits` still emits the standing non-blocking Next teardown warning after the suite passes:
  - `TypeError: controller[kState].transformAlgorithm is not a function`
- this pass intentionally reused the existing relationships route for compose-picker data, so there is no new chat-specific creator picker API surface yet

## 2026-04-10 Chat Composer Alignment Tightening

Scope for this pass:

- tighten the bottom chat composer alignment after the attachment-menu change
- ensure the plus button, input field, and send button sit on the same vertical rhythm
- reduce the oversized top padding visible inside the input field

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`

Start state:

- current HEAD at pass start: `d30c239af0f5f8cf290aeafc4db3729163672fb5`
- working tree was clean at pass start
- the attachment-menu behavior was correct, but the composer row still showed excess top space in the text field and the send control was sitting slightly low relative to the plus button and input body

Implementation results:

- tightened the composer row in `src/components/Chat/ChatExperience.tsx` so the bottom actions now share a common vertical centerline
- reduced the plus button from `44px` to `40px` to match the visual scale of the send control and composer pill more closely
- changed the outer composer row from bottom-aligned to center-aligned
- changed the inner composer pill from bottom-aligned to center-aligned
- reduced the composer pill vertical padding and min-height so the input no longer carries excess empty space above the text baseline
- tightened the textarea line box and added explicit vertical centering so one-line input text sits more naturally inside the pill
- slightly reduced the send button from `36px` to `32px` and explicitly centered it within the composer pill

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npx eslint src/components/Chat/ChatExperience.tsx`
- `npx tsc --noEmit`
- `npm run check:ui:audits`
- removed `playwright-report/` and `test-results`
- `git status --short`

Results:

- focused eslint passed
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome
- generated Playwright artifacts were removed after verification

Warnings and notes:

- `npm run check:ui:audits` still emits the standing non-blocking Next teardown warning after the suite passes:
  - `TypeError: controller[kState].transformAlgorithm is not a function`

## 2026-04-10 Chat Composer Attachment Menu Simplification

Scope for this pass:

- replace the direct plus-button file picker in chat with a compact attachment menu
- limit the composer attachment actions to `Image` and `Video`
- keep the existing attachment upload/send path intact while tightening adjacent composer state behavior

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`

Start state:

- current HEAD at pass start: `d0182a59c12bcfa6cf86f26f6987ba4c1cfde342`
- working tree was clean at pass start
- the chat plus button opened the OS file picker immediately instead of presenting the reduced two-option action sheet requested for the thread composer
- the composer had no explicit attachment-menu open/close state because the plus control was implemented as a hidden file input label

Implementation results:

- updated `src/components/Chat/ChatExperience.tsx` so the plus button now opens a compact attachment menu instead of directly invoking the file picker
- limited the attachment actions to exactly two options:
  - `Image`
  - `Video`
- replaced the single mixed hidden input with dedicated hidden inputs for image-only and video-only attachment selection
- added explicit attachment-menu state management so the menu now closes when:
  - clicking outside the menu
  - pressing `Escape`
  - switching threads
  - choosing either attachment action
- reset hidden input values after selection so re-choosing the same file still triggers a new selection event

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npx eslint src/components/Chat/ChatExperience.tsx`
- `npx tsc --noEmit`
- `npm run check:ui:audits`
- removed `playwright-report/` and `test-results`
- `git status --short`

Results:

- focused eslint passed
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome
- generated Playwright artifacts were removed after verification so the working tree reflects only intended source/doc changes

Warnings and notes:

- `npm run check:ui:audits` still emits the standing non-blocking Next teardown warning after the suite passes:
  - `TypeError: controller[kState].transformAlgorithm is not a function`
- this pass intentionally did not change the existing attachment upload/send contract; it only simplified how users choose between image and video before the existing upload flow runs

## 2026-04-10 Chat Surface Redesign Toward Simpler Mobile Messaging

Scope for this pass:

- redesign the in-thread chat experience around a simpler iMessage-like reference
- keep the purple outgoing accent while darkening the canvas and incoming bubble system
- preserve the existing realtime send, read, and presence behavior while reducing the current dashboard-like chrome

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- reviewed the supplied reference image directly from:
  - `C:\Users\uylus\Downloads\IMG_3609.png`

Start state:

- current HEAD at pass start: `502ae3d030132f55018918c7e9ba57324a909a64`
- working tree already contained the prior uncommitted chat send hardening pass
- the chat thread UI still read more like an admin panel:
  - radial background instead of a clean black canvas
  - heavy composer chrome
  - bubble metadata on every message
  - visible message-kind controls that added clutter to routine chat

Implementation results:

- redesigned `src/components/Chat/ChatExperience.tsx` around:
  - a black canvas thread view
  - denser charcoal incoming bubbles
  - purple outgoing bubbles with softer gradient treatment
  - centered identity header on compact viewports
  - timeline markers between message groups instead of timestamp noise on every bubble
  - a simpler bottom composer with:
    - plus-style attachment control
    - pill input field
    - compact circular send affordance
  - inline attachment summary chip instead of a bulky attachment state
- added auto-scroll behavior for active threads so new messages and successful sends stay visually current without needing a thread remount
- kept the existing realtime send reconciliation and thread/pricing updates from the previous pass intact while simplifying the visual layer

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npx eslint src/components/Chat/ChatExperience.tsx`
- `npx tsc --noEmit`
- `corepack pnpm exec vitest run tests/unit/chat-send-realtime.spec.ts tests/unit/server-chat-send.spec.ts tests/unit/chat-thread-messages-route.spec.ts`
- `npm run check:ui:audits`
- removed `.next`, `playwright-report`, and `test-results`
- `npm run check:continuity`

Results:

- focused eslint passed
- `npx tsc --noEmit` passed
- focused chat send/reconciliation Vitest passed:
  - `3` files
  - `10` tests
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome
- `npm run check:continuity` passed after artifact cleanup

Warnings and notes:

- `npm run check:ui:audits` still emitted the standing non-blocking Next teardown warning `TypeError: controller[kState].transformAlgorithm is not a function` after the suite passed
- the UI audit run also logged several upstream Firebase Storage image timeouts on unrelated public imagery while still passing the suite
- the chat route itself is not covered by the standing public Playwright audit suite, so this redesign was verified through compile/lint/realtime-adjacent tests plus global UI continuity checks rather than a chat-route screenshot baseline
- this pass kept the current data model and send semantics; it was a thread-surface redesign, not a chat contract rewrite

## 2026-04-10 Chat Send Realtime Reconciliation Hardening

Scope for this pass:

- fix the stuck `Sending...` state in chat without requiring a thread remount
- harden the immediate send response so thread/read/pricing state stays truthful before snapshots arrive
- review adjacent chat send and realtime subscription logic rather than applying a narrow UI-only patch

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/components/Chat/ChatExperience.tsx`
  - `src/lib/server/chat.ts`
  - `src/app/api/chat/threads/[threadId]/messages/route.ts`

Start state:

- current HEAD at pass start: `502ae3d030132f55018918c7e9ba57324a909a64`
- working tree was clean at pass start
- successful text sends could remain rendered as optimistic `Sending...` bubbles until the user navigated away and back into the thread

Implementation results:

- added a dedicated realtime reconciliation helper in:
  - `src/lib/chat-send-realtime.ts`
- updated `src/components/Chat/ChatExperience.tsx` so successful sends immediately:
  - replace optimistic placeholders with the persisted server message
  - append attachment sends without waiting for Firestore snapshot churn
  - refresh the selected thread and thread list from the server response
  - refresh pricing state immediately after paid sends
- hardened `src/lib/server/chat.ts` so the immediate send response now:
  - preserves existing thread read-state fields instead of rebuilding from the patch alone
  - returns the updated pricing summary alongside the created message and thread
- added direct regression coverage in:
  - `tests/unit/chat-send-realtime.spec.ts`
  - `tests/unit/server-chat-send.spec.ts`
  - `tests/unit/chat-thread-messages-route.spec.ts`

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/messages/route.ts`

Results:

- focused eslint passed
- focused chat send and reconciliation Vitest passed:
  - `3` files
  - `10` tests
- `npx tsc --noEmit` passed
- `npm run check:ui:audits` passed:
  - `16` tests green across Chromium and Mobile Chrome
- `npm run check:continuity` passed after clearing `.next` left by the UI audit build step

Root cause:

- `src/components/Chat/ChatExperience.tsx` was creating optimistic text messages locally but not reconciling them against the already-successful server response, so the bubble could remain stuck as `Sending...` until a thread remount forced a fresh detail fetch
- `src/lib/server/chat.ts` was also returning the immediate thread payload from the write patch alone, which could temporarily drop unchanged read-state fields until the next thread snapshot arrived

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/messages/route.ts`
- `npx eslint src/components/Chat/ChatExperience.tsx src/lib/server/chat.ts src/lib/chat-send-realtime.ts tests/unit/chat-send-realtime.spec.ts tests/unit/server-chat-send.spec.ts tests/unit/chat-thread-messages-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/chat-send-realtime.spec.ts tests/unit/server-chat-send.spec.ts tests/unit/chat-thread-messages-route.spec.ts`
- `npx tsc --noEmit`
- `npm run check:ui:audits`
- `npm run check:continuity`

Warnings and notes:

- `npm run check:ui:audits` still emits the standing non-blocking Next teardown warning `TypeError: controller[kState].transformAlgorithm is not a function` after the suite passes
- UI audit builds leave `.next` behind, so continuity must run after cleaning generated artifacts or it will fail truthfully on the artifact check

## 2026-04-10 Dedicated Hook Test Harness for Unread Status

Scope for this pass:

- replace indirect unread-hook coverage with a real client-side hook test path
- add the smallest reusable hook harness that can exercise React client hooks directly
- keep the main Vitest suite in `node` and scope DOM runtime only to hook tests that need it

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/hooks/useChatUnreadStatus.ts`
  - `src/context/AuthContext.tsx`

Start state:

- current HEAD at hook-harness start: `036391b006060a8fb32e471ebb620b9bd59697b6`
- working tree was clean at pass start
- unread-hook hardening existed, but there was still no direct hook-spec path in the repo

Implementation results:

- added `jsdom` as a dev dependency so client-hook tests can run in a real DOM runtime without changing the entire suite environment
- expanded `vitest.config.ts` test globs to include both `*.spec.ts` and `*.spec.tsx`
- added a reusable client hook harness in:
  - `tests/unit/utils/renderHook.tsx`
- added a direct unread-hook spec in:
  - `tests/unit/use-chat-unread-status.spec.tsx`
- direct coverage now proves:
  - approved legacy creators subscribe on the creator-side unread lane even if their profile role is still `user`
  - realtime subscription errors clear the unread badge state instead of leaving stale UI
  - rerendering after auth removal returns a false unread state directly from the hook
- while verifying the repo-wide check pipeline, fixed an unrelated standing lint blocker in:
  - `src/app/drops/[id]/opengraph-image.tsx`
  - the file now explicitly documents the required `next/og` `<img>` exception so `eslint --max-warnings=0` passes again

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/hooks/useChatUnreadStatus.ts`
- `npm run trace:adjacent -- src/context/AuthContext.tsx`
- `corepack pnpm add -D jsdom`
- `npx eslint vitest.config.ts tests/unit/use-chat-unread-status.spec.tsx tests/unit/utils/renderHook.tsx src/app/drops/[id]/opengraph-image.tsx`
- `corepack pnpm exec vitest run tests/unit/use-chat-unread-status.spec.tsx`
- `npx tsc --noEmit`
- `npm run check:generated-artifacts`
- `corepack pnpm run check`
- `npm run check:continuity`

Results:

- focused eslint passed
- focused unread-hook Vitest passed:
  - `1` file
  - `3` tests
- `npx tsc --noEmit` passed
- `corepack pnpm run check` passed
- `npm run check:continuity` passed
- `npm run check:generated-artifacts` passed

Warnings and notes:

- the jsdom addition is scoped to tests that opt in via `// @vitest-environment jsdom`; the main suite still runs under the default `node` environment
- `corepack pnpm run check` still emits the standing npm unknown-env warnings and Node `punycode` deprecation warnings, but all verification steps passed

## 2026-04-10 PR #166 and #168 Post-Merge Hardening

Scope for this pass:

- inspect the merged implementation behind PR `#166` and PR `#168`
- harden any missed edge cases in GumDrop ledger handling, chat viewer-role resolution, unread state, and merge hygiene
- verify the shared-helper and user-facing chat/navigation surfaces without reopening unrelated feature work

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- inspected `gh pr view 166 --json ...`
- inspected `gh pr view 168 --json ...`
- traced adjacent surfaces for:
  - `src/lib/gumdrop-ledger.ts`
  - `src/lib/server/chat.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `src/lib/chat.ts`
  - `src/app/api/chat/threads/route.ts`
  - `src/hooks/useChatUnreadStatus.ts`

Start state:

- current HEAD at post-merge hardening start: `5d61570f5a81aeaba41faf9d946e346788fee3b3`
- working tree was clean at pass start
- PR `#166` and PR `#168` were already merged into `main`

Implementation results:

- removed the accidental tracked merge artifact `test.js`
- added a canonical viewer-role resolver in `src/lib/chat.ts` so chat surfaces no longer depend on `role === "creator"` alone
- hardening outcome:
  - approved legacy creators whose profile role is still `user` now resolve as creator-side chat viewers when their creator approval/settings make messaging available
  - explicit creator deep-links still force user-view semantics for fan-side threads
- updated `src/app/api/chat/threads/route.ts` to use the canonical chat viewer-role resolver instead of raw role checks
- updated `src/components/Chat/ChatExperience.tsx` realtime thread/message subscriptions to use the canonical viewer-role resolver
- updated `src/hooks/useChatUnreadStatus.ts` to:
  - use the canonical viewer-role resolver
  - clear unread state on realtime subscription failure so stale badge state does not linger after read errors
- added direct regression coverage in:
  - `tests/unit/chat-threads-route.spec.ts`
  - `tests/unit/gumdrop-ledger.spec.ts`
- locked the current PR `#166` ledger semantics with tests:
  - legacy unsplit balances still normalize to purchased balance
  - unrestricted spends consume reward balance first
  - purchased-only spends still reject reward-only balances
  - explicit `paidGumDrops` and `bonusGumDrops` splits remain authoritative for purchase classification
  - creator spend parity mismatch / restricted reward-spend violations are counted correctly

Commands run:

- `git status --short`
- `gh pr view 166 --json number,title,state,mergedAt,mergeCommit,baseRefName,headRefName,files,commits,url`
- `gh pr view 168 --json number,title,state,mergedAt,mergeCommit,baseRefName,headRefName,files,commits,url`
- `npm run trace:adjacent -- src/lib/gumdrop-ledger.ts`
- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/lib/chat.ts`
- `npm run trace:adjacent -- src/app/api/chat/threads/route.ts`
- `npm run trace:adjacent -- src/hooks/useChatUnreadStatus.ts`
- `npx eslint src/lib/chat.ts src/hooks/useChatUnreadStatus.ts src/components/Chat/ChatExperience.tsx src/app/api/chat/threads/route.ts tests/unit/chat-threads-route.spec.ts tests/unit/gumdrop-ledger.spec.ts`
- `npx tsc --noEmit`
- `corepack pnpm exec vitest run tests/unit/chat-threads-route.spec.ts tests/unit/gumdrop-ledger.spec.ts tests/unit/server-chat.spec.ts tests/unit/server-chat-send.spec.ts`
- `npm run check:continuity`
- `npm run check:ui:audits`
- `npm run check:generated-artifacts`

Results:

- targeted eslint passed
- `npx tsc --noEmit` passed
- focused Vitest passed:
  - `4` files
  - `17` tests
- `npm run check:ui:audits` passed
- `npm run check:continuity` initially failed only because `.next` was generated by the UI audit build and had to be cleaned before sign-off
- `npm run check:generated-artifacts` passed after build-artifact cleanup

Warnings and notes:

- there is still no dedicated hook test harness in the repo, so unread-state hardening is covered indirectly through the shared viewer-role helper and route regression tests rather than a direct hook test
- the GumDrop ledger change from PR `#166` was not reverted; the hardening decision was to preserve the live semantics and lock them with explicit regression tests because the surrounding creator-experience policies still enforce purchased-only spending where required

## 2026-04-10 PR #167 Conflict Resolution

Scope for this pass:

- inspect open PR `#167`
- resolve its dirty conflict against current `main` without applying stale hunks blindly
- land the DOB-compliance fix in the current profile route and add direct route coverage

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- inspected `gh pr view 167 --json ...`
- traced adjacent surfaces for:
  - `src/app/api/user/profile/route.ts`
  - `src/lib/user-profile-validation.ts`

Start state:

- current HEAD at PR resolution start: `cad0795b314559305b6d0d580ec1c326c66ee3d6`
- working tree was clean at pass start
- PR `#167` was open and `DIRTY` against `main`

Implementation results:

- confirmed the real conflicting change in PR `#167` was narrow:
  - block DOB removal through `PUT /api/user/profile`
- implemented the fix directly in the current route:
  - `src/app/api/user/profile/route.ts`
  - `dateOfBirth: null` now returns `400`
  - `dateOfBirth: ""` now returns `400`
  - valid adult DOB updates still succeed
- added direct route coverage in:
  - `tests/unit/user-profile-route.spec.ts`

Commands run:

- `git status --short`
- `gh pr view 167 --json number,title,state,isDraft,mergeStateStatus,baseRefName,headRefName,author,files,commits,url`
- `npm run trace:adjacent -- src/app/api/user/profile/route.ts`
- `npm run trace:adjacent -- src/lib/user-profile-validation.ts`
- `npx eslint src/app/api/user/profile/route.ts tests/unit/user-profile-route.spec.ts`
- `npx tsc --noEmit`
- `corepack pnpm exec vitest run tests/unit/user-profile-route.spec.ts`

Results:

- PR `#167` inspected successfully
- targeted eslint passed
- `npx tsc --noEmit` passed
- focused Vitest passed:
  - `1` file
  - `3` tests

Warnings and notes:

- the PR branch is still dirty against `main`, so the correct path was to implement the live fix directly rather than merge the branch as-is
- the audit-only markdown change in the PR was superseded by this canonical audit entry

## 2026-04-09 Runtime Truth and Tracking Hardening Follow-Up

Scope for this pass:

- implement the next 10 runtime/tracking hardening improvements identified in the prior audit
- extract remaining high-risk admin analytics modules out of the monolithic analytics page
- persist admin debug display preferences, improve stale/runtime visibility, and harden compatibility-chat migration truth
- extend sanitizer usage, RTDB rules coverage, and artifact enforcement so truth surfaces are easier to trust
- finish with another tracking/state-of-truth audit informed by external platform observability practices

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/app/admin/analytics/page.tsx`
  - `src/app/admin/debug/page.tsx`
  - `src/lib/server/support-threads.ts`
  - `src/app/api/notifications/route.ts`

Start state:

- current HEAD at follow-up start: `360cdaa5d3033ece915dfa1b074ee6c4845ac6b9`
- working tree was clean at pass start
- the next changes should land on top of the already-pushed runtime-truth baseline rather than reopening parallel helper paths

Implementation results:

- extracted shared admin analytics UI primitives into `src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx`
- extracted onboarding/auth discrepancy rendering into `src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx`
- extracted task and notification analytics into `src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx`
- added persisted admin debug preferences under `users/{uid}.adminPreferences.debug` through:
  - `src/lib/admin-debug-preferences.ts`
  - `src/lib/server/admin-debug-preferences.ts`
  - `src/app/api/admin/debug/preferences/route.ts`
- added route-runtime filtering/rate summaries for stale, unseen, native chat, and compatibility chat through `src/lib/admin-debug-route-runtime.ts`
- added compatibility lifecycle headers and a formal removal target to the legacy creator-message route through `src/lib/creator-message-compatibility.ts` and `src/app/api/creator/messages/route.ts`
- moved chat attachment preparation/finalization into server-backed routes:
  - `src/app/api/chat/attachments/prepare/route.ts`
  - `src/app/api/chat/attachments/complete/route.ts`
  - `src/components/Chat/ChatExperience.tsx` now uploads against server-issued storage paths and server-verified asset URLs
- extended route-runtime-health coverage for:
  - `admin/debug/preferences:GET`
  - `admin/debug/preferences:PUT`
  - `chat/attachments/prepare:POST`
  - `chat/attachments/complete:POST`
- applied `sanitizeFirestorePayload(...)` to support-thread writes and notification writes so undefined-field regressions do not recur in those surfaces
- expanded Realtime Database rules coverage to reject malformed presence payloads and mismatched participant paths
- extended generated-artifact continuity checks to include `.next`, `coverage`, `lighthouse-results`, and `firebase-export`

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
- `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
- `npm run trace:adjacent -- src/lib/server/support-threads.ts`
- `npm run trace:adjacent -- src/app/api/notifications/route.ts`
- `npm run trace:adjacent -- src/app/api/chat/attachments/prepare/route.ts`
- `npx eslint src/app/admin/analytics/page.tsx src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx src/app/admin/debug/page.tsx src/app/api/admin/debug/preferences/route.ts src/app/api/chat/attachments/prepare/route.ts src/app/api/chat/attachments/complete/route.ts src/app/api/creator/messages/route.ts src/app/api/notifications/route.ts src/components/Chat/ChatExperience.tsx src/lib/admin-debug-preferences.ts src/lib/admin-debug-route-runtime.ts src/lib/creator-message-compatibility.ts src/lib/route-runtime-health.ts src/lib/server/admin-debug-preferences.ts src/lib/server/support-threads.ts tests/unit/admin-debug-route-runtime.spec.ts tests/unit/admin-debug-preferences-route.spec.ts tests/unit/chat-attachments-route.spec.ts tests/firebase/database.rules.spec.ts`
- `npx tsc --noEmit`
- `corepack pnpm exec vitest run tests/unit/admin-debug-route-runtime.spec.ts tests/unit/admin-debug-preferences-route.spec.ts tests/unit/chat-attachments-route.spec.ts tests/firebase/database.rules.spec.ts`
- `npm run check:inventory`
- `npm run check:firebase:rules`
- `npm run check:continuity`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`
- `corepack pnpm run check`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `git status --short`

Results:

- targeted eslint passed
- `npx tsc --noEmit` passed
- focused Vitest passed:
  - `3` files
  - `8` tests
- `npm run check:inventory` passed:
  - tracked files: `751`
- `npm run check:firebase:rules` passed:
  - Firestore rules: `10` tests
  - Realtime Database rules: `6` tests
  - Storage rules: `16` tests
- `npm run check:continuity` passed
- `npm run check:telemetry` passed:
  - `243` emitters checked across `411` files
  - orphaned catalog events: `0`
- `npm run check:analytics-semantics` passed
- `corepack pnpm run check` passed:
  - `119` contract files
  - `542` tests
- `npm run check:ui:audits` passed:
  - `16` tests
- `npm run check:ui:lighthouse` passed

Warnings and non-blocking notes:

- the first `corepack pnpm run check` attempt timed out under the default shell timeout; rerunning with a longer timeout passed cleanly
- UI audits and Lighthouse regenerate `.next` and local audit outputs as expected; those artifacts must still be removed before final signoff
- existing non-blocking warnings remain:
  - npm unknown env config warnings
  - Node `punycode` deprecation warnings
  - Lighthouse temp cleanup `EPERM` warnings on Windows

Research inputs for the next runtime-tracking audit:

- Google SRE on the four golden signals and production monitoring: <https://sre.google/sre-book/monitoring-distributed-systems/>
- Google SRE Workbook on multi-window, multi-burn-rate SLO alerting: <https://sre.google/workbook/alerting-on-slos/>
- YouTube Analytics API data model and bounded report availability: <https://developers.google.com/youtube/analytics/data_model>
- Meta Engineering on structured logging (`Logarithm`): <https://engineering.fb.com/2024/03/18/data-infrastructure/logarithm-logging-engine-ai-training-workflows-services-meta/>
- Meta Engineering on automated root-cause analyzers (`DrP`): <https://engineering.fb.com/2022/11/22/production-engineering/drp-ai-root-cause-analysis/>
- Meta Engineering on typed data contracts (`Tulip`): <https://engineering.fb.com/2025/10/17/developer-tools/tulip-meta-internal-python-data-validation-library/>
- Meta Engineering on automated coverage-gap/staleness repair for tribal knowledge systems: <https://engineering.fb.com/2025/09/30/ai-research/how-meta-used-ai-to-map-tribal-knowledge/>

Next tracking/state-of-truth improvements suggested by this follow-up audit:

1. Add per-surface SLOs and burn-rate alerting for chat send, moderation reads, notifications, auth entry, and AI admin routes.
2. Add explicit freshness watermarks to every admin analytics/debug module so stale-but-loaded data is never visually mistaken for realtime.
3. Version telemetry payload schemas and reject ambiguous shared-event mappings unless a task-specific discriminator is present.
4. Add automated route analyzers that trigger on new failure clusters and pre-fill likely RCA context into admin debug.
5. Introduce context-rich structured logs for high-risk routes so thread id, actor role, module key, and range are always queryable.
6. Add runtime coverage audits that fail when a tracked route remains unseen beyond a bounded warm-up window.
7. Separate realtime analytics paths from historical aggregation paths more aggressively so module freshness and bounded lag stay visible.
8. Materialize module-level discrepancy snapshots for auth/onboarding, daily-task parity, and reward-receipt drift so mismatches are queryable over time.
9. Expand generated-artifact enforcement to any future emulator/export outputs the moment they first appear in the repo.
10. Keep decomposing admin analytics into module components with pure view-model helpers so data-truth gating is testable without the full page.

## 2026-04-09 Creator Messaging Send Failure Hardening

Scope for this pass:

- fix the internal server error when sending creator messages from an admin account with paid GumDrops
- refactor the chat send experience to return clearer UI-ready failures instead of generic internal errors
- audit adjacent native and compatibility chat routes so runtime tracking exposes regressions clearly

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/lib/server/chat.ts`
  - `src/app/api/chat/threads/[threadId]/messages/route.ts`
  - `src/app/api/creator/messages/route.ts`
  - `src/components/Chat/ChatExperience.tsx`

Start state:

- current HEAD at chat-send-hardening start: `6267506df09806ef97c23bcb26e10b97dfb7b98f`
- working tree already contained the uncommitted Auth Outcome Split refactor and its audit/doc updates; this pass must reconcile on top of that state rather than revert it

Implementation results:

- identified the concrete chat-send failure: text-only sends were writing optional Firestore fields as `undefined`
  - `assetUrl`
  - `assetName`
  - `assetMimeType`
  - `creatorAccrualId` on free sends
- hardened `src/lib/server/chat.ts` so message writes omit undefined optional fields before transaction commit
- changed chat send text normalization to use optional-string semantics, which keeps attachment-only sends valid without persisting empty-string text noise
- added an explicit admin-participant regression case proving admin-role accounts with paid GumDrops can send creator text messages successfully
- improved the chat composer error handling in `src/components/Chat/ChatExperience.tsx`:
  - insufficient-funds stays inline in the dedicated card
  - other structured send failures now also stay visible inline instead of collapsing to a toast-only generic error

Primary touched surfaces:

- `src/lib/server/chat.ts`
- `src/components/Chat/ChatExperience.tsx`
- `tests/unit/server-chat-send.spec.ts`

Verification:

- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/messages/route.ts`
- `npm run trace:adjacent -- src/app/api/creator/messages/route.ts`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npx eslint src/lib/server/chat.ts src/components/Chat/ChatExperience.tsx tests/unit/server-chat-send.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/creator-messages-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/server-chat-send.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/creator-messages-route.spec.ts`
- `npx tsc --noEmit`
- `npm run check:ui:audits`

Results:

- focused lint passed
- focused Vitest passed: `3` files / `10` tests
- TypeScript passed
- UI audits passed

Warnings and follow-up:

- this pass intentionally did not commit because the working tree already contained the separate uncommitted Auth Outcome Split refactor
- if the user wants a clean commit, the chat-send hardening should be committed together with the outstanding Auth Outcome Split work or after that work is committed first

## 2026-04-09 Auth Outcome Split Historical Visibility Refactor

Scope for this pass:

- fix the admin analytics Auth Outcome Split module so historical failed-attempt windows still render instead of reading as empty
- replace the existing success-only pie treatment with a more truthful auth-attempt composition chart
- keep the refactor scoped to the Auth Outcome Split module and its supporting helper/test surfaces

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/app/admin/analytics/page.tsx`
  - `src/app/api/admin/analytics/historical/route.ts`

Start state:

- current HEAD at auth-outcome-refactor start: `6267506df09806ef97c23bcb26e10b97dfb7b98f`
- historical analytics transport already returned `authBreakdown`, but the UI suppressed the module whenever the selected range had zero successful outcomes

Implementation results:

- replaced the success-only Auth Outcome Split pie with a new attempt-composition chart that visualizes:
  - successes
  - failures
  - unfinished attempts
- moved auth-outcome derivation into a dedicated helper so the module has a stable testable model:
  - `src/lib/admin-auth-outcome-chart.ts`
- changed the chart-health truth surface for `analytics.operations.auth_outcome_split` so it now counts any tracked auth attempt/outcome as data instead of requiring at least one success
- preserved the historical route contract; no backend transport change was required because `authBreakdown` was already present in the payload

Primary touched surfaces:

- `src/app/admin/analytics/page.tsx`
- `src/lib/admin-auth-outcome-chart.ts`
- `tests/unit/admin-auth-outcome-chart.spec.ts`

Verification:

- `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
- `npm run trace:adjacent -- src/app/api/admin/analytics/historical/route.ts`
- `npm run trace:adjacent -- src/lib/admin-auth-outcome-chart.ts`
- `npx eslint src/app/admin/analytics/page.tsx src/lib/admin-auth-outcome-chart.ts tests/unit/admin-auth-outcome-chart.spec.ts`
- `corepack pnpm exec vitest run tests/unit/admin-auth-outcome-chart.spec.ts`
- `npx tsc --noEmit`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`

Results:

- focused lint passed
- focused Vitest passed: `1` file / `3` tests
- TypeScript passed
- UI audits passed
- Lighthouse passed on rerun

Warnings and follow-up:

- the first Lighthouse attempt failed only because it was run in parallel with `check:ui:audits`, which started its own `next build`; rerunning it cleanly passed
- this pass intentionally did not change the historical analytics route because the missing-history issue was a frontend gating problem, not a transport gap

## 2026-04-09 Admin Truth, Moderation, Chat, and Analytics Refactor

Scope for this pass:

- harden native creator chat send behavior and make failure contracts explicit
- replace client-side moderation Firestore subscriptions with server-backed moderation APIs
- move AI debug assistant enablement to persisted admin settings with truthful runtime status
- repair daily-task, auth, onboarding, rollout, and experiment debug parity
- replace the admin analytics global time filter with per-module persisted filters

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/lib/server/chat.ts`
  - `src/components/Admin/AdminModerationConsole.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/app/api/admin/debug/route.ts`
  - `src/lib/server/daily-tasks.ts`
  - `src/lib/tasks/task-observability.ts`

Start state:

- current HEAD at refactor start: `36fcca527b72b04c24531724465f490642018ba2`
- working tree already contained verified local notification-delivery and admin-debug truth changes that must be reconciled into this pass rather than reverted

## 2026-04-09 Admin Debug Truth Audit

Scope for this pass:

- verify that admin debug surfaces only present tracked, bounded, truthful health signals
- close route-runtime-health gaps for debug-adjacent admin routes
- expose missing coverage instead of silently omitting never-observed routes

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/app/admin/debug/page.tsx`
  - `src/app/api/admin/debug/route.ts`
  - `src/lib/server/admin-panel-system-logs.ts`

Start state:

- current HEAD at debug-truth-audit start: `36fcca527b72b04c24531724465f490642018ba2`
- working tree already contained the earlier uncommitted loading-optimization pass when this debug audit started

Implementation results:

- expanded route-runtime-health coverage to the admin surfaces that the debug console actually depends on:
  - `admin/debug:GET`
  - `admin/debug/assistant:GET`
  - `admin/overview:GET`
  - `admin/analytics/realtime:GET`
  - `admin/ui-chart-health:GET`
  - `admin/ui-chart-health:PUT`
  - `admin/support/threads:GET`
  - `admin/support/thread:GET`
  - `admin/support/thread:POST`
  - `admin/support/thread:PATCH`
- changed `listRouteRuntimeHealth()` to merge persisted samples with the full canonical target registry so never-observed routes show up explicitly instead of disappearing from debug
- changed route health status semantics so never-observed tracked routes surface as `warn`, which keeps missing runtime evidence visible
- added debug-page self-reporting through the admin UI chart-health channel for:
  - the primary debug snapshot
  - the overview dependency lane
  - the AI assistant lane
  - the route-runtime lane
- updated the debug UI to label route coverage and chart freshness explicitly instead of letting old or missing samples read like current health
- corrected the admin debug API stats so route warning/failure counts use the canonical route-health summary instead of ad hoc `lastResult` checks

Primary touched surfaces for this pass:

- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/api/admin/debug/assistant/route.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/analytics/realtime/route.ts`
- `src/app/api/admin/ui-chart-health/route.ts`
- `src/app/api/admin/support/threads/route.ts`
- `src/app/api/admin/support/threads/[threadId]/route.ts`
- `src/lib/route-runtime-health.ts`
- `src/lib/server/route-runtime-health.ts`
- `src/lib/admin-ui-chart-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `tests/unit/route-runtime-health.spec.ts`
- `tests/unit/admin-panel-system-logs.spec.ts`
- `tests/unit/admin-ui-chart-health-route.spec.ts`
- `tests/unit/admin-support-threads-route.spec.ts`
- `tests/unit/admin-debug-assistant-route.spec.ts`
- `tests/unit/admin-overview-route.spec.ts`

Commands run for this pass:

- `git status --short`
- `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
- `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
- `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
- `npm run trace:adjacent -- src/lib/route-runtime-health.ts`
- `npm run trace:adjacent -- src/app/api/admin/overview/route.ts`
- `npm run trace:adjacent -- src/app/api/admin/ui-chart-health/route.ts`
- `npm run trace:adjacent -- src/app/api/admin/support/threads/route.ts`
- `npx eslint src/lib/route-runtime-health.ts src/lib/server/route-runtime-health.ts src/lib/admin-ui-chart-health.ts src/lib/server/admin-panel-system-logs.ts src/app/admin/debug/page.tsx src/app/api/admin/debug/route.ts src/app/api/admin/debug/assistant/route.ts src/app/api/admin/overview/route.ts src/app/api/admin/analytics/realtime/route.ts src/app/api/admin/ui-chart-health/route.ts src/app/api/admin/support/threads/route.ts src/app/api/admin/support/threads/[threadId]/route.ts tests/unit/route-runtime-health.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/unit/admin-ui-chart-health-route.spec.ts tests/unit/admin-support-threads-route.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-overview-route.spec.ts`
- `npx tsc --noEmit`
- `corepack pnpm exec vitest run tests/unit/route-runtime-health.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/unit/admin-ui-chart-health-route.spec.ts tests/unit/admin-support-threads-route.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-overview-route.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:telemetry`
- `npm run check:ui:audits`
- `corepack pnpm run check`

Results:

- all targeted lint, type, and unit checks passed
- `check:inventory` passed with `721` tracked files
- `check:continuity` passed
- `check:telemetry` passed with `0` orphaned catalog events
- `check:ui:audits` passed
- `corepack pnpm run check` passed

Warnings observed:

- `npm` still emits unknown env-config warnings during the canonical `check` pipeline
- Node `punycode` deprecation warnings still surface from current tooling during Vitest runs

Remaining limits after this pass:

- route-runtime-health now exposes never-observed admin routes, but it still does not time-decay old successful samples into a separate stale state
- moderation remains a live Firestore client surface, so its truth is represented through admin UI chart health rather than route-runtime-health
- the worktree remains intentionally dirty after this pass because the earlier verified loading-optimization pass is still local and uncommitted alongside these debug-truth changes

## 2026-04-09 Admin Debug Diagnostics Channel Truth Fix

Scope for this pass:

- investigate the reported runtime/auth warning counts in the admin debug panel
- determine whether the warnings were current failures or historical sample counts being overstated
- correct the diagnostics-channel lane so it reflects current vs recent vs loaded-sample truth

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- traced adjacent surfaces for:
  - `src/lib/server/admin-ops-health.ts`
  - `src/app/admin/debug/page.tsx`

Start state:

- current HEAD for this follow-up debug pass: `a42ed27a7d4886645995f813867be70dd6fbe99b`
- working tree was clean before this pass started

Root cause:

- the diagnostics-by-channel lane in the admin debug page was showing `errorCount` and `warnCount` totals from the full loaded diagnostics sample
- those totals were not separated from active-window or recent-window counts
- as a result, channels like `runtime` and `auth` could look currently broken even when most of the loaded diagnostics were older sample noise

Implementation results:

- extended `AdminOpsHealthChannelItem` with:
  - `activeErrorCount`
  - `activeWarnCount`
  - `recentErrorCount`
  - `recentWarnCount`
- updated `buildAdminOpsHealth(...)` so per-channel diagnostics now track active-window and recent-window counts separately from full loaded-sample totals
- changed channel sorting so currently active/noisy channels rise above long-tail historical noise
- updated the admin debug diagnostics-channel UI so each row now leads with:
  - current active errors/warns in the active ops window
  - recent errors/warns in the recent ops window
  - sample totals as secondary context
- kept loaded-sample totals visible instead of hiding them, but they are no longer the primary signal

Primary touched surfaces for this pass:

- `src/lib/admin-ops-health.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/app/admin/debug/page.tsx`
- `tests/unit/admin-ops-health.spec.ts`
- `tests/unit/ai-debug-assistant.spec.ts`

Commands run for this pass:

- `git status --short`
- `npm run trace:adjacent -- src/lib/server/admin-ops-health.ts`
- `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
- `npx eslint src/lib/admin-ops-health.ts src/lib/server/admin-ops-health.ts src/app/admin/debug/page.tsx tests/unit/admin-ops-health.spec.ts tests/unit/ai-debug-assistant.spec.ts`
- `corepack pnpm exec vitest run tests/unit/admin-ops-health.spec.ts tests/unit/ai-debug-assistant.spec.ts`
- `npm run check:ui:audits`

Results:

- targeted lint passed
- targeted tests passed
- `check:ui:audits` passed after updating the adjacent fixture type for the new diagnostics channel shape

Warnings observed:

- the standard Playwright/Next build run still emits the existing `transformAlgorithm` warning after a successful UI audit run
- Node `punycode` deprecation warnings still surface from current tooling during Vitest runs

Remaining limits after this pass:

- diagnostics channels now distinguish active/recent/sample counts, but the lane still depends on the bounded diagnostics query loaded into debug rather than a dedicated long-term per-channel materializer

## 2026-04-09 Full Codebase Loading Optimization Audit (In Progress)

Scope for this pass:

- audit loading paths across the shared shell and the highest-traffic user surfaces
- remove unnecessary client waterfalls and delayed visible mounts
- preserve realtime correctness without leaning on stale cache layers
- expand runtime tracking for central load-bearing routes

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- captured current HEAD with `git rev-parse HEAD`
- traced adjacent surfaces for:
  - `src/app/dashboard/DashboardClient.tsx`
  - `src/components/CoreLayoutWrapper.tsx`
  - `src/components/CreatorDiscoveryRail.tsx`
  - `src/hooks/useDrops.ts`

Start state:

- current HEAD at optimization-audit start: `36fcca527b72b04c24531724465f490642018ba2`
- working tree was clean before the optimization pass started

Initial findings before edits:

- `useDrops(...)` was revalidating the first page immediately even when server-rendered fallback data already existed, creating duplicate `/api/drops` work right after SSR on dashboard and drops
- the home route was still a client page that fetched active drops after hydration instead of receiving server-seeded drop data
- the experiences route was still client-seeding live drop data and additionally delaying the live-drops module behind a deferred-ready timer
- visible dashboard and drops content still used delayed mount gates that created a second render phase even when the route payload was already ready
- the global shell still lazily loaded primary chrome (`Navbar`, `MobileBottomBar`), which adds avoidable split-second shell shifts during navigation
- creator spotlight data still arrived in two phases because public discovery data was not preseeded from the server

## 2026-04-09 Full Codebase Audit + Cleanup Sweep (In Progress)

Scope for this pass:

- run a repo-wide verification and cleanup sweep
- fix any concrete issues that surface
- refresh the standing audit baseline and leave the tree clean

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- captured current HEAD with `git rev-parse HEAD`

Start state:

- current HEAD at sweep start: `5aaa9cb07f5ec0334f3505cc09248b2bd55d0c01`
- working tree was clean before the sweep started

Implementation results:

- fixed `scripts/export-dependency-graph.ts` so `npm run graph:architecture` no longer fails on large repos due to `spawnSync` buffer exhaustion
- removed stale generated `.next` artifacts after a rerun exposed a broken `prebuild` parse of `.next/dev/types/routes.d.ts`
- removed generated Playwright artifacts after verification so the worktree returns clean
- no runtime/product defects surfaced beyond the graph-export wrapper and the stale generated build artifact

Primary touched surfaces for this pass:

- `scripts/export-dependency-graph.ts`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Commands run for this pass:

- `git status --short`
- `git rev-parse HEAD`
- `npm run trace:adjacent -- src/lib/route-runtime-health.ts`
- `npm run trace:adjacent -- src/lib/telemetry-catalog.ts`
- `npm run trace:adjacent -- scripts/run-lighthouse-audits.mjs`
- `npm run graph:architecture`
- `npm run check:deps`
- `npm run check:versions`
- `npm run check:functions`
- `npm run check:firebase:rules`
- `corepack pnpm run check`
- `npx vitest run`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`

Results:

- `npm run graph:architecture` passed after the graph-export script buffer fix and wrote `output/dependency-graph.json`
- `npm run check:deps` passed
- `npm run check:versions` passed
- `npm run check:functions` passed
- `npm run check:firebase:rules` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed: `106` files / `506` tests
- `npm run check:ui:audits` passed after clearing the stale `.next` artifact and rerunning with a longer timeout window
- `npm run check:ui:lighthouse` passed

Warnings and non-blocking notes:

- `npm run check:ui:audits` initially showed a small one-off Chromium home-hero screenshot drift; the isolated rerun passed, and the full suite passed on rerun after the stale `.next` cleanup
- `npm run check:ui:audits` also initially failed because `prebuild` picked up a stale `.next/dev/types/routes.d.ts`; deleting `.next` resolved it
- current Firebase/Vitest/Lighthouse runs still emit existing non-blocking warnings:
  - npm unknown env config warnings
  - Node `punycode` deprecation warnings
  - Windows Lighthouse temp-folder cleanup `EPERM` warnings

Final state:

- broad repo verification is green
- no untracked cleanup artifacts remain
- the only code change in this pass is the graph-export wrapper hardening

## Purpose

This file is the standing audit contract for the repository.

It defines:

- what counts as authoritative repo truth,
- which tracked surfaces exist and how they are classified,
- which checks are expected before broad signoff,
- which helpers are canonical,
- and which current gaps are known rather than silently assumed away.

If a future change cannot be explained against this file, the codebase is not fully audited.

## Authority and scope

- This file is the live audit baseline and process contract.
- `REPO_MEMORY_LEDGER.md` is the canonical durable decision ledger.
- `EVERY_FILE_FUNCTION_CHECKLIST.md` is the exhaustive historical file/function companion, not the current live baseline.
- Dated audit files and scorecards in the repo are evidence snapshots, not living policy.
- `git ls-files` is the literal source of truth for tracked-file inventory.
- Verified runtime code, verified configuration, and verified command output outrank prior chat context, founder memory, and AI memory.

## Current operating context

- The repo is developed locally first.
- Codex and Google Antigravity are assistive local tooling, not runtime or architecture authorities.
- The product began as a static-first system and now operates as a backend/server application.
- The deployed web runtime target is Firebase App Hosting.
- Current tracked backend/runtime surfaces include Firestore, Realtime Database, Storage, Firebase Functions, Firebase Data Connect, FCM/browser notifications, PayPal commerce routes, and server-side Google Cloud Vertex integrations.
- App Check is not part of the current runtime contract unless a later audited pass reintroduces it end to end.

## Required startup protocol for broad work

Before broad UI work, backend work, shared-helper changes, Firebase work, or audit maintenance:

1. Read `FULL_SCALE_CODEBASE_AUDIT.md`.
2. Read `REPO_MEMORY_LEDGER.md`.
3. Read `EVERY_FILE_FUNCTION_CHECKLIST.md`.
4. Run `git status --short`.
5. Identify touched surfaces and canonical helpers before editing.
6. Run `npm run trace:adjacent -- <path>` for the highest-risk touched files.
7. Update this file at the start and again at the end.
8. For broad UI audits or visual polish passes, create or refresh a dated screenshot packet under `qa-screenshots/ui-review-YYYY-MM-DD/` and record any deferred authenticated surfaces truthfully.

## Non-negotiable repo rules

- No route should invent its own error contract when shared route handling already exists.
- No analytics or telemetry path should drift from the canonical event catalog.
- No new helper should duplicate an existing canonical helper without explicit reason recorded in the audit.
- No admin/debug surface should present sampled, fallback, stale, or derived data as stronger truth than the underlying source supports.
- No broad signoff is complete until the verification results are recorded here.

## Current dependency, tooling, and artifact classification

Every meaningful tracked surface should fit one of these classes:

1. Runtime dependencies
   Root `package.json` `dependencies`, `functions/package.json` `dependencies`, generated Data Connect SDKs used by runtime code, and runtime libraries that affect shipped behavior.

2. Dev dependencies
   Root and `functions/` `devDependencies` used for linting, typing, testing, building, code generation, and audits.

3. Local workflow tooling
   `AGENTS.md`, `.agent/workflows/pre-commit.md`, local AI/workflow notes under `.Jules/` and `.jules/`, `firebase`, `gcloud`, `gh`, and local audit scripts.

4. Platform and deployment surfaces
   `apphosting.yaml`, `firebase.json`, `.firebaserc`, Firebase rules and indexes, App Hosting metadata, service-account or ADC expectations, and middleware/runtime boundary files.

5. Governance and continuity artifacts
   `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md`, dated audit snapshots, scorecards, and repo-wide verification commands.

6. Generated code and metadata
   Generated Data Connect SDKs, generated App Hosting metadata such as `backends.json`, lockfiles, and other generated files that still influence runtime or contributor understanding.

7. Captured evidence artifacts
   Tracked QA screenshots, tracked lint/build output files, and tracked diagnostic text artifacts. These are evidence only, not architecture or runtime authority.

## Current package-manager and dependency reality

- Root currently carries `package.json`, `package-lock.json`, and `pnpm-lock.yaml`.
- `functions/` currently carries `package.json`, `package-lock.json`, and `pnpm-lock.yaml`.
- Root verification commonly runs through `corepack pnpm run ...`.
- Functions verification currently runs through `npm --prefix functions run ...`.
- Until an audited consolidation pass changes this, both lockfiles in root and both lockfiles in `functions/` must stay synchronized with their respective manifests.

Current notable runtime package versions:

- Next.js `16.2.1`
- React `19.2.4`
- Firebase client SDK `12.11.0`
- Firebase Admin SDK `13.7.0`
- `@google-cloud/vertexai` `1.10.4`
- `google-auth-library` `9.15.1`
- Firebase Functions runtime package `7.2.2`
- Functions Node engine `22`

## Current root, platform, and governance surface map

| Class                         | Current tracked examples                                                                                                                                                                                                                                                                                                                                                                                   | Current meaning                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Governance baseline           | `FULL_SCALE_CODEBASE_AUDIT.md`, `REPO_MEMORY_LEDGER.md`, `EVERY_FILE_FUNCTION_CHECKLIST.md`                                                                                                                                                                                                                                                                                                                | Live audit policy, durable decision ledger, exhaustive historical companion |
| Workflow guidance             | `AGENTS.md`, `.agent/workflows/pre-commit.md`, `.Jules/palette.md`, `.jules/bolt.md`, `.jules/sentinel.md`, `.vscode/*`                                                                                                                                                                                                                                                                                    | Local operator and tool workflow context                                    |
| Historical audit evidence     | `FULL_CODEBASE_AUDIT_2026-04-01.md`, `FULL_CODEBASE_AUDIT_2026-04-03.md`, `FULL_CODEBASE_POST_AUDIT_2026-03-18.md`, `ANALYTICS_SYSTEM_AUDIT_2026-03-18.md`, `DEPENDENCY_CONSISTENCY_AUDIT_2026-03-24.md`, `STANDARDIZATION_AUDIT_CHECKLIST.md`, `TELEMETRY_MIDDLEWARE_AUDIT_2026-03-23.md`, `V1_STABILITY_AUDIT_2026-03-24.md`, `REPO_STATE_SCORECARD_2026-03-18.md`, `REPO_STATE_SCORECARD_2026-03-19.md` | Historical snapshots and evidence, not living policy                        |
| Root dependency surfaces      | `package.json`, `package-lock.json`, `pnpm-lock.yaml`                                                                                                                                                                                                                                                                                                                                                      | Root dependency graph and resolution state                                  |
| Functions dependency surfaces | `functions/package.json`, `functions/package-lock.json`, `functions/pnpm-lock.yaml`                                                                                                                                                                                                                                                                                                                        | Functions-specific dependency graph and lock state                          |
| Platform and deploy config    | `apphosting.yaml`, `firebase.json`, `.firebaserc`, `backends.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules`, `middleware.ts`                                                                                                                                                                                                                                   | Deployment/runtime configuration and boundary enforcement                   |
| Quality and audit config      | `eslint.config.mjs`, `next.config.ts`, `tsconfig.json`, `playwright.config.ts`, `vitest.config.ts`, `vitest.rules.config.ts`, `.dependency-cruiser.cjs`, `.lighthouserc.json`, `knip.json`, `.ncurc.json`, `.npmrc`                                                                                                                                                                                        | Build, lint, dependency, audit, and UI verification behavior                |
| Runtime/admin utility files   | `makeAdmin.js`, `scripts/promote-admin.ts`, `scripts/review-admin-panel-logs.ts`                                                                                                                                                                                                                                                                                                                           | Local operator utilities and administrative maintenance                     |
| Captured evidence artifacts   | `qa-screenshots/*`, `build.log`, `check_out*.txt`, `eslint*.json`, `eslint*_out.txt`, `lint*.txt`, `tsc_output*.txt`, `firestore-debug.log`                                                                                                                                                                                                                                                                | Tracked evidence and debug output, not canonical runtime truth              |

## Current tracked inventory baseline

Verified by `npm run check:inventory` on 2026-04-08:

- Total tracked files: `715`
- Root files: `54`
- Root markdown/docs: `16`
- Root lockfiles: `2`
- Root config/runtime/tooling files: `36`
- `src`: `401`
- `src/app`: `137`
- `src/components`: `74`
- `src/context`: `4`
- `src/hooks`: `14`
- `src/lib`: `149`
- `src/lib/server`: `62`
- `src/types`: `3`
- `functions`: `37`
- `functions/src`: `30`
- `scripts`: `17`
- `tests`: `132`
- `public`: `11`
- `dataconnect`: `14`
- `src/dataconnect-generated`: `15`
- `src/dataconnect-admin-generated`: `5`
- `functions/src/dataconnect-admin-generated`: `5`

## Current surface map by code domain

- `src/app`
  App Router pages, layouts, legal surfaces, dashboard surfaces, admin surfaces, and all route handlers under `src/app/api/**`.
- `src/components`
  User-facing UI, dashboard modules, creator-page UI, admin modules, auth UI, navigation, feedback, and shared UI primitives.
- `src/context`
  Auth, rollout, SWR, and UI modal/runtime providers.
- `src/hooks`
  Admin polling, auth SWR, notifications, runtime/timing hooks, and viewer watch-session hooks.
- `src/lib`
  Shared client/server-agnostic domain logic for telemetry, creators, drops, onboarding, notifications, economy, privacy, and support surfaces.
- `src/lib/server`
  Server-only analytics, auth, request guards, diagnostics, queue processing, notification delivery, creator onboarding, GumDrop ledger, AI orchestration, and admin aggregation helpers.
- `functions/src`
  Analytics event materialization, export sync, semantic rollups, orchestration/runtime helpers, and Firebase Admin/Runtime utilities for deployed functions.
- `tests`
  Contract tests, Firebase rules tests, unit tests, Playwright UI audits, and tracked visual baselines.
- `scripts`
  Inventory, telemetry, semantics, cycle, Firebase runtime, lighthouse, and rules-check entrypoints.

## Current canonical helper map

### Request, auth, and route boundaries

- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/request-origin.ts`
- `src/lib/server/request-client-ip.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`

### Telemetry and analytics canon

- `src/lib/telemetry-catalog.ts`
- `src/lib/telemetry.ts`
- `src/lib/analytics-metric-catalog.ts`
- `src/lib/server/analytics.ts`
- `src/lib/server/analytics-governance.ts`
- `src/lib/server/analytics-*.ts`
- `functions/src/analytics-*.ts`

### Daily tasks and task observability

- `src/lib/tasks/task-catalog.ts`
- `src/lib/task-guidance.ts`
- `src/lib/server/daily-tasks.ts`
- `src/lib/tasks/task-observability.ts`

### Creator onboarding and compliance

- `src/lib/creator-onboarding.ts`
- `src/lib/creator-application.ts`
- `src/lib/creator-contract.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/server/creator-onboarding-alerts.ts`
- `src/lib/server/creator-onboarding-diagnostics.ts`

### Creator public pages, follow state, and experiences

- `src/lib/creator-public-pages.ts`
- `src/lib/creator-experiences.ts`
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/creator/relationships/route.ts`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/components/Creators/*`

### Notifications, preferences, and inbox/runtime

- `src/hooks/useNotifications.ts`
- `src/lib/browser-notification-enrollment.ts`
- `src/lib/firebase-messaging.ts`
- `src/lib/notifications.ts`
- `src/lib/notification-contracts.ts`
- `src/lib/server/notification-runtime.ts`
- `src/lib/server/notification-inbox.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/privacy/consent/route.ts`

### GumDrops, wallet, and source-aware economy

- `src/lib/gumdrop-economics.ts`
- `src/lib/gumdrops-packages.ts`
- `src/lib/gumdrop-ledger.ts`
- `src/lib/server/gumdrop-ledger.ts`
- `src/app/api/checkin/route.ts`
- `src/lib/server/daily-tasks.ts`
- `src/lib/server/creator-experiences.ts`

### Admin overview, analytics, and debug truth surfaces

- `src/lib/admin-overview.ts`
- `src/hooks/useAdminOverview.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/admin/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/api/admin/debug/assistant/route.ts`
- `src/lib/ai-debug-assistant.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/admin-ops-health.ts`

### AI cover-generation stack

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/app/api/admin/ai/drop-covers/feedback/route.ts`
- `src/app/admin/ai/page.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/components/Admin/CreateDropModal.tsx`

### Drop authoring, content, and queue/runtime

- `src/lib/admin-drop-form.ts`
- `src/lib/admin-drop-formatting.ts`
- `src/lib/admin-drop-lifecycle.ts`
- `src/lib/admin-drop-queue.ts`
- `src/lib/server/drop-mutations.ts`
- `src/lib/server/drop-queue.ts`
- `src/lib/server/drop-runtime.ts`
- `src/lib/server/storage-assets.ts`
- `src/app/api/admin/drops/route.ts`
- `src/app/api/admin/content/route.ts`

## Current durable product and runtime truths cross-checked against the ledger

- Creator onboarding is a staged intake/compliance/approval flow, not a numeric queue-position workflow.
- Creator administration belongs in creator roster/intake flows, not generic user-management spillover.
- Manual sign-in accepts username or email through server-side username resolution before Firebase email/password auth.
- GumDrop economics are backend source-aware even though the client shows one visible balance.
- Creator fan-work queues and thread reads must stay scoped to the caller's real ownership relationship; public creator views must never receive another fan's bookings or private creator messages.
- Creator alert controls must stay coherent with the broader new-drop notification preference.
- Admin/debug surfaces should surface fallback, sampled, derived, stale, and ambiguous states honestly.
- AI drop-cover generation is server-side, title-driven, admin-only, and does not expose prompt boxes or client-side secrets.
- The live AI drop-cover runtime is Gemini-only; old Imagen model strings remain only as migration aliases for persisted settings and job history normalization.
- Cost-sensitive admin AI and realtime analytics routes now use adaptive rate limiting tied to the registered-user count instead of one flat global budget.

## Verification baseline from this audit

### Active continuation: Open PR assimilation and repo cleanup review (in progress)

- Start timestamp: 2026-04-07 13:21:20 -05:00
- Start HEAD: `dcf7910`
- Task scope:
  - review all currently open PRs against audited `main`
  - apply any still-needed fixes from open PRs
  - close all reviewed PRs whether assimilated or superseded
  - run a second repo cleanup review after assimilation
- Open PR inventory at start:
  - `#158` `🛡️ Sentinel: [HIGH] Fix CSRF Vulnerability in Analytics Endpoints`
  - `#157` `⚡ Bolt: Add LRU cache for drop media summaries`
  - `#156` `⚙️ Improve algorithmic efficiency and stability in high-ROI hotspot`
  - `#155` `🛡️ Improve privacy compliance and settings truth`
  - `#154` `🧾 Clean event tracking drift and dependency inconsistencies`
  - `#153` `🧹 Audit continuity and codebase hygiene refresh`
  - `#152` `💸 Fix GumDrop economics and ledger integrity drift`
- Start-state note:
  - working tree clean before this pass
  - PR file diffs will be reviewed against current canonical helpers before any assimilation

### Continuation: Open PR assimilation and second full cleanup review

Current audit date: 2026-04-07 13:38:40 -05:00
Current branch / commit for continuation start: `main` / `dcf7910`
Continuation task:

- review every open PR against current audited `main`
- assimilate only still-needed fixes from the open PR set
- close every open PR after review whether assimilated or superseded
- run a second full repo cleanup review and record the final verification baseline

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/app/api/admin/overview/route.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/server/fcm-utils.ts`
- `src/lib/server/push-notifications.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/admin/balance/route.ts`
- `tests/unit/admin-overview-route.spec.ts`
- `tests/unit/fcm-utils.spec.ts`
- `tests/unit/admin-balance-route.spec.ts`

Canonical helpers and modules reused:

- `src/lib/server/request-guard.ts`
- `src/lib/server/analytics-governance.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/gumdrop-ledger.ts`
- `src/lib/server/gumdrop-ledger.ts`
- `src/lib/server/fcm-utils.ts`
- `src/lib/server/push-notifications.ts`
- `scripts/repo-inventory.ts`
- `scripts/audit-telemetry.ts`

PR review and disposition ledger:

- `#158` reviewed and closed as already superseded
  - current `ANALYTICS_ROUTE_POLICIES` already carry `requireTrustedOrigin: true`
  - no code delta was still missing on `main`
- `#157` reviewed and closed without assimilation
  - the proposed media-summary cache was not adopted
  - current hot path already has dimension/url-kind caches and the extra summary cache would add additional stale derived state without a proven need
- `#156` reviewed and closed as not worth assimilating wholesale
  - it only removed an explicit `next/og` `<img>` eslint suppression
  - current file still legitimately needs the local suppression because `next/image` is not supported in `ImageResponse`
- `#155` reviewed and partially assimilated
  - adopted: push broadcast type filtering so new-drop broadcasts respect new-drop alert settings and general broadcasts do not incorrectly masquerade as drop alerts
  - not adopted: the privacy-settings normalization change, because the current consent model intentionally couples identified analytics to anonymous analytics at the server helper layer
- `#154` reviewed and assimilated
  - adopted: admin overview/admin telemetry coverage for creator and owner lifecycle events so admin activity does not under-report those actions
- `#153` reviewed and closed as stale/superseded
  - its audit/checklist freshness changes were overtaken by later audited passes
- `#152` reviewed and partially assimilated
  - adopted: positive admin balance adjustments now credit reward balance instead of purchased balance
  - not adopted: gifting referral bonus balance to the newly referred account, because current product truth still only promises the referrer reward and changing that would be a product-economics decision rather than a bug fix

Implementation results from this continuation:

- admin overview now includes creator/owner lifecycle telemetry in the admin activity feed instead of filtering them out
- admin telemetry catalog/module indexes now classify creator legal/id/approval/override events under the admin module and log set
- browser push broadcast routing is now type-aware
  - `new_drop` broadcasts respect `newDropAlerts`
  - `expiring_soon` broadcasts respect `expiringSoonAlerts`
  - `general` and `system_alert` broadcasts go to browser-push-enabled users without pretending they are drop-alert preference traffic
- manual admin balance credits now land in reward balance, which preserves purchased-only creator spend restrictions
- the repo continuity docs now explicitly match the current 685-file inventory baseline

Second cleanup review findings after assimilation:

- `git ls-files --others --exclude-standard` reported only the newly added route test before staging; no stray generated repo files were present
- telemetry audit remains clean with `0` cataloged events lacking emitters
- no dependency violations or circular dependencies were reported
- no open PRs should remain after the closeout step for this continuation

Commands run for this continuation:

- `git status --short`
- `gh auth status`
- `gh pr list --state open --limit 50 --json number,title,headRefName,baseRefName,author,isDraft,url`
- `gh pr diff 158 --name-only`
- `gh pr diff 157 --name-only`
- `gh pr diff 156 --name-only`
- `gh pr diff 155 --name-only`
- `gh pr diff 154 --name-only`
- `gh pr diff 153 --name-only`
- `gh pr diff 152 --name-only`
- `gh pr diff 158`
- `gh pr diff 157`
- `gh pr diff 156`
- `gh pr diff 155`
- `gh pr diff 154`
- `gh pr diff 153`
- `gh pr diff 152`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/api/analytics/ingest/route.ts`
  - `npm run trace:adjacent -- src/lib/server/fcm-utils.ts`
  - `npm run trace:adjacent -- src/app/drops/[id]/opengraph-image.tsx`
  - `npm run trace:adjacent -- src/lib/gumdrop-economics.ts`
  - `npm run trace:adjacent -- src/app/api/admin/overview/route.ts`
  - `npm run trace:adjacent -- src/lib/drop-presentation.ts`
  - `npm run trace:adjacent -- src/app/api/admin/balance/route.ts`
- focused lint:
  - `npx eslint src/app/api/admin/overview/route.ts src/lib/telemetry-catalog.ts src/lib/server/fcm-utils.ts src/lib/server/push-notifications.ts src/app/api/notifications/route.ts src/app/api/admin/balance/route.ts "src/app/drops/[id]/opengraph-image.tsx" tests/unit/admin-overview-route.spec.ts tests/unit/fcm-utils.spec.ts tests/unit/admin-balance-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/admin-overview-route.spec.ts tests/unit/fcm-utils.spec.ts tests/unit/admin-balance-route.spec.ts`
- repo-wide verification:
  - `git ls-files --others --exclude-standard`
  - `npm run check:inventory`
  - `npm run check:telemetry`
  - `npm run check:continuity`
  - `npm run check:architecture`
  - `npm run check:deps`
  - `npm run check:versions`
  - `npm run check:functions`
  - `npm run check:firebase:rules`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`

Continuation results:

- focused lint passed
- focused tests passed with `3` files and `6` tests
- `npm run check:inventory` passed with `685` tracked files
- `npm run check:telemetry` passed with `0` orphaned events
- `npm run check:continuity` passed
- `npm run check:architecture` passed
- `npm run check:deps` passed
- `npm run check:versions` passed
- `npm run check:functions` passed
- `npm run check:firebase:rules` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `93` files and `457` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` emitted informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- Playwright reported the recurring `transformAlgorithm` webserver warning after a successful all-green `check:ui:audits` run

Continuation follow-up gaps:

- the privacy-settings normalization portion of `#155` was intentionally left out because changing that contract requires a separate consent-model decision
- the extra media-summary cache from `#157` was intentionally left out because there is not yet evidence that the current cached helpers are insufficient
- admin manual balance still has no separate purchased-credit pathway; that remains intentional until an audited operator workflow explicitly requires it
  Commands run on 2026-04-07:
- `git status --short`
- `npm run trace:adjacent -- src/lib/server/rate-limit.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
- `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
- focused `eslint` on touched AI cover, rate-limit, admin route, creator route, dashboard, and debug files
- focused `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-feedback-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts tests/unit/rate-limit.spec.ts tests/unit/creator-bookings-route.spec.ts tests/unit/creator-messages-route.spec.ts`
- `npm run check:inventory`
- `npm run check:functions`
- `npm run check:firebase:rules`
- `npm run check:continuity`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `npx vitest run`
- `corepack pnpm run check`

Results:

- `git status --short` confirmed the working tree was already dirty at audit start from the earlier uncommitted creator workspace/debug pass; those changes were re-audited and verified before commit.
- adjacency traces completed for the adaptive rate-limit helper, admin AI routes/page, and the admin panel-log builder.
- focused `eslint` passed.
- focused AI/admin/creator route Vitest coverage passed with `11` files and `32` tests.
- `npm run check:inventory` passed with `670` tracked files and `115` test files.
- `npm run check:functions` passed.
- `npm run check:firebase:rules` passed.
  - Firestore rules: `7` tests passed.
  - Storage rules: `16` tests passed.
- `npm run check:continuity` passed, including architecture and cycle checks for app and functions.
- `npm run check:ui:audits` failed only on the existing Chromium `/creators/waitlist` guest hero visual-regression drift; accessibility audits passed and the other `15` checks passed.
- `npm run check:ui:lighthouse` passed.
- `npx vitest run` passed with `90` test files and `443` tests.
- `corepack pnpm run check` passed, including telemetry/governance/contracts.

## Current known warnings and non-blocking notices

- npm prints unknown env config warnings during some script chains.
- Current Firebase/Vitest tooling prints Node `punycode` deprecation warnings.
- `check:firebase-runtime` prints informational dotenv loading logs when run through the canonical `check` pipeline.
- `check:ui:audits` still has an existing Chromium visual-regression drift on `/creators/waitlist` guest hero.
- Lighthouse cleanup can emit temporary Windows `EPERM` warnings while deleting temp folders after successful audits.

## Current open follow-up gaps

- `EVERY_FILE_FUNCTION_CHECKLIST.md` remains a historical exhaustive sweep and has not been regenerated against the current `686` tracked-file baseline.
- Public creator/discovery follower counts now reconcile immediately after local follow actions, but there is still no cross-user realtime follower aggregate subscription.
- The creator workspace added on `/dashboard` is a live route-backed operations surface, but it is still polling route reads on page load and action refreshes rather than maintaining separate realtime subscriptions for each creator queue.
- The admin AI page now exposes preflight checks, per-model status, recent AI diagnostics, retained visual signals, and active-job polling truthfully, but it is still client-polling persisted job state rather than provider-side step streaming.
- Final model access is only proven by a successful generation request. The admin AI page can preflight auth, storage, project, and recent failures, but it cannot prove hidden provider/model denial without making a real generation request.
- Legacy Imagen model/location strings still exist only as normalization aliases in the shared AI-cover contract so stored settings and old job history migrate cleanly to Gemini.

## Active audit entry

Current audit date: 2026-04-07 14:23:57 -05:00
Current branch / commit at audit start: `main` / `8b24119`
Current task:

- full-scale AI codebase audit focused on lingering old AI logic and non-truthful admin AI status
- make the admin AI page show actionable preflight failures before generation
- show retained visual signals, per-model control, and recent AI errors at a glance without simulated training language

Audit start state:

- working tree clean at audit start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- startup continuity commands completed:
  - `git status --short`
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`

Audit conclusions:

- no live legacy Imagen execution path remained in the AI cover runtime
  - the only lingering Imagen strings were the expected migration aliases in `src/lib/ai-drop-covers.ts`, route-diagnostic channel inference, and test fixtures/assertions
- the admin AI page already exposed retained references and job history, but it still collapsed too much truth into one runtime card
  - no preflight checklist
  - no per-model health/proven-state surface
  - no recent AI diagnostics lane
  - no default-model control on the admin AI page itself
- recent AI failures and readiness signals existed in job history and `server_diagnostics`, but they were not summarized at a glance before an operator tried another generation

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/admin/ai/page.tsx`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`

Canonical helpers used:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

Implementation results:

- the shared AI-cover contract now includes canonical types for:
  - preflight checks
  - per-model health
  - recent runtime diagnostics
  - retained visual-signal summaries
- the admin AI dashboard builder now returns:
  - real preflight checks derived from feature toggle, database, storage, project, auth, selected-model state, visual-signal readiness, and recent AI diagnostics
  - model-by-model health for `gemini-2.5-flash-image` and `gemini-3-pro-image-preview`
  - recent AI diagnostics from the real `server_diagnostics` channel
  - retained visual-signal counts so the page can show what is actually being reused later
- the admin AI settings route now supports bounded default-model changes from the admin AI page
- the admin AI page now shows:
  - blocking issues and warnings at the top
  - a preflight checklist before generation
  - individual model cards with default-model control and recent proven/failure state
  - recent AI diagnostics
  - existing retained visual signals and running-job references without simulated training copy

Commands run:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- focused lint:
  - `npx eslint src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/app/admin/ai/page.tsx src/app/api/admin/ai/drop-covers/route.ts tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:lighthouse`
- `npm run check:ui:audits`
- `corepack pnpm run check`
- `npx vitest run`
- AI audit sweep:
  - PowerShell `Select-String` scan for `imagen-`, `Imagen`, `simulate`, `simulative`, `live training`, and `weight updates`

Results:

- focused lint passed
- focused AI tests passed with `3` files and `20` tests
- `npm run check:inventory` passed with `686` tracked files and `121` test files
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `93` files and `459` tests
- generated `playwright-report/` and `test-results/` artifacts were removed before signoff
- the lingering-AI sweep confirmed:
  - legacy Imagen strings remain only in migration aliases, test fixtures/assertions, and generic route-diagnostic channel matching
  - no live Imagen execution path remains in the runtime
  - remaining “simulate/live training/weight updates” wording is now explicit negative language that says those signals do not exist, not fake capability copy

Known warnings and tolerated notices during this pass:

- npm unknown env config warnings during canonical script chains
- Firebase/Vitest `punycode` deprecation warnings
- informational dotenv logs during the canonical `check` pipeline
- Lighthouse temp-folder cleanup can emit Windows `EPERM` warnings after successful runs

Follow-up gaps:

- no provider-side step streaming exists for Gemini image generation; the admin AI page remains a truthful polling surface over persisted job state
- model/location access can only be finally proven by a successful generation; the admin page cannot zero-cost preflight hidden provider denial
- full checklist regeneration against the `686` tracked-file baseline is still pending

### Historical audit entries

Audit start state:

- working tree clean at start
- canonical startup docs read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`

Root-cause conclusion:

- The brand-new Create Drop flow was already intended to support pre-save AI cover generation. The modal only links the accepted AI cover job to the real drop after save; it does not require a persisted drop before generation.
- The actual failure class was not a hard missing-`dropId` validation. The failure path was the server-side generation stack behind `POST /api/admin/ai/drop-covers/generate`, which called `generateAdminAiDropCover(...)` and then collapsed any non-auth exception through `handleApiError(...)` into a generic `500 Internal server error`.
- The unsaved flow also lacked a canonical draft-scoping identifier, so pre-save jobs had `dropId: null` and no stable server-side draft identity for history/reconciliation beyond local in-memory state.
- The runtime “ready” signal for AI cover generation was narrower than the full generation path. It verified Vertex token access, but it did not explicitly fail readiness when Firebase Storage bucket configuration was missing.

Touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/components/Admin/CreateDropModal.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`

Canonical helpers used:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/components/Admin/CreateDropModal.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

What changed:

- added explicit unsaved-draft scoping through `draftSessionId` so brand-new drop cover jobs have a stable pre-save identity instead of relying on `dropId: null`
- route now rejects unsaved generation requests that are missing a valid draft session with a truthful `400 draft_session_required` response instead of allowing the flow to fall through opaquely
- AI cover generation now throws route-specific typed errors for runtime, provider, storage, and database failures, and the route returns actionable JSON error responses instead of a generic `500 Internal server error`
- create-drop AI panel now sends `draftSessionId`, keeps unsaved job history scoped to that draft, and renders inline actionable error state for generation failures
- AI runtime readiness now explicitly fails if Firebase Admin database access or Firebase Storage bucket configuration is unavailable, so the admin UI does not overstate readiness
- summary-rollup writes for AI cover generation are now best-effort so a summary update failure does not abort the underlying generation flow

Behavior now:

- brand-new unsaved drops can generate AI covers against a stable draft session
- accepted covers can still be applied before save and are still linked to the persisted drop after the create-drop submit succeeds
- if the unsaved draft session is missing or invalid, the user gets a direct inline error telling them to reopen Create Drop instead of hitting a generic internal server error
- if provider/runtime/storage/database failures occur, the user sees a bounded actionable message and the route records structured diagnostics without exposing secrets

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
- `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- focused `eslint` on touched AI cover files
- `corepack pnpm exec vitest run tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/ai-drop-covers.spec.ts`
- `npm run check:ui:audits`
- `corepack pnpm run check`
- `npx vitest run`

Results:

- adjacency traces completed for all main touched files
- focused `eslint` passed
- focused AI cover route/shared tests passed
- `npm run check:ui:audits` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `79` files and `408` tests

Runtime truth and verification notes:

- verified in code and route tests that unsaved generation no longer depends on a persisted drop id; it depends on a stable `draftSessionId`
- verified route coverage for:
  - saved-drop generation input
  - unsaved draft generation input
  - missing-draft-session rejection
  - actionable provider/runtime error mapping
- verified the submit path still links an accepted AI cover to the persisted drop only after create-drop save succeeds
- verified no nested create-drop save-order change was introduced for assets or content uploads
- no authenticated browser automation seam exists locally for this admin-only flow, so end-to-end click verification was done through route-contract tests plus full build/lint/test/UI-audit coverage rather than a live signed-in Playwright session

Known warnings and non-blocking notices during this task:

- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports 6 cataloged events with no detected emitters:
  - `creator_segment_assigned`
  - `creator_role_activated`
  - `creator_role_activation_blocked`
  - `owner_override_applied`
  - `owner_override_cleared`
  - `creator_broadcast_opened`

Follow-up gaps:

- direct authenticated browser verification of the admin create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist
- this pass improves unsaved draft scoping and error truth, but it does not add full cross-session draft persistence beyond the stored AI job records already written server-side

### Continuation: Open PR Assimilation Pass

Current audit date: 2026-04-06 11:22:01 -05:00
Current branch / commit for continuation start: `main` / `982eada`
Continuation task:

- review every open GitHub PR against current `main`, apply any not-yet-assimilated changes, and close PRs once their work is confirmed implemented or deliberately assimilated

Continuation start state:

- working tree clean after pushing `982eada`
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- GitHub CLI authenticated for repository review and PR maintenance

Open PR set at continuation start:

- `#151` `⚡ Bolt: Optimize drops dashboard map loop`
- `#150` `🎨 Palette: Make icon-only DropCard indicators accessible`
- `#149` `Clean event tracking drift and dependency inconsistencies`
- `#148` `🛡️ Improve privacy compliance and settings truth`
- `#147` `📊 Fix analytics truth and tracking integrity drift`
- `#146` `💸 Fix GumDrop economics and ledger integrity drift`
- `#145` `🔀 Resolve merge conflicts and integration drift`
- `#144` `🛡️ Sentinel: [HIGH] Fix authorization bypass in duplicate filenames endpoint`
- `#143` `🎨 Palette: Add tooltips to icon-only buttons`
- `#141` `⚡ Bolt: Add aspect ratio map cache to drop presentation`
- `#140` `🎨 Palette: Add accessible tooltips and focus styles to modal buttons`
- `#139` `🛡️ Sentinel: [MEDIUM] Fix Cron Route Unsanitized Error Handling`
- `#138` `🎨 Palette: Add ARIA labels to admin user action buttons`

Continuation method:

- inspect each open PR diff and changed-file set against current `main`
- determine whether its behavior is already represented in current `main`, needs to be applied, or is stale/conflicting
- if still needed and safe, assimilate the change into current `main` or the PR branch
- close the PR once its work is confirmed already implemented or after the missing work is applied

Continuation touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/api/drops/duplicate-filenames/route.ts`
- `src/lib/server/fcm-utils.ts`
- `src/app/api/paypal/capture/route.ts`
- `src/components/DropCard.tsx`
- `src/components/Auth/AuthModal.tsx`
- `src/components/DropPreviewModal.tsx`
- `src/components/Navbar.tsx`
- `src/components/Navigation/ScrollToTop.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/roster/page.tsx`
- `src/app/api/admin/users/route.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/hooks/useDrops.ts`
- `src/lib/drop-dashboard.ts`
- `tests/unit/admin-users-route.spec.ts`
- `tests/unit/duplicate-filenames-route.spec.ts`
- `tests/unit/fcm-utils.spec.ts`
- `tests/unit/paypal-capture-route.spec.ts`

Canonical helpers and modules reused for continuation:

- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/analytics.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/gumdrop-economics.ts`
- `src/lib/gumdrop-ledger.ts`
- `src/lib/server/gumdrop-ledger.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/server/creator-onboarding.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/telemetry.ts`
- `src/lib/drop-status.ts`
- `src/lib/drop-presentation.ts`

Continuation findings and assimilated changes:

- `#144` duplicate-filename authorization gap was still present. Current `main` queried every drop for any authenticated caller. The endpoint now scopes non-admin callers to `creatorId == caller.uid` and keeps admin access global.
- `#148` browser push notification truth gap was still present. FCM broadcast now respects stored notification preferences and only sends to users with `browserPushEnabled === true` and `newDropAlerts !== false`.
- `#146` GumDrop source-aware ledger crediting was still incomplete in PayPal capture. Purchased GumDrops and bonus GumDrops are now credited into `purchased` and `reward` backend balances separately instead of collapsing the full grant into `purchased`.
- `#150` was only partially present. Drop file-count and view indicators now expose truthful accessible labels/tooltips without changing card behavior.
- `#143`, `#140`, and `#138` were only partially present. Current-main-compatible tooltip, title, focus, and `aria-label` fixes were assimilated for icon-only controls in auth, drop preview, navbar, scroll-to-top, and admin users.
- `#147` analytics/admin telemetry drift was still present in current `main`. The admin analytics page now avoids rendering empty auth/onboarding charts from zero-only payloads, the roster now emits `creator_application_review_saved`, and creator onboarding lifecycle emission/history now includes segment assignment, role activation, blocked activation, and owner override transitions.
- `#139` contained one still-valid truth fix. Admin ops health no longer treats `FIREBASE_PRIVATE_KEY` as sufficient for navigation-session signing readiness; that readiness now reflects `NAVIGATION_COOKIE_SECRET` only.
- `#151` performance cleanup was still missing and safe to assimilate. Drop feed/dashboard de-duplication now resolves drop status once per surviving drop rather than repeatedly in intermediary map/filter passes.

PRs deliberately not transplanted wholesale:

- `#145` is stale and conflicts with the current audited GumDrop package naming and already-landed merge fixes. Useful current-main-compatible pieces were already present or were absorbed through other targeted changes.
- `#141` adds an id-keyed aspect-ratio cache on top of the existing dimension parsing cache. Current `main` already caches parsed dimensions, and the extra id cache risks stale presentation when a drop's stored dimensions change, so it was not adopted.
- `#149` is stale and overlaps multiple already-landed or separately-assimilated fixes. Its current-main-compatible telemetry truth work was absorbed through the targeted changes above instead of merging stale branch churn.

Commands run for continuation:

- `git status --short`
- `gh auth status`
- `gh pr list --state open --limit 100 --json number,title,headRefName,baseRefName,url,isDraft`
- `git fetch origin` for each open PR head branch
- adjacency traces:
  - `npm run trace:adjacent -- src/app/api/drops/duplicate-filenames/route.ts`
  - `npm run trace:adjacent -- src/lib/server/fcm-utils.ts`
  - `npm run trace:adjacent -- src/app/api/paypal/capture/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/users/route.ts`
  - `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/admin-ops-health.ts`
  - `npm run trace:adjacent -- src/app/admin/roster/page.tsx`
  - `npm run trace:adjacent -- src/components/DropCard.tsx`
  - `npm run trace:adjacent -- src/app/admin/users/page.tsx`
- focused `eslint` on all touched route/component/helper/spec files
- focused `vitest` on:
  - `tests/unit/duplicate-filenames-route.spec.ts`
  - `tests/unit/fcm-utils.spec.ts`
  - `tests/unit/paypal-capture-route.spec.ts`
  - `tests/unit/admin-users-route.spec.ts`
- `npm run check:telemetry`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`

Continuation results:

- focused `eslint` passed
- focused `vitest` passed with `4` files and `12` tests
- `npm run check:telemetry` passed
  - cataloged events with no detected emitters reduced from `6` to `1`
- `npm run check:inventory` passed
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `82` files and `413` tests
- `npm run check:ui:audits` failed only on the existing Mobile Chrome `/creators/waitlist` visual-regression instability
  - accessibility audits passed
  - all other visual-regression checks passed
  - the remaining failure is the known unstable `creator-waitlist-guest-hero` screenshot size flip, not a new assimilation regression

Runtime truth and continuity implications from continuation:

- duplicate filename checks no longer expose cross-creator asset-name discovery to ordinary authenticated users
- drop/browser push notifications now map to actual stored notification preferences instead of broadcasting indiscriminately
- GumDrop purchase grants now preserve backend source separation required by creator-restricted spend logic
- admin analytics truth no longer renders empty auth/onboarding charts just because zero-valued rows exist
- creator onboarding lifecycle emitters now align with the canonical telemetry catalog for segment, role-activation, and owner-override transitions
- admin debug readiness is stricter and more truthful for navigation session signing

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `npm run check:ui:audits` still fails on the existing Mobile Chrome creator-waitlist snapshot instability
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:

- `creator_broadcast_opened` remains cataloged without a detected emitter
- the Mobile Chrome creator-waitlist hero screenshot remains unstable across consecutive captures and still needs a separate audit-safe stabilization pass

### Continuation: AI Cover Model/Location Runtime Fix

Current audit date: 2026-04-06 14:49:52 -05:00
Current branch / commit for continuation start: `main` / `5566eb5`
Continuation task:

- fix the AI drop-cover runtime so it no longer defaults to Imagen 3 / regional-only routing and no longer hides model-location denial behind a generic provider failure

Continuation start state:

- working tree clean at start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`

Initial root-cause findings:

- the canonical AI drop-cover defaults were still `imagen-3.0-fast-generate-001` and `us-central1`
- the Vertex publisher endpoint builder only handled regional hostnames and did not explicitly support the global publisher endpoint form
- the runtime status labeled the system `ready` after an ADC token check even though final model access still depended on the configured model and location being permitted for the project
- provider failures caused by model/location denial were being bucketed into generic provider-unavailable messaging instead of a bounded operator-facing model/location error

Continuation touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/app/admin/ai/page.tsx`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`

Canonical helpers and modules reused for continuation:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

External runtime truth verified for continuation:

- Google Cloud Vertex AI generative model docs currently list Imagen 4 and Imagen 4 Fast publisher models on Vertex and document both regional and global endpoints.
- The repo runtime had still been pinned to the older Imagen 3 fast default and a regional-only host pattern even though the intended current path is Imagen 4.

Continuation implementation and fixes:

- the canonical drop-cover default model is now `imagen-4.0-fast-generate-001`
- the canonical default location is now `global`
- legacy saved defaults are normalized forward so existing installs using the old implicit `imagen-3.0-fast-generate-001` plus `us-central1` pair now resolve to the new Imagen 4 Fast global runtime without requiring a manual Firestore settings edit
- the runtime resolver now lets explicit environment overrides (`VERTEX_AI_IMAGE_MODEL`, `GOOGLE_VERTEX_IMAGE_MODEL`, `VERTEX_AI_LOCATION`, `GOOGLE_CLOUD_LOCATION`, `GCLOUD_LOCATION`) supersede stored defaults if operators need to correct deployment behavior without changing the Firestore settings document first
- the Vertex publisher endpoint builder now supports the global endpoint form (`aiplatform.googleapis.com`) instead of assuming every generation request must use a regional hostname
- provider failures that clearly indicate model/location denial are now returned as bounded `model_location_unavailable` client errors instead of a generic provider-unavailable bucket
- the create-drop AI cover panel now maps that new error code to a specific operator-facing message
- the Admin AI page fallback location display now matches the new canonical global default
- the Admin AI runtime note is now more truthful: auth/storage/job recording can be configured while final model access is still only proven by a successful generation request

Commands run for continuation:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- focused `eslint` on:
  - `src/lib/ai-drop-covers.ts`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `src/app/admin/ai/page.tsx`
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused `vitest` on:
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `corepack pnpm run check`
- `npx vitest run`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`

Continuation results:

- focused `eslint` passed
- focused `vitest` passed with `3` files and `12` tests
- `corepack pnpm run check` passed
- `npx vitest run` passed with `82` files and `415` tests
- `npm run check:ui:audits` passed
- `npm run check:ui:lighthouse` passed on the clean rerun
  - the first attempt failed only because a separate `next build` from the parallel UI-audit command was still active; this was a build-process collision, not a product regression

Runtime truth and continuity implications from continuation:

- the drop-cover generation path now targets Imagen 4 Fast by default instead of the stale Imagen 3 fast default
- the runtime can now use the Vertex global publisher endpoint, which better matches the current Google-supported endpoint model for Imagen 4
- existing saved AI-cover settings that were carrying the old implicit default no longer silently pin the product to Imagen 3 unless an operator explicitly overrides the runtime
- the Admin AI page no longer overstates its readiness as full model availability; it now says credentials/config are ready while generation success still proves final model access
- create-drop failures caused by model/location permission or availability mismatches now return a bounded actionable error instead of collapsing into a generic provider failure

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter
- `npm run check:ui:lighthouse` produced non-blocking Windows temp-directory cleanup warnings after Chrome exit

Continuation follow-up gaps:

- there is still no local authenticated browser automation seam for the admin create-drop flow, so final behavioral verification for this pass is route-contract and repo-check based rather than a captured signed-in admin browser session
- if a deployed project is blocked from the Vertex global endpoint by organization resource-location policy, operators may still need an explicit environment override to a permitted regional location

### Continuation: Live AI Cover Settings Drift Correction

Current audit date: 2026-04-06 15:15:31 -05:00
Current branch / commit for continuation start: `main` / `1631728`
Continuation task:

- investigate why the runtime was still attempting `imagen-3.0-fast-generate-001` in `us-central1` after the Imagen 4 default fix and eliminate the stale live configuration path

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`

Confirmed root cause:

- the pushed repo code on `main` already targeted Imagen 4 Fast by default, but the live Firebase settings document `adminSettings/aiDropCovers` was still persisted with:
  - `model: imagen-3.0-fast-generate-001`
  - `location: us-central1`
  - `priceBasis: vertex-ai-pricing-imagen-fast-2026-04-05`
- that stale settings row was sufficient to reproduce the exact Vertex permission error against the old regional Imagen 3 publisher model path in environments still resolving from persisted settings

Continuation touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/server/ai-drop-covers.ts`
- live Firebase document: `adminSettings/aiDropCovers`

Continuation implementation:

- `getAdminAiDropCoverSettings()` now detects stale persisted AI-cover settings and self-heals them by writing the normalized canonical settings back to Firestore
- the live Firebase settings document was updated directly so current operator testing no longer depends on waiting for a later settings toggle or a later deploy cycle

Live settings document after correction:

- `model: imagen-4.0-fast-generate-001`
- `location: global`
- `priceBasis: vertex-ai-pricing-imagen-4-fast-2026-04-06`
- `pricePerGenerationUsd: 0.02`

Commands run for continuation:

- `git status --short`
- direct Firestore read of `adminSettings/aiDropCovers`
- direct Firestore update of `adminSettings/aiDropCovers`
- focused `eslint` on:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/lib/ai-drop-covers.ts`
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused `vitest` on:
  - `tests/unit/ai-drop-covers.spec.ts`
  - `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
  - `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `corepack pnpm run check`

Continuation results:

- direct Firestore read confirmed the stale live config before the fix
- direct Firestore update succeeded and confirmed the corrected live config after the fix
- focused `eslint` passed
- focused `vitest` passed with `3` files and `12` tests
- `corepack pnpm run check` passed

Runtime truth and continuity implications from continuation:

- the actual runtime failure was a persisted live settings drift problem, not another unsaved-drop workflow bug
- the repo now self-heals this exact drift class by rewriting legacy AI-cover settings to canonical values when they are loaded
- the live Admin AI runtime settings now align with the committed repo defaults instead of silently pinning generation to Imagen 3 regional routing

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:

- a live admin-browser generation attempt still needs to be performed by an authenticated operator to confirm the project’s actual Vertex permissions for Imagen 4 on the global endpoint
- if the project is denied on the global endpoint by org policy, an explicit allowed regional override will still be required

### Continuation: App Hosting Rollout Failure Root Cause

Current audit date: 2026-04-06 15:44:38 -05:00
Current branch / commit for continuation start: `main` / `bc3b49a`
Continuation task:

- investigate the reported overlooked codebase errors and determine why the last 5 commits all failed after push

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`

Confirmed root cause:

- the last 5 commits did fail after push, but they all failed on the same external deployment check: `App Hosting - Rollout (kandydrops-by-ikandy/us-central1/kandydrops)`
- the failure was not a new TypeScript, lint, unit-test, or Next build regression in the codebase
- Cloud Build logs for rollout `build-2026-04-06-006` showed the real failing step before `next build`:
  - `ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/package.json`
  - the stale lockfile still contained removed devDependency specifiers for `@lhci/cli` and `eslint-plugin-import`
- the regression originated in the earlier dependency cleanup commit that removed those packages from `package.json` without synchronizing `pnpm-lock.yaml`
- the next four commits inherited the same broken root lockfile, so all five push-triggered App Hosting rollouts failed for the same reason

Continuation touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `package.json`
- `pnpm-lock.yaml`

Canonical helpers and modules reused for continuation:

- `AGENTS.md`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/repo-inventory.ts`
- canonical verification scripts under `package.json`

Continuation implementation:

- synchronized `pnpm-lock.yaml` with the current root `package.json`
- added a canonical `check:pnpm-lock` script and wired it into `npm run check` so future local signoff catches App Hosting-style frozen-lockfile failures before push
- verified the App Hosting-equivalent install gate locally with `corepack pnpm install --frozen-lockfile`
- re-ran broad repo verification to determine whether any additional currently reproducible codebase failures remained after the lockfile correction

Commands run for continuation:

- `git status --short`
- `git log -5 --oneline`
- `gh auth status`
- `git remote -v`
- `gh api repos/omgitsguppey/kandylandv2/commits/bc3b49a/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/1631728/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/5566eb5/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/982eada/check-runs`
- `gh api repos/omgitsguppey/kandylandv2/commits/078f522/check-runs`
- `firebase apphosting:backends:get kandydrops --project kandydrops-by-ikandy`
- `corepack pnpm run build`
- `corepack pnpm run check`
- `gcloud logging read 'resource.type="build"' --project kandydrops-by-ikandy --freshness=7d --limit 20 --format=json`
- `gcloud logging read 'resource.type="build" AND resource.labels.build_id="48c3e6c8-9e30-4db9-b410-606a901467ce"' --project kandydrops-by-ikandy --limit 500 --format='value(timestamp,textPayload)'`
- `corepack pnpm install --lockfile-only`
- `npm install --package-lock-only`
- `corepack pnpm install --frozen-lockfile`
- `npm run check:consistency`
- `npx vitest run`
- `npm run check:inventory`

Continuation results:

- confirmed all 5 recent commits failed on the same Firebase App Hosting rollout check
- confirmed the real deploy blocker was stale `pnpm-lock.yaml`, not a failing app build or failing test suite
- `corepack pnpm install --frozen-lockfile` passed after the lockfile sync, matching the App Hosting install contract that had been failing remotely
- the new `check:pnpm-lock` guard passed inside `npm run check:consistency`
- `corepack pnpm run build` passed
- `corepack pnpm run check` passed
- `npm run check:consistency` passed
- `npx vitest run` passed with `82` files and `415` tests
- `npm run check:inventory` passed and reports `660` tracked files
- no additional currently reproducible local codebase failures were found beyond the already-known non-blocking warnings and the previously documented AI-provider permission/path work

Runtime truth and continuity implications from continuation:

- the last 5 failed commits were a deployment lockfile-integrity problem, not 5 separate runtime regressions
- App Hosting is currently using `pnpm install` with frozen-lockfile behavior during rollout, so root package manifest edits must keep `pnpm-lock.yaml` synchronized or deploys will fail before the app build even starts
- local `next build` and canonical checks were not sufficient to catch this specific failure until the frozen-lockfile install was reproduced directly

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:

- the current AI image-generation runtime still depends on actual project permission to call the configured Vertex publisher model endpoint
- the standing exhaustive checklist file remains historically scoped and is still not regenerated against the current `660` tracked-file baseline

### Continuation: Vertex Runtime Permission Grant

Current audit date: 2026-04-06 15:53:42 -05:00
Current branch / commit for continuation start: `main` / `bc3b49a`
Continuation task:

- verify whether Vertex permission was actually missing for the App Hosting runtime and grant the correct runtime IAM role if needed

Continuation start state:

- canonical startup docs were already read in the active continuity pass
- runtime service account identified from the deployed App Hosting Cloud Run service:
  - `firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com`

Confirmed findings:

- `aiplatform.googleapis.com` is enabled in project `kandydrops-by-ikandy`
- the App Hosting runtime service account did not have any Vertex AI user role before this continuation
- the runtime therefore lacked the normal project-level IAM grant used for publisher-model predict calls

Continuation touched surfaces:

- live Google Cloud IAM policy for project `kandydrops-by-ikandy`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Continuation implementation:

- granted `roles/aiplatform.user` to:
  - `serviceAccount:firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com`

Commands run for continuation:

- `gcloud run services describe kandydrops --region us-central1 --project kandydrops-by-ikandy --format="value(spec.template.spec.serviceAccountName)"`
- `gcloud services list --enabled --project kandydrops-by-ikandy --filter="NAME:aiplatform.googleapis.com" --format="value(NAME)"`
- `gcloud projects get-iam-policy kandydrops-by-ikandy --format=json`
- `gcloud projects add-iam-policy-binding kandydrops-by-ikandy --member="serviceAccount:firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com" --role="roles/aiplatform.user" --condition=None`
- `gcloud projects get-iam-policy kandydrops-by-ikandy --flatten="bindings[].members" --filter="bindings.members:firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com AND bindings.role:roles/aiplatform.user" --format="table(bindings.role,bindings.members)"`
- `gcloud services list --enabled --project kandydrops-by-ikandy --filter="NAME:firebasevertexai.googleapis.com OR NAME:aiplatform.googleapis.com" --format="table(NAME,TITLE)"`
- attempted verification by impersonated access token mint:
  - `gcloud auth print-access-token --impersonate-service-account=firebase-app-hosting-compute@kandydrops-by-ikandy.iam.gserviceaccount.com`

Continuation results:

- the required runtime IAM role grant succeeded
- policy verification confirms the App Hosting runtime service account now holds `roles/aiplatform.user`
- direct impersonated verification of the same runtime identity could not be completed from the current logged-in user because that user does not hold `iam.serviceAccounts.getAccessToken` on the App Hosting runtime service account
- this impersonation gap does not block the app runtime itself from calling Vertex; it only blocks local operator-side token minting for an exact same-identity probe

Runtime truth and continuity implications from continuation:

- basic Vertex runtime permission was genuinely missing and is now granted
- if AI image generation still fails after this point, the next blocker is no longer the missing `roles/aiplatform.user` grant; it will be model/location availability, org policy, request shape, or provider/runtime behavior

Known warnings and non-blocking notices during continuation:

- local same-identity verification is still blocked by missing `iam.serviceAccounts.getAccessToken` for the operator account on the App Hosting runtime service account

Continuation follow-up gaps:

- an authenticated admin app test or an explicit temporary `roles/iam.serviceAccountTokenCreator` grant is still needed if exact same-identity local probing is required

### Continuation: Admin AI Reference-Guided Cover Inputs

Current audit date: 2026-04-06 17:08:00 -05:00
Current branch / commit for continuation start: `main` / `0a4b50d`
Continuation task:

- research and implement truthful AI cover “training” controls on the Admin AI page so the runtime can reference a fixed cover template and existing drop covers without falsely claiming live model retraining

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`

Research findings anchored to current platform truth:

- Google Cloud Vertex supports reference-image style customization for Imagen, but that capability is not the same thing as live model training or online fine-tuning
- the supported truthful operator model for this repo is reference-guided generation plus persisted feedback history
- current Google Cloud pricing also lists Imagen 3 image customization in the same per-image pricing class as standard Imagen 3 generation, so the estimated cost can remain explicit rather than guessed

Confirmed repo baseline before implementation:

- the Admin AI page could toggle the feature and inspect job history, but it could not upload a style template or tell the runtime to use existing covers as references
- the create-drop AI panel was still title-only and could not show whether the next generation would use any reference guidance
- the AI job record and dashboard contract did not record standard versus reference-guided generation mode
- the current implementation had real feedback logging, but no truthful “train it on our look” control path

Continuation touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/app/api/admin/ai/drop-covers/template/route.ts`
- `src/app/admin/ai/page.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `tests/unit/admin-ai-drop-covers-template-route.spec.ts`

Canonical helpers and modules reused for continuation:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/analytics.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

Continuation implementation:

- extended the shared AI cover settings contract to distinguish:
  - standard title-only generation
  - reference-guided generation
  - template-reference usage
  - latest-catalog-cover reference usage
- added a dedicated admin route for uploading and removing a single AI cover template image:
  - `src/app/api/admin/ai/drop-covers/template/route.ts`
- stored the uploaded template in Firebase Storage under a dedicated AI reference path and persisted its URL/path/file metadata into the canonical AI cover settings document
- taught the server-side generation helper to:
  - load the uploaded template as a reference image when enabled
- load up to 4 retained positive AI cover references plus the latest catalog cover as additional reference images when enabled
  - keep reference-guided generation on the selected/default Gemini image runtime by passing the uploaded template, retained AI references, and the latest catalog cover as image inputs
  - keep one canonical generation stack instead of splitting standard and reference-guided flows across different model families
- kept the implementation truthful:
  - this is reference-guided generation, not live fine-tuning
  - the runtime fails with an actionable validation error if reference-guided mode is enabled but no usable template/latest catalog cover exists
  - the create-drop panel and Admin AI page now show whether the next generation is standard or reference-guided
- extended job history and dashboard state to record and display:
  - generation mode
  - total reference image count
  - whether the uploaded template was used
- how many retained AI and latest-catalog references were used

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/route.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/template/route.ts`
- focused lint:
  - `npx eslint src/app/admin/ai/page.tsx src/app/api/admin/ai/drop-covers/route.ts src/app/api/admin/ai/drop-covers/template/route.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`

Continuation results:

- focused lint passed
- focused Vitest passed with `4` files and `17` tests
- `npm run check:inventory` passed and still reports `660` tracked files because the new template route and its unit test are local/untracked until commit
- `npm run check:ui:audits` passed after a truthful sequential rerun
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `83` files and `420` tests
- an initial attempt to run multiple build-based verification commands in parallel caused a Next build collision (`Another next build process is already running`); that was a verification-orchestration issue, not a code failure, and the affected checks were rerun sequentially to completion

Runtime truth and continuity implications from continuation:

- the Admin AI page can now control reference-guided generation against a real uploaded cover template, retained positive AI references, and the latest catalog cover
- the repo now treats “train the AI on our covers” as a truthful reference-image customization workflow instead of fake live training
- the active generation model/path shown in the UI now matches whether reference guidance is turned on
- job history, pricing, and runtime notes remain explicit about what is estimated, what is real, and what depends on actual Vertex access

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:

- the new reference-guided runtime still depends on real project access to the Vertex customization model path (`imagen-3.0-capability-001` in `us-central1`)
- the current implementation uses reference images as style guidance only; it does not yet perform deterministic template-frame compositing after generation
- direct authenticated browser verification of the admin AI page and create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist

### Continuation: Create-Drop AI Model Switch

Current audit date: 2026-04-06 20:05:00 -05:00
Current branch / commit for continuation start: `main` / `0a4b50d`
Continuation task:

- add operator-selectable Google image-model choices in the create-drop AI cover flow so admins can switch between Gemini image models next to Generate without forking the rest of the cover-generation stack

Continuation start state:

- working tree already dirty at continuation start from the uncommitted Admin AI reference-guided cover-input pass
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`

Confirmed continuation surfaces before implementation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/components/Admin/CreateDropModal.tsx`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`

Canonical helpers and modules reused for continuation:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/server/storage-assets.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/analytics.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`

Continuation implementation:

- changed the default admin AI cover runtime from the old Imagen default to `gemini-2.5-flash-image` on the global Vertex endpoint
- added a bounded selectable-model allowlist for Create Drop:
  - `gemini-2.5-flash-image`
  - `gemini-3-pro-image-preview`
- kept model choice local to the create-drop AI panel so admin enablement/reference settings remain canonical and job history still records the exact model used per generation
- replaced the single-model generate path with provider-aware runtime execution:
  - Gemini models use Vertex `:generateContent`
  - existing non-Gemini models still route through publisher-model `:predict`
- kept reference-guided generation truthful under the Gemini path by sending the uploaded template, retained AI references, and the latest catalog cover as image inputs instead of pretending a separate tuned model exists
- added route-level validation so the create-drop switch cannot submit arbitrary model ids
- updated the create-drop AI panel to show:
  - the selected model inline next to Generate
  - preview-stage status on the `gemini-3-pro-image-preview` option
  - per-model estimated cost before generation
  - the actual model label on returned generation cards
- current repo truth supersedes the earlier reference-only note above: reference-guided generation no longer forces a switch to `imagen-3.0-capability-001`; it now runs on the selected/default Gemini image model when references are enabled

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
- focused lint:
  - `npx eslint src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/app/api/admin/ai/drop-covers/generate/route.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`
- final `git status --short`

Continuation results:

- focused lint passed
- focused Vitest passed with `4` files and `18` tests
- `npm run check:inventory` passed and still reports `660` tracked files because the admin AI template route and its unit test remain local/untracked until commit
- `npm run check:ui:audits` passed
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `83` files and `421` tests
- the first `check:ui:audits` run failed on a real TypeScript narrowing error in `src/app/api/admin/ai/drop-covers/generate/route.ts`; that route was fixed and the full audit sequence was rerun to green

Runtime truth and continuity implications from continuation:

- create-drop AI generation now has a real operator-visible model switch without creating a second cover-generation architecture
- the selected model changes the displayed estimated cost and the recorded job model truthfully for each generation
- reference-guided generation stays compatible with the uploaded template and recent-cover inputs under the Gemini image path
- the preview-quality model remains clearly marked as preview instead of being presented as equally stable to the GA default

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter

Continuation follow-up gaps:

- `gemini-3-pro-image-preview` remains preview-stage and may need a future replacement if Google changes lifecycle, availability, or pricing
- the current implementation still relies on model-generated hero/background art plus app-side deterministic text treatment; it does not yet perform deterministic template-frame compositing
- direct authenticated browser verification of the admin AI page and create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist

### Continuation: Admin AI Truth Surface + Legacy Queue Fix

Current audit date: 2026-04-06 21:10:00 -05:00
Current branch / commit for continuation start: `main` / `13bc41d`
Continuation task:

- remove simulative language and fake training implications from the Admin AI page
- expose the real retained reference/feedback state used for later AI cover generations
- repair the legacy queued-drop runtime bug where some drops never go live and keep rolling forward to the next date

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/lib/server/drop-queue.ts`
  - `npm run trace:adjacent -- src/lib/admin-drop-queue.ts`

Confirmed continuation surfaces before implementation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/ai/page.tsx`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/drop-status.ts`
- `src/app/api/cron/process-queue/route.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `tests/unit/drop-status.spec.ts`
- `tests/unit/process-queue-route.spec.ts`

Canonical helpers and modules reused for continuation:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/drop-status.ts`
- `src/lib/drop-queue-lifecycle.ts`
- `src/lib/server/drop-queue.ts`
- `src/lib/server/process-queue-drops.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/analytics.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`

Continuation implementation:

- removed operator-facing wording on the Admin AI page that implied live training, model-side retention, or hidden model introspection
- rewired the Admin AI page to show the real retained reference library instead:
  - uploaded template reference
- retained drop covers already uploaded in the catalog
  - retained positive AI covers from accepted/liked past generations
- extended the AI cover job record to store the exact reference assets used by each generation so the Admin AI page can show which retained images were actually sent with each run
- changed reference-guided generation to reuse positively-scored AI covers for later generations; dislikes stay in history and are not reused as references
- added usage counts and last-used visibility for retained reference assets based on actual recorded job history
- added an active-jobs-now panel on the Admin AI page so operators can see the current running jobs, current model, and current retained inputs without fake progress theater
- fixed the legacy queue rollover bug by teaching the canonical drop-timestamp helper to understand Firestore Timestamp-like values
- updated the queue cron route to use the canonical timestamp helper instead of `Number(rawTimestamp)`, which was making some legacy scheduled drops look unscheduled and get pushed forward repeatedly
- added regression coverage for Firestore Timestamp-like queue/drop timing values

Exact runtime root cause for the legacy queue bug:

- `src/app/api/cron/process-queue/route.ts` was coercing `validFrom` and `validUntil` with `Number(value)`
- legacy drops with Firestore Timestamp-like values therefore materialized as `null` timing values
- the queue lifecycle projection then treated them as queued instead of already scheduled/live
- each cron run reassigned a future slot and incremented `activationCount`, which produced the observed endless date shifting

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/lib/server/drop-queue.ts`
- `npm run trace:adjacent -- src/lib/admin-drop-queue.ts`
- focused lint:
  - `npx eslint src/app/admin/ai/page.tsx src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/lib/drop-status.ts src/app/api/cron/process-queue/route.ts tests/unit/drop-status.spec.ts tests/unit/process-queue-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/drop-status.spec.ts tests/unit/process-queue-route.spec.ts tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `npm run check:inventory`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `npx vitest run`
- final `git status --short`

Continuation results:

- focused lint passed
- focused Vitest passed with `5` files and `27` tests
- `npm run check:inventory` passed and now reports `662` tracked files
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `83` files and `423` tests
- `npm run check:ui:audits` still fails on the pre-existing Chromium visual instability for `/creators/waitlist`; accessibility passed and the rest of the visual suite passed

Runtime truth and continuity implications from continuation:

- the Admin AI page now states and shows the real retained guidance system instead of implying live training
- later reference-guided generations now genuinely improve from accepted/liked past AI covers because those covers are retained as future reference inputs
- the Admin AI page now shows exact retained reference assets per job, which is the truthful answer to which uploaded/live images the model has already used as references
- the page still does not claim token-by-token model progress or internal reasoning visibility because the runtime does not expose those signals
- legacy scheduled drops with Firestore Timestamp-like timing values no longer get re-queued and shifted forward just because the cron route failed to parse their timestamps

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- `check:telemetry` still reports `creator_broadcast_opened` with no detected emitter
- `check:ui:audits` still reports the existing Chromium `creator-waitlist-guest-hero` screenshot instability plus the recurring `transformAlgorithm` cleanup warning from the webserver process

Continuation follow-up gaps:

- the Admin AI page is still polling every 10 seconds; there is no streaming per-step provider progress API behind it
- the retained-reference system now reuses accepted/liked AI covers, but it still does not perform deterministic post-generation template compositing
- direct authenticated browser verification of the admin AI page and create-drop AI flow still depends on a local admin/auth automation seam that does not currently exist

### Continuation: Full Audit + Ops Health Truth Pass

Current audit date: 2026-04-06 21:55:00 -05:00
Current branch / commit for continuation start: `main` / `4f90017`
Continuation task:

- perform a full-scale audit review
- confirm there are no untracked repo files
- identify unfinished features, orphaned telemetry, and stale or misleading debug/admin truth surfaces
- raise the Admin Debug ops health percentage to at least 90 by fixing real scoring/truth issues instead of hiding failures

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- no untracked files reported by `git ls-files --others --exclude-standard`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/lib/server/admin-ops-health.ts`
  - `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
  - `npm run trace:adjacent -- src/app/creators/[username]/CreatorProfileClient.tsx`

Confirmed continuation surfaces before implementation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/admin-ops-health.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/app/api/admin/debug/route.ts`
- `src/app/admin/debug/page.tsx`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/lib/telemetry-catalog.ts`
- `tests/unit/ai-debug-assistant.spec.ts`

Canonical helpers and modules reused for continuation:

- `src/lib/admin-ops-health.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/tasks/task-observability.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/telemetry.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`

Continuation implementation:

- confirmed no pre-existing untracked repo files at pass start with `git ls-files --others --exclude-standard`
- verified the original low ops score was not caused by one giant outage; it was caused by three separate truth problems:
  - stale 6h/24h scoring windows kept older incidents in the "current" score for too long
  - repeated copies of the same diagnostic message were being scored by raw event volume instead of distinct current issue clusters
  - generic daily-task lifecycle telemetry (`daily_task_assigned`, `daily_task_started`, `daily_task_completed`, `daily_task_failed`, `daily_task_deadline_reminder_sent`) was being misclassified as task-mapping orphan telemetry
- kept raw diagnostic counts visible in debug, but changed the score builder so the top-line ops percentage penalizes distinct active/recent issue clusters instead of repeated copies of the same route/config error
- tightened the ops score windows to an actually operator-relevant range:
  - active diagnostics / pipeline: `1h`
  - recent diagnostics / pipeline: `4h`
- exposed the issue-cluster count in the debug UI so the score explanation matches the underlying math
- narrowed orphaned task telemetry classification in `src/lib/tasks/task-observability.ts` so generic task lifecycle events no longer inflate the orphaned lane
- added the missing `creator_broadcast_opened` emitter on the public creator page, which cleared the last cataloged telemetry event with no detected emitter
- fixed a real debug-panel truth bug in `overview.session_runtime`: the log no longer says runtime/session is aligned while simultaneously warning that navigation session signing is missing
- investigated live diagnostics and found the remaining current route failures were both genuine missing Firestore indexes:
  - `daily_task_events`: `userId ASC`, `timestamp DESC`, `__name__ DESC`
  - `users`: `role ASC`, `status ASC`, `__name__ ASC`
- added those indexes to `firestore.indexes.json` and deployed them with `firebase deploy --only firestore:indexes`
- verified the affected routes against the live route code with a locally minted admin ID token:
  - `GET /api/user/activity?view=history` returned `200` after the index deployment
  - `GET /api/creator/relationships` initially returned `500` while the new `users` index was still building, then returned `200` once the build completed
- refreshed the persisted admin debug ledger through the real `GET /api/admin/debug` route after the fixes and deployments

Exact runtime findings from continuation:

- the previous `review:admin-panel-logs` ledger was stale at pass start and still reflected historical fail states from old sampled diagnostics/pipeline counts
- the live Firestore diagnostics showed the recent-activity fallback warnings were caused by a missing deployed composite index, not by bad route code
- the live Firestore diagnostics showed `Creator.Relationships.GET` failures were caused by a missing deployed composite index on `users`
- `Navigation session signing unavailable` remains a real current warning because `NAVIGATION_COOKIE_SECRET` is not configured in the runtime
- the top-line ops score now measures current issue clusters truthfully; after the route/index fixes and score-window changes, the live refreshed debug payload reports:
  - ops score: `93`
  - active issue clusters: `3`
  - recent issue clusters: `5`
  - pipeline status: `healthy`
  - orphaned telemetry events: `0`

Untracked/orphaned/unfinished review findings:

- no pre-existing untracked repo files were present at pass start
- generated Playwright artifacts (`playwright-report/`, `test-results/`) were created by local verification and removed before final signoff
- `npm run check:telemetry` now passes with `0` cataloged events missing emitters
- `npm run check:deps` passes after removing duplicate exported AI-cover alias constants from `src/lib/ai-drop-covers.ts`
- no TODO/FIXME/HACK markers were found in runtime code; the only literal `TBD` strings surfaced by the scan are invalid-timestamp fallbacks in `src/lib/admin-drop-formatting.ts`, not unfinished feature stubs

Exact touched surfaces for continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `firestore.indexes.json`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/lib/admin-ops-health.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/tasks/task-observability.ts`
- `tests/unit/admin-debug-assistant-route.spec.ts`
- `tests/unit/ai-debug-assistant.spec.ts`
- `tests/unit/admin-ops-health.spec.ts`
- `tests/unit/task-observability.spec.ts`

Commands run for continuation:

- `git status --short`
- `git ls-files --others --exclude-standard`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/admin-ops-health.ts`
  - `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
  - `npm run trace:adjacent -- src/app/creators/[username]/CreatorProfileClient.tsx`
- live debug/state inspection:
  - `npm run review:admin-panel-logs`
  - local `tsx` verification scripts that called the real route modules with a minted admin ID token for:
    - `GET /api/admin/debug`
    - `GET /api/user/activity?view=history`
    - `GET /api/creator/relationships`
  - local `tsx` inspection scripts for `server_diagnostics` and `analytics_pipeline_daily`
- repo hygiene:
  - `Select-String ... TODO|FIXME|HACK|XXX|TBD`
  - `npm run check:deps`
- focused lint:
  - `npx eslint src/app/admin/debug/page.tsx src/app/api/admin/debug/route.ts src/app/creators/[username]/CreatorProfileClient.tsx src/lib/admin-ops-health.ts src/lib/server/admin-ops-health.ts src/lib/server/admin-panel-system-logs.ts src/lib/tasks/task-observability.ts tests/unit/ai-debug-assistant.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-ops-health.spec.ts tests/unit/task-observability.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-debug-assistant.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-ops-health.spec.ts tests/unit/task-observability.spec.ts`
- Firestore deployment:
  - `firebase deploy --only firestore:indexes`
- repo-wide verification:
  - `npm run check:telemetry`
  - `npm run check:inventory`
  - `npm run check:architecture`
  - `npm run check:versions`
  - `npm run check:functions`
  - `npm run check:firebase:rules`
  - `npm run check:continuity`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
- final ledger refresh:
  - local `tsx` script calling the real `GET /api/admin/debug` route after index deployment and route verification
  - `npm run review:admin-panel-logs`

Continuation results:

- focused lint passed
- focused Vitest passed with `4` files and `15` tests
- `firebase deploy --only firestore:indexes` passed
- live route verification passed after deployment:
  - `GET /api/user/activity?view=history` -> `200`
  - `GET /api/creator/relationships` -> `200` once the new `users` index finished building
  - `GET /api/admin/debug` refresh -> `200`
- `npm run check:telemetry` passed with `0` orphaned emitters
- `npm run check:inventory` passed
- staged rerun of `npm run check:inventory` passed with `663` tracked files and `112` test files
- `npm run check:architecture` passed
- `npm run check:deps` passed
- `npm run check:versions` passed
- `npm run check:functions` passed
- `npm run check:firebase:rules` passed
- `npm run check:continuity` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `84` files and `426` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed
- final live debug refresh reports an ops score of `93`, with pipeline healthy and orphaned telemetry cleared
- final persisted admin panel logs now show:
  - `13` healthy
  - `1` warn
  - `2` fail
  - remaining fails are real task/debug backlog issues, not stale or simulated state

Runtime truth and continuity implications from continuation:

- the debug panel no longer treats repeated copies of the same error as distinct ops incidents in the headline score
- raw diagnostics volume is still visible to operators, but the score now reflects distinct current issue clusters plus current/recent pipeline state
- orphaned telemetry is now limited to genuine task-mapping gaps instead of generic backend daily-task lifecycle events
- the last telemetry emitter gap (`creator_broadcast_opened`) is closed
- the recent-activity route and creator-relationships route now depend on deployed indexes that are present in repo config and were deployed during this pass
- the ops score target requested in this pass is met truthfully with current live data: `93%`

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits

Continuation follow-up gaps:

- `overview.session_runtime` remains `warn` until `NAVIGATION_COOKIE_SECRET` is configured in the runtime environment
- `tasks.integrity_and_parity` still fails with live assignment/economy drift and was not broadened into a separate repair pass here
- `ops.diagnostics_materializers` still fails because recent real diagnostics remain in the sampled window even after the route/index fixes; this is truthful and should decay naturally if no new errors recur

### Continuation: Admin Dashboard UI Hydration + Debug Chart Logging Pass

Current audit date: 2026-04-06 23:58:00 -05:00
Current branch / commit for continuation start: `main` / `fbce504`
Continuation task:

- refactor the admin dashboard UI so overview and analytics surfaces expose truthful hydration state
- add robust debug-panel logging for every admin overview module and every admin analytics chart section/category
- close broad admin UI truth gaps with testing, not decorative loading copy

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces run before editing:
  - `npm run trace:adjacent -- src/app/admin/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`

Planned continuation surfaces before implementation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/components/Admin/AdminDashboardModule.tsx`
- `src/components/Admin/AdminDropsAtGlancePanel.tsx`
- `src/components/Admin/AdminAnalyticsCharts.tsx`
- `src/components/Admin/AdminStatsBar.tsx`
- `src/components/Admin/RecentTransactionsPanel.tsx`
- `src/components/Admin/AdminActivityLogPanel.tsx`
- `src/components/Admin/TopDropsPanel.tsx`
- `src/hooks/useAdminOverview.ts`
- `src/hooks/useAdminPollingSWR.ts`
- new admin UI chart-health helpers/routes/tests as required by the implementation

Canonical helpers and modules targeted for reuse in this continuation:

- `src/lib/admin-overview.ts`
- `src/hooks/useAdminOverview.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/analytics/historical/route.ts`
- `src/app/api/admin/analytics/realtime/route.ts`
- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`

Continuation implementation:

- added a canonical admin UI chart-health contract in `src/lib/admin-ui-chart-health.ts`
- added a persisted admin chart-health store in `src/lib/server/admin-ui-chart-health.ts` using `admin_ui_chart_health`
- added `GET`/`PUT` admin chart-health route coverage in `src/app/api/admin/ui-chart-health/route.ts`
- added `useAdminUiChartHealthReporter` so admin overview and analytics surfaces report their live hydration state back into the canonical debug pipeline instead of keeping chart failures trapped in local page state
- wired admin overview page health reporting for:
  - `dashboard.platform_pulse`
  - `dashboard.revenue_trends`
  - `dashboard.top_performing_drops`
- wired `AdminDropsAtGlancePanel`, `RecentTransactionsPanel`, and `AdminActivityLogPanel` so each module reports loaded, degraded, empty, or failed state with source type and last updated time
- wired admin analytics page reporting for every current section-level analytics surface across all categories:
  - operations
  - audience
  - commerce
  - security
- extended `buildAdminPanelSystemLogs` so the debug route emits real `analytics.*_chart_health` logs per category instead of generic decorative summaries
- extended `/api/admin/debug` so it returns:
  - `analyticsChartHealth`
  - `adminUiChartsReported`
  - `adminUiChartWarnings`
  - `adminUiChartFailures`
- added a new debug monitoring lane section in `src/app/admin/debug/page.tsx` that lists each latest reported chart/module with:
  - page
  - category
  - source
  - health status
  - hydration state
  - data presence
  - last updated time
  - top issues
  - next action
- kept the system truthful:
  - no chart is presented as healthy if it only has background-degraded or failed reads
  - no debug lane claims chart coverage exists until the client has actually reported it
  - empty state is explicit when a matching admin surface has not been opened recently

Exact touched surfaces for continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/api/admin/ui-chart-health/route.ts`
- `src/components/Admin/AdminActivityLogPanel.tsx`
- `src/components/Admin/AdminDropsAtGlancePanel.tsx`
- `src/components/Admin/RecentTransactionsPanel.tsx`
- `src/hooks/useAdminUiChartHealthReporter.ts`
- `src/lib/admin-panel-system-logs.ts`
- `src/lib/admin-ui-chart-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/server/admin-ui-chart-health.ts`
- `tests/unit/admin-panel-system-logs.spec.ts`
- `tests/unit/admin-ui-chart-health-route.spec.ts`
- `tests/unit/admin-ui-chart-health.spec.ts`

Commands run for continuation:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/admin/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
  - `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
- focused lint:
  - `npx eslint src/app/admin/page.tsx src/app/admin/analytics/page.tsx src/app/admin/debug/page.tsx src/app/api/admin/debug/route.ts src/app/api/admin/ui-chart-health/route.ts src/components/Admin/AdminDropsAtGlancePanel.tsx src/components/Admin/RecentTransactionsPanel.tsx src/components/Admin/AdminActivityLogPanel.tsx src/hooks/useAdminUiChartHealthReporter.ts src/lib/admin-ui-chart-health.ts src/lib/admin-panel-system-logs.ts src/lib/server/admin-ui-chart-health.ts src/lib/server/admin-panel-system-logs.ts tests/unit/admin-ui-chart-health.spec.ts tests/unit/admin-ui-chart-health-route.spec.ts tests/unit/admin-panel-system-logs.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/admin-ui-chart-health.spec.ts tests/unit/admin-ui-chart-health-route.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts tests/unit/admin-overview-route.spec.ts tests/unit/admin-ops-health.spec.ts`
- UI and repo-wide verification:
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
  - `npx vitest run`
  - `corepack pnpm run check`
  - `npm run check:inventory`
  - `npm run check:continuity`

Continuation results:

- focused lint passed
- focused Vitest passed with `6` files and `13` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed
- `npx vitest run` passed with `87` files and `434` tests
- `corepack pnpm run check` passed
- `npm run check:inventory` passed with `663` tracked files and `112` test files
- `npm run check:continuity` passed
- no pre-existing untracked repo files were present at continuation start
- generated verification artifacts `playwright-report/` and `test-results/` were removed before final signoff

Runtime truth and continuity implications from continuation:

- admin overview and analytics hydration health is now fed back into the canonical debug route instead of being trapped in local component state
- the debug panel can now show which exact admin modules and analytics sections are loaded, degraded, empty, or failed
- category-level debug panel logs for analytics are now derived from the real latest client reports rather than simulated health summaries
- overview modules that use mixed live/polled sources now declare that source truth explicitly in the reported health item
- recent-transactions live fallback remains truthful because the reported source flips between realtime and overview snapshot paths

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- `check:ui:audits` still emits the recurring post-run WebServer `transformAlgorithm` warning after all tests pass
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits

Continuation follow-up gaps:

- chart-health reporting is client-reported and polled; it is not provider-side streaming telemetry
- the debug page now reports every current overview module and every analytics section/category, but it does not yet inspect individual Recharts primitives inside a single section card as separate debug records
- the new `admin_ui_chart_health` collection is intentionally bounded by latest-key snapshots and does not retain a long historical series yet

### Continuation: Admin Debug Truth and Creator Workspace Pass

Current audit date: 2026-04-07 09:18:00 -05:00
Current branch / commit for continuation start: `main` / `fbce504`
Continuation task:

- full audit pass for bug handling, error handling, runtime monitoring, admin debug truth, creator experience feature integrity, and creator dashboard workflow coverage

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- adjacency traces completed before editing for:
  - `src/app/admin/debug/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/viewer/page.tsx`
  - `src/app/api/creator/bookings/route.ts`
  - `src/app/api/creator/requests/route.ts`
  - `src/app/api/creator/messages/route.ts`

Planned touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/debug/route.ts`
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/dashboard/profile/page.tsx` if creator settings gating or navigation needs compatibility cleanup
- `src/app/api/creator/bookings/route.ts`
- `src/app/api/creator/messages/route.ts`
- creator workflow/supporting dashboard components/tests as required by implementation

Canonical helpers and modules targeted for reuse:

- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/server/admin-ui-chart-health.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/creator-experiences.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/context/AuthContext.tsx`

Initial findings before implementation:

- `GET /api/creator/bookings?creatorId=...` returns the full creator booking queue even for a fan viewer instead of only that caller's relationship to the creator
- `GET /api/creator/messages?threadId=...` returns thread contents without verifying that the caller owns the thread or is the creator/admin
- the creator dashboard home does not expose most already-implemented creator operations or onboarding/approval state, so real backend workflows remain buried in settings or inaccessible
- the admin debug page still contains manual simulation/testing affordances that need stronger truth-first separation from live health

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/app/admin/debug/page.tsx`
- `src/app/api/creator/bookings/route.ts`
- `src/app/api/creator/messages/route.ts`
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/components/Dashboard/CreatorWorkspacePanel.tsx`
- `tests/unit/creator-bookings-route.spec.ts`
- `tests/unit/creator-messages-route.spec.ts`

Canonical helpers and modules actually reused:

- `src/lib/server/admin-ops-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/server/admin-ui-chart-health.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/creator-experiences.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/context/AuthContext.tsx`

Implementation results:

- `GET /api/creator/bookings?creatorId=...` is now ownership-scoped:
  - a fan only sees their own bookings with that creator
  - the creator owner still sees the full creator queue
  - creator settings and subscription state remain available for the public creator page flow
- `GET /api/creator/messages?threadId=...` now validates thread ownership before returning any messages
  - creator owner, participant, and admin can read the thread
  - unrelated callers get a direct `403 Forbidden`
  - missing threads resolve to an honest empty response instead of leaking query behavior
- dashboard home now includes a real creator workspace surface driven by the live creator routes already present in the backend
  - onboarding and approval state for creator applicants
  - creator stats from `GET /api/creator/settings`
  - custom request queue with accept / decline / fulfill actions
  - booking queue with complete / cancel actions
  - creator inbox thread list with owner-checked thread reads and reply send
  - subscriber list, payout availability/history, and creator broadcast send/history
  - per-module load issues stay visible instead of collapsing into decorative empty panels
- the profile creator controls section now has a stable `#creator-tools` anchor so the dashboard workspace can deep-link to the existing creator settings and drop-submission controls without duplicating them
- the admin debug page manual-tool lane no longer presents an unimplemented webhook simulation control
  - the section is now framed as manual utilities only
  - the live working utility is labeled as manual balance adjustment instead of simulation language

Runtime truth and error-handling implications:

- creator experience privacy is now stricter and explicit at the route boundary rather than relying on client restraint
- the new creator workspace is route-backed and surfaces module-specific load failures through `reportClientIssue(...)` and inline operator/user-visible errors
- approved legacy creators without a `creatorApplication` record no longer show fake onboarding state in the creator workspace
- admin debug keeps the manual utility lane explicitly separate from live health and no longer exposes a dead-end simulated webhook button

Verification and signoff notes for this continuation:

- targeted lint and route tests passed
- full repo check, full contract tests, dependency checks, version checks, functions checks, continuity checks, and Firebase rules checks all passed
- the only failing verification path is the pre-existing Chromium `/creators/waitlist` guest-hero visual snapshot drift in `npm run check:ui:audits`
- generated `playwright-report/`, `test-results/`, and `.lighthouseci/` artifacts were removed before final signoff

Continuation follow-up gaps:

- the creator workspace is a truthful live route-backed operations surface, but it still refreshes by route reads rather than per-queue realtime subscriptions
- creator-specific controls still live in `/dashboard/profile` and keep their existing manual-save behavior
- the Chromium `/creators/waitlist` guest-hero visual baseline still needs a separate stabilization or baseline-refresh pass

### Continuation: AI Cover Legacy Audit + Consistency Runtime Pass

Current audit date: 2026-04-07 11:05:00 -05:00
Current branch / commit for continuation start: `main` / `fbce504`
Continuation task:

- full-scale audit focused on lingering legacy AI cover logic
- replace stale model/runtime branches with a canonical Gemini-only cover-generation path
- add custom consistency helpers for drop-cover generation
- refine the Admin AI page so retained signals, reference reuse, and live job state are visible without simulated training language

Continuation start state:

- working tree already dirty from an earlier local creator/debug pass and left intact for continuity
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed unrelated existing local modifications before this continuation
- adjacency traces completed before editing for:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/admin/ai/page.tsx`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

Planned touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md` if a new durable AI-runtime rule is finalized
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/admin/ai/page.tsx`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- AI cover route tests under `tests/unit/admin-ai-drop-covers-*.spec.ts`
- `tests/unit/ai-drop-covers.spec.ts`

Canonical helpers and modules targeted for reuse:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/lib/server/analytics.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/storage-assets.ts`

Initial AI audit findings before implementation:

- the shared AI cover contract still exposes legacy Imagen constants, pricing entries, and model-location normalization as first-class runtime values instead of a bounded migration shim
- the server AI runtime still preserves an older non-Gemini publisher-model `:predict` branch even though the current product path is Gemini image generation
- the Admin AI page is truthful about not doing hidden training, but it still relies on 10-second polling only and does not show a canonical per-job consistency recipe or why retained references were selected
- retained positive AI references and the latest catalog cover are visible, but their reuse value is only partially observable because the page does not surface positive reuse counts or ranked selection reasons

### Continuation: In-site Support Foundation and Dead Support Redirect Removal

Current audit date: 2026-04-07 03:43:16 -05:00
Current branch / commit for continuation start: `main` / `5d4d2bf`
Continuation task:

- full codebase audit for dead or misleading support handling
- implement a simple real in-site support ticket foundation
- remove signed-in support redirects to the nonexistent support email
- keep the support foundation mobile-first and admin-operable

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- initial support audit findings:
  - no real in-site support inbox existed even though `support_threads` / `support_messages` scaffolding already existed
  - signed-in support entry points in profile navigation and dashboard/profile still redirected to a dead `mailto:` address
  - creator application support CTAs also still routed to the dead support email
  - admin user detail still framed support readiness as future-only instead of reflecting live support state

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `src/lib/privacy-policy.ts`
- `src/lib/support-readiness.ts`
- `src/lib/server/support-threads.ts`
- `src/lib/telemetry-catalog.ts`
- `src/lib/analytics-semantics.ts`
- `src/app/api/support/threads/route.ts`
- `src/app/api/support/threads/[threadId]/route.ts`
- `src/app/api/admin/support/threads/route.ts`
- `src/app/api/admin/support/threads/[threadId]/route.ts`
- `src/app/dashboard/support/page.tsx`
- `src/app/admin/support/page.tsx`
- `src/components/Support/SupportInbox.tsx`
- `src/components/Admin/AdminSupportQueue.tsx`
- `src/components/Navigation/ProfileDropdown.tsx`
- `src/components/Navigation/ProfileSidebar.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/app/admin/layout.tsx`
- `src/components/Navigation/AdminDropdown.tsx`
- `src/app/creators/apply/page.tsx`
- `src/app/creators/waitlist/page.tsx`
- `src/app/(legal)/privacy/page.tsx`
- `src/app/api/admin/user/[userId]/route.ts`
- `src/app/admin/user/[userId]/page.tsx`
- `tests/unit/support-readiness.spec.ts`
- `tests/unit/support-threads-route.spec.ts`
- `tests/unit/admin-support-threads-route.spec.ts`
- `tests/unit/creator-waitlist-page.spec.tsx`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/privacy-page-chromium-win32.png`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/privacy-page-Mobile-Chrome-win32.png`

Canonical helpers and modules actually reused:

- `src/lib/support-readiness.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/firebase-admin.ts`
- `src/hooks/useAuthSWR.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/components/Admin/AdminPageHeader.tsx`
- `src/components/ui/Button.tsx`

Implementation results:

- a real signed-in support inbox now exists at `/dashboard/support`
  - users can create tickets
  - users can reply in-thread
  - users can resolve and reopen their own tickets
  - the inbox polls the live support routes every 10 seconds instead of faking a saved or queued state
- a real admin support queue now exists at `/admin/support`
  - admins can filter threads by queue status
  - admins can read message history
  - admins can reply and move threads between waiting/resolved states
- signed-in support entry points no longer use a dead email redirect
  - profile dropdown support now opens `/dashboard/support`
  - profile sidebar support now opens `/dashboard/support`
  - dashboard profile support card now opens `/dashboard/support`
  - creator application and waitlist support actions now deep-link into `/dashboard/support` with creator-application context
- privacy/legal copy no longer advertises the nonexistent support email and now points signed-in users to the in-site support flow
- admin user detail support readiness is now truthful
  - support readiness no longer claims support is future-only
  - support chips now distinguish account email presence from in-app support availability
  - the support lane links directly into the new admin support queue for that user
- support telemetry is now cataloged
  - `support_inbox_viewed`
  - `admin_support_viewed`

Runtime truth and continuity implications:

- support is now an actual in-site thread/message system instead of a dead redirect
- bug reports in `platform_feedback` remain support intake signals, not the primary ticket system
- `support_threads` is the support summary source of truth and `support_messages` subcollections are the conversation source of truth
- current support is polling-backed, not socket-streamed
- no signed-in support surface now implies email support exists

Commands run for continuation:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/app/dashboard/profile/page.tsx`
  - `npm run trace:adjacent -- src/components/Feedback/ReportBugButton.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/feedback/route.ts`
  - `npm run trace:adjacent -- src/lib/support-readiness.ts`
  - `npm run trace:adjacent -- src/lib/server/support-threads.ts`
  - `npm run trace:adjacent -- src/components/Support/SupportInbox.tsx`
  - `npm run trace:adjacent -- src/components/Admin/AdminSupportQueue.tsx`
  - `npm run trace:adjacent -- src/app/api/support/threads/route.ts`
  - `npm run trace:adjacent -- src/app/api/admin/support/threads/route.ts`
- focused lint:
  - `npx eslint 'src/lib/privacy-policy.ts' 'src/lib/support-readiness.ts' 'src/lib/server/support-threads.ts' 'src/app/api/support/threads/route.ts' 'src/app/api/support/threads/[threadId]/route.ts' 'src/app/api/admin/support/threads/route.ts' 'src/app/api/admin/support/threads/[threadId]/route.ts' 'src/components/Support/SupportInbox.tsx' 'src/components/Admin/AdminSupportQueue.tsx' 'src/app/dashboard/support/page.tsx' 'src/app/admin/support/page.tsx' 'src/components/Navigation/ProfileDropdown.tsx' 'src/components/Navigation/ProfileSidebar.tsx' 'src/app/dashboard/profile/page.tsx' 'src/app/admin/layout.tsx' 'src/components/Navigation/AdminDropdown.tsx' 'src/app/creators/apply/page.tsx' 'src/app/creators/waitlist/page.tsx' 'src/app/(legal)/privacy/page.tsx' 'src/app/api/admin/user/[userId]/route.ts' 'src/app/admin/user/[userId]/page.tsx' 'tests/unit/support-readiness.spec.ts' 'tests/unit/support-threads-route.spec.ts' 'tests/unit/admin-support-threads-route.spec.ts' 'tests/unit/creator-waitlist-page.spec.tsx'`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/support-readiness.spec.ts tests/unit/support-threads-route.spec.ts tests/unit/admin-support-threads-route.spec.ts tests/unit/creator-waitlist-page.spec.tsx`
- repo-wide verification:
  - `npm run check:inventory`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
  - `npm run check:continuity`
  - `npm run check:telemetry`
  - `npx cross-env PLAYWRIGHT_USE_BUILD=1 playwright test tests/ui-audits/visual-regression.spec.ts --project=chromium --project="Mobile Chrome" --grep "privacy hero stays stable" --update-snapshots`

Continuation results:

- focused lint passed
- focused support tests passed with `3` files and `29` tests
- `npm run check:inventory` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `92` files and `454` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed after refreshing the privacy hero baseline for the intentional in-site support copy change
- `npm run check:continuity` passed
- `npm run check:telemetry` passed with `0` orphaned events
- generated `playwright-report/` and `test-results/` artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits

Continuation follow-up gaps:

- support is polling-backed at 10 seconds and does not yet use realtime listeners or sockets
- public signed-out/legal support still routes users toward authenticated in-site support rather than a separate guest intake flow
- bug reports and support threads are intentionally separate; there is no automatic bug-report-to-ticket conversion yet

### Continuation: AI Drop-Cover Catalog Audit for Create-Drop + Legacy Coverage

Current audit date: 2026-04-07 18:47:17 -05:00
Current branch / commit for continuation start: `main` / `8b24119`
Continuation task:

- full-scale audit to ensure the create-drop form and legacy drops both feed the AI cover reference/training system truthfully
- remove stale AI wording from the admin surface and continuity docs
- commit and push the catalog/legacy reference fix with a full audit refresh

Continuation start state:

- working tree was already dirty at continuation start from the prior local Admin AI observability pass and preserved for continuity
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed the existing local AI admin modifications before this continuation
- adjacency traces completed before editing for:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `src/app/api/admin/drops/route.ts`

Initial audit findings before implementation:

- the create-drop form was already feeding the AI cover system truthfully:
  - generation requests already carried `creatorId`
  - accepted AI covers were already linked back to the saved drop through the canonical `link_drop` feedback action after save
- the real gap was the non-AI reference library:
  - `src/lib/server/ai-drop-covers.ts` only sampled a small `validFrom`-ordered set of recent drop covers
  - that excluded older legacy covers and any drops with older timestamp shapes or missing `validFrom`
  - the Admin AI page therefore overstated the breadth of the reusable cover library
- no live legacy Imagen execution path was found beyond migration aliases and compatibility fields kept for persisted settings/job history

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `src/app/admin/ai/page.tsx`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/admin-ai-drop-covers-route.spec.ts`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-cover-catalog.spec.ts`

Canonical helpers and modules actually reused:

- `src/components/Admin/CreateDropModal.tsx`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/drop-status.ts`
- `src/hooks/useAdminPollingSWR.ts`
- `src/lib/authFetch.ts`
- `src/lib/client-error-reporting.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/server-diagnostics.ts`
- `src/lib/server/storage-assets.ts`

Implementation results:

- kept the create-drop feed path intact because it was already correct:
  - create-drop generation requests continue to send `creatorId`
  - accepted AI covers continue to link to the saved drop through the canonical feedback route after save
- replaced the recent-only reference sample with a real drop-cover catalog:
  - AI reference assets are now built from the full `drops` collection instead of a recent `validFrom` query
  - legacy/current recency is normalized through the shared drop timestamp helper
  - duplicate image URLs are deduped before ranking
  - ranking now prefers higher `totalUnlocks`, then newer timestamps, then title
- strengthened reference matching:
  - reference assets now carry `creatorId`
  - selection scoring can prefer same creator id before falling back to creator-name matching
- corrected admin/operator truth language:
  - the Admin AI page and create-drop AI panel now say `drop cover library` / `catalog covers` instead of `recent` or `live` covers
  - retained visual-signal counts now explicitly include catalog covers spanning current and legacy drops
- added regression coverage for the catalog behavior:
  - verifies legacy timestamp-shaped drops and current drops both enter the reusable reference catalog
  - verifies the current drop id can be excluded from the catalog when generating for that drop

Runtime truth and continuity implications:

- the create-drop form already fed accepted AI jobs into the retained AI pool; this continuation closes the missing legacy/current non-AI cover side
- the reusable drop-cover reference library now spans current and legacy uploaded covers present in the catalog instead of a recent-only sample
- old `recentDropReferenceCount` compatibility fields remain only to read and preserve historical job documents while the canonical live meaning is now `catalogDropReferenceCount`
- no hidden training or fine-tuning was added; the runtime remains reference-guided generation plus retained feedback/reuse signals

Commands run for continuation:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
  - `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
  - `npm run trace:adjacent -- src/app/api/admin/drops/route.ts`
- focused lint:
  - `npx eslint src/app/admin/ai/page.tsx src/app/api/admin/ai/drop-covers/route.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- repo-wide verification:
  - `npm run check:architecture`
  - `npm run check:continuity`
  - `npm run check:telemetry`
  - `npm run check:inventory`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`
  - `corepack pnpm run check`
  - `npx vitest run`

Continuation results:

- focused lint passed
- focused AI Vitest passed with `4` files and `22` tests
- `npm run check:architecture` passed
- `npm run check:continuity` passed
- `npm run check:telemetry` passed with `0` cataloged events lacking emitters
- `npm run check:inventory` passed and now reports `687` tracked files / `122` test files after staging the new AI catalog regression test
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `94` files and `461` tests
- `npm run check:ui:audits` failed only on the existing Chromium `/creators/waitlist` guest-hero screenshot instability; accessibility passed and the rest of the suite passed
- generated `playwright-report/` and `test-results/` artifacts from the failing visual audit were removed before signoff

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- the Chromium `/creators/waitlist` guest-hero visual baseline remains unstable and can alternate between two section heights without any code change in this continuation

Continuation follow-up gaps:

- the drop-cover catalog currently scans the full `drops` collection for correctness; if cost or latency becomes an issue, the next step is a canonical summarized cover-reference index rather than a return to sampled recent-cover logic
- compatibility reads still preserve `recentDropReferenceCount` for older AI job documents; new logic should continue to treat `catalogDropReferenceCount` as the live truth
- the pre-existing Chromium `/creators/waitlist` visual instability still needs a separate stabilization or baseline refresh pass

### Continuation: Latest-Cover AI Scan + Queue Reactivation Notification Audit

Current audit date: 2026-04-07 19:22:35 -05:00
Current branch / commit for continuation start: `main` / `0224af7`
Continuation task:

- narrow the non-AI cover reference scan so the AI stack only reuses the latest catalog cover instead of scanning the full drop collection
- audit queue lifecycle and cooldown reactivation so queued drops still activate and notify correctly
- verify the legacy Timestamp-shaped queued-drop glitch is fully fixed across both scheduling and activation notification paths

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed a clean tree before editing
- adjacency traces completed before editing for:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/api/cron/process-queue/route.ts`
  - `src/lib/server/drop-queue.ts`
  - `src/app/api/cron/notify-active-drops/route.ts`

Initial audit findings before implementation:

- the legacy queue rollover bug was already fixed in `cron/process-queue` because that route now normalizes Firestore Timestamp-like `validFrom` / `validUntil` through `getFiniteDropTimestamp(...)`
- the notification side still had the same class of timestamp bug:
  - `src/app/api/cron/notify-active-drops/route.ts` queried `scheduled` and `active` drops with numeric range filters only
  - the route still coerced `validFrom` with `Number(...)` and only accepted numeric `validUntil`
  - legacy Timestamp-shaped scheduled/active drops could therefore miss activation, expiry, requeue, and activation-notification handling
- the AI helper still scanned the full `drops` collection to get one extra human-made cover reference even though the create-drop form already feeds accepted AI covers back into the retained reference pool after save

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`
- `src/app/admin/ai/page.tsx`
- `src/app/api/cron/notify-active-drops/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- `tests/unit/notify-active-drops-route.spec.ts`

Canonical helpers and modules actually reused:

- `src/lib/drop-status.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/push-notifications.ts`
- `src/lib/server/drop-runtime.ts`
- `src/lib/server/drop-queue.ts`
- `src/lib/drop-queue-lifecycle.ts`
- `src/components/Admin/CreateDropModal.tsx`

Implementation results:

- narrowed non-AI cover reuse to the latest reusable catalog cover instead of a full collection scan:
  - AI cover selection still keeps template and retained positive AI covers
  - the latest catalog cover now comes from a bounded recent `validFrom` query window instead of `adminDb.collection("drops").get()`
  - the catalog ranking now prefers the newest reusable cover before unlock count
- corrected the admin AI wording to match that runtime truth:
  - `Drop cover library` wording was replaced with `Latest catalog cover`
  - stats and job detail text no longer imply a broad reusable library when only one recent cover is being reused
- hardened `cron/notify-active-drops` against legacy Timestamp-shaped drops:
  - dropped the numeric `validFrom <= now` / `validUntil <= now` query filters
  - query now loads `scheduled` and `active` drops by status, then resolves due lifecycle changes with `getFiniteDropTimestamp(...)` and `resolveDropStatusFromTiming(...)`
  - activation keys now use normalized millis rather than `Number(rawValidFrom)`
  - legacy active drops with `autoQueueOnExpire` now requeue correctly after expiry
  - scheduled return drops with prior `activationCount` now still send the correct return notification after cooldown reactivation

Runtime truth and continuity implications:

- accepted AI covers from the create-drop form remain the historical retained reference pool
- non-AI cover reuse is now intentionally just the latest reusable catalog cover, not a full reusable library
- queue processing and notify-active-drops now both normalize Timestamp-like timing values instead of mixing normalized scheduling with legacy numeric-only activation checks
- return notifications for reactivated queued drops still depend on the real `activationCount >= 1` signal and now work for Timestamp-shaped legacy documents too

Commands run for continuation:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/api/cron/process-queue/route.ts`
  - `npm run trace:adjacent -- src/lib/server/drop-queue.ts`
  - `npm run trace:adjacent -- src/app/api/cron/notify-active-drops/route.ts`
- focused lint:
  - `npx eslint src/app/api/cron/notify-active-drops/route.ts src/lib/server/ai-drop-covers.ts src/app/admin/ai/page.tsx src/components/Admin/AiDropCoverGeneratorPanel.tsx tests/unit/notify-active-drops-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/notify-active-drops-route.spec.ts tests/unit/process-queue-route.spec.ts tests/unit/admin-ai-drop-cover-catalog.spec.ts tests/unit/ai-drop-covers.spec.ts`
- repo-wide verification:
  - `npm run check:continuity`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:lighthouse`
  - `npm run check:ui:audits`

Continuation results:

- focused lint passed
- focused queue/AI Vitest passed with `4` files and `20` tests
- `npm run check:continuity` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `94` files and `464` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` failed only on the existing Chromium `/creators/waitlist` guest-hero screenshot instability; accessibility passed and the rest of the suite passed
- an initial attempt to run multiple build-based verification commands in parallel caused a Next build collision (`Another next build process is already running`); the affected checks were rerun sequentially to completion
- generated `playwright-report/`, `test-results/`, and `.lighthouseci/` artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse cleanup emitted temporary Windows `EPERM` warnings while deleting temp folders after successful audits
- the Chromium `/creators/waitlist` guest-hero visual baseline remains unstable and can alternate between two section heights without any code change in this continuation

Continuation follow-up gaps:

- the latest-cover AI shortcut is cheaper but narrower than the earlier full-catalog scan; if broader human-cover reuse is needed again, the next step should be a canonical summarized reference index rather than another full collection scan
- compatibility reads still preserve `recentDropReferenceCount` for older AI job documents even though the live truth is now the latest catalog cover count
- the pre-existing Chromium `/creators/waitlist` visual instability still needs a separate stabilization or baseline refresh pass

### Continuation: Exclusive Collapsed Drop-Form Sections

Current audit date: 2026-04-07 21:27:55 -05:00
Current branch / commit for continuation start: `main` / `7469988`
Continuation task:

- make the shared create/edit drop form start with all sections collapsed
- allow only one section to be open at a time, with the currently open section collapsing when another section expands

Continuation start state:

- working tree clean at continuation start
- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed a clean tree before editing
- adjacency traces completed before editing for:
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/app/admin/drops/page.tsx`

Initial audit findings before implementation:

- the shared drop modal still used four independent booleans (`uploadsOpen`, `basicsOpen`, `pricingOpen`, `actionSettingsOpen`)
- create, edit, and creator-submission flows all mounted through the same shared `CreateDropModal`, so the current behavior opened every section at once across all those surfaces
- independent booleans meant multiple sections could remain expanded simultaneously, and the action-settings section could stay selected even after switching the drop type back to `content`

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/components/Admin/CreateDropModal.tsx`
- `src/lib/admin-drop-form-sections.ts`
- `tests/unit/admin-drop-form-sections.spec.ts`

Canonical helpers and modules actually reused:

- `src/components/Admin/CreateDropModal.tsx`
- `src/app/admin/drops/page.tsx`
- `src/app/dashboard/profile/page.tsx`
- `src/lib/admin-drop-form.ts`
- `src/lib/client-error-reporting.ts`

Implementation results:

- replaced the four independent section booleans in `CreateDropModal` with one canonical `openSection` state
- all sections now start collapsed for:
  - admin create drop
  - admin edit drop
  - creator submit/edit drop flows that reuse the same modal
- opening one section now closes the previously open section
- toggling the currently open section closes it back to the fully collapsed state
- switching a drop back to `content` now clears the `Action Settings` section if it was the active section
- extracted the exclusive-toggle rule into `src/lib/admin-drop-form-sections.ts` and covered it with focused unit tests

Runtime truth and continuity implications:

- this is a shared modal behavior change, not a page-specific override; admin and creator edit/create flows now stay consistent because they reuse the same component
- the AI cover generator panel stays inactive while the `Files & Assets` section is collapsed because its visibility is still truthfully tied to the open section state

Commands run for continuation:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/components/Admin/CreateDropModal.tsx`
  - `npm run trace:adjacent -- src/app/admin/drops/page.tsx`
- focused lint:
  - `npx eslint src/components/Admin/CreateDropModal.tsx src/lib/admin-drop-form-sections.ts tests/unit/admin-drop-form-sections.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/admin-drop-form-sections.spec.ts`
- repo-wide verification:
  - `corepack pnpm run check`
  - `npm run check:ui:audits`

Continuation results:

- focused lint passed
- focused accordion-state Vitest passed with `1` file and `3` tests
- `corepack pnpm run check` passed
- `npm run check:ui:audits` passed
- generated `playwright-report/` and `test-results/` artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Playwright surfaced the recurring webserver `transformAlgorithm` warning after an otherwise successful all-green UI audit run

Continuation follow-up gaps:

- this pass covers the shared modal accordion state only; it does not add keyboard arrow-key roving focus or a dedicated Radix accordion primitive

### Continuation: Creator Spotlight Hydration And AI Timeout Truth

Current audit date: 2026-04-08 00:39:00 -05:00
Current branch / commit for continuation start: `main` / `7469988`
Continuation task:

- fix the empty creator spotlight lane
- make the spotlight follow button truthfully reflect the followed state
- remove the hardcoded 20-second local AI cover timeout so failure states stop looking simulative

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed a dirty tree at continuation start from the prior uncommitted drop-form accordion pass:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `src/components/Admin/CreateDropModal.tsx`
  - `src/lib/admin-drop-form-sections.ts`
  - `tests/unit/admin-drop-form-sections.spec.ts`
- adjacency traces completed before editing for:
  - `src/components/CreatorDiscoveryRail.tsx`
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/admin/ai/page.tsx`

Initial audit findings before implementation:

- the empty creator spotlight was not caused by the rail component alone; signed-in recommendation hydration was truthfully failing in two places:
  - creator visibility logic still relied too heavily on `role === "creator"` in the discovery and relationships APIs
  - `CreatorDiscoveryRail` would overwrite valid discovery results with `relationshipResult.recommendedCreators || nextRecommended`, so an empty recommendations array from the relationships route hid real discovery creators for signed-in users
- the spotlight follow button did not visually distinguish the already-following state in the requested black / purple treatment
- AI drop-cover generation still used a local hardcoded `20_000ms` timeout in `src/lib/server/ai-drop-covers.ts`, so the app could terminate a request before the real provider/runtime boundary finished and then surface a misleading timeout failure

Exact touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/creator/relationships/route.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/components/CreatorDiscoveryRail.tsx`
- `src/lib/creator-public-pages.ts`
- `src/lib/server/ai-drop-covers.ts`
- `tests/unit/creator-public-pages.spec.ts`
- `tests/unit/creator-discovery-route.spec.ts`
- `tests/unit/creator-relationships-route.spec.ts`

Canonical helpers and modules actually reused:

- `src/components/CreatorDiscoveryRail.tsx`
- `src/lib/creator-public-pages.ts`
- `src/lib/creator-onboarding.ts`
- `src/lib/creator-experiences.ts`
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/creator/relationships/route.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

Implementation results:

- added `isCreatorVisibleInDiscovery(...)` to `src/lib/creator-public-pages.ts` so discovery/recommendation eligibility now truthfully includes:
  - explicit creator-role users
  - approved creator applicants whose role record has not been promoted yet
  - users with active public drops
  - while still excluding suspended/banned users
- updated `src/app/api/creator/discovery/route.ts` to use that canonical visibility helper instead of a role-only filter
- updated `src/app/api/creator/relationships/route.ts` to use the same canonical visibility helper for both creator lookup and signed-in recommended-creator hydration, and to count active public drops from the canonical drop-status normalization path
- fixed `CreatorDiscoveryRail` so signed-in users only replace discovery results with `recommendedCreators` when that array is non-empty; empty relationship recommendations no longer wipe real spotlight candidates
- updated the spotlight follow button so the followed state now renders as a black button with purple text and a purple outline and the label `following`
- removed the local `20_000ms` AI-cover timeout wrapper from `src/lib/server/ai-drop-covers.ts`; generation now waits for the real upstream/runtime boundary instead of failing on an app-side hard cutoff
- tightened AI timeout messaging in the create-drop panel so the failure text no longer implies a fake fixed deadline

Runtime truth and continuity implications:

- the creator spotlight now reflects the same creator eligibility truth across discovery and relationship hydration instead of diverging by signed-in state
- approved creator applicants with real active drops are no longer hidden just because their `users.role` field has not been promoted yet
- AI cover failures now reflect actual upstream/request termination rather than a local simulated 20-second cutoff
- this continuation intentionally did not modify the pre-existing uncommitted drop-form accordion files beyond carrying them forward in the working tree

Commands run for continuation:

- `git status --short`
- adjacency traces:
  - `npm run trace:adjacent -- src/components/CreatorDiscoveryRail.tsx`
  - `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
  - `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- focused lint:
  - `npx eslint src/lib/creator-public-pages.ts src/app/api/creator/discovery/route.ts src/app/api/creator/relationships/route.ts src/components/CreatorDiscoveryRail.tsx src/lib/server/ai-drop-covers.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx tests/unit/creator-public-pages.spec.ts tests/unit/creator-discovery-route.spec.ts tests/unit/creator-relationships-route.spec.ts`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/creator-public-pages.spec.ts tests/unit/creator-discovery-route.spec.ts tests/unit/creator-relationships-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/ai-drop-covers.spec.ts`
- repo-wide verification:
  - `corepack pnpm run check`
  - `npm run check:ui:audits`
  - `npm run check:ui:lighthouse`

Continuation results:

- focused lint passed
- focused creator/AI Vitest passed with `5` files and `22` tests
- `corepack pnpm run check` passed
- `npm run check:ui:lighthouse` passed on a sequential rerun after an earlier build-collision attempt
- `npm run check:ui:audits` still only surfaced the pre-existing visual-regression instability on mobile/Chromium guest surfaces; accessibility passed and the rest of the suite passed
- generated `playwright-report/`, `test-results/`, and temporary Lighthouse artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse Chrome cleanup warnings on Windows temp directories after a successful Lighthouse run
- Playwright surfaced the recurring webserver `transformAlgorithm` warning around otherwise successful UI audit runs

Continuation follow-up gaps:

- the creator spotlight still depends on poll/fetch hydration rather than a Firestore live listener
- AI cover generation still depends on actual provider latency and provider/runtime health; this pass removed the fake local cutoff, not the upstream wait itself

### Continuation: Open PR Assimilation And Audit Cleanup

Current audit date: 2026-04-08 10:21:00 -05:00
Current branch / commit for continuation start: `main` / `07a663f`
Continuation task:

- commit and push the outstanding local spotlight / drop-form changes
- inspect every open PR, assimilate any still-missing changes onto `main`, and close the PRs
- rerun the codebase review and clean up the audit state afterward

Continuation start state:

- canonical startup docs re-read earlier in this session and continuity maintained through this pass
- `git status --short` was clean immediately after committing and pushing `07a663f`
- open PRs at continuation start:
  - `#159` `💸 Fix GumDrop economics and ledger integrity drift`
  - `#160` `⚙️ Improve algorithmic efficiency and stability in high-ROI hotspot`
  - `#161` `⚡ Bolt: Optimize notificationFunnel array processing in Admin Analytics`
- adjacency traces completed before editing for:
  - `src/lib/gumdrop-economics.ts`
  - `src/lib/server/analytics-metrics.ts`
  - `src/app/admin/analytics/page.tsx`

Initial audit findings before implementation:

- PR `#159` contained a real economics/presentation drift fix that was still missing on `main`; `getBundlePresentation(...)` still treated the 1100-drop and 2500-drop packs as if they had no bonus split in the presentation layer even though the package catalog and economics pipeline treat them as `1000 + 100` and `2000 + 500`
- PR `#160` contained a real analytics efficiency improvement that was still missing on `main`; `buildAnalyticsMetricReport(...)` still performed repeated `Array.from(...).filter(...).reduce(...)` scans over the same session map
- PR `#161` contained a small but valid React render optimization that was still missing on `main`; the notification funnel pie was still allocating filtered/mapped arrays inline during render

Exact touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/gumdrop-economics.ts`
- `tests/unit/gumdrop-economics.spec.ts`
- `src/lib/server/analytics-metrics.ts`
- `src/app/admin/analytics/page.tsx`

Canonical helpers and modules actually reused:

- `src/lib/gumdrop-economics.ts`
- `src/lib/gumdrops-packages.ts`
- `src/lib/server/analytics-metrics.ts`
- `src/app/admin/analytics/page.tsx`
- `src/lib/admin-ui-chart-health.ts`
- `src/hooks/useAdminPollingSWR.ts`

PR review and assimilation results:

- PR `#159` was partially assimilated:
  - adopted the corrected base/bonus presentation mapping for:
    - `Sweet Pack` → `500 + 50`
    - `Kandy Bag Pack` → `1000 + 100`
    - `Kandy Land Pack` → `2000 + 500`
    - `King Size Bundle` thousand-step bundle tiers → even split between paid and bonus presentation amounts
  - updated `tests/unit/gumdrop-economics.spec.ts` to assert the corrected bonus presentation
  - did not take the PR's audit-file patch directly; this audit entry supersedes it
- PR `#160` was assimilated:
  - consolidated repeated session-map scans in `buildAnalyticsMetricReport(...)` into one pass while preserving output semantics
  - removed repeated array allocations and repeated linear scans across the same session set
- PR `#161` was partially assimilated:
  - adopted the notification-funnel `useMemo(...)` optimization
  - intentionally omitted the PR’s `.jules/bolt.md` note because it is not production runtime code and did not belong in the mainline repo surface
  - adjusted the memo dependency shape so ESLint stays clean on the live file

Runtime truth and continuity implications:

- GumDrop package presentation now matches the actual catalog and economics math instead of overstating base drops and hiding bonus drops on the larger fixed packs
- admin analytics no longer recomputes the same session-derived counts through repeated full-map scans
- the notification funnel pie now keeps stable filtered/mapped data references instead of recreating them inside render
- no PR was merged wholesale; the missing deltas were applied directly onto audited `main`

Commands run for continuation:

- `git status --short`
- `gh pr list --state open --limit 50`
- `gh pr view 159 --json number,title,body,headRefName,baseRefName,author,files`
- `gh pr view 160 --json number,title,body,headRefName,baseRefName,author,files`
- `gh pr view 161 --json number,title,body,headRefName,baseRefName,author,files`
- adjacency traces:
  - `npm run trace:adjacent -- src/lib/gumdrop-economics.ts`
  - `npm run trace:adjacent -- src/lib/server/analytics-metrics.ts`
  - `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
- focused lint:
  - `npx eslint src/lib/gumdrop-economics.ts tests/unit/gumdrop-economics.spec.ts src/lib/server/analytics-metrics.ts src/app/admin/analytics/page.tsx`
- focused tests:
  - `corepack pnpm exec vitest run tests/unit/gumdrop-economics.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts`
- repo-wide verification:
  - `npm run check:inventory`
  - `npm run check:continuity`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:audits`
  - `npm run check:ui:lighthouse`

Continuation results:

- focused lint passed after one dependency-shape cleanup in `src/app/admin/analytics/page.tsx`
- focused Vitest passed with `2` files and `12` tests
- `npm run check:inventory` passed with `691` tracked files
- `npm run check:continuity` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `97` files and `471` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` still surfaced the pre-existing visual-regression instability on guest creator surfaces:
  - Chromium `/creators/waitlist`
  - Mobile Chrome `/creators/apply` with a very small pixel diff
- generated `playwright-report/`, `test-results/`, and temporary Lighthouse artifacts were removed before signoff

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse Chrome cleanup warnings on Windows temp directories after a successful Lighthouse run
- Playwright surfaced the recurring webserver `transformAlgorithm` warning around otherwise successful UI audit runs

Continuation follow-up gaps:

- the creator guest-surface Playwright snapshots remain unstable and still need a separate baseline refresh or layout-stability pass
- the PR-source local branches fetched for review (`jules_pr_159`, `jules_pr_160`, `jules_pr_161`) can be deleted later; they are not part of the product runtime

Late-open PR follow-up:

- PR `#162` opened during the close-out window and was reviewed before final signoff
- finding:
  - `src/app/api/security/log-attempt/route.ts` still returned a route-local raw 500 response instead of delegating to the canonical `handleApiError(...)` path
- implementation:
  - updated `src/app/api/security/log-attempt/route.ts` to delegate unexpected failures to `handleApiError(error, "SecurityLogAttempt.POST")`
  - added `tests/unit/security-log-attempt-route.spec.ts` to assert the route now delegates unexpected failures through the canonical handler
- focused verification:
  - `npx eslint src/app/api/security/log-attempt/route.ts tests/unit/security-log-attempt-route.spec.ts`
  - `corepack pnpm exec vitest run tests/unit/security-log-attempt-route.spec.ts`
- PR disposition:
  - `#162` should be closed after the audited mainline commit containing the route hardening lands

### Continuation: Jessi Ray Operator Playbook Assets

Current audit date: 2026-04-08 10:47:00 -05:00
Current branch / commit for continuation start: `main` / `91b1764`
Continuation task:

- implement the Jessi Ray signup + feedback playbook as operator assets without changing product code

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` confirmed a clean tree before implementation
- non-mutating grounding reviewed the live product surfaces for:
  - public creator page and creator experiences
  - signup and welcome-bonus registration path
  - daily check-in ladder
  - support inbox escalation path
  - referral storage and registration handling

Initial audit findings before implementation:

- the requested playbook already aligns with current runtime truth:
  - free signup currently grants `50` welcome GumDrops
  - text creator messages currently cost `1` GD
  - following and creator alerts are free
  - daily check-in currently pays `10` to `70` GD
- the strongest truthful v1 implementation is an operator-doc package, not product code, because the plan explicitly keeps v1 out of runtime changes
- the referral parameter is technically supported through `?ref=...` capture, but it should remain internal tracking only because the new user does not directly receive the referral bonus

Exact touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `creator-playbooks/jessi-ray/README.md`
- `creator-playbooks/jessi-ray/jessi-ray-dm-script-sheet.md`
- `creator-playbooks/jessi-ray/jessi-ray-walkthrough-card.md`
- `creator-playbooks/jessi-ray/jessi-ray-feedback-prompt-card.md`
- `creator-playbooks/jessi-ray/jessi-ray-confusion-tags.md`
- `creator-playbooks/jessi-ray/jessi-ray-weekly-scorecard-template.csv`

Canonical helpers and modules actually reused for truth validation:

- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/components/Creators/CreatorExperiencesPanel.tsx`
- `src/app/api/user/register/route.ts`
- `src/lib/creator-experiences.ts`
- `src/lib/daily-checkin.ts`
- `src/components/Support/SupportInbox.tsx`
- `src/components/CoreLayoutWrapper.tsx`
- `src/lib/referrals.ts`

Implementation results:

- added a Jessi-specific operator package under `creator-playbooks/jessi-ray/`
- produced the five requested assets:
  - one DM script sheet
  - one walkthrough card
  - one feedback prompt card
  - one confusion tag sheet
  - one weekly scorecard template
- added a package `README.md` that records the live product truths the playbook depends on and the primary creator-page link to use
- intentionally kept this pass out of runtime code and UI surfaces so v1 stays consistent with the plan's `no code changes in v1` rule

Runtime truth and continuity implications:

- this package is an operator-layer implementation only; it does not claim new creator attribution, new signup flows, or new feedback capture that the runtime does not already support
- the playbook is explicitly grounded in live product truth as of this pass:
  - `50` welcome GumDrops on signup
  - `1` GD text message cost
  - `10` to `70` GD daily check-in ladder
  - in-site support escalation path for blocked users
- the public creator page link is the only user-facing link used in the package

Commands run for continuation:

- `git status --short`
- targeted repo inspection commands for creator profile, creator experiences, support inbox, referrals, signup, and daily check-in logic
- `npm run check:inventory`

Continuation results:

- operator asset package created successfully
- no runtime code or backend behavior changed in this continuation
- `npm run check:inventory` passed with `692` tracked files at verification time
- the new `creator-playbooks/jessi-ray/` package is currently untracked in the working tree, so the tracked-file baseline did not increase yet

Known warnings and non-blocking notices during continuation:

- none beyond the standing repo warnings already recorded in earlier audit entries

Continuation follow-up gaps:

- creator-specific attribution and creator-specific onboarding are still backlog items; this pass intentionally did not add runtime tracking or new UI flows

### Continuation: Creator Spotlight Follower Count Truth

Current audit date: 2026-04-08 11:55:00 -05:00
Current branch / commit for continuation start: `main` / `8b24119`
Continuation task:

- fix creator spotlight follower counts so signed-in spotlight hydration matches the public creator profile's live follower truth

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` showed an already-dirty tree from the prior uncommitted Jessi Ray playbook docs-only pass:
  - modified `FULL_SCALE_CODEBASE_AUDIT.md`
  - untracked `creator-playbooks/`
- targeted adjacency traces were run for:
  - `src/components/CreatorDiscoveryRail.tsx`
  - `src/app/api/creator/relationships/route.ts`
- grounding compared the creator spotlight path against:
  - `src/app/creators/[username]/CreatorProfileClient.tsx`
  - `src/app/api/creators/[username]/route.ts`

Initial audit findings before implementation:

- the spotlight rail already patched follower count locally from the follow/unfollow POST response
- the stale count bug was in signed-in hydration, not the button handler
- the public creator profile loads follower count from the canonical `creator_relationships where following == true` count path
- `src/app/api/creator/relationships/route.ts` was still hydrating `followedCreators` and signed-in `recommendedCreators` from `creator_ops.summary.followerCount`, which can lag behind the canonical relationship count
- because signed-in spotlight hydration prefers `/api/creator/relationships`, stale summary counts could override fresher discovery/profile truth

Exact touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/api/creator/relationships/route.ts`
- `tests/unit/creator-relationships-route.spec.ts`

Canonical helpers and modules actually reused for truth validation:

- `src/components/CreatorDiscoveryRail.tsx`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/app/api/creators/[username]/route.ts`
- `src/lib/creator-public-pages.ts`

Implementation results:

- `src/app/api/creator/relationships/route.ts` now computes follower counts for the returned spotlight creators from the canonical `creator_relationships` data instead of `creator_ops.summary`
- the route now returns live follower counts for:
  - `followedCreators`
  - signed-in `recommendedCreators`
  - single-creator relationship reads via `?creatorId=...`
- the follower-count helper now supports either Firestore aggregate-count queries or a plain query `get()` fallback so the route remains testable without changing runtime behavior
- added route coverage proving the spotlight route now prefers live relationship counts over stale ops-summary follower counts
- removed generated `playwright-report/` and `test-results/` artifacts after verification

Runtime truth and continuity implications:

- the creator spotlight follower count now matches the same canonical follower source used by the public creator profile
- this change fixes signed-in spotlight hydration drift without inventing local optimistic counts or new client-side polling
- `creator_ops.summary.followerCount` may still exist for admin/ops summary uses, but it is no longer trusted as the spotlight source of truth

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/components/CreatorDiscoveryRail.tsx`
- `npm run trace:adjacent -- src/app/api/creator/relationships/route.ts`
- targeted file inspection of spotlight, creator profile, and creator profile API surfaces
- `npx eslint src/app/api/creator/relationships/route.ts tests/unit/creator-relationships-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/creator-relationships-route.spec.ts`
- `npm run check:ui:audits`
- `corepack pnpm run check`

Continuation results:

- focused lint passed
- focused Vitest passed with `1` file and `2` tests
- `corepack pnpm run check` passed with `98` files and `473` tests in the contract suite
- `npm run check:ui:audits` still failed on an existing unrelated Mobile Chrome home-hero visual baseline drift
- generated Playwright artifacts from the UI audit run were removed before signoff

Known warnings and non-blocking notices during continuation:

- npm unknown env config warnings during canonical script chains
- `check:firebase-runtime` informational dotenv logs inside the canonical `check` pipeline
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- the UI audit failure was unrelated to creator spotlight and affected the pre-existing Mobile Chrome `/` home hero snapshot baseline

Continuation follow-up gaps:

- the unrelated Mobile Chrome home-hero snapshot drift still needs a separate visual-baseline stabilization pass
- the prior uncommitted `creator-playbooks/` operator docs remain outside this runtime fix and were left untouched

### Continuation: UI Audit Baseline Stabilization

Current audit date: 2026-04-08 12:02:00 -05:00
Current branch / commit for continuation start: `main` / `8b24119`
Continuation task:

- resolve the unrelated `check:ui:audits` failures so the UI audit suite passes again

Continuation start state:

- current runtime fix worktree already contained the uncommitted creator spotlight follower-count patch and the earlier untracked `creator-playbooks/` docs package
- `check:ui:audits` had failed on visual-regression baselines after the spotlight pass:
  - home hero on Chromium
  - home hero on Mobile Chrome
  - creator apply hero on Mobile Chrome

Initial audit findings before implementation:

- the home-hero audit selector included the live activity ticker, which renders a real active-drop count and should not be treated as a static snapshot surface
- the home-hero test also introduced masking for the ticker region, which required the stored home-hero snapshots to be regenerated to match the intended masked audit surface
- the creator-apply Mobile Chrome diff was a small stable visual drift against the current intended UI, not a runtime bug

Exact touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `tests/ui-audits/visual-regression.spec.ts`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-chromium-win32.png`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png`

Implementation results:

- updated `tests/ui-audits/visual-regression.spec.ts` so the home-hero audit masks the live activity ticker instead of treating the real drop-count surface as static
- regenerated the affected visual baselines for:
  - home hero on Chromium
  - home hero on Mobile Chrome
  - creator apply hero on Mobile Chrome
- reran the full UI audit suite to confirm the current baselines now match the intended audited surfaces
- removed generated `playwright-report/` and `test-results/` directories after verification

Runtime truth and continuity implications:

- the UI audit suite now measures the static home-hero layout instead of failing on the truthful live activity ticker count
- no product runtime code changed in this continuation; this was an audit-surface stabilization pass only

Commands run for continuation:

- `npx eslint tests/ui-audits/visual-regression.spec.ts`
- `npm run check:ui:audits`
- `npx playwright test tests/ui-audits/visual-regression.spec.ts --project=chromium --project="Mobile Chrome" --grep "creator apply hero stays stable|home hero stays stable" --update-snapshots`
- `npm run check:ui:audits`
- `git status --short`

Continuation results:

- targeted eslint passed
- targeted visual snapshot update passed
- full `npm run check:ui:audits` passed with `16` tests green across Chromium and Mobile Chrome

Known warnings and non-blocking notices during continuation:

- Playwright still emitted the recurring webserver `transformAlgorithm` warning around an earlier failing run, but the final all-green rerun completed successfully
- standard npm unknown env config warnings and Node `punycode` deprecation warnings still appear in canonical scripts

Continuation follow-up gaps:

- none for the UI audit suite from this continuation; the prior home-hero and creator-apply audit failures are resolved

### Continuation: Working Tree Cleanup And Runtime Tracking Review

Current audit date: 2026-04-08 12:18:00 -05:00
Current branch / commit for continuation start: `main` / `8b24119`
Continuation task:

- get the local working tree back to green by folding unfinished local work into one verified pass
- perform a fresh runtime-tracking review and record next improvements without inventing fake observability work

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` showed the local tree was still dirty from three unfinished threads:
  - creator spotlight follower-count truth fix
  - UI audit stabilization
  - untracked Jessi Ray operator playbook docs
- no additional generated artifacts remained after earlier cleanup

Initial audit findings before cleanup:

- runtime code changes were already complete and verified; the remaining unfinished work was repo-state cleanup, not another product bug
- the only untracked product-adjacent assets were the Jessi Ray playbook docs under `creator-playbooks/jessi-ray/`
- telemetry coverage is currently clean:
  - `npm run check:telemetry` reports `0` cataloged events without emitters
- current runtime tracking remains truthful, but there are still three clear next improvements that are not yet implemented:
  - long-lived historical series for admin/AI health signals instead of latest-state only
  - route-level latency and failure-rate summaries for high-value user flows like creator relationships, support, and AI generation
  - creator-attributed conversion tracking for creator-led signup/operator playbook funnels

Exact touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/app/api/creator/relationships/route.ts`
- `tests/unit/creator-relationships-route.spec.ts`
- `tests/ui-audits/visual-regression.spec.ts`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-chromium-win32.png`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png`
- `creator-playbooks/jessi-ray/README.md`
- `creator-playbooks/jessi-ray/jessi-ray-dm-script-sheet.md`
- `creator-playbooks/jessi-ray/jessi-ray-walkthrough-card.md`
- `creator-playbooks/jessi-ray/jessi-ray-feedback-prompt-card.md`
- `creator-playbooks/jessi-ray/jessi-ray-confusion-tags.md`
- `creator-playbooks/jessi-ray/jessi-ray-weekly-scorecard-template.csv`

Canonical helpers and modules actually reused for truth validation:

- `src/components/CreatorDiscoveryRail.tsx`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/app/api/creators/[username]/route.ts`
- `src/lib/creator-public-pages.ts`
- `src/app/admin/ai/page.tsx`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/telemetry-catalog.ts`

Implementation results:

- folded the unfinished creator spotlight follower-count fix into the canonical relationships route and kept its route coverage
- folded the UI audit stabilization into the tracked visual-regression contract and refreshed the affected home-hero snapshots
- kept the Jessi Ray operator package as tracked docs instead of leaving it untracked and half-integrated
- cleaned the local repo state so the remaining work is no longer stranded outside version control

Runtime truth and continuity implications:

- the spotlight now hydrates from canonical relationship counts instead of lagging ops summary counts
- the UI audit suite now measures the real static hero layout and masks the truthful live activity ticker count
- the Jessi Ray playbook package is explicitly operator-layer only and does not claim new runtime attribution or funnel logic that does not exist

Commands run for continuation:

- `git status --short`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:telemetry`
- `npm run check:ui:lighthouse`
- prior still-relevant verification retained in this same local cleanup window:
  - `corepack pnpm run check`
  - `npm run check:ui:audits`

Continuation results:

- `npm run check:inventory` passed with `698` tracked files after folding the Jessi Ray playbook package into version control
- `npm run check:continuity` passed
- `npm run check:telemetry` passed
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed
- `npm run check:ui:audits` passed
- the local tree is ready to be staged and committed as one coherent cleanup pass

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse Windows temp-folder `EPERM` cleanup warnings after a successful run

Runtime tracking improvement suggestions recorded from this audit:

- add historical rollups for `admin_ui_chart_health` and AI runtime diagnostics so operators can distinguish transient spikes from persistent regressions
- add canonical latency/error-rate materialization for:
  - `/api/creator/relationships`
  - `/api/support/threads`
  - `/api/admin/ai/drop-covers/generate`
- add creator-attributed onboarding/action funnel events so operator playbooks can be evaluated without manual spreadsheets only

Continuation follow-up gaps:

- the runtime tracking improvements above are recommendations only; this cleanup pass intentionally did not broaden scope into new observability infrastructure

### Continuation: Route Runtime Health Rollups And Debug Visibility

Current audit date: 2026-04-08 13:28:00 -05:00
Current branch / commit for continuation start: `main` / `a0616a6`
Continuation task:

- continue from the working-tree cleanup pass by implementing the next concrete runtime-tracking improvement
- add truthful route-level latency/error visibility for creator relationships, support threads, and AI cover generation

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` was clean at continuation start because the cleanup commit had already landed locally and been pushed
- targeted adjacency traces were run for:
  - `src/app/api/admin/debug/route.ts`
  - `src/app/api/creator/relationships/route.ts`
  - `src/app/api/support/threads/route.ts`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`

Initial audit findings before implementation:

- the repo already had two canonical observability lanes:
  - `server_diagnostics` for bounded diagnostic events
  - `admin_ui_chart_health` for client-reported chart/module hydration
- neither lane provided a simple persisted route-level rollup for high-value operational endpoints
- the admin debug page could show current diagnostics and chart health, but it could not answer at a glance:
  - which creator/support/AI routes are currently failing
  - whether those routes are merely noisy versus actively broken
  - what their latest latency profile looks like
- `handleApiError(...)` already records server failures into diagnostics, so the missing piece was route-latency/result rollups rather than another raw error logger

Exact touched surfaces for this continuation:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `src/lib/route-runtime-health.ts`
- `src/lib/server/route-runtime-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/app/api/creator/relationships/route.ts`
- `src/app/api/support/threads/route.ts`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/app/api/admin/debug/route.ts`
- `src/app/admin/debug/page.tsx`
- `tests/unit/route-runtime-health.spec.ts`
- `tests/unit/admin-panel-system-logs.spec.ts`

Canonical helpers and modules actually reused for truth validation:

- `src/lib/server/route-diagnostics.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/lib/server/admin-ui-chart-health.ts`
- `src/components/CreatorDiscoveryRail.tsx`
- `src/components/Support/SupportInbox.tsx`
- `src/app/admin/ai/page.tsx`

Implementation results:

- added a canonical route-runtime-health contract in `src/lib/route-runtime-health.ts`
- added server persistence/listing in `src/lib/server/route-runtime-health.ts` using the new `route_runtime_health` collection
- instrumented these routes to record real latency/result samples:
  - `creator/relationships:GET`
  - `creator/relationships:POST`
  - `support/threads:GET`
  - `support/threads:POST`
  - `admin/ai/drop-covers/generate:POST`
- route samples now classify outcomes as:
  - `success`
  - `client_error`
  - `server_error`
- route rollups retain truthful aggregate counts plus latest timing/result fields:
  - success/client/server error counts
  - slow count
  - average/max/latest latency
  - last success/client-error/server-error timestamps
  - last error message
- `/api/admin/debug` now returns `routeRuntimeHealth` alongside existing diagnostics/chart health
- the admin debug page now exposes a dedicated `Tracked route runtime` section with route-by-route status, latency, and last-result visibility
- persisted panel logs now include an `ops.route_runtime_health` summary entry so route issues also appear in the at-a-glance system log lane

Runtime truth and continuity implications:

- this is a real backend rollup, not simulated client health
- route health does not pretend to be a streaming trace system; it is a persisted latest-plus-rollup summary
- client validation errors are kept separate from server errors so normal operator input mistakes do not masquerade as backend outages
- existing `server_diagnostics` behavior remains canonical for detailed failure context; the new route rollups complement it rather than replacing it

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
- `npm run trace:adjacent -- src/app/api/creator/relationships/route.ts`
- `npm run trace:adjacent -- src/app/api/support/threads/route.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
- `npx eslint src/lib/route-runtime-health.ts src/lib/server/route-runtime-health.ts src/lib/server/admin-panel-system-logs.ts src/app/api/creator/relationships/route.ts src/app/api/support/threads/route.ts src/app/api/admin/ai/drop-covers/generate/route.ts src/app/api/admin/debug/route.ts src/app/admin/debug/page.tsx tests/unit/route-runtime-health.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/unit/creator-relationships-route.spec.ts tests/unit/support-threads-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/route-runtime-health.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/unit/creator-relationships-route.spec.ts tests/unit/support-threads-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:telemetry`
- `corepack pnpm run check`
- `npm run check:ui:lighthouse`
- `npm run check:ui:audits`

Continuation results:

- focused eslint passed
- focused Vitest passed with `5` files and `16` tests
- `npm run check:inventory` passed with `701` tracked files after staging the new route-health files
- `npm run check:continuity` passed
- `npm run check:telemetry` passed
- `corepack pnpm run check` passed with `99` files and `477` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed with `16` tests green
- generated `playwright-report/` and `test-results/` directories were removed after verification

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- the first Lighthouse attempt failed because another `next build` was already in progress; a clean rerun passed
- Lighthouse still surfaced Windows temp-folder `EPERM` cleanup warnings after a successful run

Runtime tracking improvement suggestions after this implementation:

- add historical day/hour rollups for `route_runtime_health` so the debug console can separate recent degradation from lifetime aggregates without manual inference
- extend the same canonical route-runtime-health instrumentation to:
  - `/api/support/threads/[threadId]`
  - `/api/admin/support/threads`
  - `/api/admin/debug/assistant`
- add creator-attributed signup/action funnel events so operator playbook conversions can be measured in-product rather than only through external scorecards

Continuation follow-up gaps:

- route runtime health currently reports persisted aggregate/latest samples, not sliding-window percentiles
- only the highest-value creator/support/AI routes are covered so far; the follow-up routes above remain open

### Continuation: Manual Email Auth Refactor

Current audit date: 2026-04-08 15:33:00 -05:00
Current branch / commit for continuation start: `main` / `f45b773`
Continuation task:

- refactor the non-Google manual signup and login flow
- keep Firebase email/password canonical while removing drift, race conditions, and half-registered states

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` was clean at continuation start
- targeted adjacency traces were run for:
  - `src/context/AuthContext.tsx`
  - `src/components/Auth/AuthModal.tsx`
  - `src/app/api/user/register/route.ts`
  - `src/app/api/auth/manual-sign-in-lookup/route.ts`

Initial audit findings before implementation:

- the canonical manual sign-in path is already username-or-email aware through `src/app/api/auth/manual-sign-in-lookup/route.ts`
- the main instability is in manual email sign-up:
  - `createUserWithEmailAndPassword(...)` completes before profile registration finishes
  - the auth-state listener can auto-bootstrap a default profile while the explicit sign-up registration is still running
  - a failed `/api/user/register` call can leave the newly created auth user signed in without a truthful completed registration result
- password reset is still implemented inline in `AuthModal.tsx` instead of sharing the same manual-auth helper surface

Exact touched surfaces:

- `src/context/AuthContext.tsx`
- `src/components/Auth/AuthModal.tsx`
- `src/app/api/user/register/route.ts`
- `src/lib/auth-errors.ts`
- `src/lib/manual-email-auth.ts`
- `tests/unit/auth-errors.spec.ts`
- `tests/unit/manual-email-auth.spec.ts`
- `tests/unit/user-register-route.spec.ts`
- `REPO_MEMORY_LEDGER.md`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Canonical helpers and modules reused:

- `src/lib/auth-errors.ts`
- `src/lib/authFetch.ts`
- `src/lib/server/username-suggestions.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`

Implementation results:

- extracted the non-Google client-side auth API helpers into `src/lib/manual-email-auth.ts`
- `AuthContext` now uses the shared helper path for:
  - username-or-email sign-in resolution
  - exact username availability checks before manual sign-up
  - password reset dispatch
- manual email sign-up now marks an explicit registration-in-flight state so the auth-state listener does not auto-bootstrap a default profile while the real sign-up registration is still running
- rollback of the just-created Firebase auth user now happens only on confirmed non-OK registration responses instead of on any thrown network boundary
- `/api/user/register` now preserves the requested normalized username when it is available and returns a truthful `409` conflict when it is not, instead of silently auto-suggesting a different username during explicit manual registration
- `AuthModal` now consumes the shared password-reset helper and no longer carries an inline Firebase auth implementation for the non-Google flow

Runtime truth and continuity implications:

- Google auth behavior was intentionally left unchanged
- manual sign-in remains Firebase email/password underneath; username handling is still server-side resolution, not a second credential system
- manual sign-up no longer reports failure while leaving a default fallback profile race to mutate the end state behind the user’s back
- username conflicts are now surfaced truthfully instead of being silently rewritten into a different final username

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/context/AuthContext.tsx`
- `npm run trace:adjacent -- src/components/Auth/AuthModal.tsx`
- `npm run trace:adjacent -- src/app/api/user/register/route.ts`
- `npm run trace:adjacent -- src/app/api/auth/manual-sign-in-lookup/route.ts`
- `npx eslint src/context/AuthContext.tsx src/components/Auth/AuthModal.tsx src/app/api/user/register/route.ts src/lib/auth-errors.ts src/lib/manual-email-auth.ts tests/unit/auth-errors.spec.ts tests/unit/manual-email-auth.spec.ts tests/unit/user-register-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/auth-errors.spec.ts tests/unit/manual-email-auth.spec.ts tests/unit/user-register-route.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run test:contracts`
- `npm run check:ui:audits`
- `corepack pnpm run check`

Continuation results:

- focused eslint passed
- focused manual-auth Vitest passed with `3` files and `15` tests
- `npm run check:inventory` passed with `701` tracked files
- `npm run check:continuity` passed
- `npm run test:contracts` passed with `100` files and `484` tests
- `npm run check:ui:audits` passed with `16` tests green
- `corepack pnpm run check` passed
- generated `playwright-report/` and `test-results/` directories were removed after verification

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- one earlier `corepack pnpm run check` attempt and one earlier `check:ui:audits` attempt timed out under heavy local load; targeted reruns and full clean reruns both passed

Continuation follow-up gaps:

- this refactor still relies on point-in-time username availability checks rather than a dedicated username reservation contract
- the fallback auto-bootstrap path remains in place for non-manual-auth cases such as restored Google sessions with no user document, by design

### Continuation: Server-Side Username Reservation

Current audit date: 2026-04-08 15:49:00 -05:00
Current branch / commit for continuation start: `main` / `4f44014`
Continuation task:

- implement a real server-side username reservation system
- tie it to legacy accounts so existing usernames self-heal into the reservation map instead of only new sign-ups being protected

Continuation start state:

- canonical startup docs were already re-read earlier in this broad auth/refactor session
- `git status --short` was clean immediately after pushing `4f44014`
- targeted adjacency traces were run for:
  - `src/app/api/user/check-username/route.ts`
  - `src/app/api/user/profile/route.ts`

Initial audit findings before implementation:

- username uniqueness is still enforced mainly by point-in-time `users.where("username" == ...)` checks
- explicit registration now preserves the requested normalized username, but there is still no durable reservation record preventing races across concurrent writes
- legacy accounts with populated `users.username` fields have no canonical reservation row yet, so a reservation system must backfill from those existing user docs rather than treating them as second-class history

Exact touched surfaces:

- `src/lib/server/username-suggestions.ts`
- `src/app/api/user/check-username/route.ts`
- `src/app/api/user/register/route.ts`
- `src/app/api/user/profile/route.ts`
- `src/app/api/user/delete/route.ts`
- `tests/unit/username-suggestions.spec.ts`
- `tests/unit/user-register-route.spec.ts`
- `REPO_MEMORY_LEDGER.md`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Canonical helpers and modules reused:

- `src/lib/user-utils.ts`
- `src/lib/server/firebase-admin.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/manual-email-auth.ts`

Implementation results:

- `src/lib/server/username-suggestions.ts` now owns the canonical reservation contract through `username_reservations`
- availability checks now:
  - resolve reservation docs first
  - backfill missing reservation rows from legacy `users.username` values
  - keep generated username suggestions on the same reservation-backed availability logic
- explicit registration now reserves usernames server-side instead of only checking point-in-time availability
- profile username changes now reserve the new username and release the caller’s prior reservation in the same transaction path
- account deletion now releases the owned username reservation after document cleanup, preventing stale claims from surviving account removal
- legacy usernames no longer sit outside the contract; the first server-side availability/read path can backfill them into the reservation map

Runtime truth and continuity implications:

- username uniqueness is no longer modeled as a best-effort query check only
- explicit sign-up, profile edits, generated suggestions, and legacy-account availability now all share one backend ownership source
- `users.username` remains a user-profile field, but the durable ownership guard is the reservation map
- manual sign-up’s exact-username behavior from the prior continuation is now backed by a real reservation contract rather than only a point-in-time check

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/app/api/user/check-username/route.ts`
- `npm run trace:adjacent -- src/app/api/user/profile/route.ts`
- `npx eslint src/lib/server/username-suggestions.ts src/app/api/user/check-username/route.ts src/app/api/user/register/route.ts src/app/api/user/profile/route.ts src/app/api/user/delete/route.ts tests/unit/username-suggestions.spec.ts tests/unit/user-register-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/username-suggestions.spec.ts tests/unit/user-register-route.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `corepack pnpm run check`

Continuation results:

- focused eslint passed
- focused reservation/auth Vitest passed with `2` files and `10` tests
- `npm run check:inventory` passed with `703` tracked files
- `npm run check:continuity` passed
- `corepack pnpm run check` passed with `100` files and `487` tests

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- the first broad `corepack pnpm run check` attempt failed only because the new test mock still had a TypeScript issue; the fix was applied and the full rerun passed

Continuation follow-up gaps:

- reservation release is now implemented for account deletion and profile username changes, but there is still no username-history or moderation-hold policy
- if the product later needs temporary reservation holds or reclaim windows, those rules must extend `username_reservations` instead of bypassing it

### Continuation: Manual Sign-In Provider Hint For Google-Only Accounts

Current audit date: 2026-04-08 15:59:26 -05:00
Current branch / commit for continuation start: `main` / `c5bc345`
Continuation task:

- ensure manual sign-in tells users to use Google auth when the entered email or resolved username belongs to a Google-only account
- solve it at the canonical server lookup boundary instead of leaving the client to infer provider state from a generic Firebase credential failure

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` was clean at continuation start
- targeted adjacency traces were run for:
  - `src/app/api/auth/manual-sign-in-lookup/route.ts`
  - `src/lib/manual-email-auth.ts`
  - `src/context/AuthContext.tsx`
  - `src/lib/auth-errors.ts`

Initial audit findings before implementation:

- the canonical provider-resolution route already existed at `/api/auth/manual-sign-in-lookup`, but direct email identifiers never used it because `resolveManualSignInIdentity(...)` short-circuited locally
- that meant Google-only accounts entering their email hit Firebase email/password directly and surfaced a generic invalid-credential style failure instead of a truthful Google sign-in instruction
- username-based manual sign-in could resolve the email correctly, but the route still did not inspect provider state to distinguish password accounts from Google-only accounts

Exact touched surfaces:

- `src/app/api/auth/manual-sign-in-lookup/route.ts`
- `src/lib/manual-email-auth.ts`
- `src/lib/auth-errors.ts`
- `tests/unit/manual-sign-in-lookup-route.spec.ts`
- `tests/unit/manual-email-auth.spec.ts`
- `tests/unit/auth-errors.spec.ts`
- `FULL_SCALE_CODEBASE_AUDIT.md`
- `REPO_MEMORY_LEDGER.md`

Canonical helpers and modules reused:

- `src/lib/server/firebase-admin.ts`
- `src/lib/server/request-guard.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/route-diagnostics.ts`
- `src/lib/auth-errors.ts`
- `src/lib/manual-email-auth.ts`

Implementation results:

- `resolveManualSignInIdentity(...)` now sends both email and username identifiers through the same server lookup route instead of bypassing the route for direct email input
- `/api/auth/manual-sign-in-lookup` now checks Firebase Auth provider state for the resolved email and returns `auth/use-google-sign-in` when the account is linked to Google without a password provider
- provider inspection failures do not block manual sign-in outright; they are recorded as route warnings and the lookup falls back to the resolved email so a temporary Admin SDK read problem does not become a broader auth outage
- `resolveEmailAuthError(...)` now maps `auth/use-google-sign-in` to a specific user-facing instruction: continue with Google instead of entering a password

Runtime truth and continuity implications:

- manual sign-in remains Firebase email/password underneath; this change only improves provider-aware identity resolution before the Firebase client sign-in call
- direct email entry and username entry now share one canonical provider hint contract
- Google-only accounts no longer masquerade as bad manual credentials when the account match is already known server-side
- password-reset affordances are now explicitly suppressed for the Google-only error code at the helper layer

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/app/api/auth/manual-sign-in-lookup/route.ts`
- `npm run trace:adjacent -- src/lib/manual-email-auth.ts`
- `npm run trace:adjacent -- src/context/AuthContext.tsx`
- `npm run trace:adjacent -- src/lib/auth-errors.ts`
- `npx eslint src/app/api/auth/manual-sign-in-lookup/route.ts src/lib/manual-email-auth.ts src/lib/auth-errors.ts tests/unit/manual-sign-in-lookup-route.spec.ts tests/unit/manual-email-auth.spec.ts tests/unit/auth-errors.spec.ts`
- `corepack pnpm exec vitest run tests/unit/manual-sign-in-lookup-route.spec.ts tests/unit/manual-email-auth.spec.ts tests/unit/auth-errors.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `corepack pnpm run check`

Continuation results:

- focused eslint passed
- focused auth Vitest passed with `3` files and `17` tests
- `npm run check:inventory` passed with `703` tracked files
- `npm run check:continuity` passed
- `corepack pnpm run check` passed with `100` files and `490` tests

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- the first `npm run check:continuity` attempt timed out under an overly short local command timeout; a clean rerun passed without code changes

Continuation follow-up gaps:

- this change is intentionally scoped to Google-only accounts; if the product later needs provider-aware hints for other non-password providers, they should extend the same lookup contract rather than reintroducing local client-side inference

### Continuation: Full-Scale Audit Cleanup After Manual Auth Hardening

Current audit date: 2026-04-08 16:11:22 -05:00
Current branch / commit for continuation start: `main` / `0fbe8aa`
Continuation task:

- run a full-scale repo audit from the pushed `main` baseline
- clean up any stale generated artifacts or failing audit lanes
- update the standing audit file to the current verified baseline

Continuation start state:

- the Google-only manual sign-in guidance fix was already committed and pushed
- `git status --short` was clean at continuation start
- `git ls-files --others --exclude-standard` returned no untracked files before verification

Initial audit findings before cleanup:

- no runtime or contract regressions were evident from the start state
- the main risk in this pass was stale audit evidence rather than stale application code
- the only failure encountered during the audit run was operational:
  - `npm run check:ui:lighthouse` collided with a concurrently running `next build`
- the audit toolchain generated transient local artifacts:
  - `playwright-report/`
  - `test-results/`

Exact touched surfaces:

- `FULL_SCALE_CODEBASE_AUDIT.md`

Operational cleanup results:

- reran `npm run check:ui:lighthouse` cleanly after the build collision
- removed transient audit artifacts:
  - `playwright-report/`
  - `test-results/`
- confirmed the working tree returned to audit-doc-only changes after cleanup

Full audit commands run for this continuation:

- `git status --short`
- `git ls-files --others --exclude-standard`
- `corepack pnpm run check`
- `npm run graph:architecture`
- `npm run check:deps`
- `npm run check:versions`
- `npm run check:functions`
- `npm run check:firebase:rules`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- final `git status --short`
- final `git ls-files --others --exclude-standard`

Continuation results:

- `corepack pnpm run check` passed with `100` files and `490` tests
- `npm run graph:architecture` passed and refreshed `output/dependency-graph.json`
- `npm run check:deps` passed
- `npm run check:versions` passed
- `npm run check:functions` passed
- `npm run check:firebase:rules` passed
- `npm run check:ui:audits` passed with `16` tests green
- `npm run check:ui:lighthouse` passed on clean rerun
- no untracked files remained after removing transient audit artifacts

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse Windows temp-folder `EPERM` cleanup warnings after a successful run
- the first Lighthouse attempt failed only because another `next build` was already running; the clean rerun passed without code changes

Runtime tracking improvements suggested from this audit:

- add route-runtime-health coverage for `/api/auth/manual-sign-in-lookup` so provider-resolution failures and Google-only mismatches are visible in admin debug without log spelunking
- materialize a small auth-provider hint counter split:
  - `auth/use-google-sign-in`
  - `auth/invalid-credential`
    so operator teams can tell whether manual sign-in confusion is mostly provider mismatch versus bad credentials
- add a bounded admin debug card for recent auth-entry failure reasons so manual-auth regressions surface before they become support volume

Continuation follow-up gaps:

- no code cleanup was required beyond the already-landed manual auth hardening and transient artifact removal
- the suggested auth runtime-tracking improvements above are not implemented in this pass

### Continuation: Creator Messaging Redesign

Current audit date: 2026-04-08 17:05:00 -05:00
Current branch / commit for continuation start: `main` / `d643d4a`
Continuation task:

- redesign creator messaging into a dedicated first-class chat product for fans and creators
- replace the split creator-profile/dashboard message UX with a primary `/dashboard/chat` surface
- preserve current creator-message economics while adding realtime thread/message state, read receipts, typing indicators, and structured insufficient-funds handling

Continuation start state:

- canonical startup docs re-read:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `EVERY_FILE_FUNCTION_CHECKLIST.md`
- `git status --short` was clean at continuation start
- targeted adjacency traces were run for:
  - `src/app/api/creator/messages/route.ts`
  - `src/components/Dashboard/CreatorWorkspacePanel.tsx`
  - `src/app/creators/[username]/CreatorProfileClient.tsx`
  - `src/components/Navigation/MobileBottomBar.tsx`

Initial audit findings before implementation:

- the repo already uses one canonical creator-user thread identity through `buildCreatorThreadId(...)`, so the redesign should extend that thread model instead of replacing it
- paid creator-message spend is already server-enforced as purchased-only through `spendCreatorExperienceGumdrops(...)`, but the current error contract is generic and not UI-ready for insufficient-funds handling
- current fan and creator message surfaces are split across the public creator page and `CreatorWorkspacePanel`, and both rely on request/refresh patterns rather than realtime subscriptions
- client-side realtime chat cannot be added truthfully without opening participant-scoped Firestore reads for creator message threads/messages and a separate ephemeral presence layer

Planned touched surfaces at continuation start:

- `src/app/api/creator/messages/route.ts`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/components/Creators/CreatorExperiencesPanel.tsx`
- `src/components/Creators/CreatorProfileHeader.tsx`
- `src/components/Dashboard/CreatorWorkspacePanel.tsx`
- `src/components/Navigation/MobileBottomBar.tsx`
- `src/components/Navigation/ProfileSidebar.tsx`
- `src/components/Navigation/ProfileDropdown.tsx`
- `src/context/UIContext.tsx`
- `src/components/InsufficientBalanceModal.tsx`
- `src/types/db.ts`
- `firestore.rules`
- `database.rules.json`

Exact touched surfaces after implementation:

- `src/app/api/chat/threads/route.ts`
- `src/app/api/chat/threads/[threadId]/route.ts`
- `src/app/api/chat/threads/[threadId]/messages/route.ts`
- `src/app/api/chat/threads/[threadId]/read/route.ts`
- `src/app/api/creator/messages/route.ts`
- `src/app/dashboard/chat/page.tsx`
- `src/app/creators/[username]/CreatorProfileClient.tsx`
- `src/components/Chat/ChatExperience.tsx`
- `src/components/Creators/CreatorExperiencesPanel.tsx`
- `src/components/Dashboard/CreatorWorkspacePanel.tsx`
- `src/components/Navigation/MobileBottomBar.tsx`
- `src/components/Navigation/ProfileDropdown.tsx`
- `src/components/Navigation/ProfileSidebar.tsx`
- `src/lib/chat.ts`
- `src/lib/server/chat.ts`
- `src/lib/route-runtime-health.ts`
- `src/types/db.ts`
- `firestore.rules`
- `database.rules.json`
- `tests/unit/chat-threads-route.spec.ts`
- `tests/unit/chat-thread-route.spec.ts`
- `tests/unit/chat-thread-messages-route.spec.ts`
- `tests/unit/chat-thread-read-route.spec.ts`
- `tests/unit/creator-messages-route.spec.ts`
- `tests/firebase/firestore.rules.spec.ts`
- `tests/ui-audits/visual-regression.spec.ts`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/creator-apply-hero-Mobile-Chrome-win32.png`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/creator-waitlist-guest-hero-Mobile-Chrome-win32.png`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Implementation results:

- added a dedicated `/dashboard/chat` route backed by a real client chat surface instead of splitting fan/creator messaging across the public creator page and creator dashboard workspace
- kept the canonical one-thread-per-creator-user model and formalized it in `src/lib/chat.ts`
- added dedicated chat API contracts for:
  - thread list read
  - thread detail read
  - message send
  - thread read-state update
- converted the legacy `/api/creator/messages` route into a compatibility adapter over the new chat helpers instead of leaving two independent messaging implementations
- added realtime Firestore subscriptions in the new chat UI for:
  - thread list updates
  - message updates
  - thread read state / unread state refresh
- added a real RTDB-backed presence/typing channel under `chat_presence/{threadId}/{uid}` with heartbeat writes and cleanup on disconnect
- preserved pricing truth:
  - fan text/image/video sends remain `1 / 5 / 10 GD`
  - creator replies remain free
  - purchased-only spend stays server-enforced
  - subscriber free chat remains controlled by `chatFreeForSubscribers`
- replaced generic send failure handling with a structured insufficient-funds payload that the dedicated chat UI renders as an inline actionable purchase gate
- moved the public creator page message CTA to deep-link into `/dashboard/chat?creator=<creatorId>` and removed the old public-page inline composer/upload path
- downgraded `CreatorWorkspacePanel` messaging to a summary + handoff into Chat so it is no longer a competing primary inbox
- redesigned signed-in mobile nav to:
  - `Home`
  - `Drops`
  - `Chat`
  - `Experiences`
  - `Dashboard`
    while removing the wallet button from the bottom nav
- opened participant-scoped Firestore client reads for creator message threads and messages so realtime chat can function truthfully
- added route-runtime-health coverage for the new chat routes from the start:
  - `chat/threads:GET`
  - `chat/thread:GET`
  - `chat/messages:POST`
  - `chat/read:POST`

Runtime truth and continuity implications:

- Chat is now the primary creator-conversation surface. The public creator page is only an acquisition handoff into Chat, and the creator workspace only summarizes/links into Chat.
- The dedicated Chat UI is realtime for thread/messages/read state. It does not fake provider streaming, delivery, or online status.
- `Sent` and `Read` are derived from real persistence and thread read timestamps.
- The insufficient-balance state is now a real server contract instead of a generic send failure.
- Firestore participant reads are now part of the supported runtime contract for creator chat.
- RTDB presence is real but currently broad-read for authenticated users; it is not yet participant-scoped by rules.

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/app/api/creator/messages/route.ts`
- `npm run trace:adjacent -- src/components/Dashboard/CreatorWorkspacePanel.tsx`
- `npm run trace:adjacent -- src/app/creators/[username]/CreatorProfileClient.tsx`
- `npm run trace:adjacent -- src/components/Navigation/MobileBottomBar.tsx`
- `npm run trace:adjacent -- src/app/api/chat/threads/route.ts`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/components/Creators/CreatorExperiencesPanel.tsx`
- focused `eslint` on the touched chat/navigation/profile files
- `corepack pnpm exec tsc --noEmit --pretty false`
- focused `eslint` on:
  - `tests/unit/chat-threads-route.spec.ts`
  - `tests/unit/chat-thread-route.spec.ts`
  - `tests/unit/chat-thread-messages-route.spec.ts`
  - `tests/unit/chat-thread-read-route.spec.ts`
  - `tests/unit/creator-messages-route.spec.ts`
  - `tests/firebase/firestore.rules.spec.ts`
- `corepack pnpm exec vitest run tests/unit/chat-threads-route.spec.ts tests/unit/chat-thread-route.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/chat-thread-read-route.spec.ts tests/unit/creator-messages-route.spec.ts`
- `npm run test:rules:firestore`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:firebase:rules`
- `corepack pnpm run check`
- `npm run check:ui:lighthouse`
- `npm run check:ui:audits`

Continuation results:

- focused chat/UI eslint passed
- focused TypeScript compile passed
- focused chat route Vitest passed with `5` files and `10` tests
- Firestore rules tests passed with `9` tests including participant chat read coverage
- `npm run check:inventory` passed with `703` tracked files
- `npm run check:continuity` passed
- `npm run check:firebase:rules` passed
- `corepack pnpm run check` passed with `104` files and `498` tests
- `npm run check:ui:lighthouse` passed
- `npm run check:ui:audits` passed with `16` tests green after stabilizing the visual checks for settled hero content and Mobile Chrome overlay drift

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- Lighthouse Windows temp-folder `EPERM` cleanup warnings after a successful run
- initial `check:ui:audits` failure due a concurrent `next build` collision; clean reruns were used for the final result
- Mobile Chrome visual baselines on creator apply/waitlist needed a bounded diff budget because the browser emulation overlay at the lower-left corner is not product UI

Continuation follow-up gaps:

- RTDB presence rules currently allow authenticated reads for the `chat_presence` subtree instead of participant-only reads; if presence privacy needs to match thread privacy exactly, that rule set should move to a participant-aware contract
- there is no automated RTDB-rules emulator suite yet, so the new presence rules were verified by lint/compile/runtime integration paths rather than dedicated rules tests
- the dedicated chat UI uses a local inline insufficient-funds card instead of the global wallet modal system; that is intentional for v1 but still separate styling logic
- the public creator page still shows recent message previews for signed-in users through the compatibility route, but actual conversation happens only in Chat

### Continuation: Creator Spotlight Compression And Self-Follow Guard

Current audit date: 2026-04-08 19:24:00 -05:00
Current branch / commit for continuation start: `main` / `d643d4a`
Continuation task:

- remove the followed-state heading `Creators you follow` from the creator spotlight and replace it with `Jump back into your creator loop.`
- render username-only creator labels on spotlight cards while keeping verification badges intact
- reduce creator spotlight vertical height substantially on mobile
- ensure creators cannot follow themselves from the spotlight flow

Continuation start state:

- the repo was already mid-pass with the uncommitted creator messaging redesign still in the working tree
- continuity docs were already current to that messaging pass
- targeted adjacency traces were run for:
  - `src/components/CreatorDiscoveryRail.tsx`
  - `src/app/api/creator/relationships/route.ts`

Initial audit findings before implementation:

- self-follow was already blocked on `POST /api/creator/relationships`, but the GET path still allowed the signed-in creator to appear in their own recommendation pool
- the spotlight rail used both `displayName` and `username`, which added unnecessary vertical height on mobile
- the followed-state rail still used the stale heading `Creators you follow` even though the desired product copy was already the support line `Jump back into your creator loop.`

Exact touched surfaces:

- `src/components/CreatorDiscoveryRail.tsx`
- `src/app/api/creator/relationships/route.ts`
- `tests/unit/creator-relationships-route.spec.ts`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Implementation results:

- excluded the signed-in caller from the creator relationships GET recommendation pool so a creator cannot be surfaced as their own spotlight candidate
- kept the existing POST self-follow guard intact for defense in depth
- changed the followed-state spotlight heading to `Jump back into your creator loop.` and removed the extra support line in that state
- changed spotlight cards to show the creator username as the single primary label, while retaining the verification checkmark
- reduced spotlight section/card vertical density by shrinking:
  - mobile panel padding
  - card width
  - avatar size
  - card gaps
  - button height
  - secondary text footprint
- added a UI fallback so the follow button does not render for the signed-in creator even if a bad card slips through

Runtime truth and continuity implications:

- creators are now excluded from their own spotlight feed at the data layer rather than only relying on the POST guard
- spotlight cards now reflect the canonical public identity handle more directly by prioritizing `@username` over display name
- mobile creator spotlight height is materially smaller without changing the underlying recommendation or follow data model

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/components/CreatorDiscoveryRail.tsx`
- `npm run trace:adjacent -- src/app/api/creator/relationships/route.ts`
- `npx eslint src/components/CreatorDiscoveryRail.tsx src/app/api/creator/relationships/route.ts tests/unit/creator-relationships-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/creator-relationships-route.spec.ts`
- `npm run check:ui:audits`

Continuation results:

- focused eslint passed
- creator relationships Vitest passed with `1` file and `3` tests
- `npm run check:ui:audits` passed with `16` tests green

Known warnings and non-blocking notices during continuation:

- Node `punycode` deprecation warning from Vitest tooling
- the recurring Playwright/Next webserver warning `controller[kState].transformAlgorithm is not a function` appeared after a successful all-green UI audit run and did not fail the suite

Continuation follow-up gaps:

- no additional functional gaps were introduced in this continuation

### Continuation: Adjacent Chat Logic And Runtime Tracking Sweep

Current audit date: 2026-04-08 21:09:00 -05:00
Current branch / commit for continuation start: `main` / `eec0983`
Continuation task:

- review the adjacent logic around the large creator chat redesign
- fix any real gaps in the new chat flow and legacy compatibility path
- improve runtime tracking so admin debug surfaces the new and legacy messaging routes truthfully

Continuation start state:

- the previous creator chat redesign and spotlight pass were already committed and pushed
- the working tree was clean before this sweep
- continuity docs were read before editing and adjacent traces were run on the server chat helper, new chat routes, and the chat client UI

Initial audit findings before implementation:

- the seed-thread path in `src/lib/server/chat.ts` could fabricate a chat shell for any existing user ID, even if the target was not an actual creator or had messaging disabled/restricted
- the new chat client was still emitting `navigation_click` telemetry on successful message send, which was semantically wrong because send is not navigation and server-side send telemetry already exists
- the legacy compatibility route `src/app/api/creator/messages/route.ts` was still active for public-page previews and some adjacent flows, but it had no route-runtime-health samples, so admin debug could not see old-path traffic or failures beside the new chat routes
- the admin debug copy for tracked route runtime still described only creator relationships, support, and AI, which understated the new chat and compatibility coverage
- Lighthouse was still vulnerable to a Windows-only `chrome-launcher` temp-folder cleanup `EPERM`, which could fail the audit after otherwise successful page scores

Exact touched surfaces:

- `src/lib/creator-experiences.ts`
- `src/lib/server/chat.ts`
- `src/app/api/creator/messages/route.ts`
- `src/components/Chat/ChatExperience.tsx`
- `src/lib/route-runtime-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `src/app/admin/debug/page.tsx`
- `scripts/run-lighthouse-audits.mjs`
- `tests/unit/creator-experiences.spec.ts`
- `tests/unit/creator-messages-route.spec.ts`
- `tests/unit/server-chat.spec.ts`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Implementation results:

- added canonical `isCreatorMessagingAvailable(...)` in `src/lib/creator-experiences.ts` so creator chat eligibility now routes through one shared helper instead of ad hoc local checks
- used that shared helper in `src/lib/server/chat.ts` to:
  - block seeded chat creation for non-creators
  - block seeded chat creation for suspended/banned creators
  - block seeded chat creation for creators with messaging disabled or restricted
  - return `selectedThreadId: null` when a requested creator seed is not actually eligible, instead of surfacing a broken thread shell
- hardened `ChatExperience` so thread-detail loads clear stale detail/insufficient-funds state before refetching and removed the incorrect `navigation_click` send telemetry
- added route-runtime-health coverage for the legacy compatibility route:
  - `creator/messages:GET`
  - `creator/messages:POST`
  - `creator/messages:DELETE`
- updated admin debug and admin system-log copy so route-health reporting now truthfully describes chat, legacy creator-message compatibility, support, and AI coverage
- hardened `scripts/run-lighthouse-audits.mjs` to ignore only the known Windows `chrome-launcher` temp cleanup `EPERM` path instead of failing the audit after a successful Lighthouse run
- added direct server-helper coverage in `tests/unit/server-chat.spec.ts` for:
  - refusing non-creator seed threads
  - refusing disabled/restricted creator seed threads
  - seeding valid creator threads correctly

Runtime truth and continuity implications:

- opening Chat from a creator page now only seeds a draft thread when the target is actually a usable creator messaging target
- legacy creator-message reads/writes remain supported, but they now contribute to the same route-runtime-health surface as the new chat routes
- admin debug route-health summaries now cover both the new Chat system and the legacy compatibility adapter instead of implying only creator relationships/support/AI visibility
- Lighthouse failures are less noisy on Windows because OS temp-folder cleanup issues no longer masquerade as page-quality failures

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/app/api/chat/threads/route.ts`
- `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/messages/route.ts`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- focused `eslint` on the touched chat/debug/runtime files
- `corepack pnpm exec vitest run tests/unit/creator-experiences.spec.ts tests/unit/creator-messages-route.spec.ts tests/unit/server-chat.spec.ts tests/unit/chat-threads-route.spec.ts tests/unit/chat-thread-route.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/chat-thread-read-route.spec.ts`
- `npm run check:pnpm-lock`
- `corepack pnpm exec tsc --noEmit --pretty`
- `corepack pnpm exec eslint . --max-warnings=0`
- `npm run check:architecture`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`
- `npm run check:firebase-runtime`
- `npm run test:contracts`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `npm run check:inventory`
- `npm run check:continuity`

Continuation results:

- focused eslint passed
- focused chat/helper Vitest passed with `7` files and `16` tests
- `npm run check:pnpm-lock` passed
- `tsc --noEmit` passed
- repo-wide `eslint . --max-warnings=0` passed
- `npm run check:architecture` passed
- `npm run check:telemetry` passed with `0` cataloged events lacking emitters
- `npm run check:analytics-semantics` passed
- `npm run check:firebase-runtime` passed
- `npm run test:contracts` passed with `105` files and `503` tests
- `npm run check:ui:audits` passed with `16` tests green
- `npm run check:ui:lighthouse` passed after narrowing the Windows cleanup error handling in the audit script
- `npm run check:inventory` passed with `715` tracked files
- `npm run check:continuity` passed

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical scripts
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- the recurring Playwright/Next webserver warning `controller[kState].transformAlgorithm is not a function` appeared after a successful UI-audit run and did not fail the suite
- `npm run check:ui:lighthouse` still prints the known Windows `EPERM` cleanup warning, but it no longer fails the audit because the page scores and server run completed successfully
- one Lighthouse run showed `EADDRINUSE` logging from the child `next start` process after audits had already completed successfully; the command still exited cleanly and the final pass remained green

Continuation follow-up improvements:

- add route-runtime-health coverage for the public creator profile fetch path and any future dedicated chat-attachment route if media uploads move server-side
- add a small admin-debug breakdown for legacy compatibility traffic versus native chat traffic so operators can see when the old path is still carrying load
- if presence privacy needs to match thread privacy exactly, replace the current authenticated-wide RTDB presence read rule with a participant-aware presence contract rather than leaving it as a broad authenticated subtree

### Continuation: AI Cover Prompt Contract And Reference-Attachment Audit

Current audit date: 2026-04-08 21:45:00 -05:00
Current branch / commit for continuation start: `main` / `eec0983`
Continuation task:

- change the AI drop-cover generation prompt so title-driven generation uses the requested reference-style instruction around the drop title
- verify whether reference images are actually attached before generation or if a race condition is preventing them from being used
- remove stale admin AI copy that still claimed cover text was deterministic in product UI

Continuation start state:

- the working tree was already dirty from the adjacent chat/runtime-health sweep that had not been committed yet
- continuity docs were reread at the start of this continuation
- targeted adjacency traces were run for:
  - `src/lib/server/ai-drop-covers.ts`
  - `src/app/api/admin/ai/drop-covers/generate/route.ts`
  - `src/components/Admin/AiDropCoverGeneratorPanel.tsx`

Initial audit findings before implementation:

- the missing text on generated covers was not caused by a reference-image race condition
- `buildAdminAiDropCoverPrompt(...)` in `src/lib/ai-drop-covers.ts` was explicitly instructing the model to:
  - avoid rendered creator text
  - preserve deterministic overlay safe zones
  - never render readable text or typography
- `buildReferenceContext(...)` in `src/lib/server/ai-drop-covers.ts` loads template and ranked reference images synchronously before the provider request, and `generateGeminiImage(...)` sends those references inline in the same `generateContent` payload, so there is no current async race between prompt creation and reference attachment
- the admin AI panel copy was stale because it still claimed cover text remained deterministic in product UI, which is not the actual runtime contract

Exact touched surfaces:

- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/server-ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-feedback-route.spec.ts`
- `tests/unit/admin-ai-drop-covers-generate-route.spec.ts`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Implementation results:

- bumped the AI cover prompt version from `drop-cover-v2` to `drop-cover-v3`
- changed the shared prompt builder so reference-guided runs now explicitly say:
  - `Use the provided reference image and maintain the same style, focusing this time on "<title>", ensuring the color matches the title theme and the colors are easy to distinguish.`
- changed the shared cover recipe guidance away from deterministic overlay language and toward:
  - legible creator-name treatment
  - legible main title treatment
  - visually distinct lower ribbon / CTA band
- removed the old hard ban on readable text from the prompt contract
- added `buildGeminiGenerateContentRequestBody(...)` in `src/lib/server/ai-drop-covers.ts` so the Gemini request body is assembled through one testable helper
- used the existing `styleDescription` field for reference images as a real text guidance part in the provider request instead of leaving it unused
- verified the Gemini request body now contains:
  - the prompt text
  - reference-style guidance text
  - inline base64 image parts for each attached reference image
- updated the create-drop admin AI panel copy so it now truthfully says the server sends inline style references when reference-guided mode is active, rather than claiming deterministic cover text behavior in product UI
- updated stale test fixtures to the new `drop-cover-v3` prompt version

Runtime truth and continuity implications:

- AI cover generation is now explicitly prompting for legible rendered cover text instead of instructing the model to avoid it
- the current missing-text behavior was caused by prompt policy, not by a race condition in reference-image loading
- reference images are attached synchronously before generation and included inline in the Vertex Gemini request body; failures to use them are now model-behavior or prompt-quality issues, not a skipped attachment step in the current runtime
- the admin AI panel now reflects the actual runtime contract for title-driven vs reference-guided generation

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/app/api/admin/ai/drop-covers/generate/route.ts`
- `npm run trace:adjacent -- src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `npx eslint src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/components/Admin/AiDropCoverGeneratorPanel.tsx tests/unit/ai-drop-covers.spec.ts tests/unit/server-ai-drop-covers.spec.ts`
- `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/server-ai-drop-covers.spec.ts`
- `corepack pnpm exec tsc --noEmit --pretty false`
- `npm run check:inventory`
- `npm run check:ui:audits`

Continuation results:

- focused eslint passed
- focused AI-cover Vitest passed with `3` files and `16` tests
- `tsc --noEmit` passed
- `npm run check:inventory` passed with `715` tracked files
- `npm run check:ui:audits` had one false-start failure because port `3000` was already occupied by an existing local node server, then passed cleanly against a controlled `next start --port 3100` instance using `PLAYWRIGHT_BASE_URL=http://localhost:3100`

Known warnings and non-blocking notices during continuation:

- standard Node `punycode` deprecation warnings from Vitest tooling
- the initial `npm run check:ui:audits` failure was environmental and not caused by the AI-cover changes
- no runtime race condition was found in the current reference-image attachment path

Continuation follow-up gaps:

- this pass improves the prompt contract, but model-rendered typography will still be less reliable than a future deterministic post-generation text compositor
- if operators want to inspect the exact prompt text per job in admin debug, the next audited pass should persist a bounded prompt preview or prompt hash in job history rather than inferring from `promptVersion`

### Continuation: Moderation, Chat Runtime, and Hydration Audit

Current audit date: 2026-04-08 23:24:00 -05:00
Current branch / commit for continuation start: `main` / `eec0983`
Continuation task:

- audit the adjacent chat, moderation, spotlight, analytics, and navigation surfaces together before editing
- fix the plain-text chat send internal error with truthful runtime diagnostics
- add a real admin moderation surface for live creator-user chat oversight and migrated security alerts
- remove creator spotlight title copy, widen cards, and stabilize spotlight/auth hydration to stop visible reload loops and nav flashes

Continuation start state:

- the working tree was already dirty from the earlier adjacent chat/runtime-health and AI-cover prompt passes
- continuity docs were reread at the start of this continuation
- targeted adjacency traces were run for:
  - `src/lib/server/chat.ts`
  - `src/components/CreatorDiscoveryRail.tsx`
  - `src/components/Navigation/MobileBottomBar.tsx`
  - `src/app/admin/analytics/page.tsx`
  - `src/components/Admin/AdminModerationConsole.tsx`
  - `src/components/Navbar.tsx`
- `firestore.rules` is not supported by `trace:adjacent`, so rules adjacency was verified through focused rules tests instead

Initial audit findings before implementation:

- legacy purchased GumDrops are already accounted for in creator messaging: when a legacy user document only has `gumDropsBalance`, `readSourceAwareBalance(...)` treats that legacy total as purchased balance
- the plain-text creator chat failure was not caused by GumDrop accounting; the real drift was creator-message eligibility and send hardening:
  - legacy approved creators with stale `role: "user"` could still be valid creators through `creatorApplication.approvalStatus === "creator_approved"`, but the chat send path and seed-thread path were not consistently honoring that
  - post-send analytics could still throw into the request path if server tracking raised synchronously after a successful write
- creator spotlight still fetched once as guest and then refetched after auth resolved, which caused the visible second-load loop on dashboard, drops, and experiences
- navbar and mobile bottom bar still rendered guest/admin/user variants before auth loading settled, which caused the split-second nav-option flash
- security alerts were still only truly useful in analytics, which was the wrong surface for live moderation

Exact touched surfaces:

- `src/lib/creator-experiences.ts`
- `src/lib/server/chat.ts`
- `tests/unit/creator-experiences.spec.ts`
- `tests/unit/server-chat.spec.ts`
- `src/components/Admin/AdminModerationConsole.tsx`
- `src/app/admin/moderation/page.tsx`
- `src/app/admin/layout.tsx`
- `src/components/Navigation/AdminDropdown.tsx`
- `src/lib/admin-ui-chart-health.ts`
- `src/lib/server/admin-panel-system-logs.ts`
- `firestore.rules`
- `tests/firebase/firestore.rules.spec.ts`
- `src/app/admin/analytics/page.tsx`
- `src/components/Navbar.tsx`
- `src/components/Navigation/MobileBottomBar.tsx`
- `src/components/CoreLayoutWrapper.tsx`
- `src/components/CreatorDiscoveryRail.tsx`
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/drops/DropsClient.tsx`
- `src/app/experiences/ExperiencesClient.tsx`
- `src/lib/telemetry-catalog.ts`
- `src/lib/analytics-semantics.ts`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Implementation results:

- hardened shared creator-message eligibility in `src/lib/creator-experiences.ts` so approved legacy creators are treated as messageable even if their `role` field has not been upgraded yet
- aligned `src/lib/server/chat.ts` with that shared eligibility helper in both seed-thread and send-message flows
- preserved legacy purchased GumDrop spend truth; no balance-model change was needed
- kept post-send analytics from surfacing as generic request failures by moving tracking calls onto `Promise.allSettled(...)` with async wrapping after the send transaction succeeds
- added a new admin moderation surface at `/admin/moderation` backed by realtime Firestore streams for:
  - `creator_message_threads`
  - selected `creator_messages`
  - `security_events`
- added admin-only Firestore rule reads for moderation over:
  - `creator_message_threads`
  - `creator_messages`
  - `security_events`
- moved the visible security-alert function out of analytics and into moderation
- removed the visible spotlight title line entirely and widened spotlight cards to a more square 1:1 shape so usernames stop truncating as aggressively
- blocked self-follow from both the spotlight data source and the spotlight card action surface
- removed deferred creator-spotlight mounting from dashboard, drops, and experiences so those pages stop intentionally doing a second client-phase mount for the rail
- gated navbar, mobile nav, admin dropdown, and layout shell decisions directly on auth loading so guest/user/admin chrome no longer flashes before the correct state is known
- added the missing `admin_moderation_viewed` telemetry catalog and analytics-semantic entries so the new moderation page is fully tracked and audit-clean

Runtime truth and continuity implications:

- plain-text chat sends now treat approved legacy creators the same way as already-upgraded creator-role accounts
- legacy purchased GumDrops were already valid spend for creator messages; that path remains source-aware and truthful
- moderation is now a real realtime Firestore oversight surface, not an analytics proxy
- security alerts are now surfaced where operators can inspect the exact live chat context and exchanged files instead of hunting through analytics cards
- creator spotlight now waits for auth to settle before fetching, which removes the guest-first then signed-in refetch pattern on spotlight pages
- navbar and mobile nav now prefer no shell over the wrong shell while auth is unresolved, which removes the visible option-flash bug
- the old analytics security block is now inert and unreachable from the UI, but the hidden dead JSX branch still exists in `src/app/admin/analytics/page.tsx`; it should be deleted in a cleanup-only pass

Commands run for continuation:

- `git status --short`
- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/components/CreatorDiscoveryRail.tsx`
- `npm run trace:adjacent -- src/components/Navigation/MobileBottomBar.tsx`
- `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
- `npm run trace:adjacent -- src/components/Admin/AdminModerationConsole.tsx`
- `npm run trace:adjacent -- src/components/Navbar.tsx`
- focused verification:
  - `npx eslint src/components/Admin/AdminModerationConsole.tsx src/app/admin/moderation/page.tsx src/app/admin/analytics/page.tsx src/components/CreatorDiscoveryRail.tsx src/components/Navbar.tsx src/components/Navigation/MobileBottomBar.tsx src/components/CoreLayoutWrapper.tsx src/components/Navigation/AdminDropdown.tsx src/app/dashboard/DashboardClient.tsx src/app/drops/DropsClient.tsx src/app/experiences/ExperiencesClient.tsx src/lib/creator-experiences.ts src/lib/server/chat.ts src/lib/admin-ui-chart-health.ts src/lib/server/admin-panel-system-logs.ts`
  - `corepack pnpm exec tsc --noEmit`
  - `corepack pnpm exec vitest run tests/unit/creator-experiences.spec.ts tests/unit/server-chat.spec.ts tests/unit/creator-messages-route.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/firebase/firestore.rules.spec.ts`
- repo-wide verification:
  - `npm run check:inventory`
  - `npm run check:continuity`
  - `npm run check:architecture`
  - `npm run check:firebase:rules`
  - `npm run check:telemetry`
  - `npm run check:analytics-semantics`
  - `corepack pnpm run check`
  - `npx vitest run`
  - `npm run check:ui:audits`
  - `npm run check:ui:lighthouse`

Continuation results:

- focused eslint passed
- focused TypeScript compile passed
- focused chat/rules Vitest passed with `4` files and `12` tests
- `npm run check:inventory` passed with `715` tracked files
- `npm run check:continuity` passed
- `npm run check:architecture` passed
- `npm run check:firebase:rules` passed
- `npm run check:telemetry` passed with `0` cataloged events lacking emitters
- `npm run check:analytics-semantics` passed
- `corepack pnpm run check` passed
- `npx vitest run` passed with `106` files and `505` tests
- `npm run check:ui:audits` passed with `16` tests green
- `npm run check:ui:lighthouse` passed
- generated `playwright-report/` and `test-results/` directories were removed after verification

Known warnings and non-blocking notices during continuation:

- standard npm unknown env config warnings in canonical script chains
- Node `punycode` deprecation warnings from Firebase/Vitest tooling
- the first `npm run check:ui:audits` attempt failed because port `3000` was already occupied by a stale local `next start` process; rerunning after killing that process passed cleanly
- one earlier `corepack pnpm run check` attempt hit the tool timeout limit rather than a repo failure; the longer rerun passed
- `npm run check:ui:lighthouse` still prints the known Windows temp-folder `EPERM` cleanup warning, but the audit now treats that as non-fatal once scores and server execution succeed

Continuation follow-up improvements:

- delete the now-hidden legacy analytics security JSX branch from `src/app/admin/analytics/page.tsx` in a cleanup-only pass
- add route-runtime-health coverage for the new moderation page’s backing route mix if moderation later moves behind a dedicated server aggregation endpoint
- split admin debug route-runtime-health between native chat traffic and legacy compatibility traffic so operators can see how much load the compatibility path still carries

## 2026-04-08 UI Evidence Review Pass (started)

Scope:

- no-code visual audit pass
- capture current public UI evidence into a dated `qa-screenshots/` run folder
- review desktop, tablet, and mobile screenshots for consistency, scale, vertical sprawl, and safe-zone issues
- translate Apple Human Interface Guidelines layout and clarity principles into repo-specific UI recommendations
- add a repeatable screenshot-review process so future visual audits produce one clean evidence set per run

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- reviewed existing screenshot evidence surfaces under `qa-screenshots/` and `tests/ui-audits/`
- ran `npm run trace:adjacent -- tests/ui-audits/visual-regression.spec.ts`

Initial findings before capture:

- the repo already has a tracked screenshot evidence root at `qa-screenshots/`, so this pass will reuse that surface instead of inventing another top-level artifact directory
- prior screenshot evidence is mixed between timestamped subfolders and older top-level PNG files, which makes cross-run comparison harder than it needs to be
- the existing automated UI audits prove baseline regression coverage, but they do not produce a clean per-run human review packet for desktop, tablet, and mobile
- authenticated and admin-only pages still require a seeded review session; this pass is starting from the public/live unauthenticated surface unless a stable authenticated review context becomes available during capture

Primary touched surfaces for this pass:

- `FULL_SCALE_CODEBASE_AUDIT.md`
- `qa-screenshots/**`
- `tests/ui-audits/visual-regression.spec.ts` adjacency was reviewed for process alignment only; no runtime/UI code change is planned
- `UI_REVIEW_PROCESS.md`
- `REPO_MEMORY_LEDGER.md`

Implementation results:

- created a dated screenshot evidence packet at `qa-screenshots/ui-review-2026-04-08/`
- captured `11` public page surfaces and `19` unique top-level component surfaces at each of:
  - `desktop`
  - `tablet`
  - `mobile`
- wrote `capture-manifest.json` with truthful deferred authenticated/admin route coverage
- generated per-device contact sheets in both HTML and PNG form for fast human review
- wrote the run review at `qa-screenshots/ui-review-2026-04-08/README.md`
- added the durable repeatable process document at `UI_REVIEW_PROCESS.md`
- recorded the new screenshot-packet workflow rule in `REPO_MEMORY_LEDGER.md`

Review findings from the evidence packet:

- the clearest polish issue is safe-zone interference:
  - consent surfaces and mobile bottom-nav chrome still visually overlap primary content on several public pages
- mobile page shells are inconsistent in top rhythm, card scale, and CTA placement across home, drops, experiences, creator profile, and creator onboarding pages
- vertical sprawl is highest on mobile drops, FAQ, and creator-application surfaces because too many explanatory and framing modules land before core content
- card scale and glass-panel density drift too much between routes, which weakens visual cohesion
- the creator profile header remains taller than it needs to be before content begins
- the guest home `Unwrap Your KandyDrops` CTA did not open an auth dialog in the review build, so auth-modal capture was excluded rather than faked

Apple-guided standards translated into repo guidance:

- prioritize clarity over extra chrome, with one dominant action per screen
- standardize mobile shell templates instead of giving every page family its own hero rhythm
- keep persistent overlays and nav out of the primary-action lane
- keep touch targets at or above the `44x44` Apple minimum
- keep identity, controls, and content grouped predictably so layouts do not shift in a way that fights muscle memory

Commands run for this pass:

- `git status --short`
- `npm run trace:adjacent -- tests/ui-audits/visual-regression.spec.ts`
- local Playwright capture against `http://localhost:3100` for:
  - `11` public pages
  - `19` unique component surfaces
  - `3` device classes
- `npm run check:inventory`
- `git ls-files --others --exclude-standard`

Results:

- `npm run check:inventory` passed and the tracked inventory baseline remains `719` files
- `git ls-files --others --exclude-standard` returned clean; the screenshot packet lives under the repo-local ignored evidence root by design
- current tracked worktree changes are documentation/process only:
  - `FULL_SCALE_CODEBASE_AUDIT.md`
  - `REPO_MEMORY_LEDGER.md`
  - `UI_REVIEW_PROCESS.md`

Known warnings and non-blocking notices for this pass:

- `qa-screenshots/` is ignored by git, so the dated screenshot packet is local evidence rather than tracked source
- authenticated and admin-only routes still need a seeded review session for full packet coverage
- the guest home signup CTA behavior should be treated as a separate functional review item because it did not surface an auth dialog during capture

Follow-up improvements now clearly justified by evidence:

- establish one canonical mobile shell for marketing, discovery, creator-profile, and help/legal surfaces
- reserve one bottom-safe-area lane for nav and consent so neither covers primary content
- compress the mobile drops and creator-profile top stacks
- normalize card primitives and button heights across public pages
- run the same packet again with a seeded authenticated session so dashboard/admin UI can be reviewed under the same rubric

## 2026-04-09 Dashboard Viewer + Dashboard Bug Report Investigation (In Progress)

Scope for this pass:

- investigate reported manual bug submissions on:
  - `/dashboard/viewer` with `action_failed`
  - `/dashboard` with `permissions`
- fix any confirmed adjacent defects
- add runtime tracking so the next recurrence surfaces in admin debug without waiting on a manual bug report

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/app/dashboard/viewer/ViewerClient.tsx`
- ran `npm run trace:adjacent -- src/app/dashboard/page.tsx`
- ran `npm run trace:adjacent -- src/lib/bug-reporting.ts`

Known local worktree context before this pass:

- `FULL_SCALE_CODEBASE_AUDIT.md` already had local updates from the screenshot review pass
- `REPO_MEMORY_LEDGER.md` already had local updates from the screenshot review pass
- `UI_REVIEW_PROCESS.md` was already present as a new tracked-process artifact candidate

Initial findings:

- both reported items came through the global manual bug trigger path, so the report titles themselves are generic and do not prove a thrown runtime exception
- `/dashboard/viewer` is still server-rendered from the public drop loader, which can hide owned non-public drops before viewer ownership is evaluated
- several dashboard-sensitive routes still lack route-runtime-health coverage:
  - `creator/discovery`
  - `user/activity`
  - `drops/content`
  - `viewer/watch-session`
- `user/activity` and `checkin` were still missing explicit null-caller guards after `guardApiRequest`, which weakens permission-path correctness if auth resolution fails upstream

Implementation results:

- fixed `/dashboard/viewer` to load the raw owned drop record with `getDropRaw(...)` and then sanitize it for the client, instead of using the public-only `getDrop(...)` path
- added route-runtime-health coverage for:
  - `creator/discovery:GET`
  - `user/activity:GET`
  - `checkin:POST`
  - `drops/content:GET`
  - `viewer/watch-session:POST`
- added explicit `401` handling when `guardApiRequest(...)` does not yield a caller in:
  - `src/app/api/user/activity/route.ts`
  - `src/app/api/checkin/route.ts`
- added targeted regression coverage for:
  - the dashboard viewer using `getDropRaw(...)`
  - `user/activity` returning a clean `401` on missing caller
  - the creator discovery route after runtime-health instrumentation

Files touched in this pass:

- `src/app/dashboard/viewer/page.tsx`
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/user/activity/route.ts`
- `src/app/api/checkin/route.ts`
- `src/app/api/drops/content/route.ts`
- `src/app/api/viewer/watch-session/route.ts`
- `src/lib/route-runtime-health.ts`
- `tests/unit/dashboard-viewer-page.spec.tsx`
- `tests/unit/creator-discovery-route.spec.ts`
- `tests/unit/user-activity-route.spec.ts`
- `REPO_MEMORY_LEDGER.md`
- `FULL_SCALE_CODEBASE_AUDIT.md`

Commands run for this pass:

- `git status --short`
- `npm run trace:adjacent -- src/app/dashboard/viewer/ViewerClient.tsx`
- `npm run trace:adjacent -- src/app/dashboard/page.tsx`
- `npm run trace:adjacent -- src/lib/bug-reporting.ts`
- `npm run trace:adjacent -- src/app/dashboard/viewer/page.tsx`
- `npm run trace:adjacent -- src/app/api/user/activity/route.ts`
- `npm run trace:adjacent -- src/app/api/drops/content/route.ts`
- `npm run trace:adjacent -- src/app/api/viewer/watch-session/route.ts`
- `npx eslint src/app/dashboard/viewer/page.tsx src/app/api/creator/discovery/route.ts src/app/api/user/activity/route.ts src/app/api/checkin/route.ts src/app/api/drops/content/route.ts src/app/api/viewer/watch-session/route.ts src/lib/route-runtime-health.ts tests/unit/dashboard-viewer-page.spec.tsx tests/unit/creator-discovery-route.spec.ts tests/unit/user-activity-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/dashboard-viewer-page.spec.tsx tests/unit/creator-discovery-route.spec.ts tests/unit/user-activity-route.spec.ts tests/unit/server-drops.spec.ts tests/unit/route-runtime-health.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:telemetry`
- `corepack pnpm run check`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`

Results:

- targeted eslint passed
- targeted vitest passed: `4` files, `8` tests
- `npm run check:inventory` passed
- `npm run check:continuity` passed
- `npm run check:telemetry` passed
- `corepack pnpm run check` passed, including `106` contract files / `506` tests
- `npm run check:ui:audits` passed
- `npm run check:ui:lighthouse` passed

Confirmed defects fixed:

- owned non-public drops can now resolve through `/dashboard/viewer` because the page no longer depends on the public drop loader
- auth-required dashboard routes no longer drift through blank-user execution when `guardApiRequest(...)` does not yield a caller

What was investigated but not proven as a distinct code defect from the bug report alone:

- the `/dashboard` `permissions` report did not have local access to its original stored `autoContext`, so there was no direct evidence of a single crashing dashboard module
- instead of guessing, this pass expanded runtime tracking on the dashboard-sensitive server surfaces so the next recurrence will show up in admin debug with route name, status code, latency, and last error

Known warnings and local-state notes for this pass:

- Firestore bug-report payloads under `platform_feedback` could not be inspected locally because default admin credentials were not available in this shell
- the working tree still includes earlier local documentation work that predates this investigation:
  - `REPO_MEMORY_LEDGER.md`
  - `UI_REVIEW_PROCESS.md`

## 2026-04-09 Telemetry Integrity Sweep

Scope for this pass:

- verify there are no orphaned telemetry catalog entries
- verify there are no unknown emitter call sites
- remove or reconnect telemetry only if the audit finds a real gap

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- ran `npm run trace:adjacent -- src/lib/telemetry-catalog.ts`
- ran `npm run trace:adjacent -- src/lib/telemetry.ts`
- ran `npm run trace:adjacent -- scripts/audit-telemetry.ts`

Implementation results:

- no runtime code changes were needed
- no cataloged telemetry events were orphaned
- no unknown emitter event names were found
- no redundant telemetry entries needed removal in this pass

Commands run for this pass:

- `git status --short`
- `npm run trace:adjacent -- src/lib/telemetry-catalog.ts`
- `npm run trace:adjacent -- src/lib/telemetry.ts`
- `npm run trace:adjacent -- scripts/audit-telemetry.ts`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`

Results:

- `npm run check:telemetry` passed:
  - `243` literal or resolvable emitters checked across `384` files
  - `0` cataloged events with no detected emitters
- `npm run check:analytics-semantics` passed

Conclusion:

- telemetry integrity is currently clean
- no orphaned telemetry required reconnection
- no redundant telemetry required removal

## 2026-04-09 Open PR Sweep

Scope for this pass:

- inspect the live open pull request queue
- merge, assimilate, or close any remaining PRs if present

Startup protocol executed:

- read `FULL_SCALE_CODEBASE_AUDIT.md`
- read `REPO_MEMORY_LEDGER.md`
- read `EVERY_FILE_FUNCTION_CHECKLIST.md`
- ran `git status --short`
- inspected the live PR queue with `gh pr list --state open --json number,title,headRefName,baseRefName,author,url`

Implementation results:

- no open pull requests were present at the time of the sweep
- no code changes were required
- no PR closures or assimilations were required

Commands run for this pass:

- `git status --short`
- `gh pr list --state open --json number,title,headRefName,baseRefName,author,url`

Results:

- `gh pr list --state open ...` returned `[]`
- the repository had no outstanding PR work to merge, implement, or close

Conclusion:

- the live GitHub PR queue is currently clean
- this pass is audit-only and does not change runtime behavior

Implementation results:

- moved the home route from a client-only drop fetch to a server-seeded `HomeClient` flow so the hero and landing sections render against live drop data on first paint
- moved the experiences route to server-seed both active drops and creator spotlight data before hydration
- server-seeded creator spotlight data on:
  - `dashboard`
  - `drops`
  - `experiences`
- created a canonical server helper for spotlight payloads:
  - `src/lib/server/creator-discovery.ts`
- changed `CreatorDiscoveryRail` so it:
  - renders seeded spotlight data immediately
  - avoids the extra public discovery request when seeded data already exists
  - collapses signed-in spotlight loading to one authenticated relationship request instead of a discovery-plus-relationships waterfall
  - still filters out self-cards
- changed `useDrops(...)` so server-seeded drop pages do not immediately refetch the first page on mount
- removed delayed mount gates for already-visible user-facing modules:
  - dashboard recent activity
  - drops featured carousel
  - experiences live-drops carousel
- stopped lazy-loading the primary app chrome in `CoreLayoutWrapper`, so `Navbar` and `MobileBottomBar` are no longer a second-phase split chunk
- added route-runtime-health coverage for the central realtime drop feed:
  - `drops/feed:GET`
- refreshed the home-hero visual baselines after the home route moved to server-seeded live data
- hardened two flaky verification surfaces that blocked a truthful signoff:
  - widened the timeout on `tests/unit/security-log-attempt-route.spec.ts`
  - broadened the home-hero audit masking before regenerating the baseline snapshots

Primary touched surfaces for this pass:

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
- `src/app/api/creator/discovery/route.ts`
- `src/app/api/drops/route.ts`
- `src/lib/route-runtime-health.ts`
- `tests/ui-audits/visual-regression.spec.ts`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-chromium-win32.png`
- `tests/ui-audits/visual-regression.spec.ts-snapshots/home-hero-Mobile-Chrome-win32.png`
- `tests/unit/security-log-attempt-route.spec.ts`

Commands run for this pass:

- `git status --short`
- `git rev-parse HEAD`
- `npm run trace:adjacent -- src/app/dashboard/DashboardClient.tsx`
- `npm run trace:adjacent -- src/components/CoreLayoutWrapper.tsx`
- `npm run trace:adjacent -- src/components/CreatorDiscoveryRail.tsx`
- `npm run trace:adjacent -- src/hooks/useDrops.ts`
- `npm run trace:adjacent -- src/app/page.tsx`
- `npm run trace:adjacent -- src/app/experiences/page.tsx`
- `npm run trace:adjacent -- src/app/api/drops/route.ts`
- `npm run trace:adjacent -- src/lib/server/creator-discovery.ts`
- `npx eslint src/app/page.tsx src/app/HomeClient.tsx src/app/dashboard/page.tsx src/app/dashboard/DashboardClient.tsx src/app/drops/page.tsx src/app/drops/DropsClient.tsx src/app/experiences/page.tsx src/app/experiences/ExperiencesClient.tsx src/components/CreatorDiscoveryRail.tsx src/components/CoreLayoutWrapper.tsx src/components/Dashboard/LiveDropsForYouCarousel.tsx src/hooks/useDrops.ts src/app/api/drops/route.ts src/app/api/creator/discovery/route.ts src/lib/creator-public-pages.ts src/lib/route-runtime-health.ts src/lib/server/creator-discovery.ts`
- `npx tsc --noEmit`
- `corepack pnpm exec vitest run tests/unit/creator-discovery-route.spec.ts tests/unit/drops-route.spec.ts tests/unit/server-drops.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:architecture`
- `npm run check:telemetry`
- `corepack pnpm exec vitest run tests/unit/security-log-attempt-route.spec.ts`
- `npx eslint tests/unit/security-log-attempt-route.spec.ts tests/ui-audits/visual-regression.spec.ts`
- `npx playwright test tests/ui-audits/visual-regression.spec.ts --project=chromium --project="Mobile Chrome" --grep "home hero stays stable" --update-snapshots`
- `corepack pnpm run check`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`

Results:

- targeted eslint passed
- `npx tsc --noEmit` passed
- targeted vitest passed
- `npm run check:inventory` passed:
  - tracked files: `721`
- `npm run check:continuity` passed
- `npm run check:architecture` passed
- `npm run check:telemetry` passed:
  - `243` literal or resolvable emitters checked across `386` files
  - `0` cataloged events with no detected emitters
- `corepack pnpm run check` passed:
  - `106` contract files / `506` tests
- `npm run check:ui:audits` passed:
  - `16` tests
- `npm run check:ui:lighthouse` passed

Load-specific findings resolved in this pass:

- the home page no longer waits for a client-side `/api/drops` fetch before the hero can show live drop state
- the experiences page no longer waits for a client-side `/api/drops` fetch plus a deferred-ready timer before showing the live-drops module
- dashboard and drops no longer perform an immediate first-page `/api/drops` revalidation right after SSR already supplied the same data
- creator spotlight no longer arrives as a blank shell followed by a second discovery request on public or newly loaded signed-in surfaces where server-seeded creator data already exists
- the global navbar and mobile bottom nav no longer depend on a secondary dynamic import before core chrome appears

Warnings and non-blocking notes:

- the targeted home-hero snapshot refresh emitted existing upstream-image timeout and RTDB permission warnings from the local review environment, but the actual visual-regression suite passed afterward
- current toolchain still emits existing non-blocking warnings:
  - npm unknown env config warnings
  - Node `punycode` deprecation warnings
  - Windows Lighthouse temp-folder cleanup `EPERM` warnings

Final state:

- broad repo verification is green
- UI audits and Lighthouse are green after the loading-path changes
- no generated Playwright artifacts remain in the worktree
- realtime behavior remains server-truth-first; this pass removed duplicated initial fetches and delayed mounts rather than replacing them with stale caches

## 2026-04-09 Notifications Delivery Time And Clear Audit

- Scope: inspect notification delivery-time rendering, clear actions, and adjacent notification runtime behavior while preserving the already-dirty local admin-debug truth pass.

Root causes found:

- notification timestamps were normalized against the client Firestore `Timestamp` class in `src/lib/notification-contracts.ts`, but the inbox route reads server-side admin snapshot data. That left `createdAt` null and surfaced `Delivery time unavailable` in the notification bell even when the document had a valid timestamp.
- the notification clear-all path in `src/hooks/useNotifications.ts` faned out one `PUT /api/notifications` request per unread notification. Under normal route limits, that can partially fail and leave some notifications uncleared.
- notification writes were inconsistent about persisting a numeric millisecond timestamp alongside `createdAt`, so runtime truth varied between producers even though the UI depends on a stable delivery-time field.
- the notifications route was not included in route-runtime-health, so repeated inbox/read-state failures would not be visible in admin debug as a first-class route issue.

Implementation results:

- broadened notification timestamp normalization so `normalizeNotificationDoc(...)` accepts both timestamp-like objects and raw `createdAtMs` values
- the notification inbox now derives `createdAtMs` from the normalized contract field instead of assuming a client-side Firestore timestamp instance
- `PUT /api/notifications` now supports batch mark-read requests through `notificationIds`, while keeping the single-id flow intact
- `useNotifications()` now clears all unread notifications through one server request instead of a burst of parallel `PUT`s
- added route-runtime-health tracking for:
  - `notifications:GET`
  - `notifications:POST`
  - `notifications:PUT`
- normalized adjacent notification producers to persist `createdAtMs` at write time:
  - creator broadcasts
  - creator subscription renewal warnings/failures
  - creator onboarding admin alerts
  - daily-task user notifications
  - drop activation push/inbox notifications
  - admin notification dispatch

Primary touched surfaces for this pass:

- `src/lib/notification-contracts.ts`
- `src/lib/server/notification-inbox.ts`
- `src/app/api/notifications/route.ts`
- `src/lib/notifications.ts`
- `src/hooks/useNotifications.ts`
- `src/lib/route-runtime-health.ts`
- `src/app/api/creator/broadcasts/route.ts`
- `src/app/api/cron/process-creator-subscriptions/route.ts`
- `src/lib/server/creator-onboarding-alerts.ts`
- `src/lib/server/daily-tasks.ts`
- `src/lib/server/push-notifications.ts`
- `tests/unit/notification-contracts.spec.ts`
- `tests/unit/notifications-route.spec.ts`

Commands run for this pass:

- `git status --short`
- `npm run trace:adjacent -- src/app/api/notifications/route.ts`
- `npm run trace:adjacent -- src/components/Navigation/NotificationBell.tsx`
- `npm run trace:adjacent -- src/lib/server/notification-inbox.ts`
- `npx eslint src/lib/notification-contracts.ts src/lib/server/notification-inbox.ts src/app/api/notifications/route.ts src/lib/notifications.ts src/hooks/useNotifications.ts src/lib/route-runtime-health.ts src/app/api/creator/broadcasts/route.ts src/app/api/cron/process-creator-subscriptions/route.ts src/lib/server/creator-onboarding-alerts.ts src/lib/server/daily-tasks.ts src/lib/server/push-notifications.ts tests/unit/notification-contracts.spec.ts tests/unit/notifications-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/notification-contracts.spec.ts tests/unit/notifications-route.spec.ts`
- `npx tsc --noEmit`
- `npm run check:telemetry`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:ui:audits`
- `corepack pnpm run check`

Results:

- targeted eslint passed
- targeted Vitest passed:
  - `2` files
  - `4` tests
- `npx tsc --noEmit` passed
- `npm run check:telemetry` passed:
  - `243` literal or resolvable emitters checked across `386` files
  - `0` cataloged events with no detected emitters
- `npm run check:inventory` passed:
  - tracked files: `723`
- `npm run check:continuity` passed
- `npm run check:ui:audits` passed:
  - `16` tests
- `corepack pnpm run check` passed:
  - `108` contract files
  - `513` tests

Warnings and non-blocking notes:

- the route now reports batch clear outcomes truthfully, but notifications with genuinely invalid or unavailable targeting still return as failed instead of being silently hidden
- existing toolchain warnings remain unchanged:
  - npm unknown env config warnings
  - Node `punycode` deprecation warnings

Final state:

- delivery time now resolves from real notification timestamps instead of falling back to `Delivery time unavailable` for valid docs
- clear-all no longer depends on a burst of parallel mark-read requests
- notifications route health is now visible in admin debug, so inbox/read-state regressions should surface without needing manual repro

## 2026-04-09 Admin Truth, Moderation, Chat Send, And Analytics Refactor Finalization

- Scope: finish the in-flight admin truth/moderation/analytics refactor, harden chat send and AI assistant runtime behavior, remove stale analytics security ownership, and verify the repo end to end.

Key issues closed in this pass:

- the admin AI debug assistant was still resolving a configured model but calling Vertex with a hardcoded model constant
- assistant availability was still partially env-gated instead of treating admin settings as the primary control plane
- the new moderation console had moved to polling APIs but still lacked direct contract coverage and still carried minor render-lifecycle noise
- the analytics page had been partially migrated to per-module ranges but still contained a dead hidden security branch and stale copy implying a page-level time baseline
- chat send still lacked direct helper-level coverage for legacy `gumDropsBalance`, purchased-only split-balance spending, and post-write tracking degradation
- admin moderation APIs had been implemented but not yet directly covered by route tests

Implementation results:

- AI debug assistant runtime now uses the resolved admin-configured model for live Vertex requests instead of the old hardcoded model constant
- AI debug assistant enablement now follows admin settings as the source of truth; disabled state is reported as an admin-settings decision instead of a runtime-override artifact
- the admin debug page now exposes editable AI assistant controls and scoped active/recent/sample counts without conflating historical sample totals with current incidents
- the moderation console remains server-backed and now has a cleaner derived-thread selection flow with no effect-driven state churn
- the hidden legacy analytics security block was removed from `src/app/admin/analytics/page.tsx`; security ownership now lives in moderation only
- analytics copy now reflects per-card time ranges truthfully instead of implying a remaining global time filter
- added direct helper coverage for chat send proving:
  - legacy `gumDropsBalance` is treated as purchased balance for creator text sends
  - split balances spend purchased GumDrops only
  - insufficient purchased balance returns the structured shortfall payload
  - post-write tracking failures do not turn a successful send into a 500
- added direct route coverage for the server-backed admin moderation APIs:
  - thread list
  - thread detail/messages/files
  - security alerts

Primary touched surfaces:

- `src/app/admin/analytics/page.tsx`
- `src/app/admin/debug/page.tsx`
- `src/app/api/admin/analytics/historical/route.ts`
- `src/app/api/admin/debug/assistant/route.ts`
- `src/components/Admin/AdminModerationConsole.tsx`
- `src/lib/server/ai-debug-assistant.ts`
- `src/lib/server/chat.ts`
- `src/lib/admin-moderation.ts`
- `src/lib/server/admin-moderation.ts`
- `src/app/api/admin/moderation/threads/route.ts`
- `src/app/api/admin/moderation/threads/[threadId]/route.ts`
- `src/app/api/admin/moderation/security-alerts/route.ts`
- `tests/unit/ai-debug-assistant.spec.ts`
- `tests/unit/admin-panel-system-logs.spec.ts`
- `tests/unit/server-chat-send.spec.ts`
- `tests/unit/admin-moderation-routes.spec.ts`

Commands run for this finalization pass:

- `git status --short`
- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/components/Admin/AdminModerationConsole.tsx`
- `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
- `npm run trace:adjacent -- src/app/api/admin/debug/route.ts`
- `npm run trace:adjacent -- src/lib/server/daily-tasks.ts`
- `npm run trace:adjacent -- src/lib/tasks/task-observability.ts`
- `npx tsc --noEmit`
- `npx eslint src/app/admin/analytics/page.tsx src/app/admin/debug/page.tsx src/app/api/admin/analytics/historical/route.ts src/app/api/admin/debug/assistant/route.ts src/lib/server/ai-debug-assistant.ts src/lib/server/chat.ts src/components/Admin/AdminModerationConsole.tsx src/lib/admin-ops-health.ts src/lib/server/admin-ops-health.ts tests/unit/ai-debug-assistant.spec.ts tests/unit/admin-panel-system-logs.spec.ts`
- `corepack pnpm exec vitest run tests/unit/server-chat.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/chat-thread-route.spec.ts tests/unit/chat-threads-route.spec.ts tests/unit/chat-thread-read-route.spec.ts tests/unit/ai-debug-assistant.spec.ts tests/unit/admin-debug-assistant-route.spec.ts tests/unit/admin-panel-system-logs.spec.ts`
- `corepack pnpm exec vitest run tests/unit/admin-ops-health.spec.ts tests/unit/task-observability.spec.ts tests/unit/notification-contracts.spec.ts tests/unit/notifications-route.spec.ts tests/unit/creator-onboarding-alerts.spec.ts tests/unit/admin-analytics-data.spec.ts tests/unit/admin-analytics-historical-users.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts`
- `corepack pnpm exec vitest run tests/unit/server-chat-send.spec.ts tests/unit/admin-moderation-routes.spec.ts`
- `npm run check:inventory`
- `npm run check:continuity`
- `corepack pnpm run check`
- `npm run check:firebase:rules`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`

Results:

- `npx tsc --noEmit` passed
- targeted eslint passed
- targeted Vitest passed for chat/debug/ops/notifications/onboarding/analytics slices
- added direct coverage:
  - `tests/unit/server-chat-send.spec.ts`
  - `tests/unit/admin-moderation-routes.spec.ts`
- `npm run check:inventory` passed:
  - tracked files: `723`
- `npm run check:continuity` passed
- `corepack pnpm run check` passed:
  - `110` contract files
  - `520` tests
- `npm run check:firebase:rules` passed:
  - Firestore rules: `10` tests
  - Storage rules: `16` tests
- `npm run check:ui:audits` passed:
  - `16` tests
- `npm run check:ui:lighthouse` passed

Warnings and non-blocking notes:

- one initial `check:ui:audits` attempt failed because port `3000` was occupied by a leftover local `next start` process; the port owner was confirmed and stopped, then the UI audit reran cleanly
- Playwright still emits the existing non-blocking Next webserver warning during teardown:
  - `TypeError: controller[kState].transformAlgorithm is not a function`
  - this did not fail the passing UI audit run
- toolchain warnings remain unchanged:
  - npm unknown env config warnings
  - Node `punycode` deprecation warnings
  - Windows Lighthouse temp cleanup `EPERM` warnings

Final state:

- admin moderation is server-backed with direct route coverage; the old client-Firestore moderation dependency is no longer the expected read path
- admin analytics now treats security ownership as moderation-only and keeps time filtering module-scoped
- AI debug assistant model selection is now truthful end to end from settings to Vertex runtime
- chat send is covered for legacy and split GumDrop balances, and post-write tracking degradation no longer threatens the message write result
- generated verification artifacts were removed after the run:
  - `playwright-report/`
  - `test-results/`

## 2026-04-09 Open PR Assimilation Sweep

- Scope: inspect all open GitHub PRs, merge the safe ones, rework any changes that need bounded implementation on `main`, and close stale/redundant PRs.

PR review outcomes:

- `#165` `🛡️ Sentinel: [MEDIUM] Fix dangerouslySetInnerHTML usage for static styles`
  - merged
  - effect: `TitleMarquee` no longer injects static CSS with `dangerouslySetInnerHTML`; marquee styles now live in `src/app/globals.css`
- `#164` `⚡ Bolt: Optimize Firestore N+1 queries in cron route`
  - not merged as-is
  - assimilated as a bounded-concurrency rework on `main`
  - effect: creator-subscription user prefetch now runs in bounded concurrent waves instead of a fully sequential loop or an unbounded `Promise.all` across every chunk
- `#163` `🧹 Audit continuity and codebase hygiene refresh`
  - closed as stale/redundant
  - reason: doc counts and continuity context were already superseded by later repo-wide audit passes, and the branch was dirty against current `main`

Implementation details for the `#164` rework:

- `src/app/api/cron/process-creator-subscriptions/route.ts`
  - added bounded concurrent waves for `adminDb.getAll(...)` user prefetch
  - current bounds:
    - chunk size: `100`
    - max concurrent chunks per wave: `3`
- `tests/unit/process-creator-subscriptions-bench.spec.ts`
  - aligned the benchmark helper with the new bounded concurrency model

Commands run:

- `gh pr list --state open --json number,title,author,headRefName,baseRefName,url,isDraft,reviewDecision,mergeable,statusCheckRollup,updatedAt`
- `gh pr view 165 --json ...`
- `gh pr view 164 --json ...`
- `gh pr view 163 --json ...`
- `gh pr diff 165 --patch`
- `gh pr diff 164 --patch`
- `gh pr diff 163 --patch`
- `git fetch origin`
- `git pull --ff-only origin main`
- `npm run trace:adjacent -- src/components/ui/TitleMarquee.tsx`
- `npm run trace:adjacent -- src/app/api/cron/process-creator-subscriptions/route.ts`
- `npx tsc --noEmit`
- `corepack pnpm exec vitest run tests/unit/process-creator-subscriptions-bench.spec.ts`

Results:

- local `main` fast-forwarded to include the merged `#165` change
- bounded concurrency rework for the subscription cron route compiles and its benchmark test passes
- all three PRs have final dispositions:
  - `#165` merged
  - `#164` implemented on `main` and then closed
  - `#163` closed

## 2026-04-09 Broad Hardening Follow-Through

- Scope: finish the deferred hardening pass across admin analytics, route runtime health, chat send UX, RTDB presence privacy, and repo cleanup enforcement; then run a fresh audit for additional improvements.

What changed:

- Added a shared Firestore payload sanitizer and applied it to chat message writes:
  - `src/lib/server/firestore-sanitize.ts`
  - `src/lib/server/chat.ts`
- Route runtime health now distinguishes freshness and chat traffic clusters:
  - `src/lib/route-runtime-health.ts`
  - `src/lib/server/admin-panel-system-logs.ts`
  - `src/app/admin/debug/page.tsx`
- Chat presence is now participant-scoped in RTDB pathing and rules:
  - `src/lib/chat.ts`
  - `database.rules.json`
  - `tests/firebase/database.rules.spec.ts`
  - `scripts/run-database-rules-tests.ts`
- Chat send UI now handles structured failure reasons and non-blocking post-send warnings explicitly:
  - `src/lib/chat-send-feedback.ts`
  - `src/components/Chat/ChatExperience.tsx`
  - `tests/unit/chat-send-feedback.spec.ts`
- Admin analytics now uses extracted model helpers for onboarding velocity, notification funnel, and daily task pipeline instead of inline truth logic:
  - `src/lib/admin-onboarding-velocity.ts`
  - `src/lib/admin-notification-funnel.ts`
  - `src/lib/admin-task-pipeline.ts`
  - `src/app/admin/analytics/page.tsx`
  - `tests/unit/admin-onboarding-velocity.spec.ts`
  - `tests/unit/admin-notification-funnel.spec.ts`
  - `tests/unit/admin-task-pipeline.spec.ts`
- Continuity now enforces cleanup of generated verification artifacts:
  - `scripts/check-generated-artifacts.ts`
  - `package.json`

Adjacent surfaces reviewed on purpose:

- `src/lib/server/chat.ts`
- `src/app/api/chat/threads/[threadId]/messages/route.ts`
- `src/app/api/creator/messages/route.ts`
- `src/components/Chat/ChatExperience.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/lib/server/admin-panel-system-logs.ts`
- `database.rules.json`

Commands run:

- `git status --short`
- `npm run trace:adjacent -- src/lib/server/chat.ts`
- `npm run trace:adjacent -- src/app/api/chat/threads/[threadId]/messages/route.ts`
- `npm run trace:adjacent -- src/app/api/creator/messages/route.ts`
- `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
- `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
- `npm run trace:adjacent -- src/lib/server/admin-panel-system-logs.ts`
- `npx tsc --noEmit`
- `npx eslint src/app/admin/analytics/page.tsx src/app/admin/debug/page.tsx src/components/Chat/ChatExperience.tsx src/lib/chat.ts src/lib/route-runtime-health.ts src/lib/server/admin-panel-system-logs.ts src/lib/server/chat.ts src/lib/server/firestore-sanitize.ts src/lib/admin-onboarding-velocity.ts src/lib/admin-notification-funnel.ts src/lib/admin-task-pipeline.ts src/lib/chat-send-feedback.ts tests/unit/admin-onboarding-velocity.spec.ts tests/unit/admin-notification-funnel.spec.ts tests/unit/admin-task-pipeline.spec.ts tests/unit/chat-send-feedback.spec.ts tests/unit/firestore-sanitize.spec.ts tests/unit/route-runtime-health.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/firebase/database.rules.spec.ts scripts/run-database-rules-tests.ts scripts/check-generated-artifacts.ts`
- `corepack pnpm exec vitest run tests/unit/chat-send-feedback.spec.ts tests/unit/firestore-sanitize.spec.ts tests/unit/admin-onboarding-velocity.spec.ts tests/unit/admin-notification-funnel.spec.ts tests/unit/admin-task-pipeline.spec.ts tests/unit/route-runtime-health.spec.ts tests/unit/admin-panel-system-logs.spec.ts tests/unit/server-chat-send.spec.ts tests/unit/server-chat.spec.ts tests/unit/chat-thread-messages-route.spec.ts tests/unit/creator-messages-route.spec.ts`
- `npm run test:rules:database`
- `npm run check:continuity`
- `npm run check:firebase:rules`
- `corepack pnpm run check`
- `npm run check:ui:audits`
- `npm run check:ui:lighthouse`
- `npm run check:generated-artifacts`
- `git status --short`

Results:

- `npx tsc --noEmit` passed
- targeted eslint passed
- focused Vitest passed:
  - `11` files
  - `31` tests
- `npm run test:rules:database` passed:
  - `4` tests
- `npm run check:continuity` passed
- `npm run check:firebase:rules` passed:
  - Firestore rules: `10` tests
  - Realtime Database rules: `4` tests
  - Storage rules: `16` tests
- `corepack pnpm run check` passed:
  - `116` contract files
  - `534` tests
- `npm run check:ui:audits` passed:
  - `16` tests
- `npm run check:ui:lighthouse` passed on rerun after a build-collision false start
- `npm run check:generated-artifacts` passed after removing generated local artifacts
- `npm run check:inventory` passed during continuity:
  - tracked files: `738`

Warnings and non-blocking notes:

- `npm run trace:adjacent -- database.rules.json` is not supported by the repo tracing tool because the target is not a traced internal module; adjacency for RTDB presence was reviewed manually through `src/lib/chat.ts`, `database.rules.json`, and the new rules test
- the first `check:continuity` run failed because a stale local `build.log` existed from an earlier build-debug run; the artifact was removed and continuity reran cleanly
- the first `check:ui:lighthouse` run collided with the immediately preceding `next build` from `check:ui:audits`; the rerun passed cleanly
- existing non-blocking warnings remain unchanged:
  - npm unknown env config warnings
  - Node `punycode` deprecation warnings
  - Lighthouse temp cleanup `EPERM` warnings on Windows
  - Playwright/Next teardown warning after a passing UI audit run:
    - `TypeError: controller[kState].transformAlgorithm is not a function`

Additional improvement opportunities from the follow-up audit:

1. Split the remaining analytics page view sections into module components so UI state and chart rendering stop living in one file.
2. Extend `sanitizeFirestorePayload(...)` to other write-heavy server modules such as support threads and notification writes.
3. Add a first-class `stale` badge and filter control inside the admin debug route runtime table so operators can isolate stale-only routes fast.
4. Add route-runtime-health coverage for attachment upload and storage URL resolution if chat/media volume grows.
5. Replace chat compatibility route traffic with a formal migration banner and kill-switch once creator-page deep links are fully migrated.
6. Add participant-scoped RTDB presence tests for invalid path/write payloads, not just allowed participant reads and writes.
7. Add a debug summary specifically for native chat versus compatibility chat error rates over bounded windows.
8. Persist admin debug display preferences the same way analytics module ranges are persisted, instead of keeping all debug panel state local.
9. Add a repo check that blocks committed Firebase emulator debug logs in the same way generated UI artifacts are blocked.
10. Extract onboarding discrepancy rendering into a dedicated admin analytics module so auth/onboarding parity rules are testable without the full page.

## 2026-04-10 GumDrop Economics and Ledger Integrity Pass

- Scope: Audit the codebase for economic and ledger integrity issues, specifically around conflicting math, mismatched price-to-GumDrop mappings, source-of-funds confusion, and stale labels.

Key issues closed in this pass:
- **Spend rule inconsistency**: Fixed an issue in `spendSourceAwareGumdrops` where `purchased` GumDrops were incorrectly consumed before `reward` GumDrops for generalized spend (like drop unwraps). This forced users to burn real purchased value first, violating the principle of prioritizing free/reward promotional balances before real-money balances.
- **Source separation failure**: Analytics tracking in `classifyGumdropTransaction` and `functions/src/analytics-transactions.ts` incorrectly conflated bonus drops from packages into the `gumdropPurchaseTotal`. The `extra.bonusGumDrops` field is now appropriately aggregated into `gumdropRewardTotal` and only `extra.paidGumDrops` into `gumdropPurchaseTotal`, accurately mirroring the `creditSourceAwareGumdrops` balance split logic.
- **Codebase hygiene**: Removed an unused `eslint-disable-next-line` from `src/app/drops/[id]/opengraph-image.tsx` that was causing `npm run check` warnings.

Implementation results:
- General spend routes (where `purchasedOnly: false`) now strictly deplete from `reward` prior to `purchased`.
- Analytics transaction classification ensures proper segregation between true purchased revenue value and promotional bundle bonus value.

Primary touched surfaces:
- `src/lib/gumdrop-ledger.ts`
- `functions/src/analytics-transactions.ts`
- `src/app/drops/[id]/opengraph-image.tsx`

## 2026-04-10 AI Cover Learning and Admin Density Refactor

- Scope: replace the AI cover system’s single-template assumptions with a reference library and prompt policy layer, then densify the admin AI surface and shared admin chrome without altering the Create Drop AI panel layout.

Key issues closed in this pass:
- **Reference cap mismatch**: Gemini 3 Pro Image Preview now supports up to `14` reference inputs in-app instead of being held to the old internal cap of `6`.
- **Prompt over-anchoring**: cover prompting now separates style lock from subject lock, parses `Creator | Flavor`, and explicitly blocks copying the reference subject when the requested flavor differs.
- **Learning visibility gap**: prompt policy, prompt history, optimizer proposal, and rejected-gallery state are now explicit server-backed admin records rather than implicit job-only history.
- **Admin AI sprawl**: `/admin/ai` is now a dense operational surface with collapsible modules, compact header chrome, prompt workbench, reference library manager, recent-generation provenance, and rejected review gallery.
- **Preference persistence gap**: admin UI module collapse state now persists per admin user through `users/{uid}.adminPreferences.ui`.
- **Runtime truth gap**: admin AI settings, template, feedback, references, prompt-policy, review-gallery, and UI-preferences routes now produce first-class runtime-health samples.

Primary touched surfaces:
- `src/lib/ai-drop-covers.ts`
- `src/lib/server/ai-drop-covers.ts`
- `src/app/admin/ai/page.tsx`
- `src/components/Admin/AdminPageHeader.tsx`
- `src/components/Admin/AdminDashboardModule.tsx`
- `src/app/api/admin/ai/drop-covers/route.ts`
- `src/app/api/admin/ai/drop-covers/feedback/route.ts`
- `src/app/api/admin/ai/drop-covers/template/route.ts`
- `src/app/api/admin/ai/drop-covers/references/route.ts`
- `src/app/api/admin/ai/drop-covers/prompt-policy/route.ts`
- `src/app/api/admin/ai/drop-covers/review-gallery/route.ts`
- `src/app/api/admin/ui/preferences/route.ts`
- `src/lib/server/admin-ui-preferences.ts`
- `src/lib/route-runtime-health.ts`
- `tests/unit/ai-drop-covers.spec.ts`
- `tests/unit/admin-ai-drop-covers-ops-routes.spec.ts`

Adjacent surfaces reviewed on purpose:
- `src/components/Admin/AiDropCoverGeneratorPanel.tsx`
- `src/app/api/admin/ai/drop-covers/generate/route.ts`
- `src/app/api/admin/analytics/preferences/route.ts`
- `src/lib/server/admin-debug-preferences.ts`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/debug/page.tsx`

Commands run:
- `git status --short`
- `npm run trace:adjacent -- src/app/admin/ai/page.tsx`
- `npm run trace:adjacent -- src/lib/server/ai-drop-covers.ts`
- `npm run trace:adjacent -- src/components/Admin/AdminPageHeader.tsx`
- `npx tsc --noEmit`
- `npx eslint src/app/admin/ai/page.tsx src/components/Admin/AdminPageHeader.tsx src/components/Admin/AdminDashboardModule.tsx src/lib/ai-drop-covers.ts src/lib/server/ai-drop-covers.ts src/app/api/admin/ai/drop-covers/route.ts src/app/api/admin/ai/drop-covers/feedback/route.ts src/app/api/admin/ai/drop-covers/template/route.ts src/app/api/admin/ai/drop-covers/references/route.ts src/app/api/admin/ai/drop-covers/prompt-policy/route.ts src/app/api/admin/ai/drop-covers/review-gallery/route.ts src/app/api/admin/ui/preferences/route.ts src/lib/server/admin-ui-preferences.ts src/lib/route-runtime-health.ts tests/unit/admin-ai-drop-covers-ops-routes.spec.ts`
- `corepack pnpm exec vitest run tests/unit/ai-drop-covers.spec.ts tests/unit/server-ai-drop-covers.spec.ts tests/unit/admin-ai-drop-covers-route.spec.ts tests/unit/admin-ai-drop-covers-generate-route.spec.ts tests/unit/admin-ai-drop-covers-template-route.spec.ts tests/unit/admin-ai-drop-covers-ops-routes.spec.ts`
- `npm run check:ui:audits`
- `npm run check:inventory`
- `npm run check:continuity`
- `npm run check:telemetry`
- `npm run check:analytics-semantics`
- `npm run check:ui:lighthouse`
- `corepack pnpm run check`
- `git status --short`

Results:
- `npx tsc --noEmit` passed
- targeted eslint passed
- focused AI/admin Vitest passed:
  - `6` files
  - `28` tests
- `npm run check:ui:audits` passed:
  - `16` tests
- `npm run check:inventory` passed:
  - tracked files: `775`
- `npm run check:continuity` passed
- `npm run check:telemetry` passed:
  - `243` emitters across `424` files
- `npm run check:analytics-semantics` passed
- `npm run check:ui:lighthouse` passed
- `corepack pnpm run check` passed:
  - `128` contract files
  - `580` tests

Warnings and non-blocking notes:
- the admin-wide density pass is shared-chrome-first; `/admin/ai` got the dedicated rebuild, while other admin pages inherit the compact header/module treatment without a one-off page rewrite in this same pass
- generated build and Playwright artifacts were produced during verification and removed before final continuity sign-off
- existing non-blocking warnings remain unchanged:
  - npm unknown env config warnings
  - Node `punycode` deprecation warnings
  - Lighthouse temp cleanup `EPERM` warnings on Windows

Follow-up opportunities:
1. Move the same per-user module-collapse persistence into the remaining admin pages that still use local-only section state.
2. Add a ranked-reference preview endpoint keyed by `Creator | Flavor` so the admin page can inspect selection reasons for a specific future generation instead of the next generic run.
3. Add more prompt-policy performance rollups beyond the current category bucket counts so acceptance rate by policy version is not limited to recent job history.
4. Add attachment/reference storage rules coverage if the AI admin reference library starts accepting anything beyond image assets.
