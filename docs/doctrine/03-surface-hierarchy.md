# KandyDrops Surface Hierarchy

Authority: surface routing layer under the Engineering Constitution and above feature doctrine.

This file prevents one UI doctrine from being applied to every surface. Agents must resolve the primary surface before using layout, density, copy, telemetry, or state rules.

## Load Order

1. Product Constitution: global product loop, vocabulary, brand intent.
2. Shared Brand Primitives: color, type, glass, motion, icons, core components, accessibility baseline.
3. Surface Doctrine: User UI, Creator UI, Admin UI, and Server Truth rules.
4. Feature Doctrine: wallet, drops, viewer, support, moderation, analytics, creator dashboard, and other feature cards.
5. Validators: deterministic checks that enforce the selected surface and feature rules.

## Primary Surface Docs

- User UI: `docs/doctrine/surfaces/user-ui-doctrine.md`
- Creator UI: `docs/doctrine/surfaces/creator-ui-doctrine.md`
- Admin UI: `docs/doctrine/surfaces/admin-ui-doctrine.md`
- Server Truth: `docs/doctrine/surfaces/server-truth-doctrine.md`
- Shared Brand Primitives: `docs/doctrine/surfaces/shared-brand-primitives.md`

Use `agent/context/surface-doctrine-map.json` to route files to one primary surface before reading feature cards.

## Surface Boundaries

- User UI optimizes conversion, clarity, reward loops, trust, and mobile/PWA polish.
- Creator UI optimizes operational control over content, earnings, fans, bookings, chat, profile, and timeline tools.
- Admin UI optimizes truth, speed, density, triage, evidence, source state, freshness, and confidence.
- Server Truth optimizes canonical data, security, cost control, auditability, and actor/target telemetry.
- Shared Brand Primitives apply everywhere unless a surface doctrine overrides layout density or state presentation.

## Conflict Rules

- Server truth beats all UI doctrine for data, security, payment, unlock, entitlement, support permission, moderation evidence, and creator monetization.
- Admin UI doctrine beats User UI doctrine inside `src/app/admin/**` and admin-only components.
- Creator UI doctrine beats User UI doctrine inside creator dashboards, creator tools, and creator workflow components.
- User UI doctrine beats Admin density rules and debug rules on public and user-facing surfaces.
- Shared brand primitives apply everywhere unless a surface doctrine explicitly overrides density or layout.
- Feature doctrine cannot contradict Server Truth.
- Generated reports can provide evidence, but they do not override constitutions, surface doctrine, or verified code.

## Agent Rule

Before editing any UI, copy, telemetry, state, admin truth, or server truth path:

1. Read `agent/context/surface-doctrine-map.json`.
2. Identify exactly one primary surface for the file.
3. Read that surface doctrine doc.
4. Read only the relevant feature doctrine card.
5. Run `npm run check:surface-doctrine-split` for hierarchy changes.

Do not apply admin card density to user surfaces. Do not apply user conversion copy to admin diagnostic surfaces. Do not let client UI state become server truth.
