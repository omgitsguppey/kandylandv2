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

## Validators

- `check:surface-doctrine-split`
- `check:design-system-drift`
- `check:accessibility-tap-targets`
