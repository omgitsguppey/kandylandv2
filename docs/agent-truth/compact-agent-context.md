# Compact Agent Context

KandyDrops keeps human doctrine docs, but code agents should not load long Markdown as the default context path. The compact agent context lane writes small deterministic lookup artifacts under `agent/context/` so agents can load only the cards, surface contracts, validators, and legacy warnings relevant to the changed files.

## Generated Artifacts

- `agent/context/doctrine.index.json` is the first file to read. It lists available surfaces, card ids, source docs, file-size budgets, and the context load plan.
- `agent/context/doctrine.cards.jsonl` is streamable JSONL. Each line is one doctrine card, so tools can keep only the matching surface records.
- `agent/context/surface-contracts.jsonl` is streamable JSONL for canonical files, source docs, validators, blocked patterns, and fallback docs per surface.
- `agent/context/validator-map.json` maps every root package `check:*`, `score:*`, and `validate:*` script to a surface.
- `agent/context/legacy-registry.json` mirrors the hardcoded legacy phaseout registry for fast task-pack warnings.
- `agent/context/file-size-budget.json` records budget constants and current oversized Markdown/generated/source warnings.
- `agent/context/task-pack.generated.json` is the per-task pack: changed files, affected surfaces, relevant cards, relevant validators, and legacy warnings only.

## Agent Load Plan

1. Read `agent/context/doctrine.index.json`.
2. Resolve surfaces from changed files, task terms, or `agent/context/validator-map.json`.
3. Stream `agent/context/doctrine.cards.jsonl` and keep matching surfaces only.
4. Stream `agent/context/surface-contracts.jsonl` and keep matching surfaces only.
5. Read `agent/context/task-pack.generated.json` for the already-filtered working set.
6. Open the original Markdown source doc only when the compact card leaves a specific uncertainty.

## Budgets

- Markdown doctrine recommended max: 300 lines.
- Generated JSON report recommended max: 500 lines unless JSONL or sharded.
- Agent card max: 1,500 chars.
- Single source file warning: 800 LOC.
- Single source file critical: 1,500 LOC.
- Generated state warning: 1,000 lines.
- Generated state critical: 5,000 lines unless JSONL.

## Commands

- `npm run build:agent-context` regenerates compact artifacts and the current changed-file task pack.
- `npm run check:agent-context` runs the existing repo intelligence self-check and validates the compact context lane.

Human docs remain intact. Compact files are a retrieval layer, not stronger truth than verified runtime code, verified configuration, or verified command output.
