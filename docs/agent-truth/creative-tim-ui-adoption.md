# Creative Tim UI Adoption Record

Status: canonical design-reference and implementation record

## Implementation status

Creative Tim sources may be considered only for controlled, component-level
implantation under the policy below. The clean rebuild preserves existing user,
creator, admin, and protected-flow route ownership while presentation work
proceeds in reviewed slices. The original five primitives are consumed by
reviewed KandyDrops UI owners. The current Admin slice consolidates headings
and disclosures over that local Card source and the existing KandyDrops Button.
The one additional native selector below comes from MIT shadcn/ui. This record
supplies component provenance and adoption constraints; current source,
deployment and interaction receipts supply their own proof. The original
dependency installation is history, and the current Admin slice adds no package
or lockfile changes.

This record defines how the locally archived Creative Tim sources may inform or
supply approved component-level presentation in the KandyDrops rebuild. They
are controlled component sources, not application foundations. KandyDrops keeps
its existing Next App Router, Tailwind, Firebase/auth, wallet/payment,
Drop read model, unlock/entitlement, navigation, telemetry, maintenance gate,
and protected media logic.

## Approved public primitive implantation

Owner: KandyDrops frontend design-system lane

Environment: local repository source only; no development, staging, or
production rollout is implied.

Safety class: isolated presentation primitives. They have no route, provider,
server, payment, entitlement, telemetry, or data-model ownership.

Cost class: no incremental provider, billing, storage, analytics, background,
or runtime cost is introduced by this source-only addition.

Approved exact source files:

- `src/components/creative-tim/ui/card.tsx`
- `src/components/creative-tim/ui/badge.tsx`
- `src/components/creative-tim/ui/avatar.tsx`
- `src/components/creative-tim/ui/separator.tsx`
- `src/components/creative-tim/ui/navigation-menu.tsx`
- `src/components/creative-tim/ui/native-select.tsx` (MIT upstream addition below)

Direct packages installed by the parent integration:

- `class-variance-authority`
- `@radix-ui/react-slot`
- `@radix-ui/react-avatar`
- `@radix-ui/react-separator`
- `@radix-ui/react-navigation-menu`

Existing source dependency, not installed by this lane:

- `lucide-react`
- existing `@/lib/utils`

Explicit non-changes in this foundation lane: no `components.json`, Creative
Tim `button`, template global reset/theme, route, provider, mock data, server,
payment, telemetry, Firebase, or KandyDrops business-logic source changed. A
separate KandyDrops-owned theme slice may define semantic tokens required by
these primitives; that is not a Creative Tim template import. No package entry
outside the five declared direct packages changed.

Historical foundation rollback before any consuming UI slice lands: delete only
the original five primitives through `navigation-menu.tsx`, remove the five declared direct package
entries from `package.json`, and remove their paired resolved entries from the
paired lockfile. Once a reviewed UI slice imports a primitive, remove those
imports first. No `components.json`, template global CSS, route, provider, or
existing KandyDrops business-logic rollback is required.

The current native selector has no new package dependency. Its rollback restores
its reviewed consumers before removing that source file; the historical five-package
rollback does not apply to it. Current Admin operational disclosures consume the
same Card and existing Button through `AdminDashboardModule`, preserving caller
open/default-open state and actions. Economy's shared header replaces both duplicate
hero wrappers; Treasury data, calculations and permission owners stay in place.

## Current Admin component manifest

Owner: `AdminPageHeader` for shared headings; the existing Analytics
`SectionCard` for disclosure state; existing route hooks/services for selection,
permissions, source values, telemetry and financial truth.

