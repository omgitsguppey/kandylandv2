# Doctrine Hierarchy

KandyDrops doctrine is organized by authority, surface ownership, compact agent context, generated snapshots, and legacy phase-out metadata.

## Authority Order

1. Product Constitution: `docs/doctrine/00-product-constitution.md`
2. Source-of-Truth Constitution: `docs/doctrine/01-source-of-truth-constitution.md`
3. Engineering Constitution: `docs/doctrine/02-engineering-constitution.md`
4. Surface Doctrine Cards: `docs/doctrine/surfaces/*.md`
5. Runbooks and ADRs
6. Generated reports: `agent/state/*.generated.json`
7. Legacy docs with superseded-by metadata

Generated reports may inform doctrine updates, but they do not override canonical doctrine.

## Agent Load Plan

Agents must read `agent/context/doctrine-registry.json` first, stream only relevant records from `agent/context/doctrine-cards.jsonl`, then open the canonical surface doc if needed. Do not read every Markdown file by default.

## Surface Ownership

Each surface has one canonical authority-level-4 doc:

- wallet
- drops
- viewer
- watch-time
- telemetry
- user-management
- behavioral-intelligence
- creator-profile
- creator-dashboard
- support
- moderation
- admin-debug
- admin-ai
- device-ui
- image-loading
- security/cost
- cloud/sql/bigquery

## Conflict Handling

Known conflicts are written to `agent/context/doctrine-conflicts.generated.json`. A conflict must include affected docs, winning rule, authority reason, and action.

Known conflict families:

- realtime allowed vs hot-cache only
- preview modal canonical vs full-page preview canonical
- notification opened/read split vs read-only canonical
- client unlock success counts vs server entitlement truth
- screenshot detected vs screenshot-like heuristic
- SQL forbidden vs Data Connect allowed mirror
- wallet total balance only vs split free/paid
- green bonus chip vs purple bonus chip

## Legacy Phase-Out

Old duplicated doctrine remains in place until owners review it, but registry entries mark it legacy or deprecated with `supersededBy`, `reviewBy`, and `removeBy`.

## Validators

- `npm run score:doctrine`
- `npm run check:doctrine`
- `npm run typecheck` if TypeScript changed

Broad browser/full-suite audits are not part of doctrine consolidation.
