# Creative Tim UI Adoption Record

Status: canonical design-reference and implementation record

## Implementation status

Creative Tim sources may be considered only for controlled, component-level
implantation under the policy below. The clean rebuild preserves existing user,
creator, admin, and protected-flow route ownership while presentation work
proceeds in reviewed slices. This record does not claim a completed public
Drop/card slice, preview implementation, live deployment, or functional
release. Five approved public primitives are now source-implanted under the
isolated path defined below. The parent integration changed `package.json` and
its paired lockfile only to install the five declared direct packages. No
runtime wiring or existing KandyDrops source was changed in that execution
lane.

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

Exact rollback before any consuming UI slice lands: delete only the five
approved source files listed above, remove the five declared direct package
entries from `package.json`, and remove their paired resolved entries from the
paired lockfile. Once a reviewed UI slice imports a primitive, remove those
imports first. No `components.json`, template global CSS, route, provider, or
existing KandyDrops business-logic rollback is required.

## Local source roots and roles

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
- The only approved Creative Tim source in this repository is the five public
  primitives listed in the approved implantation record. Named Creative Tim
  blocks remain unapproved unless a later record grants a separate exact
  manifest, file allowlist, and rollback plan.
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
whole app**. Preserve KandyDrops dark neon candy-glass tokens and all server
truth while keeping the current product architecture, contracts, and evidence
boundaries intact.