- Local Card source: `C:/Users/uylus/Documents/creative Tim assets/implementation/ui-block-lab/components/ui/card.tsx`.
- Native selector source: [shadcn native-select](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/native-select.tsx), inspected 2026-10-01; [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) is retained in the implanted file.
- Exact output: `src/components/creative-tim/ui/native-select.tsx`. Existing React, lucide-react and `@/lib/utils` satisfy the manifest; no installation is required.
- Declared adaptations: KandyDrops import alias, full-width bounded wrapper, 44px target, and omission of unused small-size/optgroup variants. Native selection, focus, invalid and disabled behavior remain upstream patterns. No domain state or CSS theme is imported.
- Card adaptations belong to consuming owners: compact Admin spacing, a wrapping heading/action row, and the existing brand's semantic tokens in `src/app/globals.css`. Retain the vendor Card source unchanged. Existing Button supplies all adopted button states and 44px default targets.
- Consumers: the fourteen checked-in Admin pages share the heading owner directly or through their consumed canvas. Analytics section disclosures preserve existing state/defaults and put technical evidence behind explicit details. Debug, Roster, AI, Analytics and Moderation selectors preserve their existing callbacks and selected-value owners.
- Retired: Support and Moderation accent components. Each had one runtime caller and only `aria-hidden` decoration; callers now use the shared heading/Card composition. Historical release-note path entries remain historical evidence. No unique permission, state, telemetry or evidence safeguard was removed.

Exact allowlists and immutable before copies belong to the connected
`output/manual-admin-analytics-finance-20261001/`, `manual-admin-native-select-20261001/`
and `manual-admin-shared-surfaces-20261001/` custody lanes. Rollback restores
only reviewed task-relative paths and reconnects old consumers before removing
the new primitive. Earlier serving archives remain retained. These source
changes do not alter payment math, provider bindings or maintenance authority.

## Local source roots and roles

The current archive is `C:/Users/uylus/Documents/creative Tim assets`, with
`implementation`, `reference`, `licenses` and `download-manifest` directories.
The old `Creative Tim UI Stuff` paths below describe the original reference
inventory and are historical locations, not current implementation inputs.

| Local source root | Role in KandyDrops |
| --- | --- |
| `C:\Users\uylus\Documents\Creative Tim UI Stuff\Extracted Projects\Starters and Frameworks\material-tailwind-dashboard-nextjs-pro-v1.0.0` | Material Tailwind Dashboard Next.js Pro. Technical component reference only: inspect implementation patterns for reusable Tailwind/Next component shape, spacing, states, and composition mechanics. Do not adopt its application shell or architecture. |
| `C:\Users\uylus\Documents\Creative Tim UI Stuff\Extracted Projects\UI Kits and Design Systems\argon-design-system-pro-react-v1.0.2` | Argon Design System PRO React. Reference for spacious public composition, hierarchy, card grammar, typography rhythm, and premium marketing/content sections. |
| `C:\Users\uylus\Documents\Creative Tim UI Stuff\Extracted Projects\Dashboards\argon-dashboard-pro-react-v1.2.5` | Argon React PRO. Companion public composition/card reference where its React examples clarify the Argon grammar. It is not a replacement for KandyDrops routing or state. |
| `C:\Users\uylus\Documents\Creative Tim UI Stuff\Extracted Projects\Dashboards\soft-ui-dashboard-pro-react-v4.0.3` | Soft UI Dashboard PRO React. Later signed-in reference for card hierarchy, account surfaces, dashboard layout, and dense-but-readable authenticated states. |
| `C:\Users\uylus\Documents\Creative Tim UI Stuff\Extracted Projects\Dashboards\soft-ui-dashboard-pro-tailwind-v1.1.0` | Soft UI Dashboard PRO Tailwind. Later signed-in Tailwind layout and card reference; use only for visual/layout ideas that can be expressed through the existing KandyDrops stack. |

## KandyDrops ownership boundary

The reference sources must not redefine or bypass KandyDrops source truth. The
existing KandyDrops implementation remains authoritative for:

- Next App Router and route ownership
- Tailwind configuration and shared brand primitives
- Firebase, authentication, authorization, and identity handoff
- Wallet, payment, GumDrop, and source-of-funds behavior
- Drop read model and canonical Drop data
- Unlock, entitlement, protected previews, and protected media access
- Navigation, responsive device-layout behavior, and maintenance mode
- Telemetry, analytics, privacy, debug evidence, and recovery behavior

