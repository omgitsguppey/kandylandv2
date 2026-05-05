# Shared Brand Primitives

Authority: shared visual and interaction primitives used by all surfaces unless a surface doctrine overrides density or state presentation.

## Purpose

Shared brand primitives define the KandyDrops visual language without owning surface-specific business rules or server truth.

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
