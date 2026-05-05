# KandyDrops Code Organization

KandyDrops code organization protects source-truth hierarchy, small self-contained change surfaces, affected validation, deterministic cacheability, and compact agent context before broad audits or route moves.

This is product architecture doctrine. It keeps the repo modular and agent-friendly without silently changing runtime behavior.

## Hierarchy

- `src/app is for route entrypoints only`.
- `src/features is for domain/product ownership`.
- `src/lib is for shared primitives only`.
- `src/lib/server is server-only shared logic`.
- `src/components/ui is pure reusable UI`.
- `scripts/agent is repo inspection/validation only`.
- `docs are human doctrine`.
- `agent/context is machine-readable doctrine`.

Shared primitives cannot import feature, component, or app route implementation. UI cannot own payment, auth, entitlement, metric, or server source truth.

## Feature Targets

Feature folders are the migration target for product ownership. Each may contain `components`, `hooks`, `server`, `contracts`, `scoring`, `validators`, `tests`, and `index.ts` exports only.

- `src/features/wallet`
- `src/features/drops`
- `src/features/viewer`
- `src/features/creator-profile`
- `src/features/creator-dashboard`
- `src/features/chat`
- `src/features/support`
- `src/features/moderation`
- `src/features/notifications`
- `src/features/admin-users`
- `src/features/analytics`
- `src/features/recommendations`

Do not perform route move automatically. Route moves require an explicit migration issue, URL parity proof, auth and telemetry parity proof, and affected validator signoff.

## Truth Layers

The required order is: `contract -> server truth -> client projection -> UI display -> telemetry -> validator -> docs`.

- UI cannot define source truth.
- Routes cannot inline scoring formulas.
- Metrics cannot be calculated independently in multiple panels.
- Admin cards cannot invent live/stale/error states.
- Docs cannot override code unless validator enforces doctrine.

## File Budgets

Warn at component >350 LOC, route handler >250 LOC, server helper >400 LOC, validator >500 LOC, markdown >300 lines, and generated JSON >500 lines unless JSONL or sharded.

Review is required at component >600 LOC, route handler >450 LOC, server helper >800 LOC, validator >900 LOC, markdown >600 lines, and generated JSON >1500 lines unless JSONL or sharded.

Critical organization failures are source file >1500 LOC without waiver, generated JSON >5000 lines without JSONL/sharding plan, route handler with 5+ inline responsibilities, component importing more than 8 domain helpers, shared lib importing feature-specific logic, UI duplicating payment/auth/entitlement truth, duplicated admin metric formulas, or blocked legacy imported by canonical runtime.

## Naming

Prefer explicit suffixes: `*.contract.ts`, `*.server.ts`, `*.client.ts`, `*.score.ts`, `*.normalize.ts`, `*.rollup.ts`, `*.policy.ts`, `*.validator.ts`, `*.view.tsx`, and `*.panel.tsx`.

Flag vague names unless allowlisted and documented: `utils.ts`, `helpers.ts`, `data.ts`, `logic.ts`, and `stuff.ts`.

## Route Groups

Recommended organization targets:

- `src/app/(public)`
- `src/app/(auth)`
- `src/app/(user)`
- `src/app/(creator)`
- `src/app/(admin)`
- `src/app/(system)`

Route groups organize only; they must not change URLs.

## Agent Context

Docs remain human-readable. `agent/context` JSON and JSONL cards are the agent-first source. Large markdown docs must have compact doctrine card. Validators must point to compact cards before full docs.

## Legacy

Legacy paths must be registered. blocked legacy cannot be imported by canonical runtime. Deprecated code requires replacement and `removeBy`. Route or modal fallback flows must be labeled fallback, not canonical.

## Validator

Use `npm run score:code-organization`, `npm run check:code-organization`, and `npm run typecheck` if TypeScript changed. Do not use Playwright, Lighthouse, Cypress, or full `npm run check` for this doctrine lane.