Creative Tim candidate blocks may guide or supply approved presentation only
after the affected KandyDrops surface doctrine and canonical state path have
been consulted.

## Forbidden imports and adoption rules

- Do not import Creative Tim pages, route trees, layouts, dashboards, app shells,
  providers, theme registries, or template-specific state managers into KandyDrops.
- Do not import template Firebase/auth, wallet/payment, Drop/content, entitlement,
  navigation, telemetry, maintenance, media-protection, payment, auth, or state
  business logic.
- Do not import a template `package.json`, lockfile, dependency set, alias, build
  configuration, global reset, Creative Tim theme colors, or competing
  Tailwind/theme configuration.
- Do not copy a whole Creative Tim application or preserve template route names
  as KandyDrops product routes.
- Approved primitive outputs are the five original sources and the bounded MIT
  selector in the current manifest. Named Creative Tim blocks require their own
  exact manifest, file allowlist and rollback plan before adoption.
- A future candidate block may add only dependencies explicitly required by its
  reviewed exact official manifest.
- Creative Tim `button` is forbidden. All approved primitive output remains
  isolated from `src/components/ui/Button.tsx`; that existing component is not
  an output target.
- Before any candidate block is adopted, define its explicit file allowlist and
  rollback approach.
- Do not use template mock data, demo content, placeholder metrics, or template
  permissions as KandyDrops runtime truth.
- Do not expose protected Drop media or internal content because a reference
  template renders it in a card or preview.

The adoption rule is **controlled component-level implantation, not a copy of a
whole app**. The owner-selected whole-site visual direction now lives in
`docs/doctrine/surfaces/shared-brand-primitives.md`. Earlier Argon, Soft UI and
neon candy-glass composition references are historical inputs where they
conflict with that direction. Retain the licensed primitive sources, current
Next/Tailwind architecture and all product/server-truth contracts. The supplied
2026-10-02 Penpot archive informs researched design choices; its community file
names alone do not establish a code or asset license.

The shared foundation proposal retains the existing KandyDrops Button owner.
Its `buttonVariants` export follows the documented MIT shadcn/CVA class pattern
using the already installed `class-variance-authority` package; it does not
implant the Creative Tim Button or add a Slot, provider or state wrapper. Real
anchors retain navigation semantics while reading the same class owner.
Card and NativeSelect vendor sources remain unchanged. Semantic colors and
material appearance stay in the single global stylesheet owner.

## Creator operational redesign — slice 5 (2026-10-05)

Implementation on `broski/kandydrops-apple-redesign`; uncommitted. Visual acceptance and public-beta release acceptance are not claimed.

- selectedIssueIdOrFingerprint: `owner-directed-apple-redesign-slice-5-creator` (design task, not a runtime Debug incident).
- affectedSurface: Creator UI — `/dashboard/creator`, `/dashboard/creator/drops`, `/dashboard/creator/settings` and their embedded operational managers.
- expectedUserImpact: grouped overview/earnings, content management, requests/bookings, and fans/engagement; system hierarchy, opaque records, semantic controls.
- filesAllowed: the exact manifest below and this existing adoption record.
- filesForbidden: API/server/database/payment/auth/permission logic, rules, deployment/config/package files, public creator discovery/profile purchasing/onboarding, and shared Admin submission/upload form owners.
- validatorToRun: typecheck, targeted lint/component tests, creator transaction/booking/projection contracts, device layout/UI, accessibility, surface doctrine and design drift.
- releaseNoteImpact: candidate creator-presentation update when included in an accepted beta bundle; no release acceptance or Beta badge update in this source slice.
- rollbackNote: restore the modified source files and remove only the nine new manifest files; server/data contracts require no rollback.

