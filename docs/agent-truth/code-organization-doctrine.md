# Code Organization Doctrine

KandyDrops code organization protects source-truth hierarchy, small self-contained change surfaces, affected validation, deterministic cacheability, and compact agent context before broad audits or route moves.

This doctrine is research-backed by Google code health and small CL practice, the Next.js App Router organization model, Nx affected-file planning, and Turborepo deterministic caching. It is an architecture/audit doctrine only; it does not move routes or rewrite product behavior by itself.

## Research Basis

- Google engineering practice: protect overall code health, design, functionality, complexity, and maintainability during review.
- Google small CL doctrine: keep changes small, self-contained, easier to review, easier to roll back, and paired with related tests.
- Next.js App Router: route groups organize without URL changes; private folders hide implementation details; colocation is safe when route entrypoints stay thin; the `src` folder separates app code from repo config.
- Nx affected model: changed files plus project graph and dependency ownership determine minimum affected checks.
- Turborepo caching model: deterministic task inputs, outputs, and logs make repeated checks cacheable by fingerprint.

## Source Hierarchy

- `src/app is for route entrypoints only`. Route handlers and pages orchestrate contracts, server truth, and feature modules.
- `src/features is for domain/product ownership`. Feature folders own product logic, state, components, tests, scoring, validators, and contracts.
- `src/lib is for shared primitives only`. Shared primitives cannot import app, component, or feature-specific runtime code.
- `src/lib/server is server-only shared logic`. It may own cross-feature server truth helpers, guarded access, rollups, and source-of-truth adapters.
- `src/components/ui is pure reusable UI`. It cannot own product source truth, scoring, telemetry facts, or server writes.
- `scripts/agent is repo inspection/validation only`. Agent scripts inspect, score, validate, plan, and generate reports.
- `docs are human doctrine`. Docs explain decisions but do not override runtime code unless validators enforce them.
- `agent/context is machine-readable doctrine`. Agents load compact indexes/cards before long Markdown.

## Feature Folder Targets

Each target feature may contain only `components`, `hooks`, `server`, `contracts`, `scoring`, `validators`, `tests`, and `index.ts` exports only.

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

Migration is plan-first. Start with contracts and low-risk helpers, then feature hooks/views, then route adapters. Do not perform route move automatically.

## Truth-Layer Hierarchy

The required order is: `contract -> server truth -> client projection -> UI display -> telemetry -> validator -> docs`.

- UI cannot define source truth.
- Routes cannot inline scoring formulas.
- Metrics cannot be calculated independently in multiple panels.
- Admin cards cannot invent live/stale/error states.
- Docs cannot override code unless validator enforces doctrine.

## File-Size Budget

Warn:

- component >350 LOC
- route handler >250 LOC
- server helper >400 LOC
- validator >500 LOC
- markdown >300 lines
- generated JSON >500 lines unless JSONL or sharded

Review required:

- component >600 LOC
- route handler >450 LOC
- server helper >800 LOC
- validator >900 LOC
- markdown >600 lines
- generated JSON >1500 lines unless JSONL or sharded

Critical:

- source file >1500 LOC without waiver
- generated JSON >5000 lines unless JSONL or sharded
- route handler mixes auth, validation, Firestore, scoring, formatting, telemetry inline
- component imports more than 8 domain helpers
- shared lib imports feature-specific logic

## Naming Rules

Use explicit names: `*.contract.ts`, `*.server.ts`, `*.client.ts`, `*.score.ts`, `*.normalize.ts`, `*.rollup.ts`, `*.policy.ts`, `*.validator.ts`, `*.view.tsx`, and `*.panel.tsx`.

Flag vague names unless allowlisted and documented: `utils.ts`, `helpers.ts`, `data.ts`, `logic.ts`, and `stuff.ts`.

## App Route Organization

Recommended route groups are:

- `src/app/(public)`
- `src/app/(auth)`
- `src/app/(user)`
- `src/app/(creator)`
- `src/app/(admin)`
- `src/app/(system)`

Route groups are migration targets only. They must preserve URLs, metadata, auth, telemetry, adjacent validators, and source-state labels.

## Agent Context Efficiency

- Docs remain human-readable.
- `agent/context` JSON and JSONL cards are the agent-first source.
- Large markdown docs must have compact doctrine card.
- Validators must point to compact cards before full docs.
- Generated historical ledgers should use JSONL when append-only.
- Massive generated arrays should be split by surface.

## Legacy And Phase-Out

- Legacy paths must be registered.
- blocked legacy cannot be imported by canonical runtime.
- Deprecated code must have a replacement and `removeBy`.
- Route and modal fallbacks must be labeled fallback, not canonical.

## Validator Lane

Use:

- `npm run score:code-organization`
- `npm run check:code-organization`
- `npm run typecheck` if TypeScript changed

Do not run Playwright, Lighthouse, Cypress, or full `npm run check` for this source-only doctrine lane.
