# Shared Brand Primitives

Authority: shared visual and interaction primitives used by all surfaces unless a surface doctrine overrides density or state presentation.

## Purpose

Shared brand primitives define the KandyDrops visual language without owning surface-specific business rules or server truth.

## Current owner-selected direction

The whole-site redesign selected on 2026-10-02 uses Apple-informed hierarchy, adaptive navigation, familiar controls and restrained materials. KandyDrops retains its name, official mark, purple accent and product voice. This target replaces the earlier neon candy-glass, Argon and Soft UI composition direction where they conflict; those templates remain historical component/provenance references.

Visual rules have one runtime owner in `src/app/globals.css`. Existing semantic utilities project that owner; components do not define their own palettes or parallel theme providers. Existing `src/components/ui/Button.tsx` owns button and button-shaped link classes. Licensed local Card, NativeSelect, Avatar, Badge and Separator sources remain reusable presentation primitives.

- Use system sans typography, ordinary readable weights and a small consistent heading hierarchy. Do not embed Apple fonts or substitute decorative type into operational controls.
- Use neutral content backgrounds and the brand accent for interactivity or selection. Status has separate semantic color plus text/icon meaning.
- Keep content, records, forms and metrics on opaque surfaces. Use a single restrained translucent material for navigation or temporary controls, with an opaque fallback for unsupported blur, reduced transparency, increased contrast and forced colors. CSS blur is a web adaptation; it must not be represented as native Liquid Glass.
- Group related rows into one meaningful record/task boundary. Use section headings, spacing and row separators for hierarchy; opaque Card defaults do not outline every group. Preserve an explicit functional boundary when it communicates a selected state, urgency, warning or failure. Avoid decorative card-within-card wrappers, repeated mastheads and ornamental labels that compete with the action.
- Apply Apple’s published material and native sample guidance as a reference for hierarchy and interaction. Native SwiftUI/UIKit/AppKit Liquid Glass APIs and samples are not web components. Web chrome uses the existing CSS material owner, a subtle static rim and a solid fallback; unknown transparency-preference support does not establish OS-aware behavior. Do not import Apple fonts, sample assets or sample code without verified applicable rights.
- A sourced primitive or passing layout test is not visual acceptance. Each affected whole-body composition must be rendered and reviewed against the current hierarchy/material direction before its visual criterion passes.
- Use the existing device-layout and mobile-shell contracts for safe areas, navigation reservation and breakpoints. A new visual style does not authorize new viewport physics or duplicated responsive state.
- Keep 44px minimum interactive targets, visible labels, keyboard focus, text enlargement, reduced motion and truthful loading/failure/recovery states across all surfaces.
- Migrate in coherent, verified slices. Dark appearance remains active while literal-white legacy consumers are being converted; automatic light appearance requires affected-consumer contrast and state proof before activation.

These are the accepted design target, not evidence that every route has migrated. Each slice records its source manifest, deliberate structural adaptations, surviving state/telemetry/audit owners and direct verification in the existing adoption/audit owners.

## Rules

- Use the KandyDrops brand purple as the primary brand anchor.
- Keep the official temporary logo mark unchanged unless a brand update explicitly replaces it.
- Use glass depth to clarify hierarchy, not as decoration that reduces contrast.
- Typography should feel premium, readable, and consistent across surfaces.
- Motion should provide feedback and orientation, respect reduced motion, and avoid frantic urgency.
- Buttons and interactive controls must preserve accessible names, focus states, and at least 44px interactive targets.
- Loading skeletons must distinguish loading state from product-state blur or locked-content protection.
- Icons must clarify actions; decorative icons cannot imply unavailable interactions.
- Shared UI components must stay free of wallet, creator, admin, moderation, support, entitlement, or server-truth business logic.

## Must Not

- Do not encode surface-specific money, entitlement, support, moderation, or admin truth logic in shared primitives.
- Do not make decorative chips look tappable.
- Do not use glass, blur, or gradients that hide state or reduce accessibility.
- Do not create a new component variant when an owned shared primitive can handle the need.

## Applies To

- `src/components/ui/**`, shared navigation primitives, shared cards, buttons, chips, tabs, inputs, loaders, and base motion tokens.

## Theme Variant System (binding, 2026-10-05, owner directive)

Theming is a first-class token/variant system. Cosmetic themes and badges will be sold as microtransactions later; that must work without rework. Every color, surface, material, and border decision flows through CSS custom properties owned by `src/app/globals.css`. Components consume only the semantic Tailwind utilities projected by the `@theme inline` block. A future theme is a pure token-variant swap: zero component changes.

- **Variant scopes.** `:root` carries the default `kandy-dark` token values; additional variants are declared as `[data-theme="<variant>"]` scopes overriding only semantic tokens (set via `document.documentElement.dataset.theme`). Components never branch on theme: no per-component theme logic, and the Tailwind `dark:` variant is banned in component class strings — variant behavior lives only in token scopes.
- **Legacy palette bridge.** Widely-used Tailwind palette ramps are aliased to semantic tokens in `@theme` so existing utilities become token-driven with zero component edits. Alias map (documented here, enforced by review):
  - Neutrals: gray/zinc/slate-100/200 → `--foreground`; gray/zinc/slate-300/400/500 → `--muted-foreground`; slate/zinc-950, purple-950, fuchsia-950 → `--background`; slate/zinc-900, gray-900 → `--card`; zinc-800, slate-700/600, gray-600 → `--secondary`.
  - Red ramp → `--destructive`; amber/orange/yellow ramps → `--warning`; emerald/green ramps → `--success`; cyan/sky/blue/indigo ramps → `--info`. Pale brand tints stay pale and saturated brand accents stay saturated: pink-400/500 → `--brand-pink`; pink-50/100/200/300 → `--brand-pink-soft`; purple-400/500, violet-400/500, fuchsia-400/500/600 → `--primary`; purple-50/100/200/300, violet-100/300, fuchsia-50/100/200/300 → `--focus-ring`.
  - New code must use semantic utilities directly (`text-muted-foreground`, `bg-destructive`, …), never palette ramps. The bridge exists to migrate, not to extend.
- **Badge tones on tokens.** Badge variants (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info`) reference semantic tokens only, including dedicated `--success-foreground`, `--warning-foreground`, `--info-foreground` tokens. Future paid cosmetic badge tones are new token sets, never new component logic.
- **Overlay token.** Modal/scrim surfaces use `--scrim`, not hardcoded black.
- **Primitive-first.** Never freehand UI: compose only from owned shared primitives (`src/components/ui/*`, licensed shadcn-derived sources adopted there with provenance). No bespoke one-off screens, no one-off component variants. If a slice needs a primitive that does not exist, create the shared primitive first (token-driven, 44px interactive targets, no business logic), then consume it.

## Validators

- `check:surface-doctrine-split`
- `check:design-system-drift`
- `check:accessibility-tap-targets`
- `kd-no-hardcoded-color-literals` (ast-grep: no hex/rgb/hsl literals in ts/tsx outside `src/app/globals.css`)
