# Workflow: UI & Copy Refinement

**Purpose:** Keep UI, copy, and product-facing state changes source-first and doctrine-bound. Improvisational "just make it better" changes are forbidden.

## Step 1: Build Compact Context

- Use `npm run agent:fast-start -- --task="<task>" --mode=<mode> --file=<entrypoint>` or `npm run optimize:doctrine-context -- --task "<task>" --changed <path>` when the task is not already covered by a fresh context pack.
- Read `docs/agent-truth/current-operator-doctrine.md` for admin truth, analytics/source-state, screenshot/browser-proof, or external-audit work.

## Step 2: Inspect Surface

- Identify the exact React components, hooks, data fetchers, API routes, and source contracts responsible for the surface.
- Identify whether the change is User UI, Creator UI, Admin UI, Server Truth, or Shared Brand Primitives before choosing doctrine.

## Step 3: Consult Doctrine

- Follow `.agent/skills/doctrine-consultation.md`.
- Read only the specific surface doctrine and copy/vocabulary files needed for the task.
- Do not open the whole doctrine library unless compact context, source inspection, or a validator leaves a real conflict unresolved.

## Step 4: Identify State Owner

- Determine what hook, context, data fetcher, server route, or generated source report owns the state.
- Loading, empty, error, unavailable, cached, refresh_due, source_missing, bridge_missing, materializer_missing, permission_blocked, and external_proof_required must remain distinct. Missing is not zero.

## Step 5: Identify Telemetry Path

- Determine if the UI interaction triggers or displays analytics.
- Components may call semantic helpers, but they must not own retry, cadence, queueing, privacy, identity, or duplicate metric behavior.

## Step 6: Identify Admin/Audit Path

- Determine how Admin Debug or the owning validator sees the state.
- Source validators, route contracts, selectors, hydration markers, fixtures, and client-error evidence should report broken modals or disconnected actions before browser reproduction.

## Step 7: Patch Or Classify

- Make the smallest connected change, remove/demote stale UI, or classify the formal evidence blocker.
- Use existing doctrine vocabulary and source-state labels.
- Browser smoke, screenshots, and test accounts are optional diagnostics unless a formal runtime evidence contract explicitly promotes them.

## Step 8: Verify

- Run the targeted source validator/test lane for the touched surface.
- Use browser audits only when source findings, selector policy, current doctrine, or the operator explicitly asks for reproduction.

## Step 9: Report

- Document the doctrine files applied, source owner, telemetry/admin/debug impact, verification lane, and any formal runtime/provider/admin evidence that remains outside source proof.
