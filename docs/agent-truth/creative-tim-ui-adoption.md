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
