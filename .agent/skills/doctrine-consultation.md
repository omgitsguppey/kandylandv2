# Skill: Doctrine Consultation

**Description:** Consult the smallest sufficient KandyDrops doctrine before touching UI, copy, product-facing state, telemetry labels, or admin truth surfaces.

## Pre-Requisites

Before adjusting UI layout, copy text, interaction logic, status labels, or product-facing source-state presentation, run this consultation flow. Do not rely on generic LLM intuition, screenshot-only judgment, or browser smoke as the first detector.

## Execution Steps

1. **Start Compact**
   Prefer the generated task context or doctrine optimizer first:
   - `npm run agent:fast-start -- --task="<task>" --mode=<mode> --file=<entrypoint>`
   - or `npm run optimize:doctrine-context -- --task "<task>" --changed <path>`

   If those artifacts are already fresh for the task, read them instead of opening broad Markdown by default.

2. **Apply Current Operator Doctrine**
   Read `docs/agent-truth/current-operator-doctrine.md` when the task touches UI/admin truth, evidence boundaries, screenshot/browser proof, analytics source states, or external-audit recommendations. It wins over older stale launch/readiness docs when they conflict.

3. **Resolve One Surface**
   Use `agent/context/surface-doctrine-map.json` and `docs/doctrine/03-surface-hierarchy.md` to identify the primary surface. Then read only the matching surface doctrine, such as:
   - `docs/doctrine/surfaces/admin-ui-doctrine.md`
   - `docs/doctrine/surfaces/creator-ui-doctrine.md`
   - `docs/doctrine/surfaces/user-ui-doctrine.md`
   - `docs/doctrine/surfaces/server-truth-doctrine.md`
   - `docs/doctrine/surfaces/shared-brand-primitives.md`

   Escalate to the older broad files only when the compact context or surface doctrine leaves a real conflict unresolved.

4. **Check Copy And Banned Patterns When Copy Changes**
   For copy, tone, or vocabulary changes, consult the relevant records from `docs/doctrine/kandydrops-copy-doctrine.md`, `docs/doctrine/kandydrops-banned-patterns.md`, `docs/doctrine/kandydrops-vocabulary-index.md`, and `docs/doctrine/kandydrops-decision-checklist.md`.

5. **Identify Source Truth Before Visual Shape**
   Determine the owner for the data, action, permission, loading, error, cache, telemetry, and debug/admin evidence path. UI labels must reflect source truth: live, cached, refresh_due, source_missing, bridge_missing, materializer_missing, permission_blocked, external_proof_required, failed, or unavailable. Missing is not zero.

6. **Keep Browser Proof Optional**
   Source validators, route contracts, selectors, hydration markers, fixtures, and client-error evidence should report broken modals, disconnected actions, and stale labels before browser reproduction. Browser smoke, screenshots, and test accounts are optional diagnostics unless a current formal runtime contract explicitly promotes them.

## Expected Outcome

You should know the primary surface, canonical source owner, allowed copy/state vocabulary, telemetry/admin/debug implications, and the smallest verification lane. Proceed only if the planned change follows doctrine and does not create a second truth system.