Shared primitives: existing ContentFrame, ContentSection, SectionHeader, ContentGrid, GroupedList/GroupedRow, Card, Badge, Button/buttonVariants, Input and NativeSelect. New `Textarea` owns multiline input styling; `ToggleControl` and `NumberControl` move the existing generic labeled controls into `ui/form-controls.tsx`, with no creator business logic. Controls retain 44px label/input targets and native input semantics. The six state hooks relocate existing owners rather than add parallel tracking, resolver or workflow systems. The unused SectionCard helper is removed.

Adaptive source composition uses content-layout intrinsic grids and the existing md shell boundary; RootLayout retains navigation/safe-area reservation. No local viewport listener or new layout physics. At 390px the body is one working pane; at 768px shared frame spacing expands; at 1440px the max-width frame and fan-tool grid use available width. No browser visual acceptance at these widths is claimed. All migrated views are under 300 lines; TSX net change is -36 lines before this record.

### Source manifest

| Change | File |
| --- | --- |
| Modified | `src/components/Creators/CreatorBookingsManager.tsx` |
| Modified | `src/components/Creators/CreatorBroadcastManager.tsx` |
| Modified | `src/components/Creators/CreatorDashboardSettingsHub.tsx` |
| Modified | `src/components/Creators/CreatorDropManager.tsx` |
| Modified | `src/components/Creators/CreatorFanPassManager.tsx` |
| Modified | `src/components/Creators/CreatorRequestsManager.tsx` |
| Modified | `src/components/Creators/CreatorSettingsHubFrame.tsx` |
| Modified | `src/components/Creators/FanPassSubscriberRow.tsx` |
| Modified | `src/components/Dashboard/CreatorWorkspaceFrame.tsx` |
| Modified | `src/components/Dashboard/CreatorWorkspacePanel.tsx` |
| Modified | `src/components/Dashboard/creator-workspace/CreatorActionQueuePanel.tsx` |
| Modified | `src/components/Dashboard/creator-workspace/CreatorBroadcastCard.tsx` |
| Modified | `src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx` |
| Modified | `src/components/Dashboard/creator-workspace/CreatorFanPassCrmPanel.tsx` |
| Modified | `src/components/creative-tim/kandydrops/creator/CreatorAccessStateSection.tsx` |
| Modified | `src/components/creative-tim/kandydrops/creator/CreatorOperatingRunway.tsx` |
| Modified | `src/components/creative-tim/kandydrops/creator/CreatorSettingsControlDeck.tsx` |
| Modified | `src/components/creative-tim/kandydrops/creator/CreatorSettingsWorkstreamRail.tsx` |
| Modified | `src/components/creative-tim/kandydrops/creator/CreatorStudioCanvas.tsx` |
| Created | `src/components/Creators/CreatorSettingsControls.tsx` |
| Created | `src/components/Creators/useCreatorBookingsManager.tsx` |
| Created | `src/components/Creators/useCreatorBroadcastManager.tsx` |
| Created | `src/components/Creators/useCreatorDashboardSettings.tsx` |
| Created | `src/components/Creators/useCreatorDropManager.tsx` |
| Created | `src/components/Creators/useCreatorRequestsManager.tsx` |
| Created | `src/components/Dashboard/useCreatorWorkspace.tsx` |
| Created | `src/components/ui/form-controls.tsx` |
| Created | `src/components/ui/textarea.tsx` |

### Preserved workflow and status paths

