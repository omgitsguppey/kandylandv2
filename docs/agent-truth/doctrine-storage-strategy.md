# Doctrine Storage Strategy

KandyDrops keeps human doctrine and machine doctrine separate.

## Human Sources

- `docs/doctrine/**` explains canonical doctrine for people.
- `docs/agent-truth/**` explains operational truth, validators, incidents, and agent workflows.
- Human docs remain readable and are not deleted only because compact context exists.

## Machine Sources

- `agent/context/doctrine-registry.json` stores authority metadata.
- `agent/context/doctrine-cards.jsonl` stores authority-level doctrine cards.
- `agent/context/doctrine.cards.jsonl` stores compact feature cards.
- `agent/context/surface-doctrine-map.json` maps paths to User, Creator, Admin, Server, shared primitive, and cross-surface contract doctrine.
- `agent/context/optimized-task-context.generated.json` stores the latest optimized per-task context pack.
- `agent/state/doctrine-retrieval-optimizer.generated.json` stores global optimizer efficiency evidence.

## Retrieval Rule

Agents read optimized context first, then compact JSON/JSONL cards, then source markdown only when a conflict remains unresolved or a selected card explicitly requires the full doc.

## Storage Rule

Append-only historical ledgers should use JSONL. Generated snapshots may use JSON when they are bounded and regenerated. Generated reports are evidence, not doctrine, and must never be selected as canonical doctrine.

## Risk Rule

Payment, auth, unlock, entitlement, content protection, security, cost, support permission, moderation evidence, and creator monetization tasks must include source-truth coverage even when a smaller UI context would appear cheaper.