- Creator access/onboarding: current role/application eligibility, stage/summary, blocking reasons, ready-for-approval, queue position, waitlist destination, and read-only admin projection.
- Dashboard hydration: settings, requests, bookings, subscriptions and threads still load from existing authenticated routes; module criticality, degraded notices, settings-not-configured/partial/unavailable source evidence, unread counts and report-bug recovery remain.
- Drop chain: creator manager → existing CreateDropModal (`mode="creator"`, same actor override and success/close callbacks) → `/api/creator/drops` → role/configuration/restriction checks → existing submission normalizer/storage → Admin drops review queue → validated approval/rejection/needs-changes decision → canonical visibility/rotation resolution. Backend and Admin sources are unchanged.
- Drop status/filter paths: all, draft, submitted, pending_review, approved, needs_changes, rejected and expired; resolver creatorStatusKey/status label, admin-created vs creator-submitted labels, publicVisibilityLabel and expiration remain. Unapproved submissions stay creator-visible and user-hidden; approval remains admin-only.
- Drop source/feedback paths: existing status and metric resolvers, unavailable metric display, tab counts, guarded fetch freshness, load skeleton, empty submit action, toast failures, refresh, submission success refresh, and screen/form/status/pending-review telemetry remain.
- Profile/settings: selected-scope behavior, lazy single-manager mounting, name/bio, Fan Pass enable/paid price/welcome text, request enable/base price, calls enable/per-minute price, broadcasts enable/audience, timeline enable/approved-drop/broadcast visibility; section-only saves, saving/error feedback and generation/request guards remain.
- Requests: pending/accepted/fulfilled/declined stored labels, accept/decline/fulfill callbacks, paid price, loading/empty/unavailable/error states, duplicate-action refs, restriction/enabled/read-only guards and post-action reload remain.
- Bookings: booked/upcoming/in_progress/completed/canceled labels and dates/duration/price; complete/cancel actions, availability/enabled/restriction/read-only and duplicate-action guards, loading/empty/unavailable/error states and post-action reload remain.
- Fan Pass: active/canceled/grace/past_due subscriber labels, fan identity/photo/masked ID, paid price, renewal/auto-renew facts, source/restriction/setup/read-only states and refresh remain. Public creator pages still own membership changes; no membership writes are added.
- Broadcasts: draft/scheduled/sent/published/failed/canceled labels, followers audience, draft/title length limits, capability/source readiness, send/read-only/restriction/duplicate guards, loading/empty/error feedback, history expansion, delivery/open/failure evidence and telemetry remain.
- Earnings/accrual: existing earningsGd, pendingCashoutGd, ledgerAccruals/pendingPayouts evidence, safe attribution, source freshness/sample distinctions and earnings/payout destination remain. No balances, pricing, payout math or accrual logic change.
- Audit/telemetry: existing data markers, semantic event names/payloads, actor/target separation, projection exclusion, human error descriptors, bug reports and debug reporting remain. Old string-only scanners that assume all action code is inline need to read the extracted owner too; this slice adds no validator family and makes no formal runtime/provider/admin-proof claim.

### Verification and remaining boundaries

- Passed: typecheck, targeted lint, design-system drift, device-layout contract, surface-doctrine split, accessibility tap targets, creator experience transaction truth, booking error copy, and admin projection analytics exclusion.
- Existing booking/drop-grouping component tests: 7 passed. AST comparison: 173 state/action/effect declarations unchanged after relocation, excluding JSX class attributes.
- Settings suite: 5 passed / 18 failed; the unchanged branch files reproduce the identical 18 failures. Legacy card selectors and fixtures predate this slice; they were not silently rewritten.
- Device dry score: 70, 27 major findings, no creator finding; its contract validator passes. This is whole-repo source evidence, not creator visual acceptance.
- Capability policy passes. Safety/self-knowledge/bloat preflight references missing `output/manual-viewer-strobe-release-v2-20261003/input.json`; unresolved evidence remains unresolved.
- Drop workflow/status/CRM and frontend-consolidation command runners hit sandbox child-process EPERM. Fan Pass validator fails on an untouched subscription API response pattern. Neither is reported as passing.
- No hardcoded color, palette ramp or dark: class remains in the migrated manifest. Inherited unmigrated shared consumers: `src/components/Admin/CreateDropModal.tsx:1561` (gradient/literal submit styling), `:1592` (scrim); `src/components/ui/UiContinuityNotice.tsx:20` (legacy neutral palette); `src/components/errors/HumanErrorNotice.tsx:158` and `:173` (legacy title/action colors). These shared Admin/error owners remain outside this bounded operational presentation slice.
- No deploy, provider call, production mutation, dependency change, commit, push, browser audit, new report family or durable governance-memory writeback.
